import type { Metadata } from "next";

import { MessagesReportContent } from "@/components/dashboard/messages-report-content";
import { getDashboardAccessContext } from "@/lib/dashboard/access";
import { getFacebookMessagesReport } from "@/lib/facebook/messages-report";

export const metadata: Metadata = {
  title: "Relatório de Mensagens",
};

export default async function MessagesReportPage() {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext?.activeAdAccount) {
    return null;
  }

  const initialReport = await getFacebookMessagesReport(accessContext.activeAdAccount.id);

  return (
    <MessagesReportContent
      activeAdAccountName={accessContext.activeAdAccount.name}
      initialReport={initialReport}
    />
  );
}