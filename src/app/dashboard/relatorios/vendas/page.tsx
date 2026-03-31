import type { Metadata } from "next";

import { SalesReportContent } from "@/components/dashboard/sales-report-content";
import { getDashboardAccessContext } from "@/lib/dashboard/access";
import { getFacebookSalesReport } from "@/lib/facebook/sales-report";

export const metadata: Metadata = {
  title: "Relatório de Vendas",
};

export default async function SalesReportPage() {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext?.activeAdAccount) {
    return null;
  }

  const initialReport = await getFacebookSalesReport(accessContext.activeAdAccount.id);

  return (
    <SalesReportContent
      activeAdAccountName={accessContext.activeAdAccount.name}
      adAccountId={accessContext.activeAdAccount.id}
      initialReport={initialReport}
      key={accessContext.activeAdAccount.id}
    />
  );
}