"use client";

import { useEffect } from "react";
import type { CustomerRecord, CustomerFileRecord, ContractCreateInput } from "@/lib/customer-types";
import type { UploadDraft } from "./types";
import { uploadAccept, uploadCategories, maxUploadSize } from "./contract-utils";

export type ContractMode = "create" | "update" | "renew" | "upgrade";

function calculateContractMonths(startValue: string, endValue: string) {
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }

  let cursor = new Date(start);
  let months = 0;

  while (cursor <= end) {
    months += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
  }

  return months;
}

type ContractFormDialogProps = {
  mode: ContractMode;
  form: ContractCreateInput & { alasanPerubahan?: string };
  isSaving: boolean;
  saveStatus: string;
  uploadDrafts: UploadDraft[];
  existingFiles: CustomerFileRecord[];
  deleteFileIds: string[];
  customers: CustomerRecord[];
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  onFormChange: (nextForm: ContractCreateInput & { alasanPerubahan?: string }) => void;
  onAddUploadDraft: () => void;
  onRemoveUploadDraft: (id: string) => void;
  onUpdateUploadDraft: (id: string, changes: Partial<UploadDraft>) => void;
  onToggleDeleteFile: (fileId: string) => void;
};

export function ContractFormDialog({
  mode,
  form,
  isSaving,
  saveStatus,
  uploadDrafts,
  existingFiles,
  deleteFileIds,
  customers,
  onClose,
  onSubmit,
  onFormChange,
  onAddUploadDraft,
  onRemoveUploadDraft,
  onUpdateUploadDraft,
  onToggleDeleteFile,
}: ContractFormDialogProps) {
  useEffect(() => {
    if (form.periodeAwal && form.periodeBerakhir) {
      const months = calculateContractMonths(form.periodeAwal, form.periodeBerakhir);
      if (months !== form.durasiKontrakBulan) {
        onFormChange({ ...form, durasiKontrakBulan: months });
      }
    }
  }, [form, onFormChange]);

  useEffect(() => {
    if (form.nilaiKontrak > 0 && form.durasiKontrakBulan && form.durasiKontrakBulan > 0) {
      const perbulan = Math.round(form.nilaiKontrak / form.durasiKontrakBulan);
      if (perbulan !== form.perbulan) {
        onFormChange({ ...form, perbulan });
      }
    }
  }, [form, onFormChange]);

  const titleMap = {
    create: "Tambah Kontrak Baru",
    update: "Edit Kontrak",
    renew: "Perpanjang Kontrak",
    upgrade: "Upgrade Kontrak",
  };

  const kickerMap = {
    create: "Create",
    update: "Update",
    renew: "Renew",
    upgrade: "Upgrade",
  };

  return (
    <div className="fo-modal-overlay" onClick={onClose}>
      <div className="fo-modal-content fo-card" onClick={(event) => event.stopPropagation()}>
        <div className="fo-card-head" style={{ marginBottom: "24px" }}>
          <div>
            <p className="fo-card-kicker">{kickerMap[mode]}</p>
            <h2>{titleMap[mode]}</h2>
          </div>
          <button className="fo-close-button" type="button" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <form className="fo-form" onSubmit={onSubmit}>
          <label>
            Pelanggan
            <select
              value={form.pelangganId}
              onChange={(event) => onFormChange({ ...form, pelangganId: Number(event.target.value) })}
              required
              disabled={mode !== "create"}
            >
              <option value="0">-- Pilih Pelanggan --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.kodePelanggan ? `[${c.kodePelanggan}] ` : ""}{c.namaPelanggan}
                </option>
              ))}
            </select>
          </label>

          <div className="fo-form-row">
            <label>
              Kategori
              <select
                value={form.kategori}
                onChange={(event) => onFormChange({ ...form, kategori: event.target.value })}
                required
              >
                <option value="">-- Pilih Kategori --</option>
                <option value="KIMA">KIMA</option>
                <option value="KIMA ANEKA">KIMA ANEKA</option>
                <option value="LUAR KIMA">LUAR KIMA</option>
              </select>
            </label>

            <label>
              Nama Lokasi
              <input
                value={form.namaLokasi}
                onChange={(event) => onFormChange({ ...form, namaLokasi: event.target.value })}
                placeholder="Misal: Gudang Blok A"
                required
              />
            </label>
          </div>

          <div className="fo-form-row">
            <label>
              Core (Teks)
              <input
                value={form.core || ""}
                onChange={(event) => onFormChange({ ...form, core: event.target.value })}
                placeholder="Misal: 2 Core"
              />
            </label>

            <label>
              Sharing Core
              <select
                value={form.sharingCore || ""}
                onChange={(event) => onFormChange({ ...form, sharingCore: event.target.value })}
              >
                <option value="">-- Tidak ada --</option>
                <option value="1/2">1/2</option>
                <option value="1/4">1/4</option>
                <option value="1/8">1/8</option>
                <option value="1/16">1/16</option>
              </select>
            </label>
          </div>

          <div className="fo-form-row">
            <label>
              Periode Awal
              <input
                type="date"
                value={form.periodeAwal}
                onChange={(event) => onFormChange({ ...form, periodeAwal: event.target.value })}
                required
              />
            </label>

            <label>
              Periode Berakhir
              <input
                type="date"
                value={form.periodeBerakhir || ""}
                onChange={(event) => onFormChange({ ...form, periodeBerakhir: event.target.value })}
              />
            </label>
          </div>

          <div className="fo-form-row">
            <label>
              Durasi (Bulan)
              <input
                type="number"
                value={form.durasiKontrakBulan || ""}
                readOnly
                disabled
                placeholder="Otomatis"
              />
            </label>

            <label>
              No Kontrak
              <input
                value={form.noKontrak || ""}
                onChange={(event) => onFormChange({ ...form, noKontrak: event.target.value })}
              />
            </label>
          </div>

          <div className="fo-form-row">
            <label>
              Nilai Kontrak (Rp)
              <input
                type="number"
                min="0"
                value={form.nilaiKontrak || ""}
                onChange={(event) => onFormChange({ ...form, nilaiKontrak: Number(event.target.value) })}
                required
              />
            </label>

            <label>
              Biaya Aktivasi (Rp)
              <input
                type="number"
                min="0"
                value={form.biayaAktivasi || ""}
                onChange={(event) => onFormChange({ ...form, biayaAktivasi: Number(event.target.value) })}
              />
            </label>
          </div>

          <label>
            Biaya Per Bulan (Rp)
            <input
              type="number"
              min="0"
              value={form.perbulan || ""}
              onChange={(event) => onFormChange({ ...form, perbulan: Number(event.target.value) })}
              required
            />
          </label>

          {mode === "upgrade" && (
            <label>
              Alasan Perubahan (Khusus Upgrade)
              <input
                value={form.alasanPerubahan || ""}
                onChange={(event) => onFormChange({ ...form, alasanPerubahan: event.target.value })}
                placeholder="Misal: Penambahan bandwidth"
                required
              />
            </label>
          )}

          <label>
            Keterangan
            <textarea
              value={form.keterangan || ""}
              onChange={(event) => onFormChange({ ...form, keterangan: event.target.value })}
              rows={2}
            />
          </label>

          <hr className="fo-divider" />

          <div className="fo-upload-section">
            <div className="fo-upload-item-head" style={{ marginBottom: "16px" }}>
              <div>
                <span className="fo-section-label">Berkas Kontrak</span>
                <small style={{ display: "block", color: "rgba(31, 41, 55, 0.6)" }}>
                  (Max {maxUploadSize / 1024 / 1024}MB per file)
                </small>
              </div>
              <button type="button" className="fo-secondary-button" onClick={onAddUploadDraft}>
                + Tambah File
              </button>
            </div>

            {existingFiles.length > 0 && (
              <div className="fo-existing-files" style={{ marginBottom: "16px" }}>
                {existingFiles.map((file) => (
                  <div
                    key={file.fileId}
                    className="fo-upload-item"
                    style={{
                      opacity: deleteFileIds.includes(file.fileId) ? 0.5 : 1,
                    }}
                  >
                    <div className="fo-upload-item-head">
                      <div>
                        <strong>{file.namaFile}</strong>
                        <small>{file.jenisBerkas}</small>
                      </div>
                      <label className="fo-checkbox-row" style={{ margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={deleteFileIds.includes(file.fileId)}
                          onChange={() => onToggleDeleteFile(file.fileId)}
                        />
                        Hapus
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {uploadDrafts.length > 0 ? (
              <div className="fo-upload-list">
                {uploadDrafts.map((draft) => (
                  <div key={draft.id} className="fo-upload-item">
                    <div className="fo-upload-item-head">
                      <strong>Draft Baru</strong>
                      <button
                        type="button"
                        className="fo-danger-button"
                        onClick={() => onRemoveUploadDraft(draft.id)}
                      >
                        Batal
                      </button>
                    </div>
                    <div className="fo-form-row">
                      <select
                        value={draft.jenisBerkas}
                        onChange={(e) => onUpdateUploadDraft(draft.id, { jenisBerkas: e.target.value })}
                        required
                      >
                        <option value="">-- Kategori --</option>
                        {uploadCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <input
                        placeholder="Nama File (Opsional)"
                        value={draft.namaFile}
                        onChange={(e) => onUpdateUploadDraft(draft.id, { namaFile: e.target.value })}
                      />
                    </div>
                    <input
                      type="file"
                      accept={uploadAccept}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onUpdateUploadDraft(draft.id, {
                            file,
                            namaFile: draft.namaFile || file.name.split(".").slice(0, -1).join("."),
                          });
                        }
                      }}
                      required={!draft.file}
                    />
                    {draft.file && (
                      <small style={{ color: "var(--success)" }}>
                        File dipilih: {draft.file.name} ({(draft.file.size / 1024).toFixed(1)} KB)
                      </small>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="fo-upload-empty">Tidak ada draft file baru.</p>
            )}
          </div>

          <hr className="fo-divider" />

          <div className="fo-form-actions">
            <button
              className="fo-secondary-button"
              type="button"
              onClick={onClose}
              disabled={isSaving}
            >
              Batal
            </button>
            <button className="fo-primary-button" type="submit" disabled={isSaving}>
              {isSaving ? "Menyimpan..." : "Simpan Kontrak"}
            </button>
          </div>

          {saveStatus && (
            <div className="fo-save-status" style={{ textAlign: "center", marginTop: "12px" }}>
              {saveStatus}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
