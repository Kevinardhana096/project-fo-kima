"use client";

import type { CustomerRecord } from "@/lib/customer-types";

type CustomerTableProps = {
  customers: CustomerRecord[];
  deletingId: string;
  onEdit: (customer: CustomerRecord) => void | Promise<void>;
  onDelete: (id: string, namaPelanggan: string) => void | Promise<void>;
};

export function CustomerTable({ customers, deletingId, onEdit, onDelete }: CustomerTableProps) {
  return (
    <div className="fo-table-container" role="region" aria-label="Tabel daftar pelanggan">
      <table className="fo-table fo-company-table">
        <thead>
          <tr>
            <th className="fo-table-col-no"><span className="fo-table-head-label">No</span></th>
            <th className="fo-table-col-code"><span className="fo-table-head-label">Kode Pelanggan</span></th>
            <th className="fo-table-col-name"><span className="fo-table-head-label">Nama Pelanggan</span></th>
            <th className="fo-table-col-contract"><span className="fo-table-head-label">Kontrak Aktif</span></th>
            <th className="fo-table-col-medium"><span className="fo-table-head-label">PIC</span></th>
            <th className="fo-table-col-medium"><span className="fo-table-head-label">Telepon</span></th>
            <th className="fo-table-col-medium"><span className="fo-table-head-label">Email</span></th>
            <th className="fo-table-col-link"><span className="fo-table-head-label">Berkas Pelanggan</span></th>
            <th className="fo-table-col-remarks"><span className="fo-table-head-label">Keterangan</span></th>
            <th className="fo-table-col-actions"><span className="fo-table-head-label">Aksi</span></th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td className="fo-table-col-no">{customer.no}</td>
              <td className="fo-company-cell-code">
                <div className="fo-table-cell-text fo-company-cell-text-nowrap">
                  <strong>{customer.kodePelanggan || "-"}</strong>
                </div>
              </td>
              <td className="fo-company-cell-name">
                <div className="fo-table-cell-title fo-company-cell-title">
                  <strong>{customer.namaPelanggan}</strong>
                </div>
              </td>
              <td className="fo-company-cell-contract">
                <span className="fo-inline-badge">{customer.kontrakAktif || "0"} kontrak aktif</span>
              </td>
              <td className="fo-company-cell-pic">
                <div className="fo-table-cell-text fo-company-cell-text-readable">
                  <span>{customer.pic || "-"}</span>
                </div>
              </td>
              <td className="fo-company-cell-phone">
                <div className="fo-table-cell-text fo-company-cell-text-nowrap">
                  <span>{customer.telepon || "-"}</span>
                </div>
              </td>
              <td className="fo-company-cell-email">
                <div className="fo-table-cell-text fo-company-cell-text-readable">
                  <span>{customer.email || "-"}</span>
                </div>
              </td>
              <td className="fo-company-cell-link">
                {customer.berkasPelanggan ? (
                  <a
                    className="fo-table-link"
                    href={customer.berkasPelanggan}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Buka folder
                  </a>
                ) : (
                  <span className="fo-table-muted">-</span>
                )}
              </td>
              <td className="fo-company-cell-remarks">
                <div className="fo-table-cell-text fo-company-cell-text-readable">
                  <span>{customer.keterangan || "-"}</span>
                </div>
              </td>
              <td className="fo-company-cell-actions">
                <div className="fo-table-actions">
                  <button
                    className="fo-table-btn fo-btn-edit"
                    type="button"
                    onClick={() => onEdit(customer)}
                  >
                    Edit
                  </button>
                  <button
                    className="fo-table-btn fo-btn-delete"
                    type="button"
                    onClick={() => void onDelete(customer.id, customer.namaPelanggan)}
                    disabled={deletingId === customer.id}
                  >
                    {deletingId === customer.id ? "..." : "Hapus"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
