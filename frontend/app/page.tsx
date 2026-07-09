"use client";

import Image from "next/image";
import { useState } from "react";

import { CustomerAdmin } from "./_components/admin/pelanggan/customer-admin";
import { ContractAdmin } from "./_components/admin/kontrak/contract-admin";

function CustomersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 12.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M3.75 18a5.25 5.25 0 0 1 10.5 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16.5 9.25a2.25 2.25 0 1 0 0-4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M16 15.75a4.18 4.18 0 0 1 4.25 2.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ContractsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 4.75h7l3 3V19a1.75 1.75 0 0 1-1.75 1.75h-8.5A1.75 1.75 0 0 1 5 19V6.5A1.75 1.75 0 0 1 6.75 4.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M14 4.75V8h3.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 11.25h5.5M8.5 14.5h7M8.5 17.75h4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const navigationItems = [
  {
    id: "pelanggan",
    label: "Pelanggan",
    desc: "Kelola master data & berkas",
    icon: <CustomersIcon />,
  },
  {
    id: "kontrak",
    label: "Kontrak Lengkap",
    desc: "Tinjau rekap sheet kontrak",
    icon: <ContractsIcon />,
  },
] as const;

export default function Home() {
  const [activeView, setActiveView] = useState("pelanggan");
  const [visitedViews, setVisitedViews] = useState<Record<string, boolean>>({
    pelanggan: true,
  });

  function handleChangeView(nextView: (typeof navigationItems)[number]["id"]) {
    setActiveView(nextView);
    setVisitedViews((current) => (
      current[nextView]
        ? current
        : { ...current, [nextView]: true }
    ));
  }

  return (
    <div className="fo-app">
      <aside className="fo-sidebar">
        <div className="fo-sidebar-brand">
          <div className="fo-brand-logo-wrap" aria-hidden="true">
            <Image
              src="/pt-kima_001.png"
              alt=""
              width={40}
              height={40}
              className="fo-brand-logo"
              priority
            />
          </div>
          <div>
            <p className="fo-brand-pre">FO KIMA</p>
            <h1 className="fo-brand-title">Admin Portal</h1>
            <span className="fo-brand-tagline">Spreadsheet sync workspace</span>
          </div>
        </div>

        <div className="fo-sidebar-group">
          <span className="fo-sidebar-label">Main Navigation</span>
        </div>

        <nav className="fo-sidebar-nav" aria-label="Sidebar navigation">
          {navigationItems.map((item) => {
            const isActive = item.id === activeView;

            return (
              <button
                key={item.id}
                type="button"
                className={isActive ? "is-active" : undefined}
                onClick={() => handleChangeView(item.id)}
              >
                <div className="fo-sidebar-nav-item">
                  <div className="fo-nav-icon-container">{item.icon}</div>
                  <div className="fo-sidebar-nav-copy">
                    <span>{item.label}</span>
                    <small>{item.desc}</small>
                  </div>
                </div>
                <div className="fo-active-indicator" />
              </button>
            );
          })}
        </nav>

        <div className="fo-sidebar-panel">
          <div className="fo-panel-header">
            <span className="fo-sidebar-label">App Mode</span>
          </div>
          <strong>Hybrid Apps Script</strong>
          <p>Frontend observability layer for customer and contract operations.</p>
        </div>
      </aside>

      <div className="fo-main">
        {visitedViews.pelanggan ? (
          <div hidden={activeView !== "pelanggan"} aria-hidden={activeView !== "pelanggan"}>
            <CustomerAdmin />
          </div>
        ) : null}
        {visitedViews.kontrak ? (
          <div hidden={activeView !== "kontrak"} aria-hidden={activeView !== "kontrak"}>
            <ContractAdmin />
          </div>
        ) : null}
      </div>
    </div>
  );
}
