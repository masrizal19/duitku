// DUITKU - Helper formatters & CSV Exporter

import { CI, MONTH_NAMES } from './constants';
import { Account, Transaction } from '../types';

export const rp = (n: number): string => {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
};

export const num = (s: string | number): number => {
  if (typeof s === 'number') return s;
  return parseInt(String(s).replace(/\D/g, ''), 10) || 0;
};

export const ini = (n: string): string => {
  return (
    n
      .trim()
      .split(/\s+/)
      .map((x) => x[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
};

export const catIc = (name: string): string => {
  return CI[name] || 'tag';
};

export const wIcon = (type: string): string => {
  return type === 'Bank' ? 'bank' : type === 'E-Wallet' ? 'phone' : 'cash';
};

export const esc = (s: string): string => {
  return String(s).replace(/[&<>"']/g, (c) => '&#' + c.charCodeAt(0) + ';');
};

export const dlong = (dayOrIso: number | string): string => {
  if (typeof dayOrIso === 'number') {
    return new Date(2026, 10, dayOrIso).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  }
  const d = new Date(dayOrIso);
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
};

export const dshort = (day: number): string => {
  return ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][new Date(2026, 10, day).getDay()];
};

export const fmtDue = (isoDate: string): string => {
  if (!isoDate) return '-';
  const d = new Date(isoDate + 'T00:00');
  if (isNaN(d.getTime())) return isoDate;
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
};

// Export transactions to CSV
export function exportTransactionsToCSV(transactions: Transaction[], accounts: Account[]) {
  const getWalletName = (id?: string) => (id ? accounts.find((a) => a.id === id)?.name || id : '-');

  const headers = ['ID', 'Tanggal', 'Waktu', 'Keterangan', 'Kategori', 'Tipe', 'Nominal (IDR)', 'Dompet/Akun'];
  const rows = transactions.map((t) => [
    t.id,
    t.date,
    t.time || '12:00',
    `"${(t.title || '').replace(/"/g, '""')}"`,
    `"${t.category_name}"`,
    t.type === 'in' ? 'Pemasukan' : 'Pengeluaran',
    t.amount,
    `"${getWalletName(t.account_id)}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `DUITKU_Laporan_Transaksi_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
