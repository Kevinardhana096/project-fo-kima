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
            <th className="fo-table-col-no">No</th>
            <th className="fo-table-col-code">Kode Pelanggan</th>
            <th className="fo-table-col-name">Nama Pelanggan</th>
            <th className="fo-table-col-contract">Kontrak Aktif</th>
            <th className="fo-table-col-medium">PIC</th>
            <th className="fo-table-col-medium">Telepon</th>
            <th className="fo-table-col-medium">Email</th>
            <th className="fo-table-col-link">Berkas Pelanggan</th>
            <th className="fo-table-col-remarks">Keterangan</th>
            <th className="fo-table-col-actions">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td className="fo-table-col-no">{customer.no}</td>
              <td>
                <div className="fo-table-cell-text">
                  <strong>{customer.kodePelanggan || "-"}</strong>
                </div>
              </td>
              <td>
                <div className="fo-table-cell-title">
                  <strong>{customer.namaPelanggan}</strong>
                </div>
              </td>
              <td>
                <span className="fo-inline-badge">{customer.kontrakAktif || "0"} kontrak aktif</span>
              </td>
              <td>
                <div className="fo-table-cell-text">
                  <span>{customer.pic || "-"}</span>
                </div>
              </td>
              <td>
                <div className="fo-table-cell-text">
                  <span>{customer.telepon || "-"}</span>
                </div>
              </td>
              <td>
                <div className="fo-table-cell-text">
                  <span>{customer.email || "-"}</span>
                </div>
              </td>
              <td>
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
              <td>
                <div className="fo-table-cell-text">
                  <span>{customer.keterangan || "-"}</span>
                </div>
              </td>
              <td>
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
