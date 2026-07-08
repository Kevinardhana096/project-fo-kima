# Penjelasan Sheet `Data Billing Backend`

Sheet `Data Billing Backend` adalah tempat simpan detail semua tagihan.

Prinsip utamanya:

- `1 baris = 1 tagihan`
- bukan `1 kontrak = 1 baris`
- jumlah tagihan mengikuti durasi kontrak dan pola penagihan

## Fungsi Sheet

Sheet ini dipakai untuk:

- menyimpan seluruh riwayat tagihan per kontrak
- menjadi sumber data untuk modal `Lihat Billing`
- menyimpan status penagihan dan pembayaran secara rapi

## Kolom Final

- `No`
- `ID Billing`
- `ID Kontrak`
- `No Kontrak`
- `Nama Pelanggan`
- `Lokasi`
- `Periode Tagihan`
- `Nominal Tagihan`
- `No Invoice`
- `Tanggal Ditagih`
- `Tanggal Dibayar`
- `Status Pembayaran`
- `Link Invoice`
- `Keterangan`

## Arti Kolom Penting

- `ID Billing`: ID unik untuk setiap tagihan
- `ID Kontrak`: penghubung ke kontrak induk di sheet `Kontrak Lengkap`
- `Periode Tagihan`: periode tagihan, misalnya bulanan atau periode lain
- `Nominal Tagihan`: nilai tagihan pada periode tersebut
- `Status Pembayaran`: misalnya `Belum Ditagih`, `Sudah Ditagih`, atau `Sudah Dibayar`
- `Link Invoice`: link ke file invoice di Google Drive bila ada

## Cara Kerja

- saat user menekan `Lihat Billing` di sheet `Kontrak Lengkap`
- sistem membaca `ID Kontrak`
- sistem mencari semua baris di sheet ini yang memiliki `ID Kontrak` yang sama
- lalu sistem menampilkan semuanya di modal utama billing
- jika user memilih `Edit` pada salah satu baris tagihan, sistem membuka modal kecil `Edit Tagihan` untuk 1 tagihan tersebut

## Status Implementasi Saat Ini

- kolom `Billing` pada tab `Kontrak Lengkap` saat ini masih berupa placeholder `Lihat Billing`
- struktur data backend billing sudah didefinisikan
- konsep UI yang disepakati saat ini adalah `Mode C`:
  - modal utama `Billing Kontrak`
  - modal kecil `Edit Tagihan`
- implementasi modal billing, generator tagihan, dan update status billing masih menjadi tahap lanjutan
- jadi dokumentasi ini adalah acuan struktur target, belum seluruhnya aktif di script saat ini

## Konsep Tampilan Billing

- `Billing Kontrak` adalah modal utama untuk melihat semua tagihan milik 1 kontrak
- `Edit Tagihan` adalah modal terpisah untuk mengubah 1 data tagihan
- modal utama direncanakan memuat:
  - identitas kontrak
  - ringkasan tagihan
  - tabel daftar tagihan
  - aksi seperti `Generate Billing`, `Tambah Tagihan`, dan `Refresh`
- modal edit direncanakan memuat field:
  - `Periode Tagihan`
  - `Nominal Tagihan`
  - `No Invoice`
  - `Tanggal Ditagih`
  - `Tanggal Dibayar`
  - `Status Pembayaran`
  - `Link Invoice`
  - `Keterangan`

## Kenapa Dipisah dari `Kontrak Lengkap`

Karena jika billing disimpan langsung di sheet kontrak utama:

- sheet menjadi sangat lebar
- sulit dibaca
- tidak fleksibel untuk kontrak dengan durasi berbeda

Dengan dipisah ke backend:

- sheet kontrak utama tetap rapi
- billing bisa fleksibel
- jumlah tagihan bisa berapa pun

## Contoh Logika

- jika 1 kontrak punya 3 tagihan, maka ada 3 baris di sheet ini
- jika 1 kontrak punya 18 tagihan, maka ada 18 baris di sheet ini
- jika ada tagihan tambahan, cukup tambah 1 baris baru

## Hasil yang Diharapkan

Dengan model ini, sheet `Data Billing Backend` menjadi:

- fleksibel
- rapi
- mudah difilter
- mudah dipakai untuk modal monitoring billing
