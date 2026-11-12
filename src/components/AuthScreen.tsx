import React, { useState } from 'react';
import { authService } from '../services/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import { Icon } from './Icon';

interface AuthScreenProps {
  onSuccess: (toastMsg: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'daftar'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Isi email dan kata sandi.');
      return;
    }

    if (mode === 'daftar' && !name.trim()) {
      setError('Isi nama lengkap.');
      return;
    }

    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const u = await authService.signInWithEmail(cleanEmail, password);
        onSuccess(`Halo, ${u.displayName.split(' ')[0]}`);
      } else {
        const u = await authService.signUpWithEmail(name, cleanEmail, password);
        onSuccess(`Selamat datang di DUITKU, ${u.displayName.split(' ')[0]}`);
      }
    } catch (err: any) {
      let msg = err.message || 'Terjadi kesalahan saat masuk.';
      if (msg.includes('Invalid login credentials')) {
        msg = 'Email atau kata sandi tidak cocok. Belum punya akun? Pilih Daftar.';
      } else if (msg.includes('User already registered')) {
        msg = 'Email ini sudah terdaftar. Silakan masuk.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await authService.signInWithGoogle();
      onSuccess('Mengarahkan ke Google Sign-In...');
    } catch (err: any) {
      console.error(err);
      setError('Gagal masuk dengan Google: ' + (err.message || 'Coba lagi nanti.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('demo@duitku.id');
    setPassword('demo1234');
    setError('');
  };

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>{mode === 'daftar' ? 'Buat akun DUITKU' : 'Masuk ke DUITKU'}</h2>
            <em className={`bdg ${isSupabaseConfigured ? 'lm' : ''}`}>
              {isSupabaseConfigured ? '● Supabase Active' : '● Demo Mode'}
            </em>
          </div>

          <div className="chips">
            <button
              type="button"
              className={`chip ${mode === 'login' ? 'on' : ''}`}
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              Masuk
            </button>
            <button
              type="button"
              className={`chip ${mode === 'daftar' ? 'on' : ''}`}
              onClick={() => {
                setMode('daftar');
                setError('');
              }}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="fm" style={{ gap: '14px' }}>
            {mode === 'daftar' && (
              <label className="fld">
                Nama lengkap
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Nama lengkap Anda"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
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
                disabled={loading}
              />
            </label>

            <label className="fld">
              Kata sandi
              <input
                type="password"
                autoComplete={mode === 'daftar' ? 'new-password' : 'current-password'}
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </label>

            {error ? <p className="er" id="er">{error}</p> : <p className="er" id="er" style={{ minHeight: '18px' }} />}

            <button
              type="submit"
              className="btn lime"
              style={{ padding: '16px', width: '100%' }}
              disabled={loading}
            >
              <Icon name="check" />
              {loading ? 'Memproses...' : mode === 'daftar' ? 'Daftar sekarang' : 'Masuk'}
            </button>

            {/* Google Sign In asli */}
            <button
              type="button"
              className="btn google"
              onClick={handleGoogleSignIn}
              disabled={loading}
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
          </form>

          {mode === 'login' && (
            <p className="mu" style={{ cursor: 'pointer', textAlign: 'center', marginTop: '6px' }} onClick={handleDemoFill}>
              Coba akun demo: <strong style={{ textDecoration: 'underline' }}>demo@duitku.id</strong>, kata sandi <strong style={{ textDecoration: 'underline' }}>demo1234</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
