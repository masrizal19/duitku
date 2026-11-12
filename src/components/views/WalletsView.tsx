import React, { useState } from 'react';
import { Account, Transaction, ViewPage } from '../../types';
import { Icon } from '../Icon';
import { rp, num, wIcon } from '../../utils/formatters';
import { BANKS } from '../../utils/constants';

interface WalletsViewProps {
  accounts: Account[];
  transactions: Transaction[];
  hideBalance: boolean;
  onToggleHide: () => void;
  onNavigate: (page: ViewPage) => void;
  onAddWallet: (wallet: { name: string; type: 'Bank' | 'E-Wallet' | 'Tunai'; note: string; initial_balance: number }) => void;
  onSetPriority: (id: string) => void;
  onDeleteWallet: (id: string) => void;
  onTransfer: (fromId: string, toId: string, amount: number) => void;
  onQuickIncome: (walletId: string) => void;
}

export const WalletsView: React.FC<WalletsViewProps> = ({
  accounts,
  transactions,
  hideBalance,
  onToggleHide,
  onNavigate,
  onAddWallet,
  onSetPriority,
  onDeleteWallet,
  onTransfer,
  onQuickIncome,
}) => {
  const [walletFilter, setWalletFilter] = useState<'Semua' | 'Bank' | 'E-Wallet' | 'Tunai'>('Semua');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [activeMenuWalletId, setActiveMenuWalletId] = useState<string | null>(null);

  // Form states for Add Wallet
  const [selectedBankIdx, setSelectedBankIdx] = useState(0);
  const [customName, setCustomName] = useState('');
  const [initialBalanceStr, setInitialBalanceStr] = useState('');

  // Form states for Transfer
  const [transferFromId, setTransferFromId] = useState(accounts[0]?.id || '');
  const [transferToId, setTransferToId] = useState(accounts[1]?.id || '');
  const [transferAmountStr, setTransferAmountStr] = useState('');
  const [transferError, setTransferError] = useState('');

  React.useEffect(() => {
    if ((!transferFromId || !accounts.some((a) => a.id === transferFromId)) && accounts.length > 0) {
      setTransferFromId(accounts[0].id);
    }
    if ((!transferToId || !accounts.some((a) => a.id === transferToId)) && accounts.length > 1) {
      setTransferToId(accounts[1].id);
    } else if (!transferToId && accounts.length > 0) {
      setTransferToId(accounts[0].id);
    }
  }, [accounts, transferFromId, transferToId]);

  // Perhitungan saldo tiap akun
  const getAccountBalance = (accId: string) => {
    const acc = accounts.find((a) => a.id === accId);
    if (!acc) return 0;
    const txSum = transactions
      .filter((t) => t.account_id === accId || t.wallet_id === accId)
      .reduce((sum, t) => sum + (t.type === 'in' ? t.amount : -t.amount), 0);
    return acc.initial_balance + txSum;
  };

  const totalBalance = accounts.reduce((sum, a) => sum + getAccountBalance(a.id), 0);

  // Filter accounts
  const filteredAccounts = accounts.filter(
    (w) => walletFilter === 'Semua' || w.type === walletFilter
  );

  // Top wallet for allocation insight
  const sortedByBal = [...accounts].sort((a, b) => getAccountBalance(b.id) - getAccountBalance(a.id));
  const topWallet = sortedByBal[0];
  const topShare = totalBalance > 0 && topWallet ? Math.round((getAccountBalance(topWallet.id) / totalBalance) * 100) : 0;

  // Handlers
  const handleSaveWallet = (e: React.FormEvent) => {
    e.preventDefault();
    const bankItem = BANKS[selectedBankIdx];
    const name = customName.trim() || bankItem[0];
    const initial_balance = num(initialBalanceStr);
    const note =
      bankItem[1] === 'Bank'
        ? `•••• ${Math.floor(1000 + Math.random() * 9000)}`
        : bankItem[1] === 'E-Wallet'
        ? 'Dompet digital'
        : 'Uang saku';

    onAddWallet({
      name,
      type: bankItem[1],
      note,
      initial_balance,
    });

    setShowAddModal(false);
    setCustomName('');
    setInitialBalanceStr('');
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');
    if (transferFromId === transferToId) {
      setTransferError('Pilih dua akun yang berbeda.');
      return;
    }
    const amt = num(transferAmountStr);
    if (!amt) {
      setTransferError('Isi nominal transfer.');
      return;
    }
    const fromBal = getAccountBalance(transferFromId);
    if (amt > fromBal) {
      setTransferError('Saldo akun asal tidak cukup.');
      return;
    }

    onTransfer(transferFromId, transferToId, amt);
    setShowTransferModal(false);
    setTransferAmountStr('');
  };

  return (
    <div>
      <div className="ph rv">
        <div>
          <h1>Dompet Saya</h1>
          <p>Saldo semua akun dalam satu tempat</p>
        </div>
      </div>

      {/* HERO DOMPET */}
      <section className="hero dk rv">
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
          <div className="hbtns">
            <span className="pill-g">
              <Icon name="up2" /> +4,2% bln ini
            </span>
            <span className="cap sm">{accounts.length} akun terhubung</span>
          </div>
          <div className="hbtns">
            <button className="btn lime" onClick={() => setShowTransferModal(true)}>
              <Icon name="swap" />
              Transfer antar akun
            </button>
            <button
              className="btn ghost"
              onClick={() => onNavigate('transaksi')}
              aria-label="Riwayat mutasi"
              style={{ padding: '13px 16px' }}
            >
              <Icon name="history" />
            </button>
          </div>
        </div>
      </section>

      {/* CHIPS FILTER */}
      <div className="ch rv" style={{ margin: '26px 0 12px' }}>
        <h3>Daftar Rekening &amp; Dompet</h3>
        <div className="chips sc" id="wfc">
          {(['Semua', 'Bank', 'E-Wallet', 'Tunai'] as const).map((filter) => {
            const count =
              filter === 'Semua'
                ? accounts.length
                : accounts.filter((w) => w.type === filter).length;
            return (
              <button
                key={filter}
                className={`chip ${walletFilter === filter ? 'on' : ''}`}
                onClick={() => setWalletFilter(filter)}
              >
                {filter} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* GRID KARTU DOMPET */}
      <div className="wgrid" id="wg">
        {filteredAccounts.map((w, i) => {
          const bal = getAccountBalance(w.id);
          const cardClass = w.is_priority ? 'lm' : i % 2 ? 'c2' : 'c1';

          return (
            <div key={w.id} className={`wc ${cardClass} rv`}>
              <div className="wt">
                <div className="wi">
                  <Icon name={wIcon(w.type)} />
                </div>
                <div>
                  <div className="wn">
                    <b>{w.name}</b>
                    <em className="bdg">{w.type}</em>
                  </div>
                  <small>{w.note || ''}</small>
                </div>
                {w.is_priority && <em className="pri">Prioritas</em>}
                <button
                  className="mb2"
                  onClick={() => setActiveMenuWalletId(w.id)}
                  aria-label={`Opsi ${w.name}`}
                >
                  <Icon name="dots" />
                </button>
              </div>

              <div className="wb">
                <div>
                  <span className="cap sm">Saldo tersedia</span>
                  <div className="wv">{hideBalance ? 'Rp ••••••' : rp(bal)}</div>
                </div>
                <button className="btn wbtn" onClick={() => onQuickIncome(w.id)}>
                  <Icon name="plus" />
                  Pendapatan
                </button>
              </div>
            </div>
          );
        })}

        <button className="addw rv" onClick={() => setShowAddModal(true)}>
          <span className="circ">
            <Icon name="plus" />
          </span>
          Tambah dompet baru
        </button>
      </div>

      {/* INSIGHT ALOKASI */}
      {topWallet && (
        <div className="insight rv">
          <div
            className="mi pe"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '15px',
              display: 'grid',
              placeItems: 'center',
              background: 'var(--c3)',
              color: '#2e2150',
            }}
          >
            <Icon name="target" />
          </div>
          <div>
            <b>Alokasi rekening</b>
            <small>
              {topShare}% dana tersimpan di {topWallet.name}, siap dianggarkan.
            </small>
          </div>
        </div>
      )}

      {/* MODAL MENU DOMPET */}
      {activeMenuWalletId && (() => {
        const targetWallet = accounts.find((w) => w.id === activeMenuWalletId);
        if (!targetWallet) return null;
        return (
          <div className="md" onClick={() => setActiveMenuWalletId(null)}>
            <div className="mb" onClick={(e) => e.stopPropagation()}>
              <h3>{targetWallet.name}</h3>
              <p className="sub">Saldo {rp(getAccountBalance(targetWallet.id))}</p>
              <div className="stk">
                <button
                  className="btn"
                  onClick={() => {
                    onSetPriority(targetWallet.id);
                    setActiveMenuWalletId(null);
                  }}
                >
                  Jadikan prioritas
                </button>
                <button
                  className="btn neg2"
                  onClick={() => {
                    const hasTx = transactions.some((t) => t.account_id === targetWallet.id);
                    if (hasTx) {
                      alert('Dompet masih punya riwayat transaksi');
                      return;
                    }
                    if (accounts.length <= 1) {
                      alert('Minimal ada satu dompet');
                      return;
                    }
                    onDeleteWallet(targetWallet.id);
                    setActiveMenuWalletId(null);
                  }}
                >
                  Hapus dompet
                </button>
                <button
                  className="chip"
                  onClick={() => setActiveMenuWalletId(null)}
                  style={{ justifyContent: 'center' }}
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL TAMBAH DOMPET */}
      {showAddModal && (
        <div className="md" onClick={() => setShowAddModal(false)}>
          <div className="mb" onClick={(e) => e.stopPropagation()}>
            <h3>Tambah dompet</h3>
            <form onSubmit={handleSaveWallet} className="fm" style={{ gap: '14px' }}>
              <label className="fld">
                Bank atau dompet
                <select
                  value={selectedBankIdx}
                  onChange={(e) => setSelectedBankIdx(Number(e.target.value))}
                >
                  {BANKS.map(([bName, bType], idx) => (
                    <option key={bName} value={idx}>
                      {bName} ({bType})
                    </option>
                  ))}
                </select>
              </label>

              <label className="fld">
                Nama tampilan (opsional)
                <input
                  maxLength={30}
                  placeholder="Contoh: BNI gaji"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </label>

              <label className="fld">
                Saldo awal
                <input
                  inputMode="numeric"
                  placeholder="Rp 0"
                  value={initialBalanceStr}
                  onChange={(e) => {
                    const n = num(e.target.value);
                    setInitialBalanceStr(n ? n.toLocaleString('id-ID') : '');
                  }}
                />
              </label>

              <div className="mact">
                <button type="button" className="chip" onClick={() => setShowAddModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn lime">
                  Simpan dompet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TRANSFER ANTAR AKUN */}
      {showTransferModal && (
        <div className="md" onClick={() => setShowTransferModal(false)}>
          <div className="mb" onClick={(e) => e.stopPropagation()}>
            <h3>Transfer antar akun</h3>
            <form onSubmit={handleExecuteTransfer} className="fm" style={{ gap: '14px' }}>
              <label className="fld">
                Dari
                <select
                  value={transferFromId}
                  onChange={(e) => setTransferFromId(e.target.value)}
                >
                  {accounts.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({rp(getAccountBalance(w.id))})
                    </option>
                  ))}
                </select>
              </label>

              <label className="fld">
                Ke
                <select
                  value={transferToId}
                  onChange={(e) => setTransferToId(e.target.value)}
                >
                  {accounts.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fld">
                Nominal
                <input
                  inputMode="numeric"
                  placeholder="Rp 0"
                  value={transferAmountStr}
                  onChange={(e) => {
                    const n = num(e.target.value);
                    setTransferAmountStr(n ? n.toLocaleString('id-ID') : '');
                  }}
                />
              </label>

              {transferError && <p className="er">{transferError}</p>}

              <div className="mact">
                <button
                  type="button"
                  className="chip"
                  onClick={() => setShowTransferModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn lime">
                  Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
