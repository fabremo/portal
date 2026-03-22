import type { Metadata } from "next";

import { MessagesReportContent } from "@/components/dashboard/messages-report-content";
import { getDashboardAccessContext } from "@/lib/dashboard/access";

export const metadata: Metadata = {
  title: "Relatório de Mensagens",
};

export default async function MessagesReportPage() {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext?.activeAdAccount) {
    return null;
  }

  return (
    <MessagesReportContent
      activeAdAccountName={accessContext.activeAdAccount.name}
      adAccountId={accessContext.activeAdAccount.id}
    />
  );
}
