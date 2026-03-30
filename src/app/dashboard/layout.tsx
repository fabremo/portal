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
          activeAdAccount={accessContext.activeAdAccount}
          canAccessBuyersModule={canAccessBuyersModule(accessContext)}
          isAdmin={accessContext.isAdmin}
          userEmail={accessContext.userEmail}
        >
          {accessContext.activeAdAccount || accessContext.isAdmin ? children : <NoAdAccountAccess />}
        </DashboardShell>
      </main>
    </MetaReportsProvider>
  );
}
