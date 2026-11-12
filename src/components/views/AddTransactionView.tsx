import React, { useState, useRef } from 'react';
import { Account, Category, ViewPage } from '../../types';
import { Icon } from '../Icon';
import { rp, num, catIc, wIcon } from '../../utils/formatters';

interface AddTransactionViewProps {
  accounts: Account[];
  categories: Category[];
  initialType?: 'in' | 'out';
  initialAccountId?: string;
  onSave: (tx: {
    type: 'in' | 'out';
    category_name: string;
    account_id: string;
    amount: number;
    title: string;
    date: string;
    receipt_url?: string;
  }) => void;
  onNavigate: (page: ViewPage) => void;
}

export const AddTransactionView: React.FC<AddTransactionViewProps> = ({
  accounts,
  categories,
  initialType = 'out',
  initialAccountId,
  onSave,
}) => {
  const [type, setType] = useState<'in' | 'out'>(initialType);
  const [amountStr, setAmountStr] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('2026-11-12');
  const [receiptName, setReceiptName] = useState('');

  // Default wallet
  const defaultWalletId = initialAccountId || (accounts.find((a) => a.name.includes('BCA'))?.id || accounts[0]?.id || '');
  const [selectedWalletId, setSelectedWalletId] = useState<string>(defaultWalletId);

  // Kategori yang cocok dengan type saat ini
  const availableCats = categories.filter((c) => c.type === type);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    availableCats[0]?.name || (type === 'out' ? 'Makan' : 'Gaji')
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Perubahan tipe: reset kategori jika kategori sebelumnya tidak ada di tipe baru
  const handleTypeChange = (newType: 'in' | 'out') => {
    setType(newType);
    const newCats = categories.filter((c) => c.type === newType);
    if (!newCats.some((c) => c.name === selectedCategory)) {
      setSelectedCategory(newCats[0]?.name || (newType === 'out' ? 'Makan' : 'Gaji'));
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const n = num(val);
    setAmountStr(n ? n.toLocaleString('id-ID') : '');
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran struk maksimal 5 MB');
        return;
      }
      setReceiptName(file.name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = num(amountStr);
    if (!amountNum) {
      alert('Isi nominal transaksi dulu');
      return;
    }

    if (!selectedWalletId) {
      alert('Pilih dompet/akun terlebih dahulu');
      return;
    }

    onSave({
      type,
      category_name: selectedCategory,
      account_id: selectedWalletId,
      amount: amountNum,
      title: title.trim() || selectedCategory,
      date,
      receipt_url: receiptName || undefined,
    });
  };

  const currentWallet = accounts.find((a) => a.id === selectedWalletId) || accounts[0];
  const parsedAmount = num(amountStr);
  const parsedDate = new Date(date + 'T00:00');
  const isDateValid = !isNaN(parsedDate.getTime());
  const isScheduled = isDateValid && parsedDate > new Date(2026, 10, 12, 23, 59);

  // Proyeksi saldo setelah transaksi
  const currentWalletBalance = currentWallet ? currentWallet.initial_balance : 0;
  const projectedBalance = currentWalletBalance + (isScheduled ? 0 : type === 'in' ? parsedAmount : -parsedAmount);

  return (
    <div>
      <div className="ph rv">
        <div>
          <span className="kick">Input cepat</span>
          <h1>Tambah Transaksi</h1>
          <p>Catat dalam hitungan detik</p>
        </div>
      </div>

      <div className="two tw">
        <div className="card rv">
          <form onSubmit={handleSubmit} className="fm">
            {/* SEGMENTED CONTROL: PENGELUARAN / PEMASUKAN */}
            <div
              className="seg full"
              id="ks"
              style={{
                // @ts-ignore
                '--n': 2,
                '--p': type === 'in' ? 1 : 0,
              }}
            >
              <i />
              <button
                type="button"
                className={type === 'out' ? 'on' : ''}
                onClick={() => handleTypeChange('out')}
              >
                <Icon name="down" />
                Pengeluaran
              </button>
              <button
                type="button"
                className={type === 'in' ? 'on' : ''}
                onClick={() => handleTypeChange('in')}
              >
                <Icon name="up" />
                Pemasukan
              </button>
            </div>

            {/* NOMINAL INPUT */}
            <div className="ab">
              <div className="t">
                <label htmlFor="fa">Nominal uang</label>
                <em className={`bdg ${type === 'in' ? 'lm' : 'rd'}`} id="ki" style={{ margin: 0 }}>
                  {type === 'in' ? 'Masuk (+)' : 'Keluar (-)'}
                </em>
              </div>
              <div className="r">
                <span>Rp</span>
                <input
                  id="fa"
                  inputMode="numeric"
                  placeholder="0"
                  value={amountStr}
                  onChange={handleAmountChange}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* KETERANGAN */}
            <label className="fld">
              Keterangan / catatan
              <span className="dsc">
                <span className="i">
                  <Icon name="note" />
                </span>
                <input
                  id="ft"
                  placeholder="Contoh: makan siang nasi padang"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={60}
                />
              </span>
            </label>

            {/* KATEGORI CHIPS */}
            <div className="fld">
              Kategori
              <div className="chips sc" id="cats">
                {availableCats.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className={`chip ${selectedCategory === c.name ? 'on' : ''}`}
                    onClick={() => setSelectedCategory(c.name)}
                  >
                    <Icon name={catIc(c.name)} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* PILIH DOMPET / AKUN */}
            <div className="fld">
              <span>{type === 'in' ? 'Masuk ke dompet / rekening' : 'Bayar dari dompet / rekening'}</span>
              <div className="wos" id="wos">
                {accounts.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    className={`wo ${selectedWalletId === w.id ? 'on' : ''}`}
                    onClick={() => setSelectedWalletId(w.id)}
                  >
                    <span className="wi2">
                      <Icon name={wIcon(w.type)} />
                    </span>
                    <span>
                      <b>{w.name}</b>
                      <small>{rp(w.initial_balance)}</small>
                    </span>
                    <span className="ck">
                      <Icon name="check" />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* TANGGAL TRANSAKSI */}
            <label className="fld">
              Tanggal transaksi
              <input
                id="fd"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min="2026-11-01"
                max="2026-11-30"
              />
            </label>

            {/* LAMPIRKAN STRUK */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleReceiptChange}
              accept="image/*,application/pdf"
              hidden
            />
            <div className="rc">
              <div className="l">
                <div className="ico in" style={{ width: '40px', height: '40px' }}>
                  <Icon name="receipt" />
                </div>
                <div>
                  <span id="rn">{receiptName || 'Lampirkan struk'}</span>
                  <small>Maks. 5 MB (opsional)</small>
                </div>
              </div>
              <button
                type="button"
                className="circ"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Pilih struk"
              >
                <Icon name="camera" />
              </button>
            </div>

            {/* SIMPAN BUTTON */}
            <button type="submit" className="btn lime" style={{ padding: '17px', fontSize: '17px' }}>
              <Icon name="check" />
              Simpan transaksi
            </button>
          </form>
        </div>

        {/* PRATINJAU TRANSAKSI (STICKY SIDEBAR) */}
        <aside className="card prev rv" id="pv">
          <div className="pvh">
            <span className="cap">Pratinjau</span>
            <em className={`bdg ${type === 'in' ? 'lm' : ''}`}>
              {type === 'in' ? 'Pemasukan' : 'Pengeluaran'}
            </em>
          </div>

          <div className={`pva ${type}`}>
            {type === 'in' ? '+' : '-'}
            {rp(parsedAmount)}
          </div>

          <div className="pvt">{title || 'Tanpa keterangan'}</div>

          <div className="pvm">
            <span>
              <Icon name={catIc(selectedCategory)} />
              {selectedCategory}
            </span>
            <span>
              <Icon name={wIcon(currentWallet?.type || 'Bank')} />
              {currentWallet?.name || '-'}
            </span>
            <span>
              <Icon name="cal" />
              {isDateValid
                ? parsedDate.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : '-'}
            </span>
          </div>

          <div className="pvb">
            <span>
              {isScheduled
                ? 'Terjadwal, saldo belum berubah'
                : `Saldo ${currentWallet?.name || ''} setelah transaksi`}
            </span>
            <b className={projectedBalance < 0 ? 'neg' : ''}>{rp(projectedBalance)}</b>
          </div>
        </aside>
      </div>
    </div>
  );
};
