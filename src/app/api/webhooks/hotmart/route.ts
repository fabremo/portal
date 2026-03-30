import { NextResponse } from "next/server";

import {
  buildWebhookLogInsert,
  completeInitialWebhookSuccess,
  getWebhookStageError,
  HotmartWebhookPayload,
  isJsonRequest,
  processWebhookLog,
  registerInitialWebhookFailure,
  resolveWebhookSecret,
} from "@/lib/buyers/hotmart-webhook-processing";
import { createServiceRoleSupabaseClient, hasServiceRoleSupabaseEnv } from "@/lib/supabase/service-role";

const webhookSecret = process.env.HOTMART_WEBHOOK_SECRET;

export async function POST(request: Request) {
  const startedAt = Date.now();

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

  const insertData = buildWebhookLogInsert(payload, null);

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
    await processWebhookLog(payload, insertData.webhook_id);
    await completeInitialWebhookSuccess(insertData.webhook_id, Date.now() - startedAt);
  } catch (error) {
    const stageError = getWebhookStageError(error, "process_approved");

    await registerInitialWebhookFailure(insertData.webhook_id, {
      durationMs: Date.now() - startedAt,
      message: stageError.message,
      stage: stageError.stage,
    });

    return NextResponse.json({ message: stageError.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Webhook registrado e processado com sucesso." }, { status: 200 });
}
