import { NextRequest, NextResponse } from "next/server";

import { getDashboardAccessContext } from "@/lib/dashboard/access";
import { resolveSalesDatePreset } from "@/lib/facebook/sales-date-range";
import { getFacebookSalesReport } from "@/lib/facebook/sales-report";

export async function GET(request: NextRequest) {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const adAccountId = request.nextUrl.searchParams.get("adAccountId");
  const preset = resolveSalesDatePreset(request.nextUrl.searchParams.get("preset"));

  if (!adAccountId) {
    return NextResponse.json({ message: "Conta de anúncios não informada." }, { status: 400 });
  }

  const hasAccess = accessContext.accessibleAccounts.some((account) => account.id === adAccountId);

  if (!hasAccess) {
    return NextResponse.json({ message: "Conta de anúncios não autorizada." }, { status: 403 });
  }

  const report = await getFacebookSalesReport(adAccountId, preset);
  return NextResponse.json(report);
}
