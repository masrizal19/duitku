import React, { useState } from 'react';
import { Account, Transaction, Bill, Debt, ViewPage } from '../../types';
import { Icon } from '../Icon';
import { rp, ini, catIc, dshort } from '../../utils/formatters';

interface DashboardViewProps {
  accounts: Account[];
  transactions: Transaction[];
  bills: Bill[];
  debts: Debt[];
  hideBalance: boolean;
  onToggleHide: () => void;
  onNavigate: (page: ViewPage) => void;
  onToggleBill: (billId: string) => void;
}

const TODAY = 12;

export const DashboardView: React.FC<DashboardViewProps> = ({
  accounts,
  transactions,
  bills,
  debts,
  hideBalance,
  onToggleHide,
  onNavigate,
  onToggleBill,
}) => {
  const [period, setPeriod] = useState<'Harian' | 'Mingguan' | 'Bulanan'>('Harian');
  const [selectedDay, setSelectedDay] = useState<number>(TODAY);

  // Perhitungan saldo aktual dari setiap akun: initial_balance + transaksi
  const getAccountBalance = (accId: string) => {
    const acc = accounts.find((a) => a.id === accId);
    if (!acc) return 0;
    const txSum = transactions
      .filter((t) => t.account_id === accId || t.wallet_id === accId)
      .reduce((sum, t) => sum + (t.type === 'in' ? t.amount : -t.amount), 0);
    return acc.initial_balance + txSum;
  };

  const totalBalance = accounts.reduce((sum, a) => sum + getAccountBalance(a.id), 0);

  // Perhitungan pengeluaran & pemasukan (transfer antar-dompet tidak dihitung sebagai pendapatan/pengeluaran)
  const totalIncome = transactions
    .filter((t) => t.type === 'in' && t.category_name !== 'Transfer')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'out' && t.category_name !== 'Transfer')
    .reduce((sum, t) => sum + t.amount, 0);

  // Period spend murni dari data aktual tanpa penambahan demo
  const getPeriodSpend = () => {
    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7);
    const dayStr = String(selectedDay).padStart(2, '0');

    if (period === 'Harian') {
      return transactions
        .filter((t) => t.type === 'out' && t.category_name !== 'Transfer' && (t.date.endsWith(`-${dayStr}`) || t.date.endsWith(`-${selectedDay}`)))
        .reduce((s, t) => s + t.amount, 0);
    }
    if (period === 'Mingguan') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const minDate = sevenDaysAgo.toISOString().split('T')[0];
      return transactions
        .filter((t) => t.type === 'out' && t.category_name !== 'Transfer' && (t.date >= minDate || t.date.includes('2026-11')))
        .reduce((s, t) => s + t.amount, 0);
    }
    // Bulanan
    return transactions
      .filter((t) => t.type === 'out' && t.category_name !== 'Transfer' && (t.date.startsWith(currentMonthPrefix) || t.date.includes('2026-11')))
      .reduce((s, t) => s + t.amount, 0);
  };

  const periodLabel = {
    Harian: 'Pengeluaran hari ini',
    Mingguan: 'Pengeluaran pekan ini',
    Bulanan: 'Pengeluaran bulan ini',
  }[period];

  const pendingBills = bills.filter((b) => !b.is_paid);
  const pendingBillsSum = pendingBills.reduce((s, b) => s + b.amount, 0);

  // Spark bars untuk 9 sampai 14 Nov
  const days = [9, 10, 11, 12, 13, 14];
  const daySpends = days.map((d) =>
    transactions
      .filter((t) => t.type === 'out' && (t.date.endsWith(`-${d}`) || t.date.includes(`11-${d}`)))
      .reduce((s, t) => s + t.amount, 0)
  );
  const maxSpend = Math.max(1, ...daySpends);

  // Agenda transaksi pada hari terpilih
  const agendaTxs = transactions.filter(
    (t) => t.date.endsWith(`-${selectedDay}`) || t.date.includes(`11-${selectedDay}`)
  );

  // Utang terdekat (maks 3)
  const sortedDebts = [...debts].sort((a, b) => Number(a.is_paid) - Number(b.is_paid)).slice(0, 3);

  // Kalender November 2026
  // 1 Nov 2026 adalah hari Minggu (index 0)
  const firstDayOffset = 6; // Senin berbasis 0..6
  const calendarCells = [];
  for (let i = 0; i < firstDayOffset; i++) {
    calendarCells.push(<b key={`empty-${i}`} />);
  }
  for (let d = 1; d <= 30; d++) {
    const inRange = d >= 9 && d <= 14;
    const isToday = d === TODAY;
    const isSelected = d === selectedDay;
    const hasTx = transactions.some((t) => t.date.endsWith(`-${d}`) || t.date.includes(`11-${d}`));

    calendarCells.push(
      <button
        key={`day-${d}`}
        className={`cd ${inRange ? 'rg' : ''} ${d === 9 ? 'rs' : ''} ${d === 14 ? 're' : ''} ${
          isToday ? 'td' : ''
        } ${isSelected ? 'sel' : ''}`}
        onClick={() => setSelectedDay(d)}
        aria-label={`${d} November`}
      >
        {d}
        {hasTx && <u />}
      </button>
    );
  }

  const getWalletName = (id?: string) => (id ? accounts.find((a) => a.id === id)?.name || '-' : '-');

  return (
    <div>
      <div className="ph rv">
        <div>
          <span className="kick">Dashboard pribadi</span>
          <h1>Ringkasan Keuangan</h1>
          <p>Semua uangmu, terbaca jelas dalam satu layar</p>
        </div>
        <div className="pr">
          <span className="live">Live sync</span>
          <div
            className="seg"
            style={{
              // @ts-ignore
              '--n': 3,
              '--p': ['Harian', 'Mingguan', 'Bulanan'].indexOf(period),
            }}
          >
            <i />
            {(['Harian', 'Mingguan', 'Bulanan'] as const).map((p) => (
              <button
                key={p}
                className={period === p ? 'on' : ''}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="dash">
        <div className="stack">
          {/* HERO SALDO */}
          <section className="hero rv">
            <div className="glow g1" />
            <div className="glow g2" />
            <div className="hrow">
              <span className="cap">Total saldo aktif</span>
              <button
                className="eye"
                onClick={onToggleHide}
                aria-label="Tampilkan atau sembunyikan saldo"
              >
                <Icon name={hideBalance ? 'eyeoff' : 'eye'} />
              </button>
            </div>
            <div className="big">{hideBalance ? 'Rp ••••••' : rp(totalBalance)}</div>
            <div className="hfoot">
              <div>
                <span className="cap sm">{periodLabel}</span>
                <div className="hv">
                  <Icon name="down" />
                  <span>{hideBalance ? 'Rp ••••••' : rp(getPeriodSpend())}</span>
                </div>
              </div>

              <div className="spark" title="Pengeluaran 9 sampai 14 Nov">
                {days.map((d, i) => (
                  <i
                    key={d}
                    className={d === TODAY ? 't' : ''}
                    style={{
                      // @ts-ignore
                      '--h': `${Math.max(10, (daySpends[i] / maxSpend) * 100)}%`,
                      animationDelay: `${i * 60}ms`,
                    }}
                  />
                ))}
              </div>

              <button
                className="btn lime"
                onClick={() => onNavigate('tambah')}
              >
                <Icon name="plus" />
                Tambah
              </button>
            </div>
          </section>

          {/* STATS MINI CARDS */}
          <div className="stats rv">
            <div className="mini">
              <div className="mi in">
                <Icon name="up2" />
              </div>
              <div>
                <small>Pemasukan</small>
                <b>{rp(totalIncome)}</b>
              </div>
            </div>

            <div className="mini">
              <div className="mi out">
                <Icon name="down2" />
              </div>
              <div>
                <small>Pengeluaran</small>
                <b>{rp(totalExpense)}</b>
              </div>
            </div>

            <div className="mini">
              <div className="mi pe">
                <Icon name="receipt" />
              </div>
              <div>
                <small>{pendingBills.length} tagihan tertunda</small>
                <b>{rp(pendingBillsSum)}</b>
              </div>
            </div>
          </div>

          {/* AGENDA TRANSAKSI */}
          <section className="card rv" id="agd">
            <div className="ch">
              <h3>
                Agenda {dshort(selectedDay)}, {selectedDay} Nov
              </h3>
              <span>
                {agendaTxs.length} transaksi{selectedDay === TODAY ? ' · hari ini' : ''}
              </span>
            </div>

            <div className="chips sc" style={{ marginBottom: '10px' }}>
              {days.map((d) => (
                <button
                  key={d}
                  className={`chip ${d === selectedDay ? 'on' : ''}`}
                  onClick={() => setSelectedDay(d)}
                >
                  {dshort(d)} {d}
                </button>
              ))}
            </div>

            {agendaTxs.length > 0 ? (
              agendaTxs.map((t) => (
                <div key={t.id} className="row nd">
                  <div className={`ico ${t.type === 'in' ? 'in' : ''}`}>
                    <Icon name={catIc(t.category_name)} />
                  </div>
                  <div className="rm">
                    <b>{t.title}</b>
                    <small>
                      {t.category_name} · {getWalletName(t.account_id)} · {t.time || '12:00'}
                    </small>
                  </div>
                  <div className={`amt ${t.type === 'in' ? 'in' : 'out'}`}>
                    {t.type === 'in' ? '+' : '-'}
                    {rp(t.amount)}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty">Tidak ada transaksi di hari ini.</div>
            )}
          </section>
        </div>

        <div className="stack">
          {/* KALENDER */}
          <section className="card rv">
            <div className="ch">
              <h3>November 2026</h3>
              <span>
                <Icon name="cal" />
              </span>
            </div>
            <div className="cal">
              {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
                <i key={day}>{day}</i>
              ))}
              {calendarCells}
            </div>
          </section>

          {/* DAFTAR TAGIHAN */}
          <section className="card rv">
            <div className="ch">
              <h3>Daftar Tagihan</h3>
              <span className="bdg" style={{ margin: 0 }}>
                {pendingBills.length} tertunda
              </span>
            </div>
            {bills.length > 0 ? (
              bills.map((b) => (
                <button
                  key={b.id}
                  className={`chk ${b.is_paid ? 'd' : ''}`}
                  onClick={() => onToggleBill(b.id)}
                >
                  <span className="o">{b.is_paid && <Icon name="check" />}</span>
                  <span>
                    <b>{b.title}</b>
                    <small>{b.is_paid ? 'Lunas terverifikasi' : `Jatuh tempo ${b.due_date}`}</small>
                  </span>
                  <span className="ca">{rp(b.amount)}</span>
                </button>
              ))
            ) : (
              <div className="empty">Belum ada tagihan.</div>
            )}
          </section>

          {/* UTANG & PIUTANG TERDEKAT */}
          <section className="card rv">
            <div className="ch">
              <h3>Utang &amp; Piutang Terdekat</h3>
              <button className="link" onClick={() => onNavigate('utang')}>
                Lihat semua
              </button>
            </div>
            {sortedDebts.length > 0 ? (
              sortedDebts.map((d) => (
                <div key={d.id} className="dbt">
                  <div className="l">
                    <div className={`ico ${d.type === 'utang' ? 'neg' : 'gr'}`}>
                      {ini(d.person)}
                    </div>
                    <div className="rm">
                      <b>
                        {d.person}
                        <em className={`bdg ${d.type === 'utang' ? 'rd' : 'lm'}`}>
                          {d.type === 'utang' ? 'Utang saya' : 'Piutang'}
                        </em>
                      </b>
                      <small>
                        {d.note} · {d.due_date}
                      </small>
                    </div>
                  </div>
                  <div
                    className={`amt ${d.is_paid ? '' : d.type === 'utang' ? 'out' : ''}`}
                    style={d.is_paid ? { textDecoration: 'line-through', opacity: 0.6 } : {}}
                  >
                    {rp(d.amount)}
                    {d.is_paid && <small>Lunas</small>}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty">Belum ada catatan.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
