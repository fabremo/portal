import type { Metadata } from "next";

import { DashboardOverviewContent } from "@/components/dashboard/dashboard-overview-content";
import { getDashboardAccessContext } from "@/lib/dashboard/access";
import { getFacebookAccountStatus } from "@/lib/facebook/status";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext?.activeAdAccount) {
    return null;
  }

  const facebookStatus = await getFacebookAccountStatus(accessContext.activeAdAccount.id);

  return (
    <DashboardOverviewContent
      activeAdAccountName={accessContext.activeAdAccount.name}
      adAccountId={accessContext.activeAdAccount.id}
      facebookStatus={facebookStatus}
    />
  );
}
