import { NextRequest, NextResponse } from "next/server";

import { getDashboardAccessContext } from "@/lib/dashboard/access";
import { getFacebookMessagesReport } from "@/lib/facebook/messages-report";

export async function GET(request: NextRequest) {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const adAccountId = request.nextUrl.searchParams.get("adAccountId");

  if (!adAccountId) {
    return NextResponse.json({ message: "Conta de anúncios não informada." }, { status: 400 });
  }

  const hasAccess = accessContext.accessibleAccounts.some((account) => account.id === adAccountId);

  if (!hasAccess) {
    return NextResponse.json({ message: "Conta de anúncios não autorizada." }, { status: 403 });
  }

  const report = await getFacebookMessagesReport(adAccountId);
  return NextResponse.json(report);
}
