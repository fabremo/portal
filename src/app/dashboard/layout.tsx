import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { NoAdAccountAccess } from "@/components/dashboard/no-ad-account-access";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { MetaReportsProvider } from "@/components/dashboard/meta-reports-provider";
import { canAccessBuyersModule, getDashboardAccessContext } from "@/lib/dashboard/access";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext) {
    redirect("/login");
  }

  return (
    <MetaReportsProvider userId={accessContext.userId}>
      <main className="page-shell px-4 py-6 md:px-6 lg:px-8">
        <DashboardShell
          accessibleAccounts={accessContext.accessibleAccounts}
          accessibleCompanies={accessContext.accessibleCompanies}
          activeAdAccount={accessContext.activeAdAccount}
          activeCompany={accessContext.activeCompany}
          canAccessBuyersModule={canAccessBuyersModule(accessContext)}
          canAccessTrackingModule={accessContext.canAccessTrackingModule}
          isAdmin={accessContext.isAdmin}
          userEmail={accessContext.userEmail}
        >
          {accessContext.activeAdAccount ? (
            children
          ) : (
            <NoAdAccountAccess
              activeCompanyName={accessContext.activeCompany?.name ?? null}
              isAdmin={accessContext.isAdmin}
            />
          )}
        </DashboardShell>
      </main>
    </MetaReportsProvider>
  );
}
