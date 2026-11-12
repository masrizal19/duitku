import React, { useState } from 'react';
import { Category, Transaction } from '../../types';
import { Icon } from '../Icon';
import { rp, num, catIc } from '../../utils/formatters';

interface CategoriesViewProps {
  categories: Category[];
  transactions: Transaction[];
  onAddCategory: (cat: { name: string; type: 'in' | 'out'; budget?: number }) => void;
  onUpdateBudget: (categoryName: string, type: 'in' | 'out', budget?: number) => void;
  onDeleteCategory: (categoryName: string, type: 'in' | 'out') => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  transactions,
  onAddCategory,
  onUpdateBudget,
  onDeleteCategory,
}) => {
  const [tabType, setTabType] = useState<'out' | 'in'>('out');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [budgetInputStr, setBudgetInputStr] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudgetStr, setNewCatBudgetStr] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const filteredCategories = categories.filter((c) => c.type === tabType);

  const getCategorySpend = (catName: string) => {
    return transactions
      .filter((t) => t.category_name === catName && t.type === tabType)
      .reduce((s, t) => s + t.amount, 0);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setBudgetInputStr(cat.budget ? cat.budget.toLocaleString('id-ID') : '');
  };

  const handleSaveBudget = () => {
    if (!editingCategory) return;
    const bNum = num(budgetInputStr);
    onUpdateBudget(editingCategory.name, editingCategory.type, bNum || undefined);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (cat: Category) => {
    const hasTx = transactions.some((t) => t.category_name === cat.name);
    if (hasTx) {
      alert('Kategori masih memiliki transaksi terkait');
      return;
    }
    onDeleteCategory(cat.name, cat.type);
    setEditingCategory(null);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const name = newCatName.trim();
    if (!name) {
      setErrorMsg('Isi nama kategori.');
      return;
    }

    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.type === tabType)) {
      setErrorMsg('Kategori sudah ada.');
      return;
    }

    const budget = tabType === 'out' ? num(newCatBudgetStr) || undefined : undefined;
    onAddCategory({
      name,
      type: tabType,
      budget,
    });

    setShowAddModal(false);
    setNewCatName('');
    setNewCatBudgetStr('');
  };

  return (
    <div>
      <div className="ph rv">
        <div>
          <h1>Kategori</h1>
          <p>Atur anggaran agar pengeluaran tetap terkendali</p>
        </div>
        <div className="pr">
          <div
            className="seg"
            style={{
              // @ts-ignore
              '--n': 2,
              '--p': tabType === 'in' ? 1 : 0,
            }}
          >
            <i />
            <button
              className={tabType === 'out' ? 'on' : ''}
              onClick={() => setTabType('out')}
            >
              Pengeluaran
            </button>
            <button
              className={tabType === 'in' ? 'on' : ''}
              onClick={() => setTabType('in')}
            >
              Pemasukan
            </button>
          </div>
        </div>
      </div>

      {/* CATEGORIES GRID */}
      <div className="kg" id="kg">
        {filteredCategories.map((c, i) => {
          const used = getCategorySpend(c.name);
          const pct = c.budget ? Math.min(100, (used / c.budget) * 100) : 0;
          const isWarning = pct > 80;

          return (
            <button
              key={`${c.name}-${c.type}`}
              className="card kc rv"
              style={{
                // @ts-ignore
                '--i': i,
              }}
              onClick={() => handleOpenEdit(c)}
            >
              <div className="t">
                <div className={`ico ${c.type === 'in' ? 'in' : ''}`}>
                  <Icon name={catIc(c.name)} />
                </div>
                <div>
                  <b>{c.name}</b>
                  <small>{c.type === 'out' ? 'Pengeluaran' : 'Pemasukan'}</small>
                </div>
              </div>

              <div className="v">{rp(used)}</div>

              {c.budget ? (
                <>
                  <div className="pbar">
                    <i
                      style={{
                        width: `${pct}%`,
                        background: isWarning ? 'var(--neg)' : 'var(--c4)',
                      }}
                    />
                  </div>
                  <small className="sub">
                    Anggaran {rp(c.budget)} · terpakai {Math.round(pct)}%
                  </small>
                </>
              ) : (
                <>
                  <div style={{ height: '22px' }} />
                  <small className="sub">Tanpa anggaran</small>
                </>
              )}
            </button>
          );
        })}

        <button
          className="addw rv"
          onClick={() => setShowAddModal(true)}
          style={{
            // @ts-ignore
            '--i': filteredCategories.length,
          }}
        >
          <span className="circ">
            <Icon name="plus" />
          </span>
          Tambah kategori
        </button>
      </div>

      {/* MODAL EDIT KATEGORI & ANGGARAN */}
      {editingCategory && (
        <div className="md" onClick={() => setEditingCategory(null)}>
          <div className="mb" onClick={(e) => e.stopPropagation()}>
            <h3>{editingCategory.name}</h3>
            <p className="sub">
              {editingCategory.type === 'out' ? 'Atur batas anggaran bulanan' : 'Kategori pemasukan'}
            </p>

            {editingCategory.type === 'out' && (
              <label className="fld">
                Anggaran bulanan
                <input
                  inputMode="numeric"
                  value={budgetInputStr}
                  onChange={(e) => {
                    const n = num(e.target.value);
                    setBudgetInputStr(n ? n.toLocaleString('id-ID') : '');
                  }}
                  placeholder="Rp 0"
                />
              </label>
            )}

            <div className="mact">
              <button type="button" className="chip" onClick={() => setEditingCategory(null)}>
                Tutup
              </button>

              {!transactions.some((t) => t.category_name === editingCategory.name) && (
                <button
                  type="button"
                  className="btn neg2"
                  onClick={() => handleDeleteCategory(editingCategory)}
                >
                  Hapus
                </button>
              )}

              {editingCategory.type === 'out' && (
                <button type="button" className="btn lime" onClick={handleSaveBudget}>
                  Simpan
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH KATEGORI */}
      {showAddModal && (
        <div className="md" onClick={() => setShowAddModal(false)}>
          <div className="mb" onClick={(e) => e.stopPropagation()}>
            <h3>Tambah kategori</h3>
            <form onSubmit={handleCreateCategory} className="fm" style={{ gap: '14px' }}>
              <label className="fld">
                Nama kategori
                <input
                  maxLength={20}
                  placeholder="Contoh: Kesehatan"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
              </label>

              {tabType === 'out' && (
                <label className="fld">
                  Anggaran bulanan (opsional)
                  <input
                    inputMode="numeric"
                    placeholder="Rp 0"
                    value={newCatBudgetStr}
                    onChange={(e) => {
                      const n = num(e.target.value);
                      setNewCatBudgetStr(n ? n.toLocaleString('id-ID') : '');
                    }}
                  />
                </label>
              )}

              {errorMsg && <p className="er">{errorMsg}</p>}

              <div className="mact">
                <button
                  type="button"
                  className="chip"
                  onClick={() => setShowAddModal(false)}
                >
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
    </div>
  );
};
