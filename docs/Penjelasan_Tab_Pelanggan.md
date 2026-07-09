# Penjelasan Tab `Pelanggan`

Tab `Pelanggan` adalah tabel yang menyimpan data pelanggan penyedia layanan kabel FO sekaligus data kerja sama pelanggan tersebut dengan PT KIMA.

Prinsipnya:

- `1 baris = 1 profil pelanggan`
- Profil pelanggan hanya memuat data identitas (kode, nama, kontak) dan tautan ke folder berkas
- Tab ini tidak lagi menyimpan data tanggal kontrak (karena pelacakan kontrak dipindahkan sepenuhnya ke tab `Kontrak Lengkap`)

## Fungsi Tab

Tab ini dipakai untuk:

- menyimpan data profil pelanggan/provider
- menyimpan link folder dokumen pelanggan (seperti PKS induk, dll)
- menjadi sumber pilihan pelanggan saat input data kontrak lokasi

## Menu pada Spreadsheet

- menu `Pelanggan`
- submenu `Tambah Pelanggan`

## Kolom yang Dipakai

- `No`
- `Kode Pelanggan`
- `Nama Pelanggan`
- `Kontrak Aktif`
- `PIC`
- `Telepon`
- `Email`
- `Berkas Pelanggan`
- `Keterangan`
- `Aksi`

## Arti Kolom Penting

- `Kode Pelanggan`: kode unik pelanggan
- `Nama Pelanggan`: nama pelanggan penyedia layanan
- `Kontrak Aktif`: jumlah kontrak/lokasi yang sedang berstatus "Aktif" (dihitung otomatis menggunakan *array formula* gabungan `MAP` dan `COUNTIFS` yang membaca data dari tab `Kontrak Lengkap`)
- `Berkas Pelanggan`: link ke folder utama Google Drive pelanggan
- `Aksi`: kolom aksi baris, misalnya untuk hapus data, dan dipantau oleh trigger Apps Script berdasarkan nama header `Aksi`, bukan nomor kolom statis

## Aturan Input

- data bisa diisi langsung di tabel untuk kebutuhan awal
- sistem UI disiapkan melalui menu `Pelanggan`
- user dapat menekan `Tambah Pelanggan` untuk input lewat form
- data yang sama juga dapat ditambah dari frontend `Next.js` melalui route handler internal yang sekarang meneruskan request ke backend Rust
- data pelanggan yang sudah ada juga dapat diedit dari frontend `Next.js`
- form tambah pelanggan pada frontend `Next.js` mendukung data inti pelanggan dan upload file ke Google Drive lewat backend Rust
- upload/hapus file dari frontend `Next.js` sudah aktif untuk jalur backend Rust modul `Pelanggan`
- setelah disimpan, sistem menambah 1 baris baru ke tab ini
- kolom `Aksi` dapat dipakai untuk penghapusan data per baris bila diperlukan

## Form `Tambah Pelanggan`

Field yang diisi:

- `Kode Pelanggan` opsional
- `Nama Pelanggan` wajib
- `PIC` opsional
- `Telepon` opsional
- `Email` opsional
- `Keterangan` opsional

Section berkas:

- pada mode tambah frontend web, field `Link Folder Berkas (Google Drive)` tidak ditampilkan
- saat tambah pelanggan baru, backend Rust akan membuat folder pelanggan di Google Drive jika link folder belum ada, lalu menyimpan URL folder itu ke kolom `link_folder_berkas` di MySQL
- file upload dikirim sebagai base64 dari browser ke route `Next.js`, lalu diteruskan ke backend Rust untuk diunggah ke Google Drive

Catatan:

- link folder berkas bersifat opsional
- form popup Google Sheets menyimpan data lewat fungsi Apps Script `savePelanggan(formData)`
- alias `savePerusahaan(formData)` tetap dipertahankan untuk kompatibilitas pemanggilan lama
- pada frontend `Next.js`, jika user mengisi link folder manual saat edit, link itu disimpan ke kolom `link_folder_berkas` di MySQL
- pembuatan folder otomatis Google Drive memakai `PELANGGAN_ROOT_FOLDER_ID` di backend Rust
- jika konfigurasi Google Drive tidak valid atau akses service account kurang, proses simpan pelanggan baru dapat gagal
- form memakai skeleton/loading awal saat popup dibuka agar user tidak melihat modal kosong
- form memakai loading dan progress bar agar user tahu proses sedang berjalan
- komponen loading ini sekarang bersifat global dan juga dipakai oleh form kontrak lokasi

## Form `Edit Pelanggan`

Field edit mengikuti field utama pelanggan:

