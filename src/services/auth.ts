// DUITKU - Supabase Authentication Service
// Menggunakan built-in Supabase Auth (Email/Password & Google OAuth)

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface AuthUserInfo {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  isDemo?: boolean;
}

// Fallback demo user jika kredensial Supabase di .env belum dimasukkan
const DEMO_USER: AuthUserInfo = {
  uid: '00000000-0000-0000-0000-000000000001',
  email: 'demo@duitku.id',
  displayName: 'Rina Anggraini',
  photoURL: null,
  isDemo: true,
};

let currentDemoUser: AuthUserInfo | null = null;
const authSubscribers: Array<(user: AuthUserInfo | null) => void> = [];

export const authService = {
  // Sign in dengan Google via Supabase OAuth
  async signInWithGoogle(): Promise<void> {
    if (!isSupabaseConfigured) {
      currentDemoUser = { ...DEMO_USER, displayName: 'Google User (Demo)' };
      notifySubscribers(currentDemoUser);
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) throw error;
  },

  // Sign in dengan Email & Password via Supabase Auth
  async signInWithEmail(email: string, pass: string): Promise<AuthUserInfo> {
    const cleanEmail = email.trim().toLowerCase();

    if (!isSupabaseConfigured) {
      if (cleanEmail === 'demo@duitku.id') {
        currentDemoUser = { ...DEMO_USER };
      } else {
        currentDemoUser = {
          uid: '00000000-0000-0000-0000-' + btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).padStart(12, '0'),
          email: cleanEmail,
          displayName: cleanEmail.split('@')[0],
          photoURL: null,
          isDemo: true,
        };
      }
      localStorage.setItem('dk_demo_session', JSON.stringify(currentDemoUser));
      notifySubscribers(currentDemoUser);
      return currentDemoUser;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Pengguna tidak ditemukan.');

    const userInfo: AuthUserInfo = {
      uid: data.user.id,
      email: data.user.email || cleanEmail,
      displayName: data.user.user_metadata?.name || data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
      photoURL: data.user.user_metadata?.avatar_url || null,
    };

    return userInfo;
  },

  // Sign up dengan Email, Password, dan Nama Lengkap via Supabase Auth
  async signUpWithEmail(name: string, email: string, pass: string): Promise<AuthUserInfo> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!isSupabaseConfigured) {
      currentDemoUser = {
        uid: '00000000-0000-0000-0000-' + Date.now().toString(16).padStart(12, '0'),
        email: cleanEmail,
        displayName: cleanName,
        photoURL: null,
        isDemo: true,
      };
      localStorage.setItem('dk_demo_session', JSON.stringify(currentDemoUser));
      notifySubscribers(currentDemoUser);
      return currentDemoUser;
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: pass,
      options: {
        data: {
          name: cleanName,
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('Pendaftaran gagal. Silakan coba lagi.');

    return {
      uid: data.user.id,
      email: data.user.email || cleanEmail,
      displayName: cleanName || cleanEmail.split('@')[0],
      photoURL: null,
    };
  },

  // Update profile nama pengguna
  async updateUserProfile(displayName: string, photoURL?: string | null): Promise<void> {
    if (!isSupabaseConfigured) {
      if (currentDemoUser) {
        currentDemoUser.displayName = displayName;
        if (photoURL !== undefined) currentDemoUser.photoURL = photoURL;
        localStorage.setItem('dk_demo_session', JSON.stringify(currentDemoUser));
        notifySubscribers(currentDemoUser);
      }
      return;
    }

    await supabase.auth.updateUser({
      data: {
        name: displayName,
        ...(photoURL !== undefined ? { avatar_url: photoURL } : {}),
      },
    });
  },

  // Logout pengguna dari Supabase
  async signOut(): Promise<void> {
    localStorage.removeItem('dk_demo_session');
    currentDemoUser = null;
    notifySubscribers(null);

    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  },

  // Auth State Listener dengan Supabase onAuthStateChange
  onAuthStateChange(callback: (user: AuthUserInfo | null) => void): () => void {
    authSubscribers.push(callback);

    if (!isSupabaseConfigured) {
      const saved = localStorage.getItem('dk_demo_session');
      if (saved) {
        try {
          currentDemoUser = JSON.parse(saved);
        } catch {
          currentDemoUser = null;
        }
      }
      setTimeout(() => callback(currentDemoUser), 10);
      return () => {
        const index = authSubscribers.indexOf(callback);
        if (index > -1) authSubscribers.splice(index, 1);
      };
    }

    // Periksa sesi yang sudah ada saat awal
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const u = data.session.user;
        callback({
          uid: u.id,
          email: u.email || '',
          displayName: u.user_metadata?.name || u.user_metadata?.full_name || u.email?.split('@')[0] || 'Pengguna DUITKU',
          photoURL: u.user_metadata?.avatar_url || null,
        });
      } else {
        callback(null);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        const info: AuthUserInfo = {
          uid: u.id,
          email: u.email || '',
          displayName: u.user_metadata?.name || u.user_metadata?.full_name || u.email?.split('@')[0] || 'Pengguna DUITKU',
          photoURL: u.user_metadata?.avatar_url || null,
        };
        callback(info);
      } else {
        callback(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
      const index = authSubscribers.indexOf(callback);
      if (index > -1) authSubscribers.splice(index, 1);
    };
  },
};

function notifySubscribers(user: AuthUserInfo | null) {
  authSubscribers.forEach((cb) => {
    try {
      cb(user);
    } catch (e) {
      console.error(e);
    }
  });
}
