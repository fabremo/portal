import type { Metadata } from "next";

import { SalesReportContent } from "@/components/dashboard/sales-report-content";
import { getDashboardAccessContext } from "@/lib/dashboard/access";
import { getCompanyAiSettingsStatus } from "@/lib/dashboard/company-ai-settings";
import { getFacebookSalesReport } from "@/lib/facebook/sales-report";

export const metadata: Metadata = {
  title: "Relatório de Vendas",
};

export default async function SalesReportPage() {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext?.activeAdAccount || !accessContext.activeCompanyId) {
    return null;
  }

  const [initialReport, companyAiStatus] = await Promise.all([
    getFacebookSalesReport(
      accessContext.activeCompanyId,
      accessContext.activeAdAccount.id,
      accessContext.userId
    ),
    getCompanyAiSettingsStatus(accessContext.activeCompanyId),
  ]);

  return (
    <SalesReportContent
      activeAdAccountName={accessContext.activeAdAccount.name}
      adAccountId={accessContext.activeAdAccount.id}
      companyAiStatus={companyAiStatus}
      initialReport={initialReport}
      key={accessContext.activeAdAccount.id}
    />
  );
}
