import React, { useState } from 'react';
import { Debt, Account, DebtPayment } from '../../types';
import { Icon } from '../Icon';
import { rp, num, ini, fmtDue } from '../../utils/formatters';

interface DebtsViewProps {
  debts: Debt[];
  debtPayments: DebtPayment[];
  accounts: Account[];
  onToggleDebt: (debtId: string) => void;
  onAddDebt: (debt: {
    person: string;
    note: string;
    amount: number;
    type: 'utang' | 'piutang';
    due_date: string;
  }) => void;
  onRecordPayment: (params: {
    debtId: string;
    accountId: string;
    amount: number;
    note?: string;
  }) => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  debts,
  debtPayments,
  accounts,
  onToggleDebt,
  onAddDebt,
  onRecordPayment,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<Debt | null>(null);

  // Form states for Add Debt
  const [addType, setAddType] = useState<'utang' | 'piutang'>('utang');
  const [person, setPerson] = useState('');
  const [note, setNote] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [dueDateIso, setDueDateIso] = useState('');
  const [addError, setAddError] = useState('');

  // Form states for Installment / Cicilan Payment
  const [paymentAmountStr, setPaymentAmountStr] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState(accounts[0]?.id || '');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // Perhitungan sisa utang/piutang dengan memperhitungkan riwayat cicilan
  const getRemainingAmount = (debt: Debt) => {
    const payments = debtPayments.filter((p) => p.debt_id === debt.id);
    const sumPaid = payments.reduce((s, p) => s + p.amount, 0);
    return Math.max(0, debt.amount - sumPaid);
  };

  const utangTotal = debts
    .filter((d) => d.type === 'utang' && !d.is_paid)
    .reduce((s, d) => s + getRemainingAmount(d), 0);

  const piutangTotal = debts
    .filter((d) => d.type === 'piutang' && !d.is_paid)
    .reduce((s, d) => s + getRemainingAmount(d), 0);

  const netPosition = piutangTotal - utangTotal;

