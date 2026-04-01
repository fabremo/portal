import type { Metadata } from "next";

import { MessagesReportContent } from "@/components/dashboard/messages-report-content";
import { getDashboardAccessContext } from "@/lib/dashboard/access";
import { getFacebookMessagesReport } from "@/lib/facebook/messages-report";

export const metadata: Metadata = {
  title: "Relatório de Mensagens",
};

export default async function MessagesReportPage() {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext?.activeAdAccount || !accessContext.activeCompanyId) {
    return null;
  }

  const initialReport = await getFacebookMessagesReport(
    accessContext.activeCompanyId,
    accessContext.activeAdAccount.id,
    accessContext.userId
  );

  return (
    <MessagesReportContent
      activeAdAccountName={accessContext.activeAdAccount.name}
      initialReport={initialReport}
    />
  );
}
