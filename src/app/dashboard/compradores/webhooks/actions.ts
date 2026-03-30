"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  completeWebhookReprocessingSuccess,
  HotmartWebhookPayload,
  markWebhookReprocessingAttempt,
  processWebhookLog,
  registerWebhookReprocessingFailure,
} from "@/lib/buyers/hotmart-webhook-processing";
import { getDashboardAccessContext } from "@/lib/dashboard/access";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

const WEBHOOK_LOGS_PATH = "/dashboard/compradores/webhooks";

type RedirectState = {
  message: string;
  status: "error" | "success";
};

type WebhookLogRow = {
  company_id: string | null;
  id: string;
  payload: HotmartWebhookPayload | null;
  processed: boolean;
  webhook_id: string;
};

function redirectToWebhookLogs({ message, status }: RedirectState): never {
  const searchParams = new URLSearchParams();
  searchParams.set("message", message);
  searchParams.set("status", status);

  redirect(`${WEBHOOK_LOGS_PATH}?${searchParams.toString()}`);
}

async function ensureWebhookReprocessingAccess() {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext) {
    redirect("/login");
  }

  return accessContext;
}

async function loadWebhookLog(formData: FormData) {
  const recordIdEntry = formData.get("webhookLogId");
  const webhookIdEntry = formData.get("webhookId");
  const recordId = typeof recordIdEntry === "string" ? recordIdEntry.trim() : "";
  const webhookId = typeof webhookIdEntry === "string" ? webhookIdEntry.trim() : "";

  if (!recordId && !webhookId) {
    redirectToWebhookLogs({
      message: "Webhook inválido para reprocessamento.",
      status: "error",
    });
  }

  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  let query = supabase
    .from("webhook_logs")
    .select("id, webhook_id, company_id, processed, payload")
    .limit(1);

  if (recordId) {
    query = query.eq("id", recordId);
  } else {
    query = query.eq("webhook_id", webhookId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error("Não foi possível localizar o webhook informado.");
  }

  return (data ?? null) as WebhookLogRow | null;
}

export async function reprocessWebhookLogAction(formData: FormData) {
  const accessContext = await ensureWebhookReprocessingAccess();
  const log = await loadWebhookLog(formData);

  if (!log) {
    redirectToWebhookLogs({
      message: "Webhook não encontrado para reprocessamento.",
      status: "error",
    });
  }

  if (log.processed) {
    redirectToWebhookLogs({
      message: "Este webhook já foi processado e não pode ser reprocessado no momento.",
      status: "error",
    });
  }

  if (!accessContext.isAdmin) {
    if (!log.company_id) {
      redirectToWebhookLogs({
        message: "Somente administradores podem reprocessar webhooks sem empresa vinculada.",
        status: "error",
      });
    }

    if (!accessContext.accessibleCompanyIds.includes(log.company_id)) {
      redirectToWebhookLogs({
        message: "Você não tem permissão para reprocessar webhooks desta empresa.",
        status: "error",
      });
    }
  }

  if (!log.payload || typeof log.payload !== "object") {
    redirectToWebhookLogs({
      message: "O payload salvo para este webhook é inválido e não pode ser reprocessado.",
      status: "error",
    });
  }

  try {
    await markWebhookReprocessingAttempt(log.webhook_id);
    await processWebhookLog(log.payload, log.webhook_id);
    await completeWebhookReprocessingSuccess(log.webhook_id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao reprocessar webhook.";

    await registerWebhookReprocessingFailure(log.webhook_id, message);

    revalidatePath(WEBHOOK_LOGS_PATH);
    redirectToWebhookLogs({
      message,
      status: "error",
    });
  }

  revalidatePath(WEBHOOK_LOGS_PATH);
  redirectToWebhookLogs({
    message: "Webhook reprocessado com sucesso.",
    status: "success",
  });
}
