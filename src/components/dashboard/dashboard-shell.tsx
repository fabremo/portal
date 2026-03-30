"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";

import { DashboardSidebar } from "@/components/dashboard/sidebar";

type AccessibleAdAccount = {
  id: string;
  isDefault: boolean;
  name: string;
};

type DashboardShellProps = {
  accessibleAccounts: AccessibleAdAccount[];
  activeAdAccount: AccessibleAdAccount | null;
  canAccessBuyersModule: boolean;
  children: ReactNode;
  isAdmin: boolean;
  userEmail: string;
};

const SIDEBAR_COLLAPSE_STORAGE_KEY = "portal_dashboard_sidebar_collapsed";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_COLLAPSE_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

function getClientSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === "true";
}

function getServerSnapshot() {
  return false;
}

export function DashboardShell({
  accessibleAccounts,
  activeAdAccount,
  canAccessBuyersModule,
  children,
  isAdmin,
  userEmail,
}: DashboardShellProps) {
  const isCollapsed = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  function handleToggleCollapse() {
    const nextValue = !getClientSnapshot();
    window.localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, String(nextValue));
    window.dispatchEvent(new StorageEvent("storage", { key: SIDEBAR_COLLAPSE_STORAGE_KEY }));
  }

  return (
    <div
      className={[
        "mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1680px] gap-6 transition-[grid-template-columns] duration-300",
        isCollapsed ? "lg:grid-cols-[92px_1fr]" : "lg:grid-cols-[280px_1fr]",
      ].join(" ")}
    >
      <DashboardSidebar
        accessibleAccounts={accessibleAccounts}
        activeAdAccount={activeAdAccount}
        canAccessBuyersModule={canAccessBuyersModule}
        isAdmin={isAdmin}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        userEmail={userEmail}
      />
      {children}
    </div>
  );
}

