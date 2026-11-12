import React, { useState, useRef, useEffect } from 'react';
import { Profile, UserSettings, DatabaseStatus } from '../../types';
import { Icon } from '../Icon';
import { ini } from '../../utils/formatters';
import { dbService } from '../../services/db';

interface SettingsViewProps {
  profile: Profile | null;
  onUpdateName: (name: string) => void;
  onUpdateAvatar: (avatar: string | null) => void;
  onUpdateSettings: (settings: UserSettings) => void;
  onLogout: () => void;
  onToast: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  onUpdateName,
  onUpdateAvatar,
  onUpdateSettings,
  onLogout,
  onToast,
}) => {
  const [name, setName] = useState(profile?.name || '');
  const [isSaved, setIsSaved] = useState(false);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus>({
    isConfigured: false,
    isConnected: false,
    message: 'Memeriksa status koneksi Supabase...',
  });
  const [isCheckingDb, setIsCheckingDb] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const settings = profile?.settings || { notif: 1, kunci: 0, ringkas: 1, tgt: 1 };

  const checkConnection = async () => {
    setIsCheckingDb(true);
    try {
      const status = await dbService.getConnectionStatus();
      setDbStatus(status);
      if (status.isConnected) {
        onToast('Supabase PostgreSQL terhubung!');
      } else {
        onToast(status.message);
      }
    } catch (err: any) {
      setDbStatus({
        isConfigured: false,
        isConnected: false,
        message: err.message || 'Koneksi gagal',
        lastChecked: new Date().toLocaleTimeString('id-ID'),
      });
    } finally {
      setIsCheckingDb(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleToggle = (key: keyof UserSettings) => {
    const newSettings = { ...settings, [key]: settings[key] ? 0 : 1 };
    onUpdateSettings(newSettings);
    onToast('Preferensi diperbarui');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          ctx.drawImage(
            img,
            (img.width - minDim) / 2,
            (img.height - minDim) / 2,
            minDim,
            minDim,
            0,
            0,
            256,
            256
          );
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          onUpdateAvatar(dataUrl);
          onToast('Foto profil diperbarui');
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      onToast('Nama tidak boleh kosong');
      return;
    }
    onUpdateName(cleanName);
    setIsSaved(true);
    onToast('Profil berhasil disimpan');
    setTimeout(() => setIsSaved(false), 2000);
  };

  const prefRows: Array<[keyof UserSettings, string, string, string]> = [
    ['notif', 'Pengingat tagihan', 'Pengingat otomatis sehari sebelum jatuh tempo', 'bell'],
    ['kunci', 'Kunci aplikasi', 'Minta PIN saat membuka DUITKU', 'shield'],
    ['ringkas', 'Ringkasan mingguan', 'Tampilkan rekap pengeluaran tiap pekan', 'note'],
    ['tgt', 'Target tabungan', 'Tampilkan progres di dashboard', 'target'],
  ];

  const initials = profile?.name ? ini(profile.name) : '?';

  return (
    <div>
      <div className="ph rv">
        <div>
          <h1>Pengaturan</h1>
          <p>Sesuaikan DUITKU dan pantau koneksi database Supabase</p>
        </div>
      </div>

      <div className="two">
        {/* CARD PROFIL */}
        <div className="card rv">
          <div className="ch">
            <h3>Profil Pengguna</h3>
            <em className="bdg" style={{ margin: 0 }}>
              Personal
            </em>
          </div>

          <div className="prof">
            <div
              className="av xl"
              style={profile?.avatar ? { backgroundImage: `url(${profile.avatar})` } : {}}
            >
              {profile?.avatar ? '' : initials}
            </div>

            <div className="chips">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                hidden
              />
              <button
                type="button"
                className="chip"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="camera" />
                Ganti foto
              </button>
              {profile?.avatar && (
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    onUpdateAvatar(null);
                    onToast('Foto profil dihapus');
                  }}
                  style={{ color: 'var(--neg)' }}
                >
                  <Icon name="trash" />
                  Hapus foto
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="fm">
            <label className="fld">
              <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                Nama lengkap
                <span id="cc">{name.length} / 40</span>
              </span>
              <input
                id="pn"
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label className="fld">
              <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                Email terdaftar
                <span>
                  <Icon name="lock" />
                </span>
              </span>
              <input value={profile?.email || '-'} readOnly />
            </label>

            <button
              type="submit"
              className="btn"
              id="spb"
              style={{
                padding: '16px',
                background: isSaved ? 'var(--lime)' : undefined,
                color: isSaved ? '#2e2150' : undefined,
              }}
            >
              <Icon name="check" />
              {isSaved ? 'Tersimpan rapi' : 'Simpan profil'}
            </button>
          </form>
        </div>

        {/* CARD PREFERENSI & KONEKSI SUPABASE */}
        <div className="card rv">
          <div className="ch">
            <h3>Status Database Supabase</h3>
            <em className={`bdg ${dbStatus.isConnected ? 'lm' : 'rd'}`} style={{ margin: 0 }}>
              {dbStatus.isConnected ? '● Terhubung' : '● Belum Aktif'}
            </em>
          </div>

          {/* STATUS KONEKSI SUPABASE DETAIL */}
          <div
            style={{
              padding: '16px',
              borderRadius: '20px',
              background: 'var(--gh)',
              display: 'grid',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b>Koneksi PostgreSQL:</b>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--mut)' }}>
                  {dbStatus.message}
                </p>
              </div>
              <button
                type="button"
                className="chip on"
                onClick={checkConnection}
                disabled={isCheckingDb}
                style={{ flexShrink: 0 }}
              >
                <Icon name="history" />
                {isCheckingDb ? 'Memeriksa...' : 'Cek Ulang'}
              </button>
            </div>

            {dbStatus.lastChecked && (
              <small style={{ color: 'var(--mut)', fontSize: '11px' }}>
                Pemeriksaan terakhir: {dbStatus.lastChecked}
              </small>
            )}

            {!dbStatus.isConnected && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--ink)',
                  background: 'var(--ct)',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  lineHeight: '1.4',
                }}
              >
                💡 <strong>Panduan Setup:</strong> Isi <code>VITE_SUPABASE_URL</code> dan{' '}
                <code>VITE_SUPABASE_ANON_KEY</code> pada file <code>.env</code>, lalu jalankan query dari{' '}
                <code>supabase/schema.sql</code> di Supabase SQL Editor.
              </div>
            )}
          </div>

          <div className="ch" style={{ marginTop: '10px' }}>
            <h3>Preferensi Aplikasi</h3>
          </div>

          {prefRows.map(([key, title, subtitle, iconName]) => {
            const isChecked = Boolean(settings[key]);
            return (
              <div key={key} className="tg">
                <div>
                  <span className="mi">
                    <Icon name={iconName} />
                  </span>
                  <div>
                    <b>{title}</b>
                    <small>{subtitle}</small>
                  </div>
                </div>

                <button
                  className={`sw ${isChecked ? 'on' : ''}`}
                  role="switch"
                  aria-checked={isChecked}
                  onClick={() => handleToggle(key)}
                  aria-label={title}
                />
              </div>
            );
          })}

          <div className="lang">
            <div>
              Bahasa antarmuka
              <small>Bahasa sistem aplikasi</small>
            </div>
            <span className="chip on">Indonesia (ID)</span>
          </div>

          <button className="lo" onClick={onLogout}>
            <Icon name="out" />
            Keluar dari akun
          </button>

          <div className="ver">DUITKU Web v2.4.0 — Supabase Edition</div>
        </div>
      </div>
    </div>
  );
};
