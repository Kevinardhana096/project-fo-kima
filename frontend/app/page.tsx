"use client";

import { useState } from "react";

import { CustomerAdmin } from "./_components/admin/pelanggan/customer-admin";
import { ContractsReadonly } from "./_components/admin/kontrak/contracts-readonly";

const navigationItems = [
  {
    id: "pelanggan",
    label: "Pelanggan",
  },
  {
    id: "kontrak",
    label: "Kontrak Lengkap",
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
          <p>FO KIMA</p>
          <h1>Admin Portal</h1>
          <span>Spreadsheet operations, cleaner workspace.</span>
        </div>

        <div className="fo-sidebar-group">
          <span className="fo-sidebar-label">Modules</span>
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
                <div className="fo-sidebar-nav-copy">
                  <span>{item.label}</span>
                </div>
                <i aria-hidden="true" />
              </button>
            );
          })}
        </nav>

        <div className="fo-sidebar-panel">
          <span className="fo-sidebar-label">Mode</span>
          <strong>Hybrid Apps Script</strong>
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
            <ContractsReadonly />
          </div>
        ) : null}
      </div>
    </div>
  );
}
