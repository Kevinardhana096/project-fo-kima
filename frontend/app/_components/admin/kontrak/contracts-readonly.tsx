"use client";

import { useDeferredValue, useEffect, useState } from "react";

import type { ApiResponse, ContractRecord } from "@/lib/customer-types";

import { formatCurrency, getContractStatusClass } from "./contract-utils";

let contractsCache: ContractRecord[] | null = null;

export function ContractsReadonly() {
  const [contracts, setContracts] = useState<ContractRecord[]>(() => contractsCache || []);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [isLoading, setIsLoading] = useState(() => !contractsCache);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadContracts() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/contracts", {
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse<ContractRecord[]>;

      if (!payload.success) {
        throw new Error(payload.error.message);
      }

      contractsCache = payload.data;
      setContracts(payload.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat data kontrak.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (contractsCache) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadContracts();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const filteredContracts = contracts.filter((contract) => {
    const keyword = deferredSearch.trim().toLowerCase();
    const matchesSearch = !keyword
      || [
        contract.no,
        contract.idKontrak,
        contract.aksi,
        contract.kategori,
        contract.previousIdKontrak,
        contract.kodePelanggan,
        contract.namaPelanggan,
        contract.lokasi,
        contract.noKontrak,
        contract.core,
        contract.sharingCore,
        contract.paket,
        contract.statusKontrak,
        contract.billingLabel,
        contract.keterangan,
      ].some((value) => String(value || "").toLowerCase().includes(keyword));

    const matchesStatus = statusFilter === "Semua" || contract.statusKontrak === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const availableStatuses = Array.from(
    new Set(contracts.map((contract) => contract.statusKontrak).filter(Boolean)),
  );

  return (
    <section id="kontrak-lengkap" className="fo-shell">
      <section className="fo-hero">
        <div>
          <p className="fo-eyebrow">FO KIMA Admin Portal</p>
          <h1>Kontrak Lengkap</h1>
          <p className="fo-lead">
            Tinjau seluruh data kontrak dengan susunan tabel yang mengikuti spreadsheet operasional
            agar proses cek data lebih cepat.
          </p>
        </div>

        <div className="fo-stats">
          <article>
            <span>Total kontrak</span>
            <strong>{contracts.length}</strong>
          </article>
        </div>
      </section>

      {errorMessage ? (
        <section className="fo-feedbacks">
          <div className="fo-feedback fo-feedback-error">{errorMessage}</div>
        </section>
      ) : null}

      <section className="fo-card fo-list-card" style={{ marginTop: "18px" }}>
        <div className="fo-card-head">
          <div>
            <p className="fo-card-kicker">Browse</p>
            <h2>Tabel Kontrak Lengkap</h2>
          </div>
        </div>

        <div className="fo-filter-bar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari no, kategori, pelanggan, lokasi, no kontrak, core, sharing core, billing, status, atau keterangan"
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="Semua">Semua status</option>
            {availableStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="fo-list-toolbar">
          <span>{filteredContracts.length} kontrak tampil</span>
          <span>Source: sheet Kontrak</span>
        </div>

        {isLoading ? (
          <div className="fo-empty-state">Memuat data kontrak...</div>
        ) : filteredContracts.length === 0 ? (
          <div className="fo-empty-state">Belum ada kontrak yang cocok.</div>
        ) : (
          <div className="fo-table-container" role="region" aria-label="Tabel kontrak lengkap">
            <table className="fo-table fo-contract-table">
              <thead>
                <tr>
                  <th className="fo-table-col-no"><span className="fo-table-head-label">No</span></th>
                  <th className="fo-table-col-action-lite"><span className="fo-table-head-label">Aksi</span></th>
                  <th className="fo-table-col-medium"><span className="fo-table-head-label">Kategori</span></th>
                  <th className="fo-table-col-contract-id"><span className="fo-table-head-label">ID Kontrak Sebelumnya</span></th>
                  <th className="fo-table-col-code"><span className="fo-table-head-label">Kode Pelanggan</span></th>
                  <th className="fo-table-col-name"><span className="fo-table-head-label">Nama Pelanggan</span></th>
                  <th className="fo-table-col-location"><span className="fo-table-head-label">Lokasi</span></th>
                  <th className="fo-table-col-time"><span className="fo-table-head-label">Sisa Waktu</span></th>
                  <th className="fo-table-col-date"><span className="fo-table-head-label">Periode Awal</span></th>
                  <th className="fo-table-col-duration"><span className="fo-table-head-label">Durasi Kontrak</span></th>
                  <th className="fo-table-col-date"><span className="fo-table-head-label">Periode Berakhir</span></th>
                  <th className="fo-table-col-contract-doc"><span className="fo-table-head-label">No Kontrak</span></th>
                  <th className="fo-table-col-medium"><span className="fo-table-head-label">Core</span></th>
                  <th className="fo-table-col-medium"><span className="fo-table-head-label">Sharing Core</span></th>
                  <th className="fo-table-col-currency"><span className="fo-table-head-label">Nilai Kontrak</span></th>
                  <th className="fo-table-col-currency"><span className="fo-table-head-label">Biaya Aktivasi</span></th>
                  <th className="fo-table-col-currency"><span className="fo-table-head-label">Perbulan</span></th>
                  <th className="fo-table-col-currency"><span className="fo-table-head-label">Nilai Periode Aktif</span></th>
                  <th className="fo-table-col-status"><span className="fo-table-head-label">Status Kontrak</span></th>
                  <th className="fo-table-col-link"><span className="fo-table-head-label">Berkas</span></th>
                  <th className="fo-table-col-medium"><span className="fo-table-head-label">Billing</span></th>
                  <th className="fo-table-col-remarks"><span className="fo-table-head-label">Keterangan</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((contract) => (
                  <tr key={contract.id}>
                    <td className="fo-table-col-no">{contract.no}</td>
                    <td className="fo-contract-cell-action">
                      <div className="fo-table-cell-text fo-contract-cell-text-readable">
                        <span>{contract.aksi || "-"}</span>
                      </div>
                    </td>
                    <td className="fo-contract-cell-category">
                      <div className="fo-table-cell-text fo-contract-cell-text-readable">
                        <span>{contract.kategori || "-"}</span>
                      </div>
                    </td>
                    <td className="fo-contract-cell-prev-id">
                      <div className="fo-table-cell-text fo-contract-cell-text-nowrap">
                        <span>{contract.previousIdKontrak || "-"}</span>
                      </div>
                    </td>
                    <td className="fo-contract-cell-code">
                      <div className="fo-table-cell-text fo-contract-cell-text-nowrap">
                        <strong>{contract.kodePelanggan || "-"}</strong>
                      </div>
                    </td>
                    <td className="fo-contract-cell-name">
                      <div className="fo-table-cell-title fo-contract-cell-title">
                        <strong>{contract.namaPelanggan || "-"}</strong>
                      </div>
                    </td>
                    <td className="fo-contract-cell-location">
                      <div className="fo-table-cell-text fo-contract-cell-text-readable">
                        <span>{contract.lokasi || "-"}</span>
                      </div>
                    </td>
                    <td className="fo-contract-cell-time">
                      <div className="fo-table-cell-text fo-contract-cell-text-readable">
                        <span>{contract.sisaWaktu || "-"}</span>
                      </div>
                    </td>
                    <td className="fo-contract-cell-date">
                      <div className="fo-table-cell-text fo-contract-cell-text-nowrap">
                        <span>{contract.periodeAwal || "-"}</span>
                      </div>
                    </td>
                    <td className="fo-contract-cell-duration">
                      <div className="fo-table-cell-text fo-contract-cell-text-nowrap">
                        <span>{contract.durasiKontrak || "-"}{contract.durasiKontrak ? " bulan" : ""}</span>
                      </div>
                    </td>
                    <td className="fo-contract-cell-date">
                      <div className="fo-table-cell-text fo-contract-cell-text-nowrap">
                        <span>{contract.periodeBerakhir || "-"}</span>
                      </div>
                    </td>
                    <td className="fo-contract-cell-doc">
                      {contract.noKontrakUrl ? (
                        <a className="fo-table-link" href={contract.noKontrakUrl} target="_blank" rel="noreferrer">
                          {contract.noKontrak || "Buka dokumen"}
                        </a>
                      ) : (
                        <span className="fo-table-muted">{contract.noKontrak || "-"}</span>
                      )}
                    </td>
                    <td className="fo-contract-cell-core">
                      <div className="fo-table-cell-text fo-contract-cell-text-nowrap">
                        <span>{contract.core || "-"}</span>
                      </div>
                    </td>
                    <td className="fo-contract-cell-sharing">
                      <div className="fo-table-cell-text fo-contract-cell-text-nowrap">
                        <span>{contract.sharingCore || "-"}</span>
                      </div>
                    </td>
                    <td className="fo-contract-cell-currency">
                      <div className="fo-table-cell-text fo-contract-cell-text-nowrap">
                        <span>{formatCurrency(contract.nilaiKontrak)}</span>
                      </div>
                    </td>
                    <td className="fo-contract-cell-currency">
                      <div className="fo-table-cell-text fo-contract-cell-text-nowrap">
                        <span>{formatCurrency(contract.biayaAktivasi)}</span>
                      </div>
                    </td>
                    <td className="fo-contract-cell-currency">
                      <div className="fo-table-cell-text fo-contract-cell-text-nowrap">
                        <span>{formatCurrency(contract.perbulan)}</span>
                      </div>
                    </td>
                    <td className="fo-contract-cell-currency">
                      <div className="fo-table-cell-text fo-contract-cell-text-nowrap">
                        <span>{formatCurrency(contract.nilaiPeriodeAktif)}</span>
                      </div>
                    </td>
                    <td className="fo-contract-cell-status">
                      <span className={`fo-inline-badge ${getContractStatusClass(contract.statusKontrak)}`.trim()}>
                        {contract.statusKontrak || "-"}
                      </span>
                    </td>
                    <td className="fo-contract-cell-link">
                      {contract.berkasUrl ? (
                        <a className="fo-table-link" href={contract.berkasUrl} target="_blank" rel="noreferrer">
                          Buka folder
                        </a>
                      ) : (
                        <span className="fo-table-muted">-</span>
                      )}
                    </td>
                    <td className="fo-contract-cell-billing">
                      <div className="fo-table-cell-text fo-contract-cell-text-readable">
                        <span>{contract.billingLabel || "-"}</span>
                      </div>
                    </td>
                    <td className="fo-contract-cell-remarks">
                      <div className="fo-table-cell-text fo-contract-cell-text-readable">
                        <span>{contract.keterangan || "-"}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
