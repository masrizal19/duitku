-- =========================================================================
-- DUITKU - PostgreSQL Database Schema for Supabase
-- Tabel: profiles, wallets, categories, transactions, debts, bills, budgets
-- Termasuk Row Level Security (RLS) & Trigger Akun Baru
-- Jalankan skrip ini langsung di Supabase SQL Editor
-- =========================================================================

-- Aktifkan ekstensi pgcrypto untuk UUID v4
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABEL PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  avatar text,
  settings jsonb NOT NULL DEFAULT '{"notif": 1, "kunci": 0, "ringkas": 1, "tgt": 1}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. TABEL WALLETS (Dompet, Rekening Bank, E-Wallet, Tunai)
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('Bank', 'E-Wallet', 'Tunai')),
  note text,
  initial_balance numeric(15, 2) NOT NULL DEFAULT 0,
  is_priority boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. TABEL CATEGORIES (Kategori Pemasukan & Pengeluaran)
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('in', 'out')),
  budget numeric(15, 2),
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. TABEL TRANSACTIONS (Mutasi Pemasukan & Pengeluaran)
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  category_name text NOT NULL,
  type text NOT NULL CHECK (type IN ('in', 'out')),
  amount numeric(15, 2) NOT NULL CHECK (amount > 0),
  title text NOT NULL,
  date date NOT NULL DEFAULT current_date,
  time text NOT NULL DEFAULT '12:00',
  receipt_url text,
  debt_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. TABEL DEBTS (Utang & Piutang)
CREATE TABLE IF NOT EXISTS public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  person text NOT NULL,
  note text,
  amount numeric(15, 2) NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('utang', 'piutang')),
  due_date text,
  is_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- TABEL DEBT_PAYMENTS (Cicilan & Pembayaran Sebagian)
CREATE TABLE IF NOT EXISTS public.debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  debt_id uuid NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL,
  amount numeric(15, 2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT current_date,
  note text,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. TABEL BILLS (Tagihan Berkala & Jatuh Tempo)
CREATE TABLE IF NOT EXISTS public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  title text NOT NULL,
  amount numeric(15, 2) NOT NULL CHECK (amount > 0),
  due_date text NOT NULL,
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. TABEL BUDGETS (Anggaran Bulanan per Kategori)
CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  category_name text NOT NULL,
  month text NOT NULL, -- Format YYYY-MM
  amount numeric(15, 2) NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_category_month UNIQUE (user_id, category_name, month)
);

-- =========================================================================
-- INDEXES UNTUK PERFORMA QUERY
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_debts_user ON public.debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON public.debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_bills_user ON public.bills(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON public.budgets(user_id, month);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Hanya user pemilik data yang dapat membaca, membuat, mengubah, & menghapus
-- =========================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES RLS
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- 2. WALLETS RLS
DROP POLICY IF EXISTS "Users can manage own wallets" ON public.wallets;
CREATE POLICY "Users can manage own wallets" ON public.wallets
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. CATEGORIES RLS
DROP POLICY IF EXISTS "Users can manage own categories" ON public.categories;
CREATE POLICY "Users can manage own categories" ON public.categories
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. TRANSACTIONS RLS
DROP POLICY IF EXISTS "Users can manage own transactions" ON public.transactions;
CREATE POLICY "Users can manage own transactions" ON public.transactions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5. DEBTS RLS
DROP POLICY IF EXISTS "Users can manage own debts" ON public.debts;
CREATE POLICY "Users can manage own debts" ON public.debts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 6. DEBT PAYMENTS RLS
DROP POLICY IF EXISTS "Users can manage own debt payments" ON public.debt_payments;
CREATE POLICY "Users can manage own debt payments" ON public.debt_payments
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 7. BILLS RLS
DROP POLICY IF EXISTS "Users can manage own bills" ON public.bills;
CREATE POLICY "Users can manage own bills" ON public.bills
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 8. BUDGETS RLS
DROP POLICY IF EXISTS "Users can manage own budgets" ON public.budgets;
CREATE POLICY "Users can manage own budgets" ON public.budgets
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =========================================================================
-- TRIGGER OTOMATIS SAAT USER BARU DAFTAR (AUTH.USERS -> PROFILES & DEFAULT DATA)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- 1. Buat profil pengguna
  INSERT INTO public.profiles (id, email, name, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data ->> 'name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Buat dompet bawaan (wallets)
  INSERT INTO public.wallets (user_id, name, type, note, initial_balance, is_priority)
  VALUES
    (NEW.id, 'Kartu BNI', 'Bank', '•••• 4829 · Utama', 2150000, false),
    (NEW.id, 'BCA Tabungan', 'Bank', '•••• 9104 · Payroll', 5412000, false),
    (NEW.id, 'GoPay', 'E-Wallet', '0812 •••• 9921', 1469990, true),
    (NEW.id, 'Dompet Tunai', 'Tunai', 'Uang saku di dompet', 543000, false);

  -- 3. Buat kategori bawaan (categories)
  INSERT INTO public.categories (user_id, name, type, budget, icon)
  VALUES
    (NEW.id, 'Makan', 'out', 1200000, 'food'),
    (NEW.id, 'Transport', 'out', 600000, 'car'),
    (NEW.id, 'Belanja', 'out', 1000000, 'bag'),
    (NEW.id, 'Tagihan', 'out', 900000, 'receipt'),
    (NEW.id, 'Hiburan', 'out', 400000, 'game'),
    (NEW.id, 'Gaji', 'in', NULL, 'coins'),
    (NEW.id, 'Freelance', 'in', NULL, 'brief'),
    (NEW.id, 'Lainnya', 'in', NULL, 'dots');

  RETURN NEW;
END;
$$;

-- Pasang trigger pada tabel auth.users Supabase
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
