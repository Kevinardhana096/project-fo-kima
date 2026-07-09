"use client";

import type { CustomerCreateInput, CustomerFileRecord } from "@/lib/customer-types";

import type { UploadDraft } from "./types";
import { uploadAccept, uploadCategories } from "./upload-utils";

type CustomerFormDialogProps = {
  form: CustomerCreateInput;
  isEditing: boolean;
  isSaving: boolean;
  saveStatus: string;
  uploadDrafts: UploadDraft[];
  existingFiles: CustomerFileRecord[];
  deleteFileIds: string[];
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  onFormChange: (nextForm: CustomerCreateInput) => void;
  onAddUploadDraft: () => void;
  onRemoveUploadDraft: (id: string) => void;
  onUpdateUploadDraft: (id: string, changes: Partial<UploadDraft>) => void;
  onToggleDeleteFile: (fileId: string) => void;
};

export function CustomerFormDialog({
  form,
  isEditing,
  isSaving,
  saveStatus,
  uploadDrafts,
  existingFiles,
  deleteFileIds,
  onClose,
  onSubmit,
  onFormChange,
  onAddUploadDraft,
  onRemoveUploadDraft,
  onUpdateUploadDraft,
  onToggleDeleteFile,
}: CustomerFormDialogProps) {
  return (
    <div className="fo-modal-overlay" onClick={onClose}>
      <div className="fo-modal-content fo-card" onClick={(event) => event.stopPropagation()}>
        <div className="fo-card-head" style={{ marginBottom: "24px" }}>
          <div>
            <p className="fo-card-kicker">{isEditing ? "Update" : "Create"}</p>
            <h2>{isEditing ? "Edit Pelanggan" : "Tambah Pelanggan"}</h2>
          </div>
          <button className="fo-close-button" type="button" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <form className="fo-form" onSubmit={onSubmit}>
          <label>
            Kode Pelanggan
            <input
              value={form.kodePelanggan}
              onChange={(event) => onFormChange({ ...form, kodePelanggan: event.target.value })}
              placeholder="Opsional tapi harus unik"
            />
          </label>

          <label>
            Nama Pelanggan
            <input
              value={form.namaPelanggan}
              onChange={(event) => onFormChange({ ...form, namaPelanggan: event.target.value })}
              placeholder="Wajib"
              required
            />
          </label>

          <div className="fo-form-row">
            <label>
              PIC
              <input
                value={form.pic}
                onChange={(event) => onFormChange({ ...form, pic: event.target.value })}
              />
            </label>

            <label>
              Telepon
              <input
                value={form.telepon}
                onChange={(event) => onFormChange({ ...form, telepon: event.target.value })}
              />
            </label>
          </div>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => onFormChange({ ...form, email: event.target.value })}
            />
          </label>

          <label>
            Keterangan
            <textarea
              value={form.keterangan}
              onChange={(event) => onFormChange({ ...form, keterangan: event.target.value })}
              rows={4}
            />
          </label>

          <section className="fo-upload-section">
            <div className="fo-upload-head">
              <div>
                <strong>Berkas Pelanggan</strong>
                <span>Tautan folder Google Drive akan dibuat otomatis saat menyimpan berkas.</span>
              </div>
            </div>

            {isEditing && (
              <div style={{ marginTop: "16px", marginBottom: "24px" }}>
                <label>
                  <strong>Link Folder Berkas (Google Drive)</strong>
                  <input
                    type="url"
                    value={form.linkFolderBerkas || ""}
                    onChange={(event) => onFormChange({ ...form, linkFolderBerkas: event.target.value })}
                    placeholder="https://drive.google.com/..."
                    style={{ marginTop: "8px" }}
                  />
                </label>
              </div>
            )}

            {isEditing ? (
              <div className="fo-existing-files">
                <strong className="fo-section-label">File Existing</strong>
                {existingFiles.length > 0 ? (
                  <div className="fo-upload-list">
                    {existingFiles.map((file) => {
                      const isMarkedForDeletion = deleteFileIds.includes(file.fileId);

                      return (
                        <div className="fo-upload-item" key={file.fileId}>
                          <div className="fo-upload-item-head">
                            <strong>{file.namaFile}</strong>
                            <label className="fo-checkbox-row">
                              <input
                                type="checkbox"
                                checked={isMarkedForDeletion}
                                onChange={() => onToggleDeleteFile(file.fileId)}
                              />
                              <span>Hapus File</span>
                            </label>
                          </div>
                          <div className="fo-table-cell-text">
                            <span>{file.jenisBerkas || "Dokumen"}</span>
                            <a className="fo-table-link" href={file.url} target="_blank" rel="noreferrer">
                              Buka file
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="fo-upload-empty">Belum ada berkas pelanggan.</p>
                )}
              </div>
            ) : null}

            <div className="fo-upload-head">
              <div>
                <strong>{isEditing ? "Upload Berkas Tambahan" : "Upload Berkas"}</strong>
                <span>Pilih file yang akan disimpan ke Google Drive Pelanggan.</span>
              </div>
              <button
                className="fo-secondary-button"
                type="button"
                onClick={onAddUploadDraft}
              >
                + Tambah Berkas
              </button>
            </div>

            {uploadDrafts.length > 0 ? (
              <div className="fo-upload-list">
                {uploadDrafts.map((item, index) => (
                  <div className="fo-upload-item" key={item.id}>
                    <div className="fo-upload-item-head">
                      <strong>Berkas #{index + 1}</strong>
                      <button
                        className="fo-danger-button"
                        type="button"
                        onClick={() => onRemoveUploadDraft(item.id)}
                      >
                        Hapus
                      </button>
                    </div>
                    <div className="fo-form-row">
                      <label>
                        Jenis Berkas
                        <select
                          value={item.jenisBerkas}
                          onChange={(event) => onUpdateUploadDraft(item.id, { jenisBerkas: event.target.value })}
                        >
                          <option value="">Pilih jenis berkas</option>
                          {uploadCategories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Nama File
                        <input
                          value={item.namaFile}
                          onChange={(event) => onUpdateUploadDraft(item.id, { namaFile: event.target.value })}
                          placeholder="Nama file manual"
                        />
                      </label>
                    </div>
                    <label>
                      Upload File
                      <input
                        accept={uploadAccept}
                        type="file"
                        onChange={(event) => {
                          const nextFile = event.target.files?.[0] || null;
                          onUpdateUploadDraft(item.id, {
                            file: nextFile,
                            namaFile: item.namaFile || (nextFile ? nextFile.name.replace(/\.[^.]+$/, "") : item.namaFile),
                          });
                        }}
                      />
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="fo-upload-empty">Belum ada berkas untuk di-upload.</p>
            )}
          </section>

          {saveStatus ? <div className="fo-save-status">{saveStatus}</div> : null}

          <div className="fo-modal-actions">
            <button className="fo-secondary-button" type="button" onClick={onClose} disabled={isSaving}>
              Batal
            </button>
            <button className="fo-primary-button" type="submit" disabled={isSaving}>
              {isSaving ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Simpan Pelanggan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
