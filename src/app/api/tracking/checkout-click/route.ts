import { NextResponse } from "next/server";

import {
  buildCheckoutClickTrackingInsert,
  type CheckoutClickTrackingPayload,
  insertCheckoutClickTracking,
  resolveTrackingCompanyBySlug,
} from "@/lib/tracking/checkout-click";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    headers: corsHeaders,
    status,
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
async function parsePayload(request: Request) {
  try {
    return (await request.json()) as CheckoutClickTrackingPayload;
  } catch {
    return null;
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    headers: corsHeaders,
    status: 204,
  });
}

export async function POST(request: Request) {
  const payload = await parsePayload(request);

  // Isso vai imprimir os dados diretamente no seu terminal do VS Code
  console.log("✅ Tracking Recebido com Sucesso:", JSON.stringify(payload, null, 2));

  if (!payload) {
    return jsonResponse({ message: "Payload inválido." }, 400);
  }

  const companySlug = typeof payload.company_slug === "string" ? payload.company_slug.trim() : "";

  if (!companySlug) {
    return jsonResponse({ message: "company_slug é obrigatório." }, 400);
  }

  let company;

  try {
    company = await resolveTrackingCompanyBySlug(companySlug);
  } catch (error) {
    console.error("[tracking.checkout-click] company lookup failed", {
      companySlug,
      error: getErrorMessage(error),
    });

    return jsonResponse({ message: "Erro ao localizar a empresa do tracking." }, 500);
  }

  if (!company) {
    return jsonResponse({ message: "Empresa não encontrada." }, 400);
  }

  if (!company.trackingEnabled) {
    return jsonResponse({ message: "Tracking não habilitado para esta empresa." }, 403);
  }

  try {
    await insertCheckoutClickTracking(
      buildCheckoutClickTrackingInsert(payload, company.companyId, request.headers.get("user-agent"))
    );
  } catch (error) {
    console.error("[tracking.checkout-click] insert failed", {
      companyId: company.companyId,
      companySlug,
      xcod: payload.xcod ?? null,
      error: getErrorMessage(error),
    });

    return jsonResponse({ message: "Erro ao registrar tracking." }, 500);
  }

  return jsonResponse({ ok: true }, 200);
}
