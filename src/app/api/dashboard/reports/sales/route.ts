import { NextRequest, NextResponse } from "next/server";

import { getDashboardAccessContext } from "@/lib/dashboard/access";
import { getFacebookSalesReport } from "@/lib/facebook/sales-report";

export async function GET(request: NextRequest) {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext) {
    return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });
  }

  const adAccountId = request.nextUrl.searchParams.get("adAccountId");

  if (!adAccountId) {
    return NextResponse.json({ message: "Conta de anuncios nao informada." }, { status: 400 });
  }

  const hasAccess = accessContext.accessibleAccounts.some((account) => account.id === adAccountId);

  if (!hasAccess) {
    return NextResponse.json({ message: "Conta de anuncios nao autorizada." }, { status: 403 });
  }

  const report = await getFacebookSalesReport(adAccountId);
  return NextResponse.json(report);
}
