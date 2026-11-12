# DUITKU — Fullstack Personal Finance App (Supabase Edition)

Aplikasi manajemen keuangan pribadi modern full-stack yang menggunakan **Supabase PostgreSQL** sebagai satu-satunya database transaksi, dilengkapi dengan **Row-Level Security (RLS)** dan autentikasi bawaan Supabase.

---

## 🚀 Konfigurasi Sederhana

Aplikasi ini hanya membutuhkan **dua environment variable frontend**:
- `VITE_SUPABASE_URL`: URL project Supabase Anda (contoh: `https://xyzcompany.supabase.co`)
- `VITE_SUPABASE_ANON_KEY`: Kunci publik anonim Supabase

> ⚠️ **PENTING**: Jangan pernah menaruh `SUPABASE_SERVICE_ROLE_KEY` di frontend atau di variabel dengan awalan `VITE_`.

---

## 📋 Struktur Tabel Database Supabase

Seluruh skema database telah disiapkan dalam file `supabase/schema.sql` yang mencakup:

1. **`profiles`**:
   - `id` (uuid, primary key, terhubung ke `auth.users(id)`)
   - `email`, `name`, `avatar`, `settings` (jsonb)
2. **`wallets`**:
   - `id` (uuid, primary key)
   - `user_id` (uuid, foreign key ke `auth.users(id)`)
   - `name`, `type` (`Bank`, `E-Wallet`, `Tunai`), `note`, `initial_balance`, `is_priority`
3. **`categories`**:
   - `id` (uuid, primary key)
   - `user_id` (uuid, foreign key ke `auth.users(id)`)
   - `name`, `type` (`in`, `out`), `budget`, `icon`
4. **`transactions`**:
   - `id` (uuid, primary key)
   - `user_id` (uuid, foreign key ke `auth.users(id)`)
   - `wallet_id` (uuid, foreign key ke `wallets(id)`)
   - `category_name`, `type` (`in`, `out`), `amount`, `title`, `date`, `time`, `receipt_url`
5. **`debts`**:
   - `id` (uuid, primary key)
   - `user_id` (uuid, foreign key ke `auth.users(id)`)
   - `person`, `note`, `amount`, `type` (`utang`, `piutang`), `due_date`, `is_paid`
6. **`bills`**:
   - `id` (uuid, primary key)
   - `user_id` (uuid, foreign key ke `auth.users(id)`)
   - `title`, `amount`, `due_date`, `is_paid`, `paid_at`
7. **`budgets`**:
   - `id` (uuid, primary key)
   - `user_id` (uuid, foreign key ke `auth.users(id)`)
   - `category_name`, `month`, `amount`

---

## 🔒 Row Level Security (RLS)

Setiap tabel diaktifkan RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) dengan policy standar:
```sql
CREATE POLICY "Users can manage own wallets" ON public.wallets
FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```
Setiap pengguna yang login hanya dapat melihat, menambah, mengubah, dan menghapus datanya sendiri berdasarkan `auth.uid()`.

---

## 🛠️ Petunjuk Konfigurasi Langkah Demi Langkah

### 1. Buat Project di Supabase
1. Buka [Supabase Dashboard](https://supabase.com/) dan buat project baru.
2. Buka menu **Settings** > **API**.
3. Salin **Project URL** dan **anon public key**.

### 2. Eksekusi Skrip SQL di Supabase
1. Pada menu dashboard Supabase di sebelah kiri, klik **SQL Editor**.
2. Klik **New query**.
3. Buka file `supabase/schema.sql` di repository ini, salin seluruh kodenya, dan tempelkan ke SQL Editor Supabase.
4. Klik tombol **Run** (atau `Ctrl+Enter`).
5. Seluruh tabel, indeks, RLS policy, serta trigger otomatis pembuat data awal (`handle_new_user`) akan langsung aktif.

### 3. Buat File `.env`
Buat atau salin file `.env.example` menjadi `.env` di direktori utama:
```ini
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🏃 Menjalankan Aplikasi

Jalankan perintah berikut:
```bash
npm run dev
```
Akses aplikasi melalui browser di `http://localhost:3000`.

---

## 🧪 Cara Menguji Koneksi Database

1. **Indikator Status di Halaman Masuk**:
   - Di bagian kanan atas kartu login/daftar, terdapat indikator status:
     - 🟢 `● Supabase Active`: Menandakan konfigurasi `.env` terdeteksi.
     - 🟡 `● Demo Mode`: Menandakan `.env` belum diisi.
2. **Indikator & Pengujian di Menu Pengaturan**:
   - Masuk ke aplikasi, lalu buka tab **Pengaturan**.
   - Pada kartu **Status Database Supabase**, klik tombol **Cek Ulang** (`history` icon).
   - Sistem akan melakukan query ping ke tabel `profiles`. Jika berhasil, status akan menampilkan:
     `● Terhubung` dengan pesan `Koneksi Supabase PostgreSQL aktif dan terhubung`.
3. **Uji Operasi CRUD**:
   - **Tambah Transaksi**: Masuk ke menu **Catat**, masukkan nominal pengeluaran dan simpan. Buka Supabase Table Editor pada tabel `transactions` untuk memastikan data tersimpan langsung di server database.
   - **Tambah Dompet**: Buka menu **Dompet**, klik **Tambah dompet baru**, isi nama dan saldo awal. Data akan tersimpan di tabel `wallets`.
   - **Cicilan Utang**: Buka menu **Utang-Piutang**, klik **Bayar / Cicil**. Transaksi mutasi dan pembayaran cicilan akan tercatat otomatis.
