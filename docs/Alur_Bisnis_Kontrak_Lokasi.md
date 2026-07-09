# Alur Bisnis Kontrak Lokasi

Dokumen ini merangkum alur bisnis inti pada sheet `Kontrak Lengkap` agar aturan operasional, implementasi Apps Script, dan pengembangan website tetap mengacu ke satu sumber yang ringkas.

Catatan:

- dokumen ini terutama menjelaskan aturan bisnis inti kontrak dan histori, bukan status teknis implementasi frontend/backend terbaru
- mekanisme teknis lama yang spesifik ke spreadsheet atau Apps Script bisa berbeda dengan implementasi aktif di backend Rust/MySQL

## Prinsip Dasar

- `1 baris = 1 kontrak`
- setiap perubahan penting kontrak dibuat sebagai baris baru
- kontrak lama tidak dihapus jika masih dibutuhkan sebagai histori
- histori antar kontrak dihubungkan melalui `ID Kontrak Sebelumnya`
- kontrak baru harus tetap dikelompokkan pada grup `Pelanggan + Lokasi` yang sama

## Struktur Data Penting

- `ID Kontrak`: ID unik kontrak
- `ID Kontrak Sebelumnya`: referensi ke kontrak asal bila kontrak ini hasil `Perpanjangan` atau `Di-upgrade`
- `Status Kontrak`: status operasional kontrak
- `Periode Awal` dan `Periode Berakhir`: dasar perhitungan durasi, sisa waktu, dan lifecycle status
- `Perbulan`: nilai bulanan kontrak
- `Nilai Periode Aktif`: nilai otomatis hasil `Perbulan x Durasi Kontrak`

## Daftar Status Kontrak

- `Aktif`: kontrak sedang berjalan
- `Belum Beroperasi`: kontrak sudah dibuat, tetapi tanggal mulai belum masuk
- `Berakhir`: kontrak sudah selesai dan tidak punya tindak lanjut
- `Diperpanjang`: kontrak lama sudah punya kontrak lanjutan hasil perpanjangan
- `Di-upgrade`: kontrak lama dipotong karena perubahan paket di tengah periode
- `Nonaktif`: kontrak diputus manual oleh admin

## Aksi Manual pada Kolom `Aksi`

Nilai dropdown dikelola manual di sheet:

- `Edit`
- `Perpanjang`
- `Di-upgrade`
- `Hapus`

## Tambah Kontrak Lokasi

Digunakan saat membuat kontrak baru dari nol.

Aturan:

- sistem menambah 1 baris kontrak baru
- `ID Kontrak Sebelumnya` kosong
- folder Drive dibuat berdasarkan `Lokasi` dan `Periode`
- status kontrak dihitung otomatis:
  - `Belum Beroperasi` jika tanggal mulai belum masuk
  - `Aktif` jika sedang berjalan
  - `Berakhir` jika sudah lewat

## Perpanjangan Kontrak Lokasi

Digunakan saat kontrak lama dilanjutkan ke periode berikutnya.

Aturan sumber:

- hanya kontrak terbaru pada grup `Pelanggan + Lokasi` yang sama yang boleh diperpanjang
- kontrak sumber tidak boleh sudah punya kontrak turunan

Aturan hasil:

- sistem membuat baris kontrak baru
- kontrak baru menyimpan `ID Kontrak Sebelumnya`
- kontrak baru disisipkan ke grup `Pelanggan + Lokasi` yang sama
- kontrak baru membuat folder periode baru

Aturan status:

- jika kontrak lama masih berjalan dan kontrak baru mulai di masa depan:
  - kontrak lama tetap `Aktif`
  - kontrak baru `Belum Beroperasi`
- jika kontrak lanjutan sudah mulai berlaku:
  - kontrak lama menjadi `Diperpanjang`
  - kontrak baru menjadi `Aktif`
- jika tidak ada tindak lanjut, kontrak yang selesai menjadi `Berakhir`

## Upgrade Kontrak Lokasi

Digunakan saat paket berubah di tengah periode kontrak yang masih berjalan.

Aturan sumber:

- hanya kontrak `Aktif` terbaru pada grup `Pelanggan + Lokasi` yang sama yang boleh di-upgrade
- kontrak sumber tidak boleh sudah punya kontrak turunan

Aturan hasil:

- sistem membuat kontrak baru
- kontrak baru menyimpan `ID Kontrak Sebelumnya`
- kontrak baru disisipkan ke grup `Pelanggan + Lokasi` yang sama
- kontrak baru membuat folder periode baru

Aturan periode:

- `Periode Awal` kontrak baru default ke tanggal hari ini, tetapi tetap bisa diedit
- `Periode Berakhir` kontrak baru tetap muncul dan bisa diedit
- kontrak lama dipotong sampai sehari sebelum `Periode Awal` kontrak baru

Aturan nilai:

- `Perbulan` kontrak lama tetap memakai tarif lama
- `Durasi Kontrak` lama otomatis menyesuaikan karena periode lama dipotong
- `Nilai Periode Aktif` lama ikut berubah
- `Nilai Kontrak` lama harus merepresentasikan hanya periode yang benar-benar terpakai sebelum upgrade
- kontrak baru memakai paket, harga, dan nilai baru

Aturan status:

- kontrak lama menjadi `Di-upgrade`
- kontrak baru:
  - `Aktif` jika tanggal mulai sudah berlaku
  - `Belum Beroperasi` jika tanggal mulai masih di masa depan

## Hapus Kontrak

Dipakai untuk salah input, duplikat, atau data uji.

Aturan:

- sistem menghapus baris kontrak
- sistem menghapus folder periode kontrak jika folder itu tidak dipakai kontrak lain
- histori yang masih dibutuhkan sebaiknya tidak dihapus

## Struktur Folder Drive

Setiap kontrak lokasi disimpan dengan pola:

- `Root Lokasi`
- `Root Lokasi/Nama Lokasi`
- `Root Lokasi/Nama Lokasi/DD-MM-YYYY s.d. DD-MM-YYYY`
- subfolder:
  - `Kontrak`
  - `BAK-PKS`
  - `Dokumen Lain`

Implikasi:

- kontrak baru, perpanjangan, dan upgrade masing-masing punya folder periodenya sendiri
- semua histori tetap ngumpul di bawah folder `Lokasi` yang sama

## Implikasi ke Website

Jika spreadsheet ini dipakai sebagai backend operasional untuk website:

- `ID Kontrak` harus diperlakukan sebagai identifier utama
- `ID Kontrak Sebelumnya` dipakai untuk membentuk histori/rantai kontrak
- status kontrak tidak boleh ditebak hanya dari tanggal; perlu ikut membaca status hasil rekonsiliasi sistem
- aksi `Perpanjang` dan `Di-upgrade` harus tetap membuat record baru, bukan update destruktif ke kontrak lama
