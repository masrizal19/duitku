/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/views/DashboardView';
import { TransactionsView } from './components/views/TransactionsView';
import { AddTransactionView } from './components/views/AddTransactionView';
import { WalletsView } from './components/views/WalletsView';
import { DebtsView } from './components/views/DebtsView';
import { ReportsView } from './components/views/ReportsView';
import { CategoriesView } from './components/views/CategoriesView';
import { SettingsView } from './components/views/SettingsView';
import { Icon } from './components/Icon';
import { PAGES } from './utils/constants';
import { ini } from './utils/formatters';
import { authService, AuthUserInfo } from './services/auth';
import { dbService } from './services/db';
import {
  Account,
  Transaction,
  Category,
  Debt,
  DebtPayment,
  Bill,
  Profile,
  UserSettings,
  ViewPage,
} from './types';

export default function App() {
  const [user, setUser] = useState<AuthUserInfo | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authLoadError, setAuthLoadError] = useState<string | null>(null);

  // App data states
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  // Navigation and UI states
  const [currentPage, setCurrentPage] = useState<ViewPage>('dashboard');
  const [hideBalance, setHideBalance] = useState<boolean>(false);
  const [theme, setTheme] = useState<string>('light');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showMoreModal, setShowMoreModal] = useState<boolean>(false);

  // Quick action from Wallet to Tambah
  const [quickIncomeWalletId, setQuickIncomeWalletId] = useState<string | undefined>(undefined);

  // 1. Inisialisasi tema
  useEffect(() => {
    const savedTheme = localStorage.getItem('dk_t') || 'light';
    setTheme(savedTheme);
    document.documentElement.dataset.theme = savedTheme;
  }, []);

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('dk_t', next);
    document.documentElement.dataset.theme = next;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // 2. Hash route sync
  useEffect(() => {
    const parseHash = () => {
      const h = (window.location.hash || '#dashboard').replace('#', '') as ViewPage;
      const validPages = PAGES.map((p) => p[0]);
      if (validPages.includes(h)) {
        setCurrentPage(h);
      }
    };

    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  const navigateTo = (page: ViewPage) => {
    setShowMoreModal(false);
    window.location.hash = page;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const loadAuthenticatedUserData = async (authUser: AuthUserInfo) => {
    setLoading(true);
    setAuthLoadError(null);
    try {
      const prof = await dbService.initUserProfile(
        authUser.uid,
        authUser.email,
        authUser.displayName,
        authUser.photoURL
      );
      setProfile(prof);

      // Muat data relasional dari Supabase sesuai RLS pengguna aktif
      const [accs, cats, txs, dbts, dpmts, blls] = await Promise.all([
        dbService.getAccounts(authUser.uid),
        dbService.getCategories(authUser.uid),
        dbService.getTransactions(authUser.uid),
        dbService.getDebts(authUser.uid),
        dbService.getDebtPayments(authUser.uid),
        dbService.getBills(authUser.uid),
      ]);

      setAccounts(accs);
      setCategories(cats);
      setTransactions(txs);
      setDebts(dbts);
      setDebtPayments(dpmts);
      setBills(blls);
    } catch (err: any) {
      setAuthLoadError(
        err?.message || 'Gagal memuat profil dan data keuangan dari database Supabase.'
      );
    } finally {
      setLoading(false);
    }
  };

  // 3. Auth Listener & Initial Data Load (menggunakan Supabase Auth murni)
  useEffect(() => {
    let active = true;
    const unsubscribe = authService.onAuthStateChange(async (authUser) => {
      if (!active) return;
      setUser(authUser);

      if (authUser) {
        await loadAuthenticatedUserData(authUser);
      } else {
        setProfile(null);
        setAuthLoadError(null);
        setAccounts([]);
        setCategories([]);
        setTransactions([]);
        setDebts([]);
        setDebtPayments([]);
        setBills([]);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Handler: Tambah Transaksi
  const handleSaveTransaction = async (data: {
    type: 'in' | 'out';
    category_name: string;
    account_id: string;
    amount: number;
    title: string;
    date: string;
    receipt_url?: string;
  }) => {
    if (!user) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    try {
      const newTx = await dbService.createTransaction(user.uid, {
        ...data,
        wallet_id: data.account_id,
        account_id: data.account_id,
        time,
      });
      setTransactions((prev) => [newTx, ...prev]);

      const isFuture = new Date(data.date) > new Date('2026-11-12');
      showToast(isFuture ? 'Transaksi terjadwal disimpan' : 'Transaksi disimpan');
      navigateTo('transaksi');
    } catch (err: any) {
      alert('Gagal menyimpan transaksi: ' + (err.message || 'Error'));
    }
  };

  // Handler: Hapus Transaksi
  const handleDeleteTransaction = async (txId: string) => {
    if (!user) return;
    try {
      await dbService.deleteTransaction(user.uid, txId);
      setTransactions((prev) => prev.filter((t) => t.id !== txId));
      showToast('Transaksi dihapus');
    } catch (err: any) {
      alert('Gagal menghapus transaksi: ' + (err.message || 'Error'));
    }
  };

  // Handler: Toggle Tagihan Lunas
  const handleToggleBill = async (billId: string) => {
    if (!user) return;
    try {
      const newPaid = await dbService.toggleBillPaid(user.uid, billId);
      setBills((prev) =>
        prev.map((b) => (b.id === billId ? { ...b, is_paid: newPaid } : b))
      );
      showToast(newPaid ? 'Tagihan ditandai lunas' : 'Status tagihan diperbarui');
    } catch (err: any) {
      console.error(err);
    }
  };

  // Handler: Toggle Utang Lunas
  const handleToggleDebt = async (debtId: string) => {
    if (!user) return;
    try {
      const newPaid = await dbService.toggleDebtPaid(user.uid, debtId);
      setDebts((prev) =>
        prev.map((d) => (d.id === debtId ? { ...d, is_paid: newPaid } : d))
      );
      showToast(newPaid ? 'Catatan ditandai lunas' : 'Status diperbarui');
    } catch (err: any) {
      console.error(err);
    }
  };

  // Handler: Catat Utang Baru
  const handleAddDebt = async (debtData: {
    person: string;
    note: string;
    amount: number;
    type: 'utang' | 'piutang';
    due_date: string;
  }) => {
    if (!user) return;
    try {
      const created = await dbService.createDebt(user.uid, debtData);
      setDebts((prev) => [created, ...prev]);
      showToast('Catatan ditambahkan');
    } catch (err: any) {
      alert('Gagal mencatat utang: ' + (err.message || 'Error'));
    }
  };

  // Handler: Bayar Sebagian / Cicilan Utang (Atomic)
  const handleRecordPayment = async (params: {
    debtId: string;
    accountId: string;
    amount: number;
    note?: string;
  }) => {
    if (!user) return;
    try {
      const result = await dbService.recordDebtPayment(user.uid, params);
      setDebtPayments((prev) => [result.payment, ...prev]);

      // Refresh transaksi & debts
      const [latestTxs, latestDebts] = await Promise.all([
        dbService.getTransactions(user.uid),
        dbService.getDebts(user.uid),
      ]);
      setTransactions(latestTxs);
      setDebts(latestDebts);

      showToast(result.isFullyPaid ? 'Cicilan dicatat & utang telah lunas!' : 'Cicilan berhasil dicatat');
    } catch (err: any) {
      alert('Gagal memproses cicilan: ' + (err.message || 'Error'));
    }
  };

  // Handler: Tambah Dompet
  const handleAddWallet = async (walletData: {
    name: string;
    type: 'Bank' | 'E-Wallet' | 'Tunai';
    note: string;
    initial_balance: number;
  }) => {
    if (!user) return;
    try {
      const created = await dbService.createAccount(user.uid, {
        ...walletData,
        is_priority: false,
      });
      setAccounts((prev) => [...prev, created]);
      showToast('Dompet ditambahkan');
    } catch (err: any) {
      alert('Gagal menambah dompet: ' + (err.message || 'Error'));
    }
  };

  // Handler: Set Prioritas Dompet
  const handleSetPriority = async (walletId: string) => {
    if (!user) return;
    try {
      await dbService.setPriorityAccount(user.uid, walletId);
      setAccounts((prev) =>
        prev.map((w) => ({ ...w, is_priority: w.id === walletId }))
      );
      showToast('Dompet prioritas diubah');
    } catch (err: any) {
      console.error(err);
    }
  };

  // Handler: Hapus Dompet
  const handleDeleteWallet = async (walletId: string) => {
    if (!user) return;
    try {
      await dbService.deleteAccount(user.uid, walletId);
      setAccounts((prev) => prev.filter((w) => w.id !== walletId));
      showToast('Dompet dihapus');
    } catch (err: any) {
      alert('Gagal menghapus dompet: ' + (err.message || 'Error'));
    }
  };

  // Handler: Transfer Antar Akun
  const handleTransfer = async (fromId: string, toId: string, amount: number) => {
    if (!user) return;
    try {
      await dbService.transferBalance(user.uid, fromId, toId, amount);
      const latestTxs = await dbService.getTransactions(user.uid);
      setTransactions(latestTxs);
      showToast('Transfer berhasil');
    } catch (err: any) {
      alert('Gagal transfer: ' + (err.message || 'Error'));
    }
  };

  // Handler: Kategori CRUD
  const handleAddCategory = async (catData: { name: string; type: 'in' | 'out'; budget?: number }) => {
    if (!user) return;
    try {
      const created = await dbService.createCategory(user.uid, catData);
      setCategories((prev) => [...prev, created]);
      showToast('Kategori ditambahkan');
    } catch (err: any) {
      alert('Gagal menambah kategori: ' + (err.message || 'Error'));
    }
  };

  const handleUpdateBudget = async (categoryName: string, type: 'in' | 'out', budget?: number) => {
    if (!user) return;
    try {
      await dbService.updateCategory(user.uid, categoryName, type, { budget });
      setCategories((prev) =>
        prev.map((c) => (c.name === categoryName && c.type === type ? { ...c, budget } : c))
      );
      showToast('Anggaran disimpan');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDeleteCategory = async (categoryName: string, type: 'in' | 'out') => {
    if (!user) return;
    try {
      await dbService.deleteCategory(user.uid, categoryName, type);
      setCategories((prev) => prev.filter((c) => !(c.name === categoryName && c.type === type)));
      showToast('Kategori dihapus');
    } catch (err: any) {
      console.error(err);
    }
  };

  // Handler: Update Nama & Avatar Profil
  const handleUpdateName = async (newName: string) => {
    if (!user) return;
    try {
      await authService.updateUserProfile(newName);
      await dbService.updateProfile(user.uid, { full_name: newName, name: newName });
      setProfile((prev) => (prev ? { ...prev, full_name: newName, name: newName } : null));
    } catch (err: any) {
      showToast(err?.message || 'Gagal memperbarui nama profil');
    }
  };

  const handleUpdateAvatar = async (avatarUrl: string | null) => {
    if (!user) return;
    try {
      await authService.updateUserProfile(profile?.full_name || user.displayName, avatarUrl);
      await dbService.updateProfile(user.uid, { avatar_url: avatarUrl, avatar: avatarUrl });
      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl, avatar: avatarUrl } : null));
    } catch (err: any) {
      showToast(err?.message || 'Gagal memperbarui foto profil');
    }
  };

  const handleUpdateSettings = async (newSettings: UserSettings) => {
    if (!user) return;
    try {
      await dbService.updateSettings(user.uid, newSettings);
      setProfile((prev) => (prev ? { ...prev, settings: newSettings } : null));
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan preferensi');
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      showToast('Kamu sudah keluar');
    } catch (err: any) {
      showToast(err?.message || 'Gagal keluar dari akun');
    }
  };

  const handleQuickIncome = (walletId: string) => {
    setQuickIncomeWalletId(walletId);
    navigateTo('tambah');
  };

  // Tampilkan loading screen saat memeriksa sesi atau memuat data akun dari Supabase
  if (loading) {
    return (
      <div id="auth" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: 'var(--sf)' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="lgm" style={{ width: '56px', height: '56px', borderRadius: '18px' }}>
            <Icon name="wallet" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>DUITKU</h2>
          <p style={{ color: 'var(--mut)', fontSize: '14px', margin: 0 }}>
            {user ? 'Menghubungkan ke database Supabase...' : 'Memeriksa sesi autentikasi...'}
          </p>
        </div>
      </div>
    );
  }

  // Tampilkan Auth Screen jika belum memiliki sesi Supabase Auth
  if (!user) {
    return (
      <>
        <AuthScreen
          onSuccess={(msg) => {
            showToast(msg);
            navigateTo('dashboard');
          }}
        />
        {toastMessage && (
          <div className="toast">
            <Icon name="check" />
            {toastMessage}
          </div>
        )}
      </>
    );
  }

  // Tampilkan error database jika profil / tabel Supabase gagal dimuat (jangan lanjut ke dashboard kosong)
  if (authLoadError) {
    return (
      <div id="auth" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: 'var(--sf)', padding: '24px' }}>
        <div className="card" style={{ maxWidth: '460px', width: '100%', padding: '28px', display: 'grid', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="lgm" style={{ width: '44px', height: '44px', borderRadius: '14px' }}>
              <Icon name="wallet" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Gagal Memuat Akun</h2>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--mut)' }}>
                {user.email}
              </p>
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: '14px',
              background: 'rgba(224, 97, 138, 0.12)',
              color: 'var(--neg)',
              fontSize: '13px',
              fontWeight: 600,
              lineHeight: 1.5,
            }}
          >
            {authLoadError}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn lime"
              style={{ flex: 1 }}
              onClick={() => loadAuthenticatedUserData(user)}
            >
              <Icon name="history" />
              Coba Lagi
            </button>
            <button
              type="button"
              className="chip"
              onClick={handleLogout}
            >
              <Icon name="out" />
              Keluar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const initials = profile?.name ? ini(profile.name) : '?';

  return (
    <div className="app">
      {/* SIDEBAR NAVIGATION */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigateTo}
        profile={profile}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onLogout={handleLogout}
      />

      {/* MAIN VIEW AREA */}
      <main>
        {/* MOBILE TOP BAR */}
        <div className="mt">
          <div className="lg">
            <div className="lgm">
              <Icon name="wallet" />
            </div>
            <span className="lgt">DUITKU</span>
          </div>
          <div
            className="av"
            id="mav"
            style={profile?.avatar ? { backgroundImage: `url(${profile.avatar})` } : {}}
            onClick={() => navigateTo('pengaturan')}
            role="button"
            tabIndex={0}
          >
            {profile?.avatar ? '' : initials}
          </div>
        </div>

        {/* ACTIVE VIEW */}
        <section id="view" className="enter">
          {currentPage === 'dashboard' && (
            <DashboardView
              accounts={accounts}
              transactions={transactions}
              bills={bills}
              debts={debts}
              hideBalance={hideBalance}
              onToggleHide={() => setHideBalance(!hideBalance)}
              onNavigate={navigateTo}
              onToggleBill={handleToggleBill}
            />
          )}

          {currentPage === 'transaksi' && (
            <TransactionsView
              transactions={transactions}
              accounts={accounts}
              onNavigate={navigateTo}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {currentPage === 'tambah' && (
            <AddTransactionView
              accounts={accounts}
              categories={categories}
              initialType={quickIncomeWalletId ? 'in' : 'out'}
              initialAccountId={quickIncomeWalletId}
              onSave={handleSaveTransaction}
              onNavigate={navigateTo}
            />
          )}

          {currentPage === 'dompet' && (
            <WalletsView
              accounts={accounts}
              transactions={transactions}
              hideBalance={hideBalance}
              onToggleHide={() => setHideBalance(!hideBalance)}
              onNavigate={navigateTo}
              onAddWallet={handleAddWallet}
              onSetPriority={handleSetPriority}
              onDeleteWallet={handleDeleteWallet}
              onTransfer={handleTransfer}
              onQuickIncome={handleQuickIncome}
            />
          )}

          {currentPage === 'utang' && (
            <DebtsView
              debts={debts}
              debtPayments={debtPayments}
              accounts={accounts}
              onToggleDebt={handleToggleDebt}
              onAddDebt={handleAddDebt}
              onRecordPayment={handleRecordPayment}
            />
          )}

          {currentPage === 'laporan' && (
            <ReportsView transactions={transactions} accounts={accounts} />
          )}

          {currentPage === 'kategori' && (
            <CategoriesView
              categories={categories}
              transactions={transactions}
              onAddCategory={handleAddCategory}
              onUpdateBudget={handleUpdateBudget}
              onDeleteCategory={handleDeleteCategory}
            />
          )}

          {currentPage === 'pengaturan' && (
            <SettingsView
              profile={profile}
              onUpdateName={handleUpdateName}
              onUpdateAvatar={handleUpdateAvatar}
              onUpdateSettings={handleUpdateSettings}
              onLogout={handleLogout}
              onToast={showToast}
            />
          )}
        </section>
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <BottomNav
        currentPage={currentPage}
        onNavigate={navigateTo}
        onOpenMore={() => setShowMoreModal(true)}
      />

      {/* MOBILE "MORE" MODAL */}
      {showMoreModal && (
        <div className="md" onClick={() => setShowMoreModal(false)}>
          <div className="mb" onClick={(e) => e.stopPropagation()}>
            <h3>Menu lainnya</h3>
            <div className="stk">
              {PAGES.filter((p) => ['utang', 'laporan', 'kategori', 'pengaturan'].includes(p[0])).map(
                ([k, n, i]) => (
                  <button
                    key={k}
                    className="mrow"
                    onClick={() => navigateTo(k as ViewPage)}
                  >
                    <Icon name={i} />
                    {n}
                  </button>
                )
              )}

              <button className="mrow" onClick={handleToggleTheme}>
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
                {theme === 'dark' ? 'Tema terang' : 'Tema gelap'}
              </button>

              <button
                className="mrow neg"
                onClick={() => {
                  setShowMoreModal(false);
                  handleLogout();
                }}
              >
                <Icon name="out" />
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION POPUP */}
      {toastMessage && (
        <div className="toast">
          <Icon name="check" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
