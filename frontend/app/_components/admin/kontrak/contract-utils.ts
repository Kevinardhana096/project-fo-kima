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

import type { ContractCreateInput } from "@/lib/customer-types";
import type { UploadDraft } from "./types";

export const emptyContractForm: ContractCreateInput = {
  pelangganId: 0,
  kategori: "",
  namaLokasi: "",
  core: "",
  sharingCore: "",
  periodeAwal: "",
  periodeBerakhir: "",
  durasiKontrakBulan: 0,
  noKontrak: "",
  nilaiKontrak: 0,
  biayaAktivasi: 0,
  perbulan: 0,
  linkFolderBerkas: "",
  keterangan: "",
};

export const uploadCategories = ["Kontrak", "BAK-PKS", "Dokumen Lain"];
export const allowedUploadMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);
export const allowedUploadExtensions = new Set([".pdf", ".xlsx", ".docx", ".jpg", ".jpeg", ".png"]);
export const uploadAccept = ".pdf,.xlsx,.docx,.jpg,.jpeg,.png";
export const maxUploadSize = 10 * 1024 * 1024;

export function createUploadDraft(): UploadDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    jenisBerkas: "",
    namaFile: "",
    file: null,
  };
}

export function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function hasAllowedUploadFileType(file: File) {
  const lowerFileName = file.name.toLowerCase();
  return allowedUploadMimeTypes.has(file.type) || [...allowedUploadExtensions].some((extension) => lowerFileName.endsWith(extension));
}