  const handleSaveDebt = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!person.trim()) {
      setAddError('Isi nama orang.');
      return;
    }
    const amt = num(amountStr);
    if (!amt) {
      setAddError('Isi nominal.');
      return;
    }

    let dueStr = '-';
    if (dueDateIso) {
      const dt = new Date(dueDateIso + 'T00:00');
      const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      dueStr = `${dt.getDate()} ${mon[dt.getMonth()]}`;
    }

    onAddDebt({
      person: person.trim(),
      note: note.trim() || 'Tanpa keterangan',
      amount: amt,
      type: addType,
      due_date: dueStr,
    });

    setShowAddModal(false);
    setPerson('');
    setNote('');
    setAmountStr('');
    setDueDateIso('');
  };

  const handleExecutePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');
    if (!selectedDebtForPayment) return;

    const amt = num(paymentAmountStr);
    if (!amt) {
      setPaymentError('Isi nominal pembayaran.');
      return;
    }

    const remaining = getRemainingAmount(selectedDebtForPayment);
    if (amt > remaining) {
      setPaymentError(`Nominal melebihi sisa kewajiban (${rp(remaining)}).`);
      return;
    }

    onRecordPayment({
      debtId: selectedDebtForPayment.id,
      accountId: paymentAccountId,
      amount: amt,
      note: paymentNote.trim() || 'Cicilan',
    });

    setSelectedDebtForPayment(null);
    setPaymentAmountStr('');
    setPaymentNote('');
  };

  const renderSection = (type: 'utang' | 'piutang', title: string) => {
    const list = debts.filter((d) => d.type === type);
    const sumRemaining = list.filter((d) => !d.is_paid).reduce((s, d) => s + getRemainingAmount(d), 0);

    return (
      <div className="card rv">
        <div className="ch">
          <h3>{title}</h3>
          <span>Sisa {rp(sumRemaining)}</span>
        </div>

        {list.length > 0 ? (
          list.map((d) => {
            const remaining = getRemainingAmount(d);
            const payments = debtPayments.filter((p) => p.debt_id === d.id);
            const isPartial = payments.length > 0 && !d.is_paid;

            return (
              <div
                key={d.id}
                className={`chk ${d.is_paid ? 'd' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => onToggleDebt(d.id)}
              >
                <span className="o">{d.is_paid && <Icon name="check" />}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <b>{d.person} · {d.note}</b>
                    {isPartial && <em className="bdg lm">Dicicil ({payments.length}x)</em>}
                  </div>
                  <small>
                    {d.is_paid
                      ? 'Lunas'
                      : `Jatuh tempo ${d.due_date}${
                          isPartial ? ` · Sisa: ${rp(remaining)}` : ''
                        }`}
                  </small>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="ca">{rp(d.amount)}</span>
                  {!d.is_paid && (
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '99px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDebtForPayment(d);
                        setPaymentAmountStr(remaining ? remaining.toLocaleString('id-ID') : '');
                      }}
                    >
                      Bayar / Cicil
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty">Belum ada catatan.</div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="ph rv">
        <div>
          <h1>Utang-Piutang</h1>
          <p>Tandai yang sudah lunas, sisanya tetap terpantau</p>
        </div>
        <div className="pr">
          <button className="btn lime" onClick={() => setShowAddModal(true)}>
            <Icon name="plus" />
            Catat baru
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="sum rv">
        <div>
          <small>Utang saya</small>
          <b style={{ color: 'var(--neg)' }}>{rp(utangTotal)}</b>
        </div>
        <div>
          <small>Piutang saya</small>
          <b style={{ color: 'var(--in)' }}>{rp(piutangTotal)}</b>
        </div>
        <div className="acc">
          <small>Posisi bersih</small>
          <b>{rp(netPosition)}</b>
        </div>
      </div>

      {/* TWO COLUMNS: UTANG & PIUTANG */}
      <div className="two">
        {renderSection('utang', 'Utang saya')}
        {renderSection('piutang', 'Piutang saya')}
      </div>

      {/* MODAL CATAT UTANG/PIUTANG BARU */}
      {showAddModal && (
        <div className="md" onClick={() => setShowAddModal(false)}>
          <div className="mb" onClick={(e) => e.stopPropagation()}>
            <h3>Catat utang atau piutang</h3>
            <div
              className="seg full"
              id="dk"
              style={{
                // @ts-ignore
                '--n': 2,
                '--p': addType === 'piutang' ? 1 : 0,
              }}
            >
              <i />
              <button
                type="button"
                className={addType === 'utang' ? 'on' : ''}
                onClick={() => setAddType('utang')}
              >
                Utang saya
              </button>
              <button
                type="button"
                className={addType === 'piutang' ? 'on' : ''}
                onClick={() => setAddType('piutang')}
              >
                Piutang
              </button>
            </div>

            <form onSubmit={handleSaveDebt} className="fm" style={{ gap: '14px', marginTop: '10px' }}>
              <label className="fld">
                Nama orang
                <input
                  maxLength={30}
                  placeholder="Contoh: Bayu"
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                />
              </label>

              <label className="fld">
                Keterangan
                <input
                  maxLength={40}
                  placeholder="Contoh: Pinjam makan malam"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>

              <label className="fld">
                Nominal
                <input
                  inputMode="numeric"
                  placeholder="Rp 0"
                  value={amountStr}
                  onChange={(e) => {
                    const n = num(e.target.value);
                    setAmountStr(n ? n.toLocaleString('id-ID') : '');
                  }}
                />
              </label>

              <label className="fld">
                Jatuh tempo
                <input
                  type="date"
                  value={dueDateIso}
                  onChange={(e) => setDueDateIso(e.target.value)}
                />
              </label>

              {addError && <p className="er">{addError}</p>}

              <div className="mact">
                <button type="button" className="chip" onClick={() => setShowAddModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn lime">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL BAYAR SEBAGIAN / CICILAN ATOMIK */}
      {selectedDebtForPayment && (
        <div className="md" onClick={() => setSelectedDebtForPayment(null)}>
          <div className="mb" onClick={(e) => e.stopPropagation()}>
            <h3>
              {selectedDebtForPayment.type === 'utang' ? 'Bayar Cicilan Utang' : 'Terima Cicilan Piutang'}
            </h3>
            <p className="sub">
              {selectedDebtForPayment.person} · Total {rp(selectedDebtForPayment.amount)} · Sisa{' '}
              {rp(getRemainingAmount(selectedDebtForPayment))}
            </p>

            <form onSubmit={handleExecutePayment} className="fm" style={{ gap: '14px', marginTop: '10px' }}>
              <label className="fld">
                Nominal pembayaran cicilan
                <input
                  inputMode="numeric"
                  placeholder="Rp 0"
                  value={paymentAmountStr}
                  onChange={(e) => {
                    const n = num(e.target.value);
                    setPaymentAmountStr(n ? n.toLocaleString('id-ID') : '');
                  }}
                />
              </label>

              <label className="fld">
                {selectedDebtForPayment.type === 'utang'
                  ? 'Bayar menggunakan dompet'
                  : 'Terima ke dompet'}
                <select
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                >
                  {accounts.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({rp(w.initial_balance)})
                    </option>
                  ))}
                </select>
              </label>

              <label className="fld">
                Catatan cicilan
                <input
                  placeholder="Contoh: Cicilan ke-1"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                />
              </label>

              {paymentError && <p className="er">{paymentError}</p>}

              <div className="mact">
                <button
                  type="button"
                  className="chip"
                  onClick={() => setSelectedDebtForPayment(null)}
                >
                  Batal
                </button>
                <button type="submit" className="btn lime">
                  Catat Transaksi Cicilan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
