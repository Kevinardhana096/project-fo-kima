# Dokumentasi Arsitektur Website Next.js

Dokumen ini merangkum kondisi website `Next.js` yang aktif saat ini setelah jalur `Pelanggan` dan `Kontrak Lengkap` dipindahkan ke backend Rust.

## Ringkasan Status

- browser tetap memanggil route internal `Next.js`
- route internal `Next.js` untuk `customers` dan `kontrak-lengkap` sekarang meneruskan request ke backend Rust
- backend Rust membaca dan menulis data ke MySQL
- Spreadsheet dan Apps Script tidak lagi menjadi jalur aktif untuk route frontend yang sudah dipindahkan
- tab `Pelanggan` di Google Sheets disinkronkan dari MySQL oleh backend Rust setelah create/update/delete pelanggan
- tab `Kontrak Lengkap` di Google Sheets disinkronkan dari MySQL oleh backend Rust setelah create/update/delete/perpanjang/upgrade kontrak
- link folder berkas pelanggan disimpan melalui jalur Rust/MySQL
- upload/hapus berkas pelanggan sudah diproses backend Rust ke Google Drive
- upload/hapus berkas kontrak sudah diproses backend Rust ke Google Drive

## Arsitektur Aktif

- `Next.js`
  - UI admin/internal
  - route handler internal `/api/customers` dan `/api/kontrak-lengkap`
  - adapter response agar UI lama tetap jalan
- `Rust Backend`
  - API utama bisnis
  - validasi data
  - CRUD `pelanggan`
  - CRUD `Kontrak Lengkap`
  - `perpanjang`
  - `upgrade`
- `MySQL`
  - penyimpanan utama data relasional
  - histori `Kontrak Lengkap` pada tabel internal `lokasi`

## Alur Data Aktif

1. user membuka website `Next.js`
2. browser memanggil route internal `Next.js`
3. route internal `Next.js` memanggil backend Rust melalui `BACKEND_API_BASE_URL`
4. backend Rust memproses request dan berinteraksi dengan MySQL
5. response dikembalikan ke route `Next.js`
6. route `Next.js` mengembalikan data ke browser

## Modul yang Sudah Dipindahkan

- `Pelanggan`
  - list
  - detail
  - tambah
  - edit
  - hapus
  - simpan link folder berkas manual
  - upload dan hapus berkas pelanggan ke Google Drive
- `Kontrak Lengkap`
  - list
  - detail
  - tambah
  - edit
  - hapus
  - perpanjang
  - upgrade
  - upload dan hapus berkas kontrak ke Google Drive

## Modul yang Belum Dipindahkan Penuh

- billing kontrak dari frontend
- sinkronisasi Google Sheets untuk modul selain `Pelanggan` dan `Kontrak Lengkap`

## Struktur Frontend

- `frontend/app/api/customers/`
  - adapter route customer ke backend Rust
- `frontend/app/api/kontrak-lengkap/`
  - adapter route `Kontrak Lengkap` ke backend Rust untuk list/detail/create/update/delete/perpanjang/upgrade
- `frontend/lib/rust-backend.ts`
  - wrapper HTTP server-to-server
  - mapper request/response backend Rust ke bentuk data UI frontend

## Catatan Teknis

- `BACKEND_API_BASE_URL` wajib mengarah ke backend Rust yang aktif, default lokal `http://127.0.0.1:8080`
- route frontend sengaja mempertahankan format respons lama agar komponen UI tidak perlu dirombak sekaligus
- route frontend `/api/kontrak-lengkap` memanggil endpoint backend `/api/kontrak-lengkap`
- route frontend lama `/api/contracts` masih tersedia sebagai alias kompatibilitas
- endpoint backend lama `/api/lokasi` masih tersedia sebagai alias kompatibilitas, tetapi bukan nama utama untuk integrasi frontend baru
- link folder berkas pelanggan disimpan ke kolom `link_folder_berkas`
- upload/hapus berkas pelanggan membutuhkan `GOOGLE_APPLICATION_CREDENTIALS` dan `PELANGGAN_ROOT_FOLDER_ID` di environment backend
- upload/hapus berkas kontrak membutuhkan `GOOGLE_APPLICATION_CREDENTIALS` dan `LOKASI_ROOT_FOLDER_ID` di environment backend
- sinkronisasi Google Sheets membutuhkan `GOOGLE_APPLICATION_CREDENTIALS` dan `SPREADSHEET_ID` di environment backend
- sinkronisasi Google Sheets berjalan di background task; kegagalan sync dicatat di log backend dan tidak menggagalkan response API pelanggan
- kegagalan upload/hapus Google Drive pada submit pelanggan dikembalikan sebagai error API agar user tahu operasi belum selesai
- operasi create folder, list file, upload file, dan hapus file Google Drive pelanggan masih berjalan sinkron pada request utama backend
- field `Link Folder Berkas` hanya ditampilkan di mode edit pelanggan; pada mode tambah, backend normalnya membuat folder pelanggan lalu mengisi `link_folder_berkas` otomatis saat simpan berhasil
- sinkronisasi Google Sheets untuk `Kontrak Lengkap` berjalan sebagai background task setelah mutasi kontrak berhasil
- operasi Google Drive kontrak pada submit/hapus kontrak masih berjalan sinkron pada request utama backend
- frontend mengirim payload kontrak dalam bentuk UI `camelCase`; wrapper server `rust-backend.ts` memetakan payload itu ke bentuk Rust `snake_case`
- route frontend lama `/api/contracts` masih tersedia sebagai alias read-compatible untuk list/detail, tetapi jalur utama UI baru memakai `/api/kontrak-lengkap`

## Yang Sudah Tidak Relevan

Bagian berikut tidak lagi menggambarkan jalur aktif frontend saat ini:

- `Apps Script Web App` sebagai backend aktif untuk route `customers`
- `Apps Script Web App` sebagai backend aktif untuk route `Kontrak Lengkap`
- shared secret Apps Script sebagai dependency wajib untuk frontend lokal

## Arah Lanjutan

Langkah berikutnya yang disarankan:

1. hubungkan modul billing kontrak ke backend Rust/MySQL
2. kuatkan mekanisme sinkronisasi Google Sheets agar task background tidak saling tumpang tindih saat traffic tinggi
3. tambahkan pengujian end-to-end untuk create/update/perpanjang/upgrade/hapus kontrak beserta berkas Drive
