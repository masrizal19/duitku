import React, { useState } from 'react';
import { authService } from '../services/auth';
import { isSupabaseConfigured, supabaseConfigError } from '../lib/supabase';
import { Icon } from './Icon';

interface AuthScreenProps {
  onSuccess: (toastMsg: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'daftar' | 'lupa'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const mapAuthError = (err: any): string => {
    const raw = err?.message || 'Terjadi kesalahan autentikasi.';
    if (
      raw.includes('Invalid login credentials') ||
      raw.toLowerCase().includes('invalid credentials')
    ) {
      return 'Email atau kata sandi tidak cocok. Periksa kembali atau gunakan fitur Lupa Kata Sandi.';
    }
    if (raw.includes('Email not confirmed')) {
      return 'Email Anda belum diverifikasi. Silakan buka kotak masuk email Anda (termasuk folder Spam) dan klik tautan verifikasi terlebih dahulu.';
    }
    if (raw.includes('User already registered')) {
      return 'Email ini sudah terdaftar. Silakan masuk menggunakan akun tersebut.';
    }
    if (raw.toLowerCase().includes('rate limit') || err?.status === 429) {
      return 'Terlalu banyak percobaan. Silakan tunggu beberapa saat sebelum mencoba lagi.';
    }
    return raw;
  };

  const switchMode = (nextMode: 'login' | 'daftar' | 'lupa') => {
    setMode(nextMode);
    setError('');
    setNotice('');
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!isSupabaseConfigured) {
      setError(
        supabaseConfigError ||
          'Konfigurasi Supabase belum tersedia. Hubungi pengelola untuk mengatur VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.'
      );
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Masukkan alamat email yang valid.');
      return;
    }

    if (mode === 'lupa') {
      setLoading(true);
      try {
        await authService.sendPasswordResetEmail(cleanEmail);
        setNotice(
          'Jika email tersebut terdaftar di DUITKU, tautan reset kata sandi telah dikirim. Silakan periksa kotak masuk maupun folder Spam Anda.'
        );
      } catch (err: any) {
        setError(mapAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'daftar' && !cleanName) {
      setError('Isi nama lengkap.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const result = await authService.signInWithEmail(cleanEmail, password);
        onSuccess(`Halo, ${result.user.displayName.split(' ')[0]}`);
      } else {
        const result = await authService.signUpWithEmail(cleanName, cleanEmail, password);
        if (result.requiresEmailConfirmation || !result.session) {
          setNotice(
            `Akun berhasil didaftarkan untuk ${cleanEmail}. Periksa kotak masuk email (termasuk folder Spam) dan klik tautan verifikasi sebelum masuk.`
          );
          setPassword('');
          setShowPassword(false);
          setMode('login');
          return;
        }
        onSuccess(`Selamat datang di DUITKU, ${result.user.displayName.split(' ')[0]}`);
      }
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setNotice('');

    if (!isSupabaseConfigured) {
      setError(
        supabaseConfigError ||
          'Konfigurasi Supabase belum tersedia. Login Google tidak dapat dilakukan.'
      );
      return;
    }

    setLoading(true);
    try {
      await authService.signInWithGoogle();
    } catch (err: any) {
      setError('Gagal masuk dengan Google: ' + (err?.message || 'Coba lagi nanti.'));
      setLoading(false);
    }
  };

  const heading =
    mode === 'daftar'
      ? 'Buat akun DUITKU'
      : mode === 'lupa'
      ? 'Lupa Kata Sandi'
      : 'Masuk ke DUITKU';

  return (
    <div id="auth">
      <div className="ax">
        <div className="al">
          <div>
            <h1>DUITKU</h1>
            <p>Catat, pantau, dan atur uangmu tanpa ribet.</p>
          </div>
          <div className="bk">
            <i />
            <i />
            <i />
          </div>
        </div>

        <div className="ar" id="af">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <h2>{heading}</h2>
            <em className={`bdg ${isSupabaseConfigured ? 'lm' : 'rd'}`}>
              {isSupabaseConfigured ? '● Supabase Auth' : '● Config Error'}
            </em>
          </div>

          {!isSupabaseConfigured && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'rgba(224, 97, 138, 0.12)',
                color: 'var(--neg)',
                fontSize: '13px',
                fontWeight: 600,
                lineHeight: 1.45,
              }}
            >
              {supabaseConfigError}
            </div>
          )}

          {mode !== 'lupa' && (
            <div className="chips">
              <button
                type="button"
                className={`chip ${mode === 'login' ? 'on' : ''}`}
                onClick={() => switchMode('login')}
              >
                Masuk
              </button>
              <button
                type="button"
                className={`chip ${mode === 'daftar' ? 'on' : ''}`}
                onClick={() => switchMode('daftar')}
              >
                Daftar
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="fm" style={{ gap: '14px' }}>
            {mode === 'lupa' && (
              <p className="mu">
                Masukkan email akun Anda. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi.
              </p>
            )}

            {mode === 'daftar' && (
              <label className="fld">
                Nama lengkap
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Nama lengkap Anda"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading || !isSupabaseConfigured}
                />
              </label>
            )}

            <label className="fld">
              Email
              <input
                type="email"
                autoComplete="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || !isSupabaseConfigured}
              />
            </label>

            {mode !== 'lupa' && (
              <div style={{ display: 'grid', gap: '6px' }}>
                <label className="fld">
                  Kata sandi
                  <div className="pw-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'daftar' ? 'new-password' : 'current-password'}
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading || !isSupabaseConfigured}
                    />
                    <button
                      type="button"
                      className="pw-eye"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                      aria-pressed={showPassword}
                      disabled={loading || !isSupabaseConfigured}
                    >
                      <Icon name={showPassword ? 'eyeoff' : 'eye'} />
                    </button>
                  </div>
                </label>

                {mode === 'login' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="auth-link"
                      onClick={() => switchMode('lupa')}
                      disabled={loading || !isSupabaseConfigured}
                    >
                      Lupa Kata Sandi?
                    </button>
                  </div>
                )}
              </div>
            )}

            {notice && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: 'rgba(211, 247, 95, 0.22)',
                  color: 'var(--ink)',
                  fontSize: '13px',
                  fontWeight: 600,
                  lineHeight: 1.45,
                }}
              >
                {notice}
              </div>
            )}

            {error ? (
              <p className="er" id="er">
                {error}
              </p>
            ) : (
              <p className="er" id="er" style={{ minHeight: '18px' }} />
            )}

            <button
              type="submit"
              className="btn lime"
              style={{ padding: '16px', width: '100%' }}
              disabled={loading || !isSupabaseConfigured}
            >
              <Icon name="check" />
              {loading
                ? 'Memproses...'
                : mode === 'daftar'
                ? 'Daftar sekarang'
                : mode === 'lupa'
                ? 'Kirim Tautan Reset'
                : 'Masuk'}
            </button>

            {mode === 'lupa' ? (
              <div style={{ textAlign: 'center', marginTop: '4px' }}>
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => switchMode('login')}
                  disabled={loading}
                >
                  Kembali ke halaman masuk
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn google"
                onClick={handleGoogleSignIn}
                disabled={loading || !isSupabaseConfigured}
                style={{
                  padding: '14px',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontWeight: 700,
                  borderRadius: '99px',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.98 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                Masuk dengan Google
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
