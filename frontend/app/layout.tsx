import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FO KIMA Admin Portal",
  description: "Frontend Next.js untuk monitoring dan pengelolaan data pelanggan FO KIMA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
