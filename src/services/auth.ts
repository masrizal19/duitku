// DUITKU - Supabase Authentication Service
// Menggunakan Supabase Auth asli secara penuh (tanpa Demo Mode atau akun lokal)

import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient, supabase } from '../lib/supabase';

export interface AuthUserInfo {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

export interface SignUpResult {
  user: AuthUserInfo;
  session: Session | null;
  requiresEmailConfirmation: boolean;
}

export interface SignInResult {
  user: AuthUserInfo;
  session: Session;
}

function getAuthRedirectUrl(): string {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'duitku.mkverse.my.id') {
      return 'https://duitku.mkverse.my.id';
    }
    return window.location.origin;
  }
  return 'https://duitku.mkverse.my.id';
}

function mapSupabaseUser(user: User): AuthUserInfo {
  const email = (user.email || '').trim().toLowerCase();
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    (email ? email.split('@')[0] : 'Pengguna DUITKU');

  return {
    uid: user.id,
    email,
    displayName: String(displayName).trim(),
    photoURL: user.user_metadata?.avatar_url || null,
  };
}

export const authService = {
  // Sign in dengan Google via Supabase OAuth
  async signInWithGoogle(): Promise<void> {
    const client = getSupabaseClient();
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl(),
      },
    });

    if (error) throw error;
  },

  // Sign in dengan Email & Password via Supabase Auth
  async signInWithEmail(email: string, password: string): Promise<SignInResult> {
    const client = getSupabaseClient();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      throw new Error('Isi email dan kata sandi.');
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) throw error;
    if (!data.user || !data.session) {
      throw new Error(
        'Sesi autentikasi tidak tersedia. Pastikan email sudah diverifikasi lalu coba masuk kembali.'
      );
    }

    return {
      user: mapSupabaseUser(data.user),
      session: data.session,
    };
  },

  // Sign up dengan Email, Password, dan Nama Lengkap via Supabase Auth
  async signUpWithEmail(name: string, email: string, password: string): Promise<SignUpResult> {
    const client = getSupabaseClient();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanName) {
      throw new Error('Isi nama lengkap Anda.');
    }
    if (!cleanEmail) {
      throw new Error('Isi alamat email yang valid.');
    }
    if (password.length < 6) {
      throw new Error('Kata sandi minimal 6 karakter.');
    }

    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
        data: {
          full_name: cleanName,
          name: cleanName,
        },
      },
    });

    if (error) throw error;
    if (!data.user) {
      throw new Error('Pendaftaran gagal: Supabase tidak mengembalikan data akun.');
    }

    // Supabase mengembalikan identities kosong jika email sudah terdaftar sebelumnya (saat confirm email aktif)
    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('Email ini sudah terdaftar di Supabase. Silakan masuk atau periksa email Anda.');
    }

    const requiresEmailConfirmation = !data.session;

    return {
      user: mapSupabaseUser(data.user),
      session: data.session,
      requiresEmailConfirmation,
    };
  },

  // Ambil sesi aktif saat ini dari Supabase Auth
  async getSession(): Promise<Session | null> {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  // Update metadata nama / avatar pengguna di Supabase Auth
  async updateUserProfile(displayName: string, photoURL?: string | null): Promise<void> {
    const client = getSupabaseClient();
    const cleanName = displayName.trim();

    const { data: sessionData, error: sessionErr } = await client.auth.getSession();
    if (sessionErr || !sessionData.session) {
      throw new Error('Sesi autentikasi berakhir. Silakan masuk kembali.');
    }

    const { error } = await client.auth.updateUser({
      data: {
        full_name: cleanName,
        name: cleanName,
        ...(photoURL !== undefined ? { avatar_url: photoURL } : {}),
      },
    });

    if (error) throw error;
  },

  // Logout pengguna dari Supabase Auth
  async signOut(): Promise<void> {
    const client = getSupabaseClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },

  // Auth State Listener tunggal tanpa race condition atau callback ganda
  onAuthStateChange(callback: (user: AuthUserInfo | null) => void): () => void {
    if (!supabase) {
      callback(null);
      return () => {};
    }

    let isActive = true;
    let initialResolved = false;
    let lastEmittedUid: string | null | undefined = undefined;

    const emitUser = (session: Session | null, force = false) => {
      if (!isActive) return;
      const nextUid = session?.user?.id || null;
      if (!force && lastEmittedUid === nextUid) {
        return;
      }
      lastEmittedUid = nextUid;
      callback(session?.user ? mapSupabaseUser(session.user) : null);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isActive) return;

      if (event === 'INITIAL_SESSION') {
        initialResolved = true;
        emitUser(session);
        return;
      }

      if (event === 'SIGNED_OUT') {
        emitUser(null);
        return;
      }

      if (event === 'USER_UPDATED') {
        emitUser(session, true);
        return;
      }

      if (event === 'SIGNED_IN') {
        initialResolved = true;
        emitUser(session);
        return;
      }

      // TOKEN_REFRESHED tidak perlu memicu reload penuh jika user id tetap sama
    });

    // Pastikan getSession tetap diperiksa sebagai jaring pengaman jika INITIAL_SESSION tertunda
    supabase.auth.getSession().then(({ data, error }) => {
      if (!isActive || initialResolved) return;
      initialResolved = true;
      emitUser(error ? null : data.session);
    });

    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
    };
  },
};
