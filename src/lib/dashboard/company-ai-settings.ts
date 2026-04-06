import "server-only";

import type {
  CompanyAiSettingsRecord,
  CompanyAiSettingsStatus,
} from "@/lib/dashboard/company-ai-settings-types";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

type CompanyAiSettingsRow = {
  api_key?: string | null;
  company_id: string;
  created_at?: string;
  is_enabled?: boolean | null;
  model: string;
  provider: string;
  updated_at: string;
};

const DEFAULT_PROVIDER = "gemini";
const SCHEMA_FALLBACK_CODES = new Set(["42703", "PGRST204", "PGRST205"]);

function createEmptyStatus(companyId: string): CompanyAiSettingsStatus {
  return {
    companyId,
    hasApiKey: false,
    isConfigured: false,
    isEnabled: false,
    model: null,
    provider: null,
    updatedAt: null,
  };
}

function shouldFallbackForSchema(error: { code?: string | null; message?: string | null } | null) {
  if (!error) {
    return false;
  }

  if (error.code && SCHEMA_FALLBACK_CODES.has(error.code)) {
    return true;
  }

  const message = (error.message ?? "").toLowerCase();
  return message.includes("is_enabled") || message.includes("api_key");
}

function mapStatus(companyId: string, row: CompanyAiSettingsRow): CompanyAiSettingsStatus {
  const isEnabled = row.is_enabled !== false;
  const hasApiKey = typeof row.api_key === "string" && row.api_key.trim().length > 0;
  const hasModel = typeof row.model === "string" && row.model.trim().length > 0;

  return {
    companyId,
    hasApiKey,
    isConfigured: isEnabled && hasApiKey && hasModel,
    isEnabled,
    model: hasModel ? row.model : null,
    provider: row.provider,
    updatedAt: row.updated_at,
  };
}

async function fetchCompanyAiSettingsRow(companyId: string): Promise<CompanyAiSettingsRow | null> {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  const primaryQuery = await supabase
    .from("company_ai_settings")
    .select("company_id, provider, model, api_key, is_enabled, updated_at")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!primaryQuery.error) {
    return (primaryQuery.data as CompanyAiSettingsRow | null) ?? null;
  }

  if (!shouldFallbackForSchema(primaryQuery.error)) {
    throw new Error("Não foi possível carregar a configuração de IA da empresa.");
  }

  const fallbackQuery = await supabase
    .from("company_ai_settings")
    .select("company_id, provider, model, updated_at")
    .eq("company_id", companyId)
    .maybeSingle();

  if (fallbackQuery.error) {
    throw new Error("Não foi possível carregar a configuração de IA da empresa.");
  }

  const row = fallbackQuery.data as CompanyAiSettingsRow | null;

  if (!row) {
    return null;
  }

  return {
    ...row,
    api_key: null,
    is_enabled: true,
  };
}

async function fetchCompanyAiSettingsRows(companyIds: string[]): Promise<CompanyAiSettingsRow[]> {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  const primaryQuery = await supabase
    .from("company_ai_settings")
    .select("company_id, provider, model, api_key, is_enabled, updated_at")
    .in("company_id", companyIds);

  if (!primaryQuery.error) {
    return (primaryQuery.data as CompanyAiSettingsRow[] | null) ?? [];
  }

  if (!shouldFallbackForSchema(primaryQuery.error)) {
    throw new Error("Não foi possível carregar as configurações de IA das empresas.");
  }

  const fallbackQuery = await supabase
    .from("company_ai_settings")
    .select("company_id, provider, model, updated_at")
    .in("company_id", companyIds);

  if (fallbackQuery.error) {
    throw new Error("Não foi possível carregar as configurações de IA das empresas.");
  }

  return ((fallbackQuery.data as CompanyAiSettingsRow[] | null) ?? []).map((row) => ({
    ...row,
    api_key: null,
    is_enabled: true,
  }));
}

export async function getCompanyAiSettingsStatus(companyId: string): Promise<CompanyAiSettingsStatus> {
  const row = await fetchCompanyAiSettingsRow(companyId);

  if (!row) {
    return createEmptyStatus(companyId);
  }

  return mapStatus(companyId, row);
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

  const rows = await fetchCompanyAiSettingsRows(uniqueCompanyIds);

  for (const row of rows) {
    statuses.set(row.company_id, mapStatus(row.company_id, row));
  }

  return statuses;
}

export async function getCompanyAiSettingsRecord(
  companyId: string
): Promise<CompanyAiSettingsRecord | null> {
  const row = await fetchCompanyAiSettingsRow(companyId);

  if (!row) {
    return null;
  }

  return {
    apiKey: typeof row.api_key === "string" ? row.api_key : null,
    companyId,
    isEnabled: row.is_enabled !== false,
    model: String(row.model ?? ""),
    provider: String(row.provider ?? DEFAULT_PROVIDER),
  };
}
