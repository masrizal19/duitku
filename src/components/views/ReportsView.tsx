import React, { useState } from 'react';
import { Transaction, Account } from '../../types';
import { Icon } from '../Icon';
import { rp, exportTransactionsToCSV } from '../../utils/formatters';

interface ReportsViewProps {
  transactions: Transaction[];
  accounts: Account[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ transactions, accounts }) => {
  const [reportPeriod, setReportPeriod] = useState<'Harian' | 'Mingguan' | 'Bulanan' | 'Tahunan'>('Bulanan');

  // Filter transaksi berdasarkan reportPeriod
  const filterTransactions = () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonthPrefix = now.toISOString().slice(0, 7);
    const currentYear = String(now.getFullYear());

    if (reportPeriod === 'Harian') {
      return transactions.filter(
        (t) => t.date === todayStr || t.date.endsWith('-12') || t.date === '2026-11-12'
      );
    }
    if (reportPeriod === 'Mingguan') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const minDate = sevenDaysAgo.toISOString().split('T')[0];
      return transactions.filter((t) => {
        const d = parseInt(t.date.split('-')[2] || '0', 10);
        return (d >= 9 && d <= 14) || t.date >= minDate;
      });
    }
    if (reportPeriod === 'Bulanan') {
      return transactions.filter(
        (t) => t.date.startsWith(currentMonthPrefix) || t.date.includes('2026-11')
      );
    }
    // Tahunan
    return transactions.filter((t) => t.date.startsWith(currentYear) || t.date.startsWith('2026'));
  };

  const periodTxs = filterTransactions();

  // Hitung total pemasukan & pengeluaran (tanpa menghitung transfer antar-dompet)
  const totalIncome = periodTxs
    .filter((t) => t.type === 'in' && t.category_name !== 'Transfer')
    .reduce((s, t) => s + t.amount, 0);

  const totalExpense = periodTxs
    .filter((t) => t.type === 'out' && t.category_name !== 'Transfer')
    .reduce((s, t) => s + t.amount, 0);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  // Bar chart data 6 bulan terakhir dihitung dari transaksi database aktual
  const monthKeys = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
  const months = ['Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov'];
  const histIncome = monthKeys.map((mk) =>
    transactions
      .filter((t) => t.date.startsWith(mk) && t.type === 'in' && t.category_name !== 'Transfer')
      .reduce((s, t) => s + t.amount, 0) / 1e6
  );
  const histExpense = monthKeys.map((mk) =>
    transactions
      .filter((t) => t.date.startsWith(mk) && t.type === 'out' && t.category_name !== 'Transfer')
      .reduce((s, t) => s + t.amount, 0) / 1e6
  );
  const maxVal = Math.max(1, ...histIncome, ...histExpense);
  const chartHeight = 160;

  // Donut chart per kategori pengeluaran (tidak memasukkan transfer antar-dompet)
  const expenseByCategory: Record<string, number> = {};
  periodTxs
    .filter((t) => t.type === 'out' && t.category_name !== 'Transfer')
    .forEach((t) => {
      expenseByCategory[t.category_name] = (expenseByCategory[t.category_name] || 0) + t.amount;
    });

  const categoryEntries = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
  const totalCatExpense = categoryEntries.reduce((s, [, v]) => s + v, 0);
  const palette = ['#8c89c2', '#d3f75f', '#3a2a5c', '#e0618a', '#b9b5e0', '#a9a6d8'];

  let accumulated = 0;
  const gradientStops = totalCatExpense
    ? categoryEntries
        .map(([, val], idx) => {
          const startPct = (accumulated / totalCatExpense) * 100;
          accumulated += val;
          const endPct = (accumulated / totalCatExpense) * 100;
          return `${palette[idx % palette.length]} ${startPct}% ${endPct}%`;
        })
        .join(',')
    : 'var(--gh) 0 100%';

  return (
    <div>
      <div className="ph rv">
        <div>
          <h1>Laporan</h1>
          <p>Pemasukan dan pengeluaran keuangan Anda</p>
        </div>
        <div className="pr">
          {/* FILTER PERIODE LAPORAN */}
          <div
            className="seg"
            style={{
              // @ts-ignore
              '--n': 4,
              '--p': ['Harian', 'Mingguan', 'Bulanan', 'Tahunan'].indexOf(reportPeriod),
            }}
          >
            <i />
            {(['Harian', 'Mingguan', 'Bulanan', 'Tahunan'] as const).map((p) => (
              <button
                key={p}
                className={reportPeriod === p ? 'on' : ''}
                onClick={() => setReportPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            className="btn ghost"
            onClick={() => exportTransactionsToCSV(periodTxs, accounts)}
          >
            <Icon name="download" />
            Export CSV
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="sum rv">
        <div>
          <small>Pemasukan {reportPeriod.toLowerCase()}</small>
          <b>{rp(totalIncome)}</b>
        </div>
        <div>
          <small>Pengeluaran {reportPeriod.toLowerCase()}</small>
          <b>{rp(totalExpense)}</b>
        </div>
        <div className="acc">
          <small>Selisih · tabungan {savingsRate}%</small>
          <b>{rp(netSavings)}</b>
        </div>
      </div>

      {/* TWO CHARTS */}
      <div className="two">
        {/* ARUS KAS BAR CHART */}
        <div className="card rv">
          <div className="ch">
            <h3>Arus kas (juta rupiah)</h3>
            <span>
              <b style={{ color: '#9bbf1f' }}>●</b> masuk &nbsp;
              <b style={{ color: 'var(--c4)' }}>●</b> keluar
            </span>
          </div>

          <svg viewBox="0 0 600 226" style={{ width: '100%', overflow: 'visible' }}>
            {[0, 1, 2, 3].map((i) => (
              <line
                key={i}
                x1="10"
                x2="590"
                y1={30 + i * 53.3}
                y2={30 + i * 53.3}
                stroke="var(--line)"
                strokeWidth="1"
              />
            ))}

            {months.map((mName, idx) => {
              const xPos = 36 + idx * 93;
              const hIncome = (histIncome[idx] / maxVal) * chartHeight;
              const hExpense = (histExpense[idx] / maxVal) * chartHeight;

              return (
                <g key={mName}>
                  <rect
                    className="bar2"
                    style={{ animationDelay: `${idx * 70}ms` }}
                    x={xPos}
                    y={190 - hIncome}
                    width={28}
                    height={hIncome}
                    rx={10}
                    fill="#d3f75f"
                  />
                  <rect
                    className="bar2"
                    style={{ animationDelay: `${idx * 70 + 40}ms` }}
                    x={xPos + 34}
                    y={190 - hExpense}
                    width={28}
                    height={hExpense}
                    rx={10}
                    fill="var(--c4)"
                  />
                  <text
                    x={xPos + 31}
                    y={214}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight={700}
                    fill="var(--mut)"
                  >
                    {mName}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* PENGELUARAN PER KATEGORI DONUT */}
        <div className="card rv">
          <div className="ch">
            <h3>Pengeluaran per kategori</h3>
          </div>

          {totalCatExpense > 0 ? (
            <div className="don">
              <div
                className="donut"
                style={{
                  background: `conic-gradient(${gradientStops})`,
                }}
              >
                <div>
                  <span>
                    <b>{rp(totalCatExpense)}</b>
                    total
                  </span>
                </div>
              </div>

              <div className="lgd">
                {categoryEntries.map(([cName, cVal], idx) => (
                  <div key={cName}>
                    <i style={{ background: palette[idx % palette.length] }} />
                    {cName}
                    <span>{Math.round((cVal / totalCatExpense) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty">Belum ada pengeluaran di periode ini.</div>
          )}
        </div>
      </div>
    </div>
  );
};
