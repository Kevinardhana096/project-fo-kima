"use client";

import type { ContractRecord } from "@/lib/customer-types";
import { formatCurrency, getContractStatusClass } from "./contract-utils";

type ContractTableProps = {
  contracts: ContractRecord[];
  deletingId: number | null;
  onEdit: (contract: ContractRecord) => void;
  onRenew: (contract: ContractRecord) => void;
  onUpgrade: (contract: ContractRecord) => void;
  onDelete: (id: number, namaPelanggan: string) => void;
};

export function ContractTable({
  contracts,
  deletingId,
  onEdit,
  onRenew,
  onUpgrade,
  onDelete,
}: ContractTableProps) {
  return (
    <div className="fo-table-container" role="region" aria-label="Tabel kontrak lengkap">
      <table className="fo-table fo-contract-table" style={{ width: "max-content", minWidth: "100%" }}>
        <thead>
          <tr>
            <th className="fo-table-col-no"><span className="fo-table-head-label">No</span></th>
            <th className="fo-table-col-action-lite" style={{ width: "240px" }}><span className="fo-table-head-label">Aksi</span></th>
            <th className="fo-table-col-medium"><span className="fo-table-head-label">Kategori</span></th>
            <th className="fo-table-col-contract-id"><span className="fo-table-head-label">ID Kontrak</span></th>
            <th className="fo-table-col-code"><span className="fo-table-head-label">Kode Pelanggan</span></th>
            <th className="fo-table-col-name" style={{ width: "240px" }}><span className="fo-table-head-label">Nama Pelanggan</span></th>
            <th className="fo-table-col-location" style={{ width: "240px" }}><span className="fo-table-head-label">Lokasi</span></th>
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
            <th className="fo-table-col-remarks"><span className="fo-table-head-label">Keterangan</span></th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract, index) => {
            // Sisa Waktu logic
            const today = new Date();
            const end = new Date(`${contract.periodeBerakhir}T00:00:00`);
            const millisPerDay = 24 * 60 * 60 * 1000;
            const diffDays = Math.floor((end.getTime() - today.setHours(0, 0, 0, 0)) / millisPerDay);
            let sisaWaktu = "";
            if (!Number.isNaN(diffDays)) {
              if (diffDays < 0) sisaWaktu = `Lewat ${Math.abs(diffDays)} hari`;
              else if (diffDays === 0) sisaWaktu = "Berakhir hari ini";
              else sisaWaktu = `${diffDays} hari`;
            }

            return (
              <tr key={contract.id}>
                <td className="fo-table-col-no">{index + 1}</td>
                <td className="fo-contract-cell-action">
                  <div className="fo-row-actions">
                    <button
                      className="fo-action-button"
                      onClick={() => onEdit(contract)}
                      aria-label="Edit"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="fo-action-button"
                      onClick={() => onRenew(contract)}
                      aria-label="Perpanjang"
                    >
                      🔄 Perpanjang
                    </button>
                    <button
                      className="fo-action-button"
                      onClick={() => onUpgrade(contract)}
                      aria-label="Upgrade"
                    >
                      🚀 Upgrade
                    </button>
                    <button
                      className="fo-action-button is-danger"
                      onClick={() => onDelete(contract.id, contract.namaPelanggan)}
                      disabled={deletingId === contract.id}
                      aria-label="Hapus"
                    >
                      {deletingId === contract.id ? "⏳..." : "🗑️ Hapus"}
                    </button>
                  </div>
                </td>
                <td className="fo-contract-cell-category">
                  <div className="fo-table-cell-text fo-contract-cell-text-readable">
                    <span>{contract.kategori || "-"}</span>
                  </div>
                </td>
                <td className="fo-contract-cell-prev-id">
                  <div className="fo-table-cell-text fo-contract-cell-text-nowrap">
                    <span>{contract.kodeKontrak || "-"}</span>
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
                    <span>{contract.namaLokasi || "-"}</span>
                  </div>
                </td>
                <td className="fo-contract-cell-time">
                  <div className="fo-table-cell-text fo-contract-cell-text-readable">
                    <span>{sisaWaktu || "-"}</span>
                  </div>
                </td>
                <td className="fo-contract-cell-date">
                  <div className="fo-table-cell-text fo-contract-cell-text-nowrap">
                    <span>{contract.periodeAwal || "-"}</span>
                  </div>
                </td>
                <td className="fo-contract-cell-duration">
                  <div className="fo-table-cell-text fo-contract-cell-text-nowrap">
                    <span>{contract.durasiKontrakBulan || "-"}{contract.durasiKontrakBulan ? " bulan" : ""}</span>
                  </div>
                </td>
                <td className="fo-contract-cell-date">
                  <div className="fo-table-cell-text fo-contract-cell-text-nowrap">
                    <span>{contract.periodeBerakhir || "-"}</span>
                  </div>
                </td>
                <td className="fo-contract-cell-doc">
                  <span className="fo-table-muted">{contract.noKontrak || "-"}</span>
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
                  {contract.linkFolderBerkas ? (
                    <a className="fo-table-link" href={contract.linkFolderBerkas} target="_blank" rel="noreferrer">
                      Buka folder
                    </a>
                  ) : (
                    <span className="fo-table-muted">-</span>
                  )}
                </td>
                <td className="fo-contract-cell-remarks">
                  <div className="fo-table-cell-text fo-contract-cell-text-readable">
                    <span>{contract.keterangan || "-"}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
