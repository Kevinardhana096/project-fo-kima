"use client";

import type { CustomerCreateInput } from "@/lib/customer-types";

import type { UploadDraft } from "./types";

export const emptyForm: CustomerCreateInput = {
  kodePelanggan: "",
  namaPelanggan: "",
  pic: "",
  telepon: "",
  email: "",
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