- `Kode Pelanggan`
- `Nama Pelanggan`
- `PIC`
- `Telepon`
- `Email`
- `Link Folder Berkas (Google Drive)`
- `Keterangan`

Section berkas pada mode edit frontend web saat ini:

- menyimpan perubahan link folder Google Drive manual
- menampilkan file existing dari Google Drive
- memproses upload file baru ke subfolder sesuai jenis berkas dengan nama file yang diisi user saat upload
- memproses hapus file existing dengan memindahkan file ke trash Google Drive

Catatan:

- perubahan kode atau nama pelanggan belum me-rename folder Google Drive pada jalur backend Rust
- edit pelanggan tidak me-rename file existing di Google Drive
- hapus file existing dan upload tambahan memakai Google Drive REST API dari backend Rust

## Logika Otomatis

- `No` diisi otomatis
- pada frontend web, kolom `Berkas Pelanggan` berasal dari link folder manual atau folder otomatis yang disimpan di MySQL; untuk pelanggan baru dari web, link ini normalnya terisi otomatis setelah data berhasil disimpan
- backend Rust membuat subfolder `Kontrak`, `BAK-PKS`, dan `Dokumen Lain`
- upload file masuk ke subfolder sesuai `Jenis Berkas`
- input `Nama File` pada form upload dipakai untuk nama file baru yang dibuat di Google Drive

## Aturan Edit Langsung di Tabel

- boleh dipakai untuk koreksi typo atau melengkapi data
- `No` dan `Kontrak Aktif` sebaiknya tidak diedit manual karena dikendalikan oleh formula dan sistem

## Aturan Hapus Data

- sheet dapat memiliki kolom `Aksi`
- kolom `Aksi` dapat berisi pilihan `Hapus`
- saat user memilih `Hapus`, sistem akan membaca posisi kolom dari header `Aksi`, lalu menampilkan dialog konfirmasi sebelum menghapus baris
- pendekatan ini dipakai agar fitur hapus tetap berjalan walau urutan kolom sheet berubah, ada kolom disisipkan, atau beberapa kolom disembunyikan
- pada frontend `Next.js`, hapus pelanggan sekarang mengikuti aturan backend Rust dan akan ditolak jika pelanggan masih memiliki data lokasi
- fitur hapus dipakai untuk salah input, data duplikat, atau data uji coba
- histori yang masih diperlukan sebaiknya tidak dihapus, tetapi dikelola melalui status data

## Integrasi Web Saat Ini

- frontend `Next.js` diposisikan sebagai tampilan kedua untuk data `Pelanggan`
- browser memanggil route handler `Next.js`
- route handler `Next.js` meneruskan request ke backend Rust
- resource web yang aktif pada fase ini mencakup:
  - list pelanggan
  - detail pelanggan
  - tambah pelanggan
  - edit pelanggan
  - hapus pelanggan
- simpan link folder berkas manual
- upload/hapus file pelanggan pada frontend web sudah aktif pada jalur backend Rust
- `Kode Pelanggan` diperlakukan sebagai field opsional, tetapi jika diisi harus unik dan tidak boleh duplikat dengan pelanggan lain
- popup Google Sheets lama masih memakai `savePelanggan`, tetapi itu bukan jalur aktif frontend web saat ini
- sinkronisasi tab `Pelanggan` ke Google Sheets berjalan di background task backend setelah create/update/delete pelanggan
- operasi Google Drive pelanggan pada submit masih berjalan sinkron di request utama; jika Google Drive lambat atau gagal, response API pelanggan ikut menunggu atau gagal

## Struktur Komponen Frontend

Implementasi frontend untuk menu ini sekarang berada di folder:

- `frontend/app/_components/admin/pelanggan/customer-admin.tsx`
- `frontend/app/_components/admin/pelanggan/customer-table.tsx`
- `frontend/app/_components/admin/pelanggan/customer-form-dialog.tsx`

Tujuannya agar:

- folder per menu lebih jelas
- logika state, tabel, dan modal tidak tercampur
- pengembangan fitur berikutnya lebih mudah

## Hubungan dengan Tab Lain

- data di tab ini dipakai sebagai referensi pelanggan pada tab `Kontrak Lengkap`
- satu pelanggan bisa memiliki beberapa riwayat kerja sama
- satu pelanggan bisa dipakai oleh banyak lokasi/customer

## Hasil yang Diharapkan

Dengan model ini, tab `Pelanggan` tetap:

- mudah dibaca
- rapi untuk histori kerja sama
- jelas membedakan dokumen pelanggan dan dokumen lokasi
- siap dipakai untuk input manual maupun sistem input berbasis UI
