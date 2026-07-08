"use client";

import { useDeferredValue, useEffect, useState } from "react";

import type { ApiResponse, CustomerCreateInput, CustomerFileRecord, CustomerRecord, CustomerUploadItem } from "@/lib/customer-types";

import { CustomerFormDialog } from "./customer-form-dialog";
import { CustomerTable } from "./customer-table";
import type { UploadDraft } from "./types";
import {
  createUploadDraft,
  emptyForm,
  fileToBase64,
  hasAllowedUploadFileType,
  maxUploadSize,
} from "./upload-utils";

let customersCache: CustomerRecord[] | null = null;

export function CustomerAdmin() {
  const [customers, setCustomers] = useState<CustomerRecord[]>(() => customersCache || []);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [form, setForm] = useState<CustomerCreateInput>(emptyForm);
  const [isLoading, setIsLoading] = useState(() => !customersCache);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [uploadDrafts, setUploadDrafts] = useState<UploadDraft[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState("");
  const [existingFiles, setExistingFiles] = useState<CustomerFileRecord[]>([]);
  const [deleteFileIds, setDeleteFileIds] = useState<string[]>([]);

  const isEditing = Boolean(editingCustomerId);

  useEffect(() => {
    if (customersCache) {
      return;
    }

    void loadCustomers();
  }, []);

  async function loadCustomers() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/customers", {
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse<CustomerRecord[]>;

      if (!payload.success) {
        throw new Error(payload.error.message);
      }

      customersCache = payload.data;
      setCustomers(payload.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat data pelanggan.");
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingCustomerId("");
    setSaveStatus("");
    setUploadDrafts([]);
    setExistingFiles([]);
    setDeleteFileIds([]);
    setIsModalOpen(false);
  }

  function startCreateCustomer() {
    setEditingCustomerId("");
    setForm(emptyForm);
    setUploadDrafts([]);
    setExistingFiles([]);
    setDeleteFileIds([]);
    setSaveStatus("");
    setSuccessMessage("");
    setErrorMessage("");
    setIsModalOpen(true);
  }

  async function startEditCustomer(customer: CustomerRecord) {
    setEditingCustomerId(customer.id);
    setForm({
      kodePelanggan: customer.kodePelanggan,
      namaPelanggan: customer.namaPelanggan,
      pic: customer.pic,
      telepon: customer.telepon,
      email: customer.email,
      keterangan: customer.keterangan,
    });
    setUploadDrafts([]);
    setExistingFiles(customer.existingFiles || []);
    setDeleteFileIds([]);
    setSaveStatus("");
    setSuccessMessage("");
    setErrorMessage("");
    setIsModalOpen(true);

    try {
      const response = await fetch(`/api/customers/${encodeURIComponent(customer.id)}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse<CustomerRecord>;

      if (!payload.success) {
        throw new Error(payload.error.message);
      }

      setForm({
        kodePelanggan: payload.data.kodePelanggan,
        namaPelanggan: payload.data.namaPelanggan,
        pic: payload.data.pic,
        telepon: payload.data.telepon,
        email: payload.data.email,
        keterangan: payload.data.keterangan,
      });
      setExistingFiles(payload.data.existingFiles || []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat detail pelanggan.");
    }
  }

  function updateUploadDraft(id: string, changes: Partial<UploadDraft>) {
    setUploadDrafts((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }

  async function buildUploadItems() {
    const uploadItems: CustomerUploadItem[] = [];
    const activeDrafts = uploadDrafts.filter(
      (item) => item.file || item.jenisBerkas || item.namaFile.trim(),
    );

    for (const [index, item] of activeDrafts.entries()) {
      const label = `Berkas #${index + 1}`;

      if (!item.file) {
        throw new Error(`${label}: pilih file terlebih dahulu.`);
      }

      if (!item.jenisBerkas) {
        throw new Error(`${label}: jenis berkas wajib dipilih.`);
      }

      if (!item.namaFile.trim()) {
        throw new Error(`${label}: nama file wajib diisi.`);
      }

      if (!hasAllowedUploadFileType(item.file)) {
        throw new Error(`${label}: tipe file tidak didukung. Gunakan PDF, XLSX, DOCX, JPG, atau PNG.`);
      }

      if (item.file.size > maxUploadSize) {
        throw new Error(`${label}: ukuran file maksimal 10 MB.`);
      }

      setSaveStatus(`Membaca ${label}...`);
      uploadItems.push({
        jenisBerkas: item.jenisBerkas,
        namaFile: item.namaFile.trim(),
        originalFileName: item.file.name,
        mimeType: item.file.type,
        base64Data: await fileToBase64(item.file),
        size: item.file.size,
      });
    }

    return uploadItems;
  }

  async function handleSubmitCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    setSaveStatus("");

    try {
      const uploadItems = await buildUploadItems();
      const url = isEditing
        ? `/api/customers/${encodeURIComponent(editingCustomerId)}`
        : "/api/customers";
      const method = isEditing ? "PUT" : "POST";
      setSaveStatus(isEditing ? "Menyimpan perubahan..." : "Menyimpan data pelanggan...");

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          deleteFileIds,
          uploadItems,
        }),
      });
      const payload = (await response.json()) as ApiResponse<CustomerRecord>;

      if (!payload.success) {
        throw new Error(payload.error.message);
      }

      customersCache = null;
      resetForm();
      setSuccessMessage(
        payload.message || (isEditing ? "Pelanggan berhasil diperbarui." : "Pelanggan berhasil ditambahkan."),
      );
      await loadCustomers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal menyimpan data pelanggan.");
    } finally {
      setIsSaving(false);
      setSaveStatus("");
    }
  }

  function toggleDeleteFile(fileId: string) {
    setDeleteFileIds((current) =>
      current.includes(fileId)
        ? current.filter((item) => item !== fileId)
        : [...current, fileId],
    );
  }

  async function handleDeleteCustomer(id: string, namaPelanggan: string) {
    const confirmed = window.confirm(`Hapus pelanggan "${namaPelanggan}" dari spreadsheet?`);
    if (!confirmed) return;

    setDeletingId(id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/customers/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as ApiResponse<CustomerRecord>;

      if (!payload.success) {
        throw new Error(payload.error.message);
      }

      if (editingCustomerId === id) {
        resetForm();
      }

      customersCache = null;
      setSuccessMessage(payload.message || "Pelanggan berhasil dihapus.");
      await loadCustomers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal menghapus pelanggan.");
    } finally {
      setDeletingId("");
    }
  }

  const filteredCustomers = customers.filter((customer) => {
    const keyword = deferredSearch.trim().toLowerCase();
    if (!keyword) return true;

    return [
      customer.kodePelanggan,
      customer.namaPelanggan,
      customer.pic,
      customer.telepon,
      customer.email,
      customer.keterangan,
    ].some((value) => String(value || "").toLowerCase().includes(keyword));
  });

  return (
    <section id="pelanggan" className="fo-shell">
      <section className="fo-hero">
        <div>
          <p className="fo-eyebrow">FO KIMA Admin Portal</p>
          <h1>Pelanggan</h1>
          <p className="fo-lead">
            Kelola master data pelanggan dan sinkronkan tampilannya dengan data operasional yang sama.
          </p>
        </div>

        <div className="fo-stats">
          <article>
            <span>Total data pelanggan</span>
            <strong>{customers.length}</strong>
          </article>
        </div>
      </section>

      {(errorMessage || successMessage) && (
        <section className="fo-feedbacks">
          {errorMessage ? <div className="fo-feedback fo-feedback-error">{errorMessage}</div> : null}
          {successMessage ? <div className="fo-feedback fo-feedback-success">{successMessage}</div> : null}
        </section>
      )}

      <section className="fo-card fo-list-card" style={{ marginTop: "18px" }}>
        <div className="fo-card-head">
          <div>
            <p className="fo-card-kicker">Browse</p>
            <h2>Daftar Pelanggan</h2>
          </div>
          <div className="fo-card-actions">
            <button className="fo-primary-button" type="button" onClick={startCreateCustomer}>
              + Tambah Pelanggan
            </button>
          </div>
        </div>

        <div className="fo-search-wrap">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode, nama, PIC, telepon, email, atau keterangan"
          />
        </div>

        <div className="fo-list-toolbar">
          <span>{filteredCustomers.length} pelanggan tampil</span>
          <span>Source: master pelanggan</span>
        </div>

        <div className="fo-table-stage">
          {isLoading ? (
            <div className="fo-empty-state">Memuat data pelanggan...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="fo-empty-state">Belum ada data yang cocok.</div>
          ) : (
            <CustomerTable
              customers={filteredCustomers}
              deletingId={deletingId}
              onEdit={startEditCustomer}
              onDelete={handleDeleteCustomer}
            />
          )}
        </div>
      </section>

      {isModalOpen ? (
        <CustomerFormDialog
          form={form}
          isEditing={isEditing}
          isSaving={isSaving}
          saveStatus={saveStatus}
          uploadDrafts={uploadDrafts}
          existingFiles={existingFiles}
          deleteFileIds={deleteFileIds}
          onClose={resetForm}
          onSubmit={handleSubmitCustomer}
          onFormChange={setForm}
          onAddUploadDraft={() => setUploadDrafts((current) => [...current, createUploadDraft()])}
          onRemoveUploadDraft={(id) => setUploadDrafts((current) => current.filter((draft) => draft.id !== id))}
          onUpdateUploadDraft={updateUploadDraft}
          onToggleDeleteFile={toggleDeleteFile}
        />
      ) : null}
    </section>
  );
}
