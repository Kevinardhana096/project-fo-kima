# Dokumentasi Arsitektur Website Next.js

Dokumen ini merangkum arah arsitektur website yang akan memakai spreadsheet dan Apps Script sebagai backend operasional awal.

## Tujuan

- membangun website admin/internal dengan `Next.js`
- memakai spreadsheet sebagai sumber data operasional awal
- memakai Apps Script sebagai lapisan logika bisnis dan integrasi Google Drive
- menjaga kemungkinan migrasi ke database proper di tahap berikutnya

## Posisi Sistem Saat Ini

Komponen yang sudah ada:

- Google Sheets sebagai penyimpanan data utama
- Google Apps Script sebagai business logic
- Google Drive sebagai penyimpanan dokumen
- endpoint `Apps Script Web App` sudah mulai disiapkan untuk modul `Pelanggan`
- struktur bisnis kontrak lokasi sudah mendukung:
  - tambah kontrak
  - edit kontrak
  - perpanjangan
  - upgrade paket

## Arsitektur yang Disarankan

Arsitektur tahap awal:

- `Next.js`
  - frontend admin portal
  - route handler internal sebagai gateway server-to-server
  - halaman list, detail, filter, dan dashboard
  - form yang memanggil endpoint backend
- `Apps Script Web App / endpoint wrapper`
  - validasi data
  - eksekusi logika bisnis
  - baca/tulis ke spreadsheet
  - upload metadata file ke Drive
- `Google Sheets`
  - penyimpanan data operasional
  - audit visual/manual
  - sumber histori kontrak
- `Google Drive`
  - penyimpanan dokumen kontrak per lokasi dan periode

## Alur Data

Alur request tahap awal:

1. User memakai website `Next.js`.
2. Browser memanggil route handler internal `Next.js`.
3. Route handler `Next.js` meneruskan request ke `Apps Script Web App` dengan shared secret server-to-server.
4. Apps Script menjalankan business logic.
5. Data disimpan ke Google Sheets dan file disimpan ke Google Drive.
6. Response dikembalikan ke frontend.

Implementasi V1 saat ini:

- fokus awal ada pada tab `Pelanggan`, dengan tambahan akses baca untuk `Kontrak Lengkap`
- frontend web sudah mendukung list, detail, tambah, edit, dan hapus pelanggan
- upload file dari frontend web sudah aktif untuk `Tambah Pelanggan` dan `Edit Pelanggan`
- mode edit pelanggan pada frontend juga sudah mendukung:
  - membaca daftar file existing dari Google Drive
  - menandai file existing untuk dihapus saat simpan
  - upload file tambahan ke folder pelanggan
- upload file dikirim dari browser ke route handler `Next.js` sebagai payload JSON base64, lalu diteruskan ke `Apps Script Web App`
- spreadsheet UI tetap dipertahankan sebagai fallback operasional dan audit visual

Implementasi tahap berikutnya yang aktif sekarang:

- akses baca `Kontrak Lengkap` mulai dibuka ke frontend web
- scope kontrak masih `read-only`
- frontend menampilkan list kontrak, filter dasar, dan detail kontrak tanpa aksi tulis
- struktur kontrak yang dibaca frontend sudah mengikuti perubahan sheet terbaru:
  - `kategori`
  - `core`
  - `sharing_core`
- frontend tidak lagi memakai tombol `Muat Ulang` pada menu `Pelanggan` dan `Kontrak Lengkap`
- perpindahan menu `Pelanggan` dan `Kontrak Lengkap` dioptimalkan dengan:
  - komponen tetap mounted setelah pertama kali dibuka
  - cache memory ringan untuk list utama

## Pembagian Tanggung Jawab

### Next.js

- route handler internal untuk menjaga secret Apps Script tetap di server
- tampilan list dan detail data pelanggan
- form tambah pelanggan, edit pelanggan, upload berkas pelanggan, dan aksi hapus pelanggan
- sinkronisasi detail pelanggan saat mode edit agar daftar file existing tetap akurat
- validasi ringan di sisi UI
- dashboard dan reporting sederhana untuk tahap berikutnya

## Struktur Frontend Saat Ini

Struktur komponen frontend sekarang dipecah per menu agar modular:

