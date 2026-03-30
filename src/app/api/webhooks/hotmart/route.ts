import { NextResponse } from "next/server";

import {
  buildWebhookLogInsert,
  completeWebhookReprocessingSuccess,
  HotmartWebhookPayload,
  isJsonRequest,
  processWebhookLog,
  resolveCompanyFromProduct,
  resolveWebhookSecret,
  setWebhookProcessingState,
} from "@/lib/buyers/hotmart-webhook";
import { createServiceRoleSupabaseClient, hasServiceRoleSupabaseEnv } from "@/lib/supabase/service-role";

const webhookSecret = process.env.HOTMART_WEBHOOK_SECRET;

export async function POST(request: Request) {
  if (!isJsonRequest(request.headers.get("content-type"))) {
    return NextResponse.json({ message: "Payload JSON inválido." }, { status: 400 });
  }

  let payload: HotmartWebhookPayload;

  try {
    payload = (await request.json()) as HotmartWebhookPayload;
  } catch {
    return NextResponse.json({ message: "Payload JSON inválido." }, { status: 400 });
  }

  const requestSecret = resolveWebhookSecret(payload, request.headers);

  if (!webhookSecret || requestSecret !== webhookSecret) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  if (!hasServiceRoleSupabaseEnv) {
    return NextResponse.json({ message: "Configuração do Supabase incompleta." }, { status: 500 });
  }

  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ message: "Configuração do Supabase incompleta." }, { status: 500 });
  }

  let resolvedCompanyId: string | null = null;

  try {
    const resolvedCompany = await resolveCompanyFromProduct(payload);
    resolvedCompanyId = resolvedCompany?.companyId ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao resolver a empresa pelo produto Hotmart.";

    return NextResponse.json({ message }, { status: 500 });
  }

  const insertData = buildWebhookLogInsert(payload, resolvedCompanyId);

  if (!insertData) {
    return NextResponse.json({ message: "Campos obrigatórios ausentes." }, { status: 400 });
  }

  const { error } = await supabase.from("webhook_logs").insert(insertData);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ message: "Webhook já registrado." }, { status: 200 });
    }

    return NextResponse.json({ message: "Erro ao registrar webhook." }, { status: 500 });
  }

  try {
    const result = await processWebhookLog(payload, insertData.webhook_id);

    if (!result.handled) {
      return NextResponse.json({ message: "Webhook registrado com sucesso." }, { status: 201 });
    }

    await completeWebhookReprocessingSuccess(insertData.webhook_id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao processar webhook.";

    await setWebhookProcessingState(insertData.webhook_id, {
      processed: false,
      processing_error: message,
    });

    return NextResponse.json({ message }, { status: 500 });
  }

  return NextResponse.json({ message: "Webhook registrado e compra processada com sucesso." }, { status: 201 });
}
