This is the `Next.js` frontend for the FO KIMA admin portal. The active internal routes now talk to the Rust backend for `Pelanggan` and read-only `Kontrak Lengkap`.

## Getting Started

1. Copy `.env.example` to `.env.local`.
2. Fill these variables:

```bash
BACKEND_API_BASE_URL=http://127.0.0.1:8080
```

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Current capabilities:

- list pelanggan
- detail pelanggan
- tambah pelanggan
- edit pelanggan
- hapus pelanggan
- simpan link folder berkas pelanggan
- upload/hapus berkas pelanggan ke Google Drive
- list `Kontrak Lengkap` read-only
- detail `Kontrak Lengkap` read-only
- tampilkan `Kategori`, `Core`, dan `Sharing Core` pada list kontrak

Notes:

- browser hanya memanggil `/api/customers`
- browser juga memanggil `/api/kontrak-lengkap` untuk list `Kontrak Lengkap`
- `Next.js` server sekarang meneruskan request utama ke backend Rust melalui `BACKEND_API_BASE_URL`
- route `/api/kontrak-lengkap` di Next.js memakai endpoint backend `/api/kontrak-lengkap`
- upload/hapus berkas pelanggan diteruskan ke backend Rust dan diproses ke Google Drive
- pada mode tambah pelanggan, field `Link Folder Berkas` tidak ditampilkan
- saat pelanggan baru disimpan tanpa link folder, backend Rust normalnya membuat folder pelanggan otomatis lalu menyimpan URL folder ke MySQL
- pada mode edit pelanggan, user bisa mengisi atau mengganti `Link Folder Berkas` secara manual
- menu `Pelanggan` dan `Kontrak Lengkap` tidak lagi memakai tombol `Muat Ulang`
- perpindahan menu dioptimalkan dengan komponen persistent mount dan cache memory ringan untuk list utama

## Frontend Structure

Komponen sekarang dipecah per menu:

```text
app/_components/admin/
  pelanggan/
    customer-admin.tsx
    customer-table.tsx
    customer-form-dialog.tsx
    upload-utils.ts
    types.ts
  kontrak/
    contracts-readonly.tsx
    contract-utils.ts
```

Tujuannya:

- setiap menu punya folder sendiri
- file tampilan lebih modular
- logic upload dan tampilan tabel lebih mudah dirawat

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
