import type { Metadata } from "next";

import { DashboardOverviewContent } from "@/components/dashboard/dashboard-overview-content";
import { getDashboardAccessContext } from "@/lib/dashboard/access";
import { getFacebookMessagesReport } from "@/lib/facebook/messages-report";
import { getFacebookSalesReport } from "@/lib/facebook/sales-report";
import { getFacebookAccountStatus } from "@/lib/facebook/status";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext?.activeAdAccount || !accessContext.activeCompanyId) {
    return null;
  }

  const [facebookStatus, salesReport, messagesReport] = await Promise.all([
    getFacebookAccountStatus(accessContext.activeAdAccount.id),
    getFacebookSalesReport(
      accessContext.activeCompanyId,
      accessContext.activeAdAccount.id,
      accessContext.userId
    ),
    getFacebookMessagesReport(
      accessContext.activeCompanyId,
      accessContext.activeAdAccount.id,
      accessContext.userId
    ),
  ]);

  return (
    <DashboardOverviewContent
      activeAdAccountName={accessContext.activeAdAccount.name}
      facebookStatus={facebookStatus}
      messagesReport={messagesReport}
      salesReport={salesReport}
    />
  );
}
