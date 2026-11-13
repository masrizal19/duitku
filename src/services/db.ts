// DUITKU - Supabase Database Service
// Database transaksi utama menggunakan Supabase PostgreSQL dengan RLS & Supabase Auth

import { SupabaseClient, User } from '@supabase/supabase-js';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  supabaseConfigError,
  testSupabaseConnection,
} from '../lib/supabase';
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

const DEFAULT_SETTINGS: UserSettings = { notif: 1, kunci: 0, ringkas: 1, tgt: 1 };

function readLocalPreferences(uid: string): UserSettings {
  try {
    const raw = localStorage.getItem(`dk_prefs_${uid}`);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      notif: parsed.notif ?? DEFAULT_SETTINGS.notif,
      kunci: parsed.kunci ?? DEFAULT_SETTINGS.kunci,
      ringkas: parsed.ringkas ?? DEFAULT_SETTINGS.ringkas,
      tgt: parsed.tgt ?? DEFAULT_SETTINGS.tgt,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeLocalPreferences(uid: string, settings: UserSettings): void {
  localStorage.setItem(`dk_prefs_${uid}`, JSON.stringify(settings));
}

async function requireAuthSession(expectedUid?: string): Promise<{ client: SupabaseClient; user: User }> {
  const client = getSupabaseClient();
  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error) {
    throw new Error(`Gagal memverifikasi sesi Supabase: ${error.message}`);
  }
  if (!session?.user?.id) {
    throw new Error('Sesi autentikasi tidak ditemukan. Silakan masuk terlebih dahulu.');
  }
  if (expectedUid && expectedUid !== session.user.id) {
    throw new Error('Identitas pengguna tidak cocok dengan sesi autentikasi aktif.');
  }

  return { client, user: session.user };
}

function mapDbProfile(row: {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
}, fallbackUser: User): Profile {
  const resolvedEmail = (row.email || fallbackUser.email || '').trim().toLowerCase();
  const resolvedName = (
    row.full_name ||
    fallbackUser.user_metadata?.full_name ||
    fallbackUser.user_metadata?.name ||
    resolvedEmail.split('@')[0] ||
    'Pengguna DUITKU'
  ).trim();
  const resolvedAvatar = row.avatar_url ?? fallbackUser.user_metadata?.avatar_url ?? null;

  return {
    id: row.id,
    full_name: resolvedName,
    email: resolvedEmail,
    avatar_url: resolvedAvatar,
    created_at: row.created_at,
    updated_at: row.updated_at,
    name: resolvedName,
    avatar: resolvedAvatar,
    settings: readLocalPreferences(row.id),
  };
}

export const dbService = {
  // Cek status koneksi Supabase
  async getConnectionStatus(): Promise<DatabaseStatus> {
    if (!isSupabaseConfigured) {
      return {
        isConfigured: false,
        isConnected: false,
        message:
          supabaseConfigError ||
          'Kredensial Supabase (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY) belum dikonfigurasi.',
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

  // 1. PROFILES (Menggunakan kolom: id, full_name, email, avatar_url, created_at, updated_at)
  async initUserProfile(
    uid: string,
    email: string,
    name: string,
    avatar: string | null
  ): Promise<Profile> {
    const { client, user } = await requireAuthSession(uid);

    const { data: existing, error: fetchError } = await client
      .from('profiles')
      .select('id, full_name, email, avatar_url, created_at, updated_at')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Gagal memeriksa profil di database: ${fetchError.message}`);
    }

    const cleanEmail = (user.email || email || '').trim().toLowerCase();
    const fallbackName = (
      name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      cleanEmail.split('@')[0] ||
      'Pengguna DUITKU'
    ).trim();
    const resolvedAvatar = existing?.avatar_url ?? avatar ?? user.user_metadata?.avatar_url ?? null;

    const payload = {
      id: user.id,
      full_name: existing?.full_name?.trim() || fallbackName,
      email: existing?.email || cleanEmail,
      avatar_url: resolvedAvatar,
      updated_at: new Date().toISOString(),
    };

    const { data: upserted, error: upsertError } = await client
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('id, full_name, email, avatar_url, created_at, updated_at')
      .single();

    if (upsertError || !upserted) {
      throw new Error(
        `Gagal menyimpan profil pengguna ke public.profiles: ${upsertError?.message || 'Unknown error'}`
      );
    }

    // Pastikan dompet & kategori default tersedia untuk pengguna baru
    await this.seedDefaultDataIfEmpty(user.id);

    return mapDbProfile(upserted, user);
  },

  async seedDefaultDataIfEmpty(uid: string): Promise<void> {
    const { client, user } = await requireAuthSession(uid);

    const { data: existingWallets, error: walletCheckErr } = await client
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (walletCheckErr) {
      throw new Error(`Gagal memeriksa data dompet awal: ${walletCheckErr.message}`);
    }

    if (!existingWallets || existingWallets.length === 0) {
      const { error: walletInsertErr } = await client.from('wallets').insert([
        { user_id: user.id, name: 'Bank Utama', type: 'Bank', note: 'Rekening tabungan', initial_balance: 0, is_priority: true },
        { user_id: user.id, name: 'E-Wallet', type: 'E-Wallet', note: 'Dompet digital', initial_balance: 0, is_priority: false },
        { user_id: user.id, name: 'Dompet Tunai', type: 'Tunai', note: 'Uang tunai', initial_balance: 0, is_priority: false },
      ]);
      if (walletInsertErr) {
        throw new Error(`Gagal membuat dompet awal: ${walletInsertErr.message}`);
      }
    }

    const { data: existingCats, error: catCheckErr } = await client
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (catCheckErr) {
      throw new Error(`Gagal memeriksa data kategori awal: ${catCheckErr.message}`);
    }

    if (!existingCats || existingCats.length === 0) {
      const { error: catInsertErr } = await client.from('categories').insert([
        { user_id: user.id, name: 'Makan', type: 'out', budget: 1200000, icon: 'food' },
        { user_id: user.id, name: 'Transport', type: 'out', budget: 600000, icon: 'car' },
        { user_id: user.id, name: 'Belanja', type: 'out', budget: 1000000, icon: 'bag' },
        { user_id: user.id, name: 'Tagihan', type: 'out', budget: 900000, icon: 'receipt' },
        { user_id: user.id, name: 'Hiburan', type: 'out', budget: 400000, icon: 'game' },
        { user_id: user.id, name: 'Gaji', type: 'in', icon: 'coins' },
        { user_id: user.id, name: 'Freelance', type: 'in', icon: 'brief' },
        { user_id: user.id, name: 'Lainnya', type: 'in', icon: 'dots' },
      ]);
      if (catInsertErr) {
        throw new Error(`Gagal membuat kategori awal: ${catInsertErr.message}`);
      }
    }
  },

  async updateProfile(
    uid: string,
    updates: { full_name?: string; avatar_url?: string | null; name?: string; avatar?: string | null }
  ): Promise<void> {
    const { client, user } = await requireAuthSession(uid);

    const dbUpdates: { full_name?: string; avatar_url?: string | null; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };

    if (updates.full_name !== undefined || updates.name !== undefined) {
      dbUpdates.full_name = (updates.full_name ?? updates.name ?? '').trim();
    }
    if (updates.avatar_url !== undefined || updates.avatar !== undefined) {
      dbUpdates.avatar_url = updates.avatar_url !== undefined ? updates.avatar_url : updates.avatar ?? null;
    }

    const { error } = await client
      .from('profiles')
      .update(dbUpdates)
      .eq('id', user.id);

    if (error) {
      throw new Error(`Gagal memperbarui profil di database: ${error.message}`);
    }
  },

  async updateSettings(uid: string, settings: UserSettings): Promise<void> {
    const { user } = await requireAuthSession(uid);
    writeLocalPreferences(user.id, settings);
  },

  // 2. WALLETS (DOMPET & REKENING)
  async getWallets(uid: string): Promise<Wallet[]> {
    const { client, user } = await requireAuthSession(uid);

    const { data, error } = await client
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Gagal memuat data dompet: ${error.message}`);
    }

    return (data || []) as Wallet[];
  },

  async getAccounts(uid: string): Promise<Wallet[]> {
    return this.getWallets(uid);
  },

  async createWallet(uid: string, wallet: Omit<Wallet, 'id' | 'user_id'>): Promise<Wallet> {
    const { client, user } = await requireAuthSession(uid);

    const { data, error } = await client
      .from('wallets')
      .insert({ ...wallet, user_id: user.id })
      .select()
      .single();

    if (error) throw new Error(`Gagal menambah dompet: ${error.message}`);
    return data as Wallet;
  },

  async createAccount(uid: string, account: Omit<Wallet, 'id' | 'user_id'>): Promise<Wallet> {
    return this.createWallet(uid, account);
  },

  async setPriorityWallet(uid: string, walletId: string): Promise<void> {
    const { client, user } = await requireAuthSession(uid);

    const { error: resetErr } = await client
      .from('wallets')
      .update({ is_priority: false })
      .eq('user_id', user.id);
    if (resetErr) throw new Error(`Gagal mengubah prioritas dompet: ${resetErr.message}`);

    const { error: setErr } = await client
      .from('wallets')
      .update({ is_priority: true })
      .eq('id', walletId)
      .eq('user_id', user.id);
    if (setErr) throw new Error(`Gagal menetapkan dompet prioritas: ${setErr.message}`);
  },

  async setPriorityAccount(uid: string, accountId: string): Promise<void> {
    return this.setPriorityWallet(uid, accountId);
  },

  async deleteWallet(uid: string, walletId: string): Promise<void> {
    const { client, user } = await requireAuthSession(uid);
    const { error } = await client
      .from('wallets')
      .delete()
      .eq('id', walletId)
      .eq('user_id', user.id);

    if (error) throw new Error(`Gagal menghapus dompet: ${error.message}`);
  },

  async deleteAccount(uid: string, accountId: string): Promise<void> {
    return this.deleteWallet(uid, accountId);
  },

  async transferBalance(uid: string, fromWalletId: string, toWalletId: string, amount: number): Promise<void> {
    const { client, user } = await requireAuthSession(uid);
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const { data: walletsList, error: fetchErr } = await client
      .from('wallets')
      .select('id, name')
      .eq('user_id', user.id)
      .in('id', [fromWalletId, toWalletId]);

    if (fetchErr) throw new Error(`Gagal memverifikasi dompet transfer: ${fetchErr.message}`);

    const fromName = walletsList?.find((w) => w.id === fromWalletId)?.name || 'Akun Asal';
    const toName = walletsList?.find((w) => w.id === toWalletId)?.name || 'Akun Tujuan';

    const txRecords = [
      {
        user_id: user.id,
        wallet_id: fromWalletId,
        category_name: 'Transfer',
        type: 'out',
        amount,
        title: `Transfer ke ${toName}`,
        date: dateStr,
        time: timeStr,
      },
      {
        user_id: user.id,
        wallet_id: toWalletId,
        category_name: 'Transfer',
        type: 'in',
        amount,
        title: `Transfer dari ${fromName}`,
        date: dateStr,
        time: timeStr,
      },
    ];

    const { error } = await client.from('transactions').insert(txRecords);
    if (error) throw new Error(`Gagal melakukan transfer antar dompet: ${error.message}`);
  },

  // 3. CATEGORIES
  async getCategories(uid: string): Promise<Category[]> {
    const { client, user } = await requireAuthSession(uid);

    const { data, error } = await client
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Gagal memuat kategori: ${error.message}`);
    }

    return (data || []) as Category[];
  },

  async createCategory(uid: string, category: Omit<Category, 'id' | 'user_id'>): Promise<Category> {
    const { client, user } = await requireAuthSession(uid);

    const { data, error } = await client
      .from('categories')
      .insert({ ...category, user_id: user.id })
      .select()
      .single();

    if (error) throw new Error(`Gagal menambah kategori: ${error.message}`);
    return data as Category;
  },

  async updateCategory(
    uid: string,
    categoryName: string,
    type: 'in' | 'out',
    updates: Partial<Category>
  ): Promise<void> {
    const { client, user } = await requireAuthSession(uid);
    const { error } = await client
      .from('categories')
      .update(updates)
      .eq('user_id', user.id)
      .eq('name', categoryName)
      .eq('type', type);

    if (error) throw new Error(`Gagal memperbarui kategori: ${error.message}`);
  },

  async deleteCategory(uid: string, categoryName: string, type: 'in' | 'out'): Promise<void> {
    const { client, user } = await requireAuthSession(uid);
    const { error } = await client
      .from('categories')
      .delete()
      .eq('user_id', user.id)
      .eq('name', categoryName)
      .eq('type', type);

    if (error) throw new Error(`Gagal menghapus kategori: ${error.message}`);
  },

  // 4. TRANSACTIONS
  async getTransactions(uid: string): Promise<Transaction[]> {
    const { client, user } = await requireAuthSession(uid);

    const { data, error } = await client
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('time', { ascending: false });

    if (error) {
      throw new Error(`Gagal memuat transaksi: ${error.message}`);
    }

    return (data || []).map((t: any) => ({
      ...t,
      account_id: t.wallet_id,
    })) as Transaction[];
  },

  async createTransaction(uid: string, tx: Omit<Transaction, 'id' | 'user_id'>): Promise<Transaction> {
    const { client, user } = await requireAuthSession(uid);
    const targetWalletId = tx.wallet_id || tx.account_id;
    if (!targetWalletId) throw new Error('Dompet/akun harus dipilih');

    const { data, error } = await client
      .from('transactions')
      .insert({
        user_id: user.id,
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

    if (error) throw new Error(`Gagal menyimpan transaksi: ${error.message}`);
    return {
      ...data,
      account_id: data.wallet_id,
    } as Transaction;
  },

  async deleteTransaction(uid: string, txId: string): Promise<void> {
    const { client, user } = await requireAuthSession(uid);
    const { error } = await client
      .from('transactions')
      .delete()
      .eq('id', txId)
      .eq('user_id', user.id);

    if (error) throw new Error(`Gagal menghapus transaksi: ${error.message}`);
  },

  // 5. DEBTS & CICILAN
  async getDebts(uid: string): Promise<Debt[]> {
    const { client, user } = await requireAuthSession(uid);

    const { data, error } = await client
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Gagal memuat catatan utang/piutang: ${error.message}`);
    }
    return (data || []) as Debt[];
  },

  async getDebtPayments(uid: string, debtId?: string): Promise<DebtPayment[]> {
    const { client, user } = await requireAuthSession(uid);
    let query = client.from('debt_payments').select('*').eq('user_id', user.id);
    if (debtId) query = query.eq('debt_id', debtId);
    const { data, error } = await query.order('payment_date', { ascending: false });

    if (error) {
      throw new Error(`Gagal memuat riwayat cicilan: ${error.message}`);
    }
    return (data || []) as DebtPayment[];
  },

  async createDebt(uid: string, debt: Omit<Debt, 'id' | 'user_id' | 'is_paid'>): Promise<Debt> {
    const { client, user } = await requireAuthSession(uid);

    const { data, error } = await client
      .from('debts')
      .insert({ ...debt, user_id: user.id, is_paid: false })
      .select()
      .single();

    if (error) throw new Error(`Gagal mencatat utang/piutang: ${error.message}`);
    return data as Debt;
  },

  async toggleDebtPaid(uid: string, debtId: string): Promise<boolean> {
    const { client, user } = await requireAuthSession(uid);

    const { data: d, error: getErr } = await client
      .from('debts')
      .select('is_paid')
      .eq('id', debtId)
      .eq('user_id', user.id)
      .single();
    if (getErr) throw new Error(`Gagal memeriksa status utang: ${getErr.message}`);

    const newStatus = !d?.is_paid;
    const { error: updErr } = await client
      .from('debts')
      .update({ is_paid: newStatus })
      .eq('id', debtId)
      .eq('user_id', user.id);
    if (updErr) throw new Error(`Gagal memperbarui status utang: ${updErr.message}`);

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
    const { client, user } = await requireAuthSession(uid);
    const { debtId, accountId, amount, note } = params;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const { data: debt, error: debtErr } = await client
      .from('debts')
      .select('*')
      .eq('id', debtId)
      .eq('user_id', user.id)
      .single();

    if (debtErr || !debt) throw new Error('Data utang tidak ditemukan');

    const txType: 'in' | 'out' = debt.type === 'utang' ? 'out' : 'in';
    const txTitle = `${debt.type === 'utang' ? 'Bayar utang' : 'Terima piutang'} ${debt.person} (${note || 'Cicilan'})`;

    const { data: createdTx, error: txErr } = await client
      .from('transactions')
      .insert({
        user_id: user.id,
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

    if (txErr) throw new Error(`Gagal mencatat transaksi cicilan: ${txErr.message}`);

    const { data: createdPayment, error: dpErr } = await client
      .from('debt_payments')
      .insert({
        user_id: user.id,
        debt_id: debtId,
        wallet_id: accountId,
        amount,
        payment_date: dateStr,
        note,
        transaction_id: createdTx.id,
      })
      .select()
      .single();

    if (dpErr) throw new Error(`Gagal menyimpan data cicilan: ${dpErr.message}`);

    const { data: allPayments, error: sumErr } = await client
      .from('debt_payments')
      .select('amount')
      .eq('debt_id', debtId)
      .eq('user_id', user.id);

    if (sumErr) throw new Error(`Gagal menghitung total cicilan: ${sumErr.message}`);

    const sumPaid = (allPayments || []).reduce((s, p) => s + Number(p.amount), 0);
    const isFullyPaid = sumPaid >= Number(debt.amount);

    if (isFullyPaid) {
      const { error: paidErr } = await client
        .from('debts')
        .update({ is_paid: true })
        .eq('id', debtId)
        .eq('user_id', user.id);
      if (paidErr) throw new Error(`Gagal menandai utang lunas: ${paidErr.message}`);
    }

    return { payment: createdPayment as DebtPayment, isFullyPaid };
  },

  // 6. BILLS
  async getBills(uid: string): Promise<Bill[]> {
    const { client, user } = await requireAuthSession(uid);

    const { data, error } = await client
      .from('bills')
      .select('*')
      .eq('user_id', user.id)
      .order('is_paid', { ascending: true })
      .order('due_date', { ascending: true });

    if (error) {
      throw new Error(`Gagal memuat tagihan: ${error.message}`);
    }
    return (data || []) as Bill[];
  },

  async createBill(uid: string, bill: Omit<Bill, 'id' | 'user_id' | 'is_paid'>): Promise<Bill> {
    const { client, user } = await requireAuthSession(uid);

    const { data, error } = await client
      .from('bills')
      .insert({ ...bill, user_id: user.id, is_paid: false })
      .select()
      .single();

    if (error) throw new Error(`Gagal menambah tagihan: ${error.message}`);
    return data as Bill;
  },

  async toggleBillPaid(uid: string, billId: string): Promise<boolean> {
    const { client, user } = await requireAuthSession(uid);

    const { data: b, error: getErr } = await client
      .from('bills')
      .select('is_paid')
      .eq('id', billId)
      .eq('user_id', user.id)
      .single();
    if (getErr) throw new Error(`Gagal memeriksa tagihan: ${getErr.message}`);

    const newStatus = !b?.is_paid;
    const { error: updErr } = await client
      .from('bills')
      .update({ is_paid: newStatus, paid_at: newStatus ? new Date().toISOString() : null })
      .eq('id', billId)
      .eq('user_id', user.id);
    if (updErr) throw new Error(`Gagal memperbarui status tagihan: ${updErr.message}`);

    return newStatus;
  },

  async deleteBill(uid: string, billId: string): Promise<void> {
    const { client, user } = await requireAuthSession(uid);
    const { error } = await client
      .from('bills')
      .delete()
      .eq('id', billId)
      .eq('user_id', user.id);

    if (error) throw new Error(`Gagal menghapus tagihan: ${error.message}`);
  },

  // 7. BUDGETS
  async getBudgets(uid: string, month: string): Promise<Budget[]> {
    const { client, user } = await requireAuthSession(uid);
    const { data, error } = await client
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', month);

    if (error) throw new Error(`Gagal memuat anggaran: ${error.message}`);
    return (data || []) as Budget[];
  },

  async setBudget(uid: string, categoryName: string, month: string, amount: number): Promise<void> {
    const { client, user } = await requireAuthSession(uid);
    const { error } = await client.from('budgets').upsert(
      {
        user_id: user.id,
        category_name: categoryName,
        month,
        amount,
      },
      { onConflict: 'user_id,category_name,month' }
    );

    if (error) throw new Error(`Gagal menyimpan anggaran: ${error.message}`);
  },
};
