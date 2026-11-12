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

---

## ⚙️ Sistem CI/CD (GitHub Actions)

Repositori ini telah dilengkapi dengan 4 pipeline otomatis di `.github/workflows/`:

| Workflow | File | Trigger | Tujuan |
| :--- | :--- | :--- | :--- |
| **CI Validation** | `.github/workflows/ci.yml` | `push` ke `main`, `pull_request` ke `main` | Linting (`tsc --noEmit`), type checking, test, dan uji production build menggunakan Bun. |
| **Web Deployment** | `.github/workflows/deploy-web.yml` | `push` ke `main`, `workflow_dispatch` | Build web bundle production, upload artifact, dan deploy otomatis ke Vercel jika token tersedia. |
| **Android Build** | `.github/workflows/build-android.yml` | `push` (jika `android/**` berubah), `workflow_dispatch` | Build APK Debug dan Release App Bundle (.aab) menggunakan Capacitor & Gradle wrapper. |
| **Release Publisher** | `.github/workflows/release.yml` | `push` tag `v*.*.*`, `workflow_dispatch` | Publikasi GitHub Release, pembuatan changelog, dan melampirkan file bundle web & APK/AAB. |

---

## 🔐 Konfigurasi GitHub Secrets

Buka repositori Anda di GitHub: **`masrizal19/duitku`** > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**.

### 1. Wajib (Database & Autentikasi Frontend)
* `VITE_SUPABASE_URL`: URL project Supabase Anda (misal `https://xyzcompany.supabase.co`).
* `VITE_SUPABASE_ANON_KEY`: Kunci publik anonim Supabase (bukan `SERVICE_ROLE_KEY`).

### 2. Opsional untuk Deployment Web Otomatis ke Vercel
* `VERCEL_TOKEN`: Token API Vercel dari [Vercel Account Tokens](https://vercel.com/account/tokens).
* `VERCEL_ORG_ID`: ID organisasi atau user Vercel (bisa dilihat di `.vercel/project.json` setelah `vercel link`).
* `VERCEL_PROJECT_ID`: ID proyek di Vercel.

### 3. Opsional untuk Penandatanganan Rilis Android (Signing APK & AAB)
* `ANDROID_KEYSTORE_BASE64`: File keystore Android Anda yang di-encode ke base64 (`base64 -w 0 release.keystore`).
* `ANDROID_KEYSTORE_PASSWORD`: Password keystore.
* `ANDROID_KEY_ALIAS`: Alias key penandatangan.
* `ANDROID_KEY_PASSWORD`: Password key penandatangan.

---

## 🚀 Panduan Penggunaan Workflow

### 1. Cara Mengaktifkan GitHub Actions
1. Masuk ke tab **Actions** di repositori GitHub `masrizal19/duitku`.
2. Jika ada notifikasi "Workflows aren't being run on this repository", klik tombol hijau **I understand my workflows, go ahead and enable them**.
3. Pastikan branch default Anda adalah `main`. Setiap `git push origin main` akan otomatis menjalankan workflow CI dan Web Deployment.

### 2. Cara Melakukan Deployment Web
* **Metode 1 (Vercel Direct via Git)**: Hubungkan repositori GitHub `masrizal19/duitku` langsung di dashboard Vercel. Vercel akan otomatis mendeteksi konfigurasi `vercel.json` dan variabel environment.
* **Metode 2 (GitHub Actions ke Vercel)**: Tambahkan secret `VERCEL_TOKEN`, `VERCEL_ORG_ID`, dan `VERCEL_PROJECT_ID`. Workflow `.github/workflows/deploy-web.yml` akan otomatis men-deploy bundle hasil build saat ada perubahan di branch `main`.
* **Metode 3 (Unduh Artifact Mandiri)**: Jika tidak menggunakan Vercel, buka tab **Actions** > pilih run **DUITKU Web Deployment** terakhir > unduh artifact `duitku-production-web` yang berisi file web siap hosting di static server / CDN mana pun.

### 3. Persiapan & Pembangunan Aplikasi Android (Mobile)

Aplikasi DUITKU dirancang dengan UI mobile-first yang sangat responsif, navigasi bottom bar, touch gesture, dan layout adaptive.

Untuk mengubahnya menjadi aplikasi native Android menggunakan **Capacitor**:

#### Langkah Inisialisasi Lokal (Satu Kali Saja):
```bash
# 1. Install dependensi Capacitor
bun add @capacitor/core @capacitor/android
bun add -D @capacitor/cli

# 2. Inisialisasi proyek Capacitor
bunx cap init "DUITKU" "id.duitku.app" --web-dir dist

# 3. Tambahkan platform Android
bun run build
bunx cap add android

# 4. Commit dan push ke repository GitHub
git add android capacitor.config.ts package.json bun.lock
git commit -m "feat(mobile): inisialisasi Capacitor Android platform"
git push origin main
```

#### Cara Membangun APK dan AAB di GitHub Actions:
1. Buka tab **Actions** di GitHub.
2. Pilih workflow **DUITKU Android Build** di bilah sisi kiri.
3. Klik tombol **Run workflow**.
4. Pilih `Build Type`:
   - `debug`: Membangun file `app-debug.apk` untuk langsung di-install dan diuji pada perangkat Android atau emulator.
   - `release` / `all`: Membangun file Android App Bundle (`.aab`) dan APK release (memerlukan secret keystore).
5. Klik **Run workflow**.

### 4. Cara Mengunduh Hasil Build (Artifacts)
1. Buka tab **Actions** di repositori GitHub Anda.
2. Klik nama workflow run yang sudah selesai (bercentang hijau).
3. Gulir ke bagian paling bawah ke bagian **Artifacts**.
4. Klik pada nama artifact yang ingin diunduh:
   - `duitku-debug-apk`: File APK Android untuk pengujian langsung di HP.
   - `duitku-release-bundle`: File `.aab` untuk upload ke Google Play Console.
   - `duitku-web-build` / `duitku-production-web`: File web bundle siap deploy.

### 5. Cara Merilis Versi Baru (GitHub Release)
Untuk merilis versi resmi baru (misalnya `v1.0.0`):
```bash
# Buat tag versi di terminal lokal Anda
git tag -a v1.0.0 -m "Release DUITKU versi 1.0.0"

# Push tag ke GitHub
git push origin v1.0.0
```
Workflow `.github/workflows/release.yml` akan langsung:
1. Memvalidasi kode (`tsc --noEmit`).
2. Melakukan production build.
3. Mengompres paket web menjadi `duitku-web-v1.0.0.zip`.
4. Menyertakan APK/AAB jika tersedia.
5. Membuat rilis publik di halaman **Releases** GitHub dengan changelog otomatis.

---

## 🔧 Panduan Mengatasi Kegagalan Workflow (Troubleshooting)

1. **Build Gagal karena Type Checking (`tsc --noEmit`)**:
   - Jalankan `bun run lint` di lokal sebelum commit.
   - Pastikan tidak ada tipe data atau import yang tidak ditemukan.
2. **Variabel Supabase Tidak Terbaca saat Runtime**:
   - Pastikan nama secret di GitHub Settings tepat bernama `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` (huruf kapital dan diawali `VITE_`).
3. **Android Build Menginformasikan "Capacitor Android Not Initialized"**:
   - Ini adalah perilaku proteksi yang valid karena folder `android/` belum di-commit ke Git. Ikuti panduan inisialisasi Capacitor di atas, lalu push folder `android/` ke repositori.
4. **Error Permission pada Gradle Wrapper**:
   - Workflow telah menyertakan perintah `chmod +x android/gradlew` otomatis untuk mencegah permission denied di runner Linux.

