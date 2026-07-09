"use client";

import { useEffect, useState } from "react";

import type { ApiResponse, CustomerCreateInput, CustomerFileRecord, CustomerRecord, CustomerUploadItem } from "@/lib/customer-types";

import { CustomerFormDialog } from "./customer-form-dialog";
import { CustomerTable } from "./customer-table";
import type { UploadDraft } from "./types";
import { createUploadDraft, emptyForm } from "./upload-utils";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function CustomerAdmin() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [refreshKey, setRefreshKey] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [form, setForm] = useState<CustomerCreateInput>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
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
    async function loadCustomers() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const query = new URLSearchParams();
        query.set("page", String(page));
        query.set("page_size", String(pageSize));
        if (debouncedSearch) query.set("search", debouncedSearch);

        const response = await fetch(`/api/customers?${query.toString()}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as ApiResponse<CustomerRecord[]>;

        if (!payload.success) {
          throw new Error(payload.error.message);
        }

        setCustomers(payload.data);
        if (payload.meta) {
          setTotalRecords(payload.meta.total);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Gagal memuat data pelanggan.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadCustomers();
  }, [page, pageSize, debouncedSearch, refreshKey]);

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
      linkFolderBerkas: customer.berkasPelanggan || "",
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
        linkFolderBerkas: payload.data.berkasPelanggan || "",
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

    for (const draft of activeDrafts) {
      if (!draft.file || !draft.jenisBerkas || !draft.namaFile.trim()) {
        throw new Error("Terdapat file draft yang belum lengkap isiannya.");
      }

      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]!);
        };
        reader.onerror = reject;
        reader.readAsDataURL(draft.file!);
      });

      uploadItems.push({
        jenisBerkas: draft.jenisBerkas,
        namaFile: draft.namaFile.trim(),
        originalFileName: draft.file.name,
        mimeType: draft.file.type || "application/octet-stream",
        base64Data,
        size: draft.file.size,
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

      resetForm();
      setSuccessMessage(
        payload.message || (isEditing ? "Pelanggan berhasil diperbarui." : "Pelanggan berhasil ditambahkan."),
      );
      setPage(1);
      setRefreshKey((current) => current + 1);
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
    const confirmed = window.confirm(`Hapus pelanggan "${namaPelanggan}" dari database?`);
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

      setSuccessMessage(payload.message || "Pelanggan berhasil dihapus.");
      setPage(1);
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal menghapus pelanggan.");
    } finally {
      setDeletingId("");
    }
  }



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
            <strong>{totalRecords}</strong>
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
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Cari kode, nama, PIC, telepon, email, atau keterangan"
          />
        </div>

        <div className="fo-list-toolbar">
          <span>{customers.length} dari total {totalRecords} pelanggan tampil</span>
          <span>Source: master pelanggan</span>
        </div>

        <div className="fo-table-stage">
          {isLoading ? (
            <div className="fo-empty-state">Memuat data pelanggan...</div>
          ) : customers.length === 0 ? (
            <div className="fo-empty-state">Belum ada data yang cocok.</div>
          ) : (
            <>
              <CustomerTable
                customers={customers}
                deletingId={deletingId}
                onEdit={startEditCustomer}
                onDelete={handleDeleteCustomer}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", padding: "0 16px", paddingBottom: "16px" }}>
                <span style={{ fontSize: "14px", color: "var(--fo-color-gray-500)" }}>
                  Halaman {page} dari {Math.max(1, Math.ceil(totalRecords / pageSize))}
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    type="button"
                    className="fo-secondary-button" 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                  >
                    &laquo; Sebelumnya
                  </button>
                  <button 
                    type="button"
                    className="fo-secondary-button" 
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= Math.ceil(totalRecords / pageSize) || isLoading}
                  >
                    Selanjutnya &raquo;
                  </button>
                </div>
              </div>
            </>
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
