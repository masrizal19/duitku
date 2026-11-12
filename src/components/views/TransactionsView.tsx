import React, { useState } from 'react';
import { Account, Transaction, ViewPage } from '../../types';
import { Icon } from '../Icon';
import { rp, ini, dlong, exportTransactionsToCSV } from '../../utils/formatters';

interface TransactionsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  onNavigate: (page: ViewPage) => void;
  onDeleteTransaction: (id: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  accounts,
  onNavigate,
  onDeleteTransaction,
}) => {
  const [filterType, setFilterType] = useState<'Semua' | 'Masuk' | 'Keluar'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const getWalletName = (id?: string) => (id ? accounts.find((a) => a.id === id)?.name || '-' : '-');

  // Perhitungan ringkasan (tanpa menghitung transfer antar dompet sebagai pendapatan atau pengeluaran)
  const totalIn = transactions.filter((t) => t.type === 'in' && t.category_name !== 'Transfer').reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter((t) => t.type === 'out' && t.category_name !== 'Transfer').reduce((s, t) => s + t.amount, 0);
  const scheduledTxs = transactions.filter((t) => new Date(t.date) > new Date('2026-11-12'));
  const scheduledSum = scheduledTxs.reduce((s, t) => s + (t.type === 'in' ? t.amount : -t.amount), 0);

  // Filter transaksi
  const filtered = transactions.filter((t) => {
    const matchesFilter =
      filterType === 'Semua' ||
      (filterType === 'Masuk' && t.type === 'in') ||
      (filterType === 'Keluar' && t.type === 'out');

    const wName = getWalletName(t.account_id);
    const searchTarget = `${t.title} ${t.category_name} ${wName}`.toLowerCase();
    const matchesSearch = !searchQuery || searchTarget.includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Sort by date desc and time desc
  const sorted = [...filtered].sort((a, b) => {
    const dateComp = b.date.localeCompare(a.date);
    if (dateComp !== 0) return dateComp;
    return (b.time || '').localeCompare(a.time || '');
  });

  // Group by date
  const grouped: Record<string, Transaction[]> = {};
  sorted.forEach((t) => {
    if (!grouped[t.date]) grouped[t.date] = [];
    grouped[t.date].push(t);
  });

  const countSemua = transactions.length;
  const countMasuk = transactions.filter((t) => t.type === 'in').length;
  const countKeluar = transactions.filter((t) => t.type === 'out').length;

  return (
    <div>
      <div className="ph rv">
        <div>
          <h1>Transaksi</h1>
          <p>Riwayat uang masuk dan keluar</p>
        </div>
        <div className="pr">
          <label className="fld" style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--mut)' }}>
              <Icon name="search" />
            </span>
            <input
              id="sq"
              placeholder="Cari transaksi"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '46px', width: '220px' }}
            />
          </label>

          <button
            className="btn ghost"
            onClick={() => exportTransactionsToCSV(transactions, accounts)}
            title="Download CSV"
          >
            <Icon name="download" />
            Export CSV
          </button>

          <button className="btn lime" onClick={() => onNavigate('tambah')}>
            <Icon name="plus" />
            Tambah Transaksi
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="stats rv" style={{ marginBottom: '20px' }}>
        <div className="mini">
          <div className="mi in">
            <Icon name="up2" />
          </div>
          <div>
            <small>Total masuk</small>
            <b style={{ color: 'var(--in)' }}>+{rp(totalIn)}</b>
          </div>
        </div>

        <div className="mini">
          <div className="mi out">
            <Icon name="down2" />
          </div>
          <div>
            <small>Total keluar</small>
            <b>-{rp(totalOut)}</b>
          </div>
        </div>

        <div className="mini">
          <div className="mi pe">
            <Icon name="cal" />
          </div>
          <div>
            <small>{scheduledTxs.length} terjadwal</small>
            <b>{rp(scheduledSum)}</b>
          </div>
        </div>
      </div>

      {/* TRANSACTIONS CARD */}
      <div className="card rv">
        <div className="chips" id="fch" style={{ marginBottom: '14px' }}>
          <button
            className={`chip ${filterType === 'Semua' ? 'on' : ''}`}
            onClick={() => setFilterType('Semua')}
          >
            Semua
            <span className="n">{countSemua}</span>
          </button>
          <button
            className={`chip ${filterType === 'Masuk' ? 'on' : ''}`}
            onClick={() => setFilterType('Masuk')}
          >
            <Icon name="down" />
            Masuk
            <span className="n">{countMasuk}</span>
          </button>
          <button
            className={`chip ${filterType === 'Keluar' ? 'on' : ''}`}
            onClick={() => setFilterType('Keluar')}
          >
            <Icon name="up" />
            Keluar
            <span className="n">{countKeluar}</span>
          </button>
        </div>

        <div id="txl">
          {Object.keys(grouped).length > 0 ? (
            Object.entries(grouped).map(([dateStr, items]) => {
              const isToday = dateStr.endsWith('-12') || dateStr === '2026-11-12';
              const isFuture = new Date(dateStr) > new Date('2026-11-12');

              return (
                <div key={dateStr}>
                  <div className="dg">
                    {dlong(dateStr)}
                    {isToday && <em className="bdg lm">Hari ini</em>}
                    {isFuture && <em className="bdg">Terjadwal</em>}
                  </div>

                  {items.map((t) => (
                    <div key={t.id} className="row">
                      <div className={`ico ${t.type === 'in' ? 'in' : ''}`}>{ini(t.title)}</div>
                      <div className="rm">
                        <b>
                          {t.title}
                          {isFuture && <em className="bdg">Terjadwal</em>}
                        </b>
                        <small>
                          {t.category_name} · {getWalletName(t.account_id)} · {t.date} {t.time || ''}
                        </small>
                      </div>
                      <div className={`amt ${t.type === 'in' ? 'in' : 'out'}`}>
                        {t.type === 'in' ? '+' : '-'}
                        {rp(t.amount)}
                      </div>
                      <button
                        className="del"
                        onClick={() => onDeleteTransaction(t.id)}
                        aria-label="Hapus transaksi"
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })
          ) : (
            <div className="empty">Tidak ada transaksi yang cocok.</div>
          )}
        </div>
      </div>
    </div>
  );
};
