// DUITKU - Type Definitions for Supabase Database

export type WalletType = 'Bank' | 'E-Wallet' | 'Tunai';
export type TransactionType = 'in' | 'out';
export type DebtType = 'utang' | 'piutang';

export interface Profile {
  id: string; // auth.users UUID
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
  // Properti UI lokal yang diturunkan dari full_name / avatar_url / preferensi lokal
  name: string;
  avatar: string | null;
  settings: UserSettings;
}

export interface UserSettings {
  notif: number;
  kunci: number;
  ringkas: number;
  tgt: number;
}

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  type: WalletType;
  note: string;
  initial_balance: number;
  is_priority: boolean;
  created_at?: string;
  updated_at?: string;
}

// Alias Account ke Wallet untuk kompatibilitas fungsi
export type Account = Wallet;

export interface Category {
  id?: string;
  user_id?: string;
  name: string;
  type: TransactionType;
  budget?: number;
  icon?: string;
}

export interface Transaction {
  id: string;
  user_id?: string;
  wallet_id?: string;
  account_id: string;
  category_name: string;
  type: TransactionType;
  amount: number;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  receipt_url?: string;
  debt_id?: string;
  created_at?: string;
}

export interface Debt {
  id: string;
  user_id?: string;
  person: string;
  note: string;
  amount: number;
  type: DebtType;
  due_date: string;
  is_paid: boolean;
  created_at?: string;
}

export interface DebtPayment {
  id: string;
  user_id?: string;
  debt_id: string;
  wallet_id?: string;
  amount: number;
  payment_date: string;
  note?: string;
  transaction_id?: string;
  created_at?: string;
}

export interface Bill {
  id: string;
  user_id?: string;
  title: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  paid_at?: string;
  created_at?: string;
}

export interface Budget {
  id?: string;
  user_id?: string;
  category_name: string;
  month: string; // YYYY-MM
  amount: number;
}

export interface DatabaseStatus {
  isConfigured: boolean;
  isConnected: boolean;
  message: string;
  lastChecked?: string;
}

export type ViewPage =
  | 'dashboard'
  | 'transaksi'
  | 'tambah'
  | 'dompet'
  | 'utang'
  | 'laporan'
  | 'kategori'
  | 'pengaturan';