- `frontend/app/_components/admin/pelanggan/`
  - `customer-admin.tsx` sebagai container/state utama
  - `customer-table.tsx` untuk tabel pelanggan
  - `customer-form-dialog.tsx` untuk modal tambah/edit
  - `upload-utils.ts` untuk helper upload
  - `types.ts` untuk tipe lokal komponen
- `frontend/app/_components/admin/kontrak/`
  - `contracts-readonly.tsx` untuk list/detail kontrak read-only
  - `contract-utils.ts` untuk formatter dan helper status

Pendekatan ini dipakai agar setiap menu punya folder sendiri dan lebih mudah dikembangkan tanpa menumpuk semua tampilan dalam satu file besar.

### Apps Script

- validasi bisnis final
- endpoint HTTP `doGet/doPost` untuk resource `customers`
- generate `ID Kontrak`
- penentuan status kontrak
- relasi `ID Kontrak Sebelumnya`
- penyisipan baris pada grup `Pelanggan + Lokasi`
- validasi `Kategori`
- validasi eksklusif `Core xor Sharing Core`
- validasi dropdown `Sharing Core`
- pembuatan folder periode
- upload dan linking dokumen

### Spreadsheet

- menyimpan data master operasional
- menyediakan histori kontrak yang bisa diaudit manual
- menjadi fallback operasional jika website belum dipakai penuh

## Model Entitas Awal

Entitas penting yang perlu dianggap stabil di website:

- `contract`
  - `id_kontrak`
  - `previous_contract_id`
  - `kategori`
  - `kode_perusahaan`
  - `nama_perusahaan`
  - `lokasi`
  - `periode_awal`
  - `periode_berakhir`
  - `core`
  - `sharing_core`
  - `nilai_kontrak`
  - `biaya_aktivasi`
  - `perbulan`
  - `nilai_periode_aktif`
  - `status_kontrak`
  - `berkas_url`
  - `keterangan`
- `billing`
  - referensi ke `id_kontrak`
  - data invoice/tagihan
- `customer`
  - data pelanggan

## Endpoint yang Disarankan

Endpoint awal yang kemungkinan dibutuhkan:

- `GET /api/customers`
- `GET /api/customers/:id`
- `POST /api/customers`
- `DELETE /api/customers/:id`
- `GET /api/contracts`
- `GET /api/contracts/:id`
- `GET /api/contracts`
- `GET /api/contracts/:id`
- `POST /api/contracts`
- `POST /api/contracts/:id/renew`
- `POST /api/contracts/:id/upgrade`
- `PUT /api/contracts/:id`
- `DELETE /api/contracts/:id`
- `GET /api/billing/:contractId`

Catatan:

- pada implementasi V1, endpoint `customers` sudah memakai route handler `Next.js` yang memanggil Apps Script Web App
- shared secret integrasi disimpan di environment server `Next.js` dan `Script Properties` Apps Script
- jika nanti migrasi ke database proper, kontrak API bisa dipertahankan agar frontend minim perubahan

## Risiko Jika Tetap Mengandalkan Spreadsheet Terlalu Lama

- rawan bentrok saat banyak user update bersamaan
- query dan reporting makin berat saat data membesar
- validasi makin tersebar bila tidak dijaga ketat
- histori kompleks lebih sulit dioptimalkan
- integrasi auth dan permission lebih terbatas

## Strategi yang Disarankan

Strategi implementasi:

1. tahap 1:
   - spreadsheet + Apps Script tetap jadi backend operasional
   - `Next.js` dibangun sebagai UI admin
2. tahap 2:
   - tetapkan contract API yang stabil
   - mulai kurangi ketergantungan UI langsung ke spreadsheet
3. tahap 3:
   - migrasikan data inti ke database proper seperti PostgreSQL
   - pertahankan spreadsheet hanya untuk audit/ekspor bila perlu

## Kesimpulan

Untuk kondisi sekarang, spreadsheet dan Apps Script masih layak dipakai sebagai backend awal website `Next.js`, terutama untuk mempercepat delivery dan menjaga fleksibilitas bisnis.

Tetapi arsitektur ini sebaiknya diposisikan sebagai fase transisi. Saat alur bisnis stabil dan user bertambah, data inti perlu dipindahkan ke database proper agar performa, validasi, dan maintainability tetap sehat.
