import type { Metadata } from "next";

import { SalesReportContent } from "@/components/dashboard/sales-report-content";
import { getDashboardAccessContext } from "@/lib/dashboard/access";

export const metadata: Metadata = {
  title: "Relatorio de Vendas",
};

export default async function SalesReportPage() {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext?.activeAdAccount) {
    return null;
  }

  return (
    <SalesReportContent
      activeAdAccountName={accessContext.activeAdAccount.name}
      adAccountId={accessContext.activeAdAccount.id}
    />
  );
}
