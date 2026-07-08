"use client";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function getContractStatusClass(status: string) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "aktif") return "is-positive";
  if (normalized === "belum beroperasi") return "is-warning";
  if (normalized === "berakhir" || normalized === "nonaktif") return "is-neutral";
  if (normalized === "diperpanjang" || normalized === "di-upgrade") return "is-accent";
  return "";
}
