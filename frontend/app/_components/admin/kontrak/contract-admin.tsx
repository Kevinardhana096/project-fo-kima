"use client";

import { useCallback, useDeferredValue, useEffect, useState } from "react";

import type { ApiResponse, ContractRecord, CustomerRecord, CustomerFileRecord, ContractCreateInput } from "@/lib/customer-types";

import { ContractTable } from "./contract-table";
import { ContractFormDialog, type ContractMode } from "./contract-form-dialog";
import {
  createUploadDraft,
  emptyContractForm,
  fileToBase64,
  hasAllowedUploadFileType,
  maxUploadSize,
} from "./contract-utils";
import type { UploadDraft } from "./types";

export function ContractAdmin() {
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ContractMode>("create");
  const [form, setForm] = useState<ContractCreateInput & { id?: number; alasanPerubahan?: string }>(emptyContractForm);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  
  const [uploadDrafts, setUploadDrafts] = useState<UploadDraft[]>([]);
  const [existingFiles, setExistingFiles] = useState<CustomerFileRecord[]>([]);
  const [deleteFileIds, setDeleteFileIds] = useState<string[]>([]);

  const loadData = useCallback(async function loadData() {
    setIsLoading(true);
    try {
      const [contractsRes, customersRes] = await Promise.all([
        fetch("/api/kontrak-lengkap", { cache: "no-store" }),
        fetch("/api/pelanggan", { cache: "no-store" }),
      ]);
      const contractsPayload = (await contractsRes.json()) as ApiResponse<ContractRecord[]>;
      const customersPayload = (await customersRes.json()) as ApiResponse<CustomerRecord[]>;

      if (contractsPayload.success) setContracts(contractsPayload.data);
      if (customersPayload.success) setCustomers(customersPayload.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  function startCreateContract() {
    setModalMode("create");
    setForm(emptyContractForm);
    setUploadDrafts([]);
    setExistingFiles([]);
    setDeleteFileIds([]);
    setSaveStatus("");
    setIsModalOpen(true);
  }

  async function loadContractForEdit(contract: ContractRecord, mode: ContractMode) {
    setModalMode(mode);
    setForm({
      id: contract.id,
      pelangganId: contract.pelangganId,
      kategori: contract.kategori,
      namaLokasi: contract.namaLokasi,
      core: contract.core,
      sharingCore: contract.sharingCore,
      periodeAwal: contract.periodeAwal,
      periodeBerakhir: contract.periodeBerakhir,
      durasiKontrakBulan: contract.durasiKontrakBulan,
      noKontrak: contract.noKontrak,
      nilaiKontrak: contract.nilaiKontrak,
      biayaAktivasi: contract.biayaAktivasi,
      perbulan: contract.perbulan,
      linkFolderBerkas: contract.linkFolderBerkas,
      keterangan: contract.keterangan,
      alasanPerubahan: "",
    });
    setUploadDrafts([]);
    setExistingFiles(contract.existingFiles || []);
    setDeleteFileIds([]);
    setSaveStatus("");
    setIsModalOpen(true);

    try {
      const response = await fetch(`/api/kontrak-lengkap/${contract.id}`, { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<ContractRecord>;
      if (payload.success) {
        setExistingFiles(payload.data.existingFiles || []);
      }
    } catch (error) {
      console.error("Gagal memuat detail file", error);
    }
  }

  async function buildUploadItems() {
    const uploadItems = [];
    const activeDrafts = uploadDrafts.filter(d => d.file || d.jenisBerkas || d.namaFile.trim());

    for (const draft of activeDrafts) {
      if (!draft.file || !draft.jenisBerkas || !draft.namaFile.trim()) {
        throw new Error("Terdapat file draft yang belum lengkap isiannya.");
      }

      if (!hasAllowedUploadFileType(draft.file)) {
        throw new Error(`Tipe file ${draft.file.name} tidak didukung.`);
      }

      if (draft.file.size > maxUploadSize) {
        throw new Error(`Ukuran file ${draft.file.name} melebihi 10MB.`);
      }

      uploadItems.push({
        jenisBerkas: draft.jenisBerkas,
        namaFile: draft.namaFile.trim(),
        originalFileName: draft.file.name,
        mimeType: draft.file.type,
        size: draft.file.size,
        base64Data: await fileToBase64(draft.file),
      });
    }
    return uploadItems;
  }

  async function handleSubmitContract(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setSaveStatus("Mempersiapkan data...");

    try {
      if (form.pelangganId === 0) {
        throw new Error("Pilih pelanggan terlebih dahulu.");
      }

      setSaveStatus("Memproses file upload...");
      const uploadItems = await buildUploadItems();

      const payload = { ...form, uploadItems, deleteFileIds };

      let url = "/api/kontrak-lengkap";
      let method = "POST";

      if (modalMode === "update") {
        url = `/api/kontrak-lengkap/${form.id}`;
        method = "PUT";
      } else if (modalMode === "renew") {
        url = `/api/kontrak-lengkap/${form.id}/perpanjang`;
        method = "POST";
      } else if (modalMode === "upgrade") {
        url = `/api/kontrak-lengkap/${form.id}/upgrade`;
        method = "POST";
      }

      setSaveStatus("Mengirim data ke server...");
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as ApiResponse<ContractRecord>;
      if (!result.success) throw new Error(result.error.message);

      setSaveStatus("Kontrak berhasil disimpan!");
      setTimeout(() => {
        setIsModalOpen(false);
        void loadData();
      }, 1500);
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteContract(id: number, nama: string) {
    if (!confirm(`Apakah Anda yakin ingin menghapus kontrak lokasi dari pelanggan "${nama}"?`)) {
      return;
    }
    setDeletingId(id);
    try {
      const response = await fetch(`/api/kontrak-lengkap/${id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.error?.message);
      void loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal menghapus kontrak");
    } finally {
      setDeletingId(null);
    }
  }

  const filteredContracts = contracts.filter((contract) => {
    const keyword = deferredSearch.trim().toLowerCase();
    const matchesSearch = !keyword || [
      contract.kodeKontrak,
      contract.namaPelanggan,
      contract.kodePelanggan,
      contract.namaLokasi,
      contract.noKontrak,
      contract.kategori,
      contract.statusKontrak,
    ].some((v) => String(v || "").toLowerCase().includes(keyword));

    const matchesStatus = statusFilter === "Semua" || contract.statusKontrak === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const availableStatuses = Array.from(new Set(contracts.map((c) => c.statusKontrak).filter(Boolean)));

  return (
    <section id="kontrak-lengkap" className="fo-shell">
      <section className="fo-hero">
        <div>
          <p className="fo-eyebrow">FO KIMA Admin Portal</p>
          <h1>Kontrak Lengkap</h1>
          <p className="fo-lead">Kelola data kontrak layanan fiber optik KIMA.</p>
        </div>
        <div className="fo-stats">
          <article>
            <span>Total kontrak</span>
            <strong>{contracts.length}</strong>
          </article>
        </div>
      </section>

      <section className="fo-card fo-list-card" style={{ marginTop: "18px" }}>
        <div className="fo-card-head">
          <div>
            <p className="fo-card-kicker">Browse</p>
            <h2>Daftar Kontrak Lengkap</h2>
          </div>
          <div className="fo-card-actions">
            <button className="fo-primary-button" type="button" onClick={startCreateContract}>
              + Tambah Kontrak
            </button>
          </div>
        </div>

        <div className="fo-filter-bar">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kontrak..."
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="Semua">Semua status</option>
            {availableStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="fo-list-toolbar">
          <span>{filteredContracts.length} kontrak tampil</span>
        </div>

        {isLoading ? (
          <div className="fo-empty-state">Memuat data kontrak...</div>
        ) : filteredContracts.length === 0 ? (
          <div className="fo-empty-state">Belum ada kontrak yang cocok.</div>
        ) : (
          <ContractTable
            contracts={filteredContracts}
            deletingId={deletingId}
            onEdit={(c) => loadContractForEdit(c, "update")}
            onRenew={(c) => loadContractForEdit(c, "renew")}
            onUpgrade={(c) => loadContractForEdit(c, "upgrade")}
            onDelete={handleDeleteContract}
          />
        )}
      </section>

      {isModalOpen && (
        <ContractFormDialog
          mode={modalMode}
          form={form}
          isSaving={isSaving}
          saveStatus={saveStatus}
          uploadDrafts={uploadDrafts}
          existingFiles={existingFiles}
          deleteFileIds={deleteFileIds}
          customers={customers}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmitContract}
          onFormChange={setForm}
          onAddUploadDraft={() => setUploadDrafts((cur) => [...cur, createUploadDraft()])}
          onRemoveUploadDraft={(id) => setUploadDrafts((cur) => cur.filter((d) => d.id !== id))}
          onUpdateUploadDraft={(id, changes) =>
            setUploadDrafts((cur) => cur.map((d) => (d.id === id ? { ...d, ...changes } : d)))
          }
          onToggleDeleteFile={(fileId) =>
            setDeleteFileIds((cur) =>
              cur.includes(fileId) ? cur.filter((id) => id !== fileId) : [...cur, fileId]
            )
          }
        />
      )}
    </section>
  );
}
