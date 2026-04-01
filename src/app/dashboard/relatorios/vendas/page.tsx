import type { Metadata } from "next";

import { SalesReportContent } from "@/components/dashboard/sales-report-content";
import { getDashboardAccessContext } from "@/lib/dashboard/access";
import { getFacebookSalesReport } from "@/lib/facebook/sales-report";

export const metadata: Metadata = {
  title: "Relatório de Vendas",
};

export default async function SalesReportPage() {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext?.activeAdAccount || !accessContext.activeCompanyId) {
    return null;
  }

  const initialReport = await getFacebookSalesReport(
    accessContext.activeCompanyId,
    accessContext.activeAdAccount.id,
    accessContext.userId
  );

  return (
    <SalesReportContent
      activeAdAccountName={accessContext.activeAdAccount.name}
      adAccountId={accessContext.activeAdAccount.id}
      initialReport={initialReport}
      key={accessContext.activeAdAccount.id}
    />
  );
}
