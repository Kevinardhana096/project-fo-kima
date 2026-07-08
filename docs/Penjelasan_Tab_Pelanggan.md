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
- data yang sama juga dapat ditambah dari frontend `Next.js` melalui route handler internal dan API `Apps Script Web App`
- data pelanggan yang sudah ada juga dapat diedit dari frontend `Next.js`
- form tambah pelanggan pada frontend `Next.js` juga sudah mendukung upload berkas
- form edit pelanggan pada frontend `Next.js` juga sudah mendukung pengelolaan berkas
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

- bisa upload banyak file
- tiap file memiliki:
  - `Jenis Berkas`
  - `Upload File`
  - `Nama File`

Catatan:

- upload berkas bersifat opsional
- `Jenis Berkas` dapat berupa `Kontrak`, `BAK-PKS`, atau `Dokumen Lain`
- nama file dapat ditentukan manual oleh user
- form popup Google Sheets menyimpan data lewat fungsi Apps Script `savePelanggan(formData)`
- alias `savePerusahaan(formData)` tetap dipertahankan untuk kompatibilitas pemanggilan lama
- pada frontend `Next.js`, tipe file yang diterima saat ini adalah `PDF`, `XLSX`, `DOCX`, `JPG`, dan `PNG`
- pada frontend `Next.js`, ukuran file dibatasi `10 MB` per file
- setelah simpan, sistem membuat folder pelanggan dan mengisi kolom `Berkas Pelanggan` dengan link folder utama
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
- `Keterangan`

Section berkas pada mode edit sekarang mendukung:

- menampilkan file existing dari folder pelanggan
- membuka file existing lewat link langsung
- menandai file existing untuk dihapus saat simpan
- upload file baru tambahan ke subfolder sesuai `Jenis Berkas`

Catatan:

- perubahan kode atau nama pelanggan akan ikut me-rename folder utama pelanggan di Google Drive
- file existing baru benar-benar dihapus saat user menekan simpan
- upload tambahan pada mode edit memakai validasi file yang sama dengan mode tambah

## Logika Otomatis

- `No` diisi otomatis
- sistem membuat folder utama pelanggan dengan format `Kode Pelanggan - Nama Pelanggan`
- sistem membuat subfolder:
  - `Kontrak`
  - `BAK-PKS`
  - `Dokumen Lain`
- jika berkas diunggah, file masuk ke subfolder sesuai jenis berkas
- kolom `Berkas Pelanggan` tetap mengarah ke folder utama pelanggan, bukan ke file kontrak tunggal
- nama file upload saat ini memakai pola `Nama File Manual + ekstensi file asli`

## Aturan Edit Langsung di Tabel

- boleh dipakai untuk koreksi typo atau melengkapi data
- `No` dan `Kontrak Aktif` sebaiknya tidak diedit manual karena dikendalikan oleh formula dan sistem

## Aturan Hapus Data

- sheet dapat memiliki kolom `Aksi`
- kolom `Aksi` dapat berisi pilihan `Hapus`
- saat user memilih `Hapus`, sistem akan membaca posisi kolom dari header `Aksi`, lalu menampilkan dialog konfirmasi sebelum menghapus baris
- pendekatan ini dipakai agar fitur hapus tetap berjalan walau urutan kolom sheet berubah, ada kolom disisipkan, atau beberapa kolom disembunyikan
- pada frontend `Next.js` V1, hapus pelanggan juga tersedia, tetapi masih terbatas pada penghapusan baris sheet dan belum membersihkan folder Drive pelanggan
- fitur hapus dipakai untuk salah input, data duplikat, atau data uji coba
- histori yang masih diperlukan sebaiknya tidak dihapus, tetapi dikelola melalui status data

## Integrasi Web V1

- frontend `Next.js` diposisikan sebagai tampilan kedua untuk data `Pelanggan`
- browser tidak memanggil Apps Script langsung; request selalu masuk ke route handler `Next.js` terlebih dahulu
- route handler `Next.js` meneruskan request ke `Apps Script Web App` dengan shared secret server-to-server
- resource web yang aktif pada fase ini mencakup:
  - list pelanggan
  - detail pelanggan
  - tambah pelanggan
  - edit pelanggan
  - hapus pelanggan
- upload file pada frontend web sudah aktif untuk alur `Tambah Pelanggan`
- upload file pada frontend web juga sudah aktif untuk alur `Edit Pelanggan`
- alur edit pada frontend web juga sudah mendukung `existingFiles` dan `deleteFileIds`
- `Kode Pelanggan` diperlakukan sebagai field opsional, tetapi jika diisi harus unik dan tidak boleh duplikat dengan pelanggan lain
- pada sisi Google Sheets popup, nama fungsi simpan utama yang aktif adalah `savePelanggan`, bukan `savePerusahaan`

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
