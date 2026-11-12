// DUITKU - Supabase Database Service
// Database transaksi utama menggunakan Supabase PostgreSQL dengan RLS

import { supabase, isSupabaseConfigured, testSupabaseConnection } from '../lib/supabase';
import {
  Wallet,
  Transaction,
  Category,
  Debt,
  DebtPayment,
  Bill,
  Budget,
  Profile,
  UserSettings,
  DatabaseStatus,
} from '../types';

export const dbService = {
  // Cek status koneksi Supabase
  async getConnectionStatus(): Promise<DatabaseStatus> {
    if (!isSupabaseConfigured) {
      return {
        isConfigured: false,
        isConnected: false,
        message: 'Kredensial Supabase (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY) belum dikonfigurasi di file .env',
        lastChecked: new Date().toLocaleTimeString('id-ID'),
      };
    }

    const test = await testSupabaseConnection();
    return {
      isConfigured: true,
      isConnected: test.ok,
      message: test.message,
      lastChecked: new Date().toLocaleTimeString('id-ID'),
    };
  },

  // 1. PROFILES
  async initUserProfile(uid: string, email: string, name: string, avatar: string | null): Promise<Profile> {
    const defaultSettings: UserSettings = { notif: 1, kunci: 0, ringkas: 1, tgt: 1 };

    if (!isSupabaseConfigured) {
      // Fallback lokal sementara saat env belum diisi
      const localProfile: Profile = {
        id: uid,
        email,
        name: name || 'Pengguna DUITKU',
        avatar,
        settings: defaultSettings,
      };
      return localProfile;
    }

    try {
      // Ambil profile dari tabel profiles
      const { data: existing, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('[Supabase] Error fetching profile:', error);
      }

      if (existing) {
        return existing as Profile;
      }

      // Jika belum ada, buat baris profile baru di database Supabase
      const newProfile: Profile = {
        id: uid,
        email,
        name: name || email.split('@')[0],
        avatar,
        settings: defaultSettings,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (insertError) {
        console.error('[Supabase] Error creating profile:', insertError);
        return newProfile;
      }

      // Pastikan kategori awal tersedia untuk user baru
      await this.seedDefaultDataIfEmpty(uid);

      return inserted as Profile;
    } catch (err) {
      console.error('[Supabase] initUserProfile error:', err);
      return { id: uid, email, name, avatar, settings: defaultSettings };
    }
  },

  async seedDefaultDataIfEmpty(uid: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    // Cek apakah wallets sudah ada
    const { data: existingWallets } = await supabase.from('wallets').select('id').eq('user_id', uid).limit(1);
    if (!existingWallets || existingWallets.length === 0) {
      await supabase.from('wallets').insert([
        { user_id: uid, name: 'Kartu BNI', type: 'Bank', note: '•••• 4829 · Utama', initial_balance: 2150000, is_priority: false },
        { user_id: uid, name: 'BCA Tabungan', type: 'Bank', note: '•••• 9104 · Payroll', initial_balance: 5412000, is_priority: false },
        { user_id: uid, name: 'GoPay', type: 'E-Wallet', note: '0812 •••• 9921', initial_balance: 1469990, is_priority: true },
        { user_id: uid, name: 'Dompet Tunai', type: 'Tunai', note: 'Uang saku di dompet', initial_balance: 543000, is_priority: false },
      ]);
    }

    // Cek apakah categories sudah ada
    const { data: existingCats } = await supabase.from('categories').select('id').eq('user_id', uid).limit(1);
    if (!existingCats || existingCats.length === 0) {
      await supabase.from('categories').insert([
        { user_id: uid, name: 'Makan', type: 'out', budget: 1200000, icon: 'food' },
        { user_id: uid, name: 'Transport', type: 'out', budget: 600000, icon: 'car' },
        { user_id: uid, name: 'Belanja', type: 'out', budget: 1000000, icon: 'bag' },
        { user_id: uid, name: 'Tagihan', type: 'out', budget: 900000, icon: 'receipt' },
        { user_id: uid, name: 'Hiburan', type: 'out', budget: 400000, icon: 'game' },
        { user_id: uid, name: 'Gaji', type: 'in', icon: 'coins' },
        { user_id: uid, name: 'Freelance', type: 'in', icon: 'brief' },
        { user_id: uid, name: 'Lainnya', type: 'in', icon: 'dots' },
      ]);
    }
  },

  async updateProfile(uid: string, updates: Partial<Profile>): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('profiles').update(updates).eq('id', uid);
    if (error) console.error('[Supabase] updateProfile error:', error);
  },

  async updateSettings(uid: string, settings: UserSettings): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('profiles').update({ settings }).eq('id', uid);
    if (error) console.error('[Supabase] updateSettings error:', error);
  },

  // 2. WALLETS (DOMPET & REKENING)
  async getWallets(uid: string): Promise<Wallet[]> {
    if (!isSupabaseConfigured) {
      return [
        { id: 'w1', user_id: uid, name: 'Kartu BNI', type: 'Bank', note: '•••• 4829 · Utama', initial_balance: 2150000, is_priority: false },
        { id: 'w2', user_id: uid, name: 'BCA Tabungan', type: 'Bank', note: '•••• 9104 · Payroll', initial_balance: 5412000, is_priority: false },
        { id: 'w3', user_id: uid, name: 'GoPay', type: 'E-Wallet', note: '0812 •••• 9921', initial_balance: 1469990, is_priority: true },
        { id: 'w4', user_id: uid, name: 'Dompet Tunai', type: 'Tunai', note: 'Uang saku di dompet', initial_balance: 543000, is_priority: false },
      ];
    }

    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[Supabase] Error fetching wallets:', error);
      return [];
    }

    return (data || []) as Wallet[];
  },

  // Alias untuk kompatibilitas
  async getAccounts(uid: string): Promise<Wallet[]> {
    return this.getWallets(uid);
  },

  async createWallet(uid: string, wallet: Omit<Wallet, 'id' | 'user_id'>): Promise<Wallet> {
    if (!isSupabaseConfigured) {
      return {
        ...wallet,
        id: 'w_' + Date.now().toString(16),
        user_id: uid,
      };
    }

    const { data, error } = await supabase
      .from('wallets')
      .insert({ ...wallet, user_id: uid })
      .select()
      .single();

    if (error) throw error;
    return data as Wallet;
  },

  async createAccount(uid: string, account: Omit<Wallet, 'id' | 'user_id'>): Promise<Wallet> {
    return this.createWallet(uid, account);
  },

  async setPriorityWallet(uid: string, walletId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    await supabase.from('wallets').update({ is_priority: false }).eq('user_id', uid);
    await supabase.from('wallets').update({ is_priority: true }).eq('id', walletId).eq('user_id', uid);
  },

  async setPriorityAccount(uid: string, accountId: string): Promise<void> {
    return this.setPriorityWallet(uid, accountId);
  },

  async deleteWallet(uid: string, walletId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('wallets').delete().eq('id', walletId).eq('user_id', uid);
    if (error) throw error;
  },

  async deleteAccount(uid: string, accountId: string): Promise<void> {
    return this.deleteWallet(uid, accountId);
  },

  async transferBalance(uid: string, fromWalletId: string, toWalletId: string, amount: number): Promise<void> {
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    if (!isSupabaseConfigured) return;

    const { data: walletsList } = await supabase
      .from('wallets')
      .select('id, name')
      .in('id', [fromWalletId, toWalletId]);

    const fromName = walletsList?.find((w) => w.id === fromWalletId)?.name || 'Akun Asal';
    const toName = walletsList?.find((w) => w.id === toWalletId)?.name || 'Akun Tujuan';

    const txRecords = [
      {
        user_id: uid,
        wallet_id: fromWalletId,
        category_name: 'Lainnya',
        type: 'out',
        amount,
        title: `Transfer ke ${toName}`,
        date: dateStr,
        time: timeStr,
      },
      {
        user_id: uid,
        wallet_id: toWalletId,
        category_name: 'Lainnya',
        type: 'in',
        amount,
        title: `Transfer dari ${fromName}`,
        date: dateStr,
        time: timeStr,
      },
    ];

    const { error } = await supabase.from('transactions').insert(txRecords);
    if (error) throw error;
  },

  // 3. CATEGORIES
  async getCategories(uid: string): Promise<Category[]> {
    if (!isSupabaseConfigured) {
      return [
        { name: 'Makan', type: 'out', budget: 1200000, icon: 'food' },
        { name: 'Transport', type: 'out', budget: 600000, icon: 'car' },
        { name: 'Belanja', type: 'out', budget: 1000000, icon: 'bag' },
        { name: 'Tagihan', type: 'out', budget: 900000, icon: 'receipt' },
        { name: 'Hiburan', type: 'out', budget: 400000, icon: 'game' },
        { name: 'Gaji', type: 'in', icon: 'coins' },
        { name: 'Freelance', type: 'in', icon: 'brief' },
        { name: 'Lainnya', type: 'in', icon: 'dots' },
      ];
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', uid)
      .order('name', { ascending: true });

    if (error) {
      console.warn('[Supabase] Error fetching categories:', error);
      return [];
    }

    return (data || []) as Category[];
  },

  async createCategory(uid: string, category: Omit<Category, 'id' | 'user_id'>): Promise<Category> {
    if (!isSupabaseConfigured) {
      return {
        ...category,
        id: 'cat_' + Date.now().toString(16),
        user_id: uid,
      };
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({ ...category, user_id: uid })
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  },

  async updateCategory(uid: string, categoryName: string, type: 'in' | 'out', updates: Partial<Category>): Promise<void> {
    if (!isSupabaseConfigured) return;
    await supabase.from('categories').update(updates).eq('user_id', uid).eq('name', categoryName).eq('type', type);
  },

  async deleteCategory(uid: string, categoryName: string, type: 'in' | 'out'): Promise<void> {
    if (!isSupabaseConfigured) return;
    await supabase.from('categories').delete().eq('user_id', uid).eq('name', categoryName).eq('type', type);
  },

  // 4. TRANSACTIONS
  async getTransactions(uid: string): Promise<Transaction[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', uid)
      .order('date', { ascending: false })
      .order('time', { ascending: false });

    if (error) {
      console.warn('[Supabase] Error fetching transactions:', error);
      return [];
    }

    // Map wallet_id ke account_id untuk kemudahan frontend UI
    return (data || []).map((t: any) => ({
      ...t,
      account_id: t.wallet_id,
    })) as Transaction[];
  },

  async createTransaction(uid: string, tx: Omit<Transaction, 'id' | 'user_id'>): Promise<Transaction> {
    const targetWalletId = tx.wallet_id || tx.account_id;
    if (!targetWalletId) throw new Error('Dompet/akun harus dipilih');

    if (!isSupabaseConfigured) {
      const newTx: Transaction = {
        ...tx,
        wallet_id: targetWalletId,
        account_id: targetWalletId,
        id: 'tx_' + Date.now().toString(16),
        user_id: uid,
      };
      return newTx;
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: uid,
        wallet_id: targetWalletId,
        category_name: tx.category_name,
        type: tx.type,
        amount: tx.amount,
        title: tx.title,
        date: tx.date,
        time: tx.time,
        receipt_url: tx.receipt_url || null,
        debt_id: tx.debt_id || null,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      account_id: data.wallet_id,
    } as Transaction;
  },

  async deleteTransaction(uid: string, txId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('transactions').delete().eq('id', txId).eq('user_id', uid);
    if (error) throw error;
  },

  // 5. DEBTS & CICILAN
  async getDebts(uid: string): Promise<Debt[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Error fetching debts:', error);
      return [];
    }
    return (data || []) as Debt[];
  },

  async getDebtPayments(uid: string, debtId?: string): Promise<DebtPayment[]> {
    if (!isSupabaseConfigured) return [];
    let query = supabase.from('debt_payments').select('*').eq('user_id', uid);
    if (debtId) query = query.eq('debt_id', debtId);
    const { data, error } = await query.order('payment_date', { ascending: false });
    if (error) return [];
    return (data || []) as DebtPayment[];
  },

  async createDebt(uid: string, debt: Omit<Debt, 'id' | 'user_id' | 'is_paid'>): Promise<Debt> {
    if (!isSupabaseConfigured) {
      return {
        ...debt,
        id: 'd_' + Date.now().toString(16),
        user_id: uid,
        is_paid: false,
      };
    }

    const { data, error } = await supabase
      .from('debts')
      .insert({ ...debt, user_id: uid, is_paid: false })
      .select()
      .single();

    if (error) throw error;
    return data as Debt;
  },

  async toggleDebtPaid(uid: string, debtId: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { data: d } = await supabase.from('debts').select('is_paid').eq('id', debtId).eq('user_id', uid).single();
    const newStatus = !d?.is_paid;
    await supabase.from('debts').update({ is_paid: newStatus }).eq('id', debtId).eq('user_id', uid);
    return newStatus;
  },

  async recordDebtPayment(
    uid: string,
    params: {
      debtId: string;
      accountId: string;
      amount: number;
      note?: string;
    }
  ): Promise<{ payment: DebtPayment; isFullyPaid: boolean }> {
    const { debtId, accountId, amount, note } = params;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    if (!isSupabaseConfigured) {
      return {
        payment: {
          id: 'dp_' + Date.now(),
          user_id: uid,
          debt_id: debtId,
          wallet_id: accountId,
          amount,
          payment_date: dateStr,
          note,
        },
        isFullyPaid: true,
      };
    }

    // 1. Ambil info utang
    const { data: debt } = await supabase.from('debts').select('*').eq('id', debtId).eq('user_id', uid).single();
    if (!debt) throw new Error('Data utang tidak ditemukan');

    const txType: 'in' | 'out' = debt.type === 'utang' ? 'out' : 'in';
    const txTitle = `${debt.type === 'utang' ? 'Bayar utang' : 'Terima piutang'} ${debt.person} (${note || 'Cicilan'})`;

    // 2. Buat transaksi mutasi
    const { data: createdTx, error: txErr } = await supabase
      .from('transactions')
      .insert({
        user_id: uid,
        wallet_id: accountId,
        category_name: debt.type === 'utang' ? 'Tagihan' : 'Lainnya',
        type: txType,
        amount,
        title: txTitle,
        date: dateStr,
        time: timeStr,
        debt_id: debtId,
      })
      .select()
      .single();

    if (txErr) throw txErr;

    // 3. Simpan data pembayaran cicilan
    const { data: createdPayment, error: dpErr } = await supabase
      .from('debt_payments')
      .insert({
        user_id: uid,
        debt_id: debtId,
        wallet_id: accountId,
        amount,
        payment_date: dateStr,
        note,
        transaction_id: createdTx.id,
      })
      .select()
      .single();

    if (dpErr) throw dpErr;

    // 4. Hitung apakah total cicilan sudah melunasi utang
    const { data: allPayments } = await supabase.from('debt_payments').select('amount').eq('debt_id', debtId);
    const sumPaid = (allPayments || []).reduce((s, p) => s + Number(p.amount), 0);
    const isFullyPaid = sumPaid >= Number(debt.amount);

    if (isFullyPaid) {
      await supabase.from('debts').update({ is_paid: true }).eq('id', debtId).eq('user_id', uid);
    }

    return { payment: createdPayment as DebtPayment, isFullyPaid };
  },

  // 6. BILLS
  async getBills(uid: string): Promise<Bill[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', uid)
      .order('is_paid', { ascending: true })
      .order('due_date', { ascending: true });

    if (error) {
      console.warn('[Supabase] Error fetching bills:', error);
      return [];
    }
    return (data || []) as Bill[];
  },

  async createBill(uid: string, bill: Omit<Bill, 'id' | 'user_id' | 'is_paid'>): Promise<Bill> {
    if (!isSupabaseConfigured) {
      return {
        ...bill,
        id: 'b_' + Date.now().toString(16),
        user_id: uid,
        is_paid: false,
      };
    }

    const { data, error } = await supabase
      .from('bills')
      .insert({ ...bill, user_id: uid, is_paid: false })
      .select()
      .single();

    if (error) throw error;
    return data as Bill;
  },

  async toggleBillPaid(uid: string, billId: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { data: b } = await supabase.from('bills').select('is_paid').eq('id', billId).eq('user_id', uid).single();
    const newStatus = !b?.is_paid;
    await supabase
      .from('bills')
      .update({ is_paid: newStatus, paid_at: newStatus ? new Date().toISOString() : null })
      .eq('id', billId)
      .eq('user_id', uid);
    return newStatus;
  },

  async deleteBill(uid: string, billId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    await supabase.from('bills').delete().eq('id', billId).eq('user_id', uid);
  },

  // 7. BUDGETS
  async getBudgets(uid: string, month: string): Promise<Budget[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('budgets').select('*').eq('user_id', uid).eq('month', month);
    if (error) return [];
    return (data || []) as Budget[];
  },

  async setBudget(uid: string, categoryName: string, month: string, amount: number): Promise<void> {
    if (!isSupabaseConfigured) return;
    await supabase.from('budgets').upsert(
      {
        user_id: uid,
        category_name: categoryName,
        month,
        amount,
      },
      { onConflict: 'user_id,category_name,month' }
    );
  },
};
