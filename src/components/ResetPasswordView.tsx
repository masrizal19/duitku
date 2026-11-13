import React, { useEffect, useState } from 'react';
import { authService } from '../services/auth';
import { isSupabaseConfigured, supabase, supabaseConfigError } from '../lib/supabase';
import { Icon } from './Icon';

interface ResetPasswordViewProps {
  onBackToLogin: () => void;
  onToast: (msg: string) => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({
  onBackToLogin,
  onToast,
}) => {
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setCheckingSession(false);
      setHasRecoverySession(false);
      setError(
        supabaseConfigError ||
          'Konfigurasi Supabase tidak tersedia. Tidak dapat memproses pemulihan kata sandi.'
      );
      return;
    }

    const client = supabase;
    let active = true;
    let resolved = false;

    const verifySession = async () => {
      try {
        const { data, error: sessionErr } = await client.auth.getSession();
        if (!active) return;

        if (!sessionErr && data.session) {
          resolved = true;
          setHasRecoverySession(true);
          setCheckingSession(false);
        }
      } catch {
        // ditangani oleh timeout fallback
      }
    };

    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        resolved = true;
        setHasRecoverySession(true);
        setCheckingSession(false);
        setError('');
      }
    });

    verifySession();

    const fallbackTimer = setTimeout(() => {
      if (!active || resolved) return;
      setCheckingSession(false);
      setHasRecoverySession(false);
    }, 1800);

    return () => {
      active = false;
      clearTimeout(fallbackTimer);
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError('Kata sandi baru minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      await authService.updatePassword(newPassword);
      setSuccessMsg('Kata sandi berhasil diperbarui. Silakan masuk menggunakan kata sandi baru Anda.');
      setNewPassword('');
      setConfirmPassword('');
      onToast('Kata sandi berhasil diperbarui');

      try {
        await authService.signOut();
      } catch {
        // abaikan jika sesi sudah bersih
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memperbarui kata sandi. Silakan minta tautan baru.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth">
      <div className="ax">
        <div className="al">
          <div>
            <h1>DUITKU</h1>
            <p>Atur ulang kata sandi akun Anda dengan aman.</p>
          </div>
          <div className="bk">
            <i />
            <i />
            <i />
          </div>
        </div>

        <div className="ar" id="af">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <h2>Buat Kata Sandi Baru</h2>
            <em className={`bdg ${isSupabaseConfigured ? 'lm' : 'rd'}`}>
              {isSupabaseConfigured ? '● Supabase Auth' : '● Config Error'}
            </em>
          </div>

          {checkingSession ? (
            <p className="mu" style={{ padding: '12px 0' }}>
              Memverifikasi tautan pemulihan kata sandi dari Supabase...
            </p>
          ) : successMsg ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div
                style={{
                  padding: '14px',
                  borderRadius: '16px',
                  background: 'rgba(211, 247, 95, 0.22)',
                  color: 'var(--ink)',
                  fontSize: '14px',
                  fontWeight: 600,
                  lineHeight: 1.5,
                }}
              >
                {successMsg}
              </div>

              <button
                type="button"
                className="btn lime"
                style={{ padding: '16px', width: '100%' }}
                onClick={onBackToLogin}
              >
                <Icon name="check" />
                Masuk Sekarang
              </button>
            </div>
          ) : !hasRecoverySession ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              <p className="er">
                {error ||
                  'Tautan reset kata sandi tidak valid atau sudah kedaluwarsa. Silakan minta tautan reset yang baru.'}
              </p>
              <button
                type="button"
                className="btn lime"
                style={{ padding: '16px', width: '100%' }}
                onClick={onBackToLogin}
              >
                Kembali ke Halaman Masuk
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="fm" style={{ gap: '14px' }}>
              <p className="mu">
                Masukkan kata sandi baru minimal 6 karakter untuk akun Anda.
              </p>

              <label className="fld">
                Kata sandi baru
                <div className="pw-wrap">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="pw-eye"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={showNewPassword ? 'Sembunyikan kata sandi baru' : 'Lihat kata sandi baru'}
                    aria-pressed={showNewPassword}
                    disabled={loading}
                  >
                    <Icon name={showNewPassword ? 'eyeoff' : 'eye'} />
                  </button>
                </div>
              </label>

              <label className="fld">
                Konfirmasi kata sandi baru
                <div className="pw-wrap">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Ulangi kata sandi baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="pw-eye"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={
                      showConfirmPassword
                        ? 'Sembunyikan konfirmasi kata sandi'
                        : 'Lihat konfirmasi kata sandi'
                    }
                    aria-pressed={showConfirmPassword}
                    disabled={loading}
                  >
                    <Icon name={showConfirmPassword ? 'eyeoff' : 'eye'} />
                  </button>
                </div>
              </label>

              {error ? (
                <p className="er">{error}</p>
              ) : (
                <p className="er" style={{ minHeight: '18px' }} />
              )}

              <button
                type="submit"
                className="btn lime"
                style={{ padding: '16px', width: '100%' }}
                disabled={loading}
              >
                <Icon name="check" />
                {loading ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  className="auth-link"
                  onClick={onBackToLogin}
                  disabled={loading}
                >
                  Kembali ke halaman masuk
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
