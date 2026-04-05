import "server-only";

import type {
  CompanyAiSettingsRecord,
  CompanyAiSettingsStatus,
} from "@/lib/dashboard/company-ai-settings-types";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

type CompanyAiSettingsRow = {
  company_id: string;
  created_at: string;
  model: string;
  provider: string;
  updated_at: string;
};

const DEFAULT_PROVIDER = "gemini";

function createEmptyStatus(companyId: string): CompanyAiSettingsStatus {
  return {
    companyId,
    hasApiKey: false,
    isConfigured: false,
    model: null,
    provider: null,
    updatedAt: null,
  };
}

export async function getCompanyAiSettingsStatus(companyId: string): Promise<CompanyAiSettingsStatus> {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  const { data, error } = await supabase
    .from("company_ai_settings")
    .select("company_id, provider, model, updated_at")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível carregar a configuração de IA da empresa.");
  }

  const row = data as CompanyAiSettingsRow | null;

  if (!row) {
    return createEmptyStatus(companyId);
  }

  return {
    companyId,
    hasApiKey: true,
    isConfigured: true,
    model: row.model,
    provider: row.provider,
    updatedAt: row.updated_at,
  };
}

export async function getCompanyAiSettingsStatuses(
  companyIds: string[]
): Promise<Map<string, CompanyAiSettingsStatus>> {
  const uniqueCompanyIds = [...new Set(companyIds.filter(Boolean))];
  const statuses = new Map<string, CompanyAiSettingsStatus>();

  uniqueCompanyIds.forEach((companyId) => {
    statuses.set(companyId, createEmptyStatus(companyId));
  });

  if (!uniqueCompanyIds.length) {
    return statuses;
  }

  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  const { data, error } = await supabase
    .from("company_ai_settings")
    .select("company_id, provider, model, updated_at")
    .in("company_id", uniqueCompanyIds);

  if (error) {
    throw new Error("Não foi possível carregar as configurações de IA das empresas.");
  }

  for (const row of (data ?? []) as CompanyAiSettingsRow[]) {
    statuses.set(row.company_id, {
      companyId: row.company_id,
      hasApiKey: true,
      isConfigured: true,
      model: row.model,
      provider: row.provider,
      updatedAt: row.updated_at,
    });
  }

  return statuses;
}

export async function getCompanyAiSettingsRecord(
  companyId: string
): Promise<CompanyAiSettingsRecord | null> {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  const { data, error } = await supabase
    .from("company_ai_settings")
    .select("company_id, provider, model, api_key")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível carregar o registro de IA da empresa.");
  }

  if (!data) {
    return null;
  }

  return {
    apiKey: String((data as { api_key: unknown }).api_key ?? ""),
    companyId,
    model: String((data as { model: unknown }).model ?? ""),
    provider: String((data as { provider: unknown }).provider ?? DEFAULT_PROVIDER),
  };
}