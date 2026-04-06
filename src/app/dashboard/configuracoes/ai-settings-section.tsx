import { Sparkles } from "lucide-react";

import {
  clearCompanyAiApiKeyAction,
  saveCompanyAiSettingsAction,
  toggleCompanyAiSettingsActiveAction,
} from "@/app/dashboard/configuracoes/actions";
import { listGeminiModels } from "@/lib/ai/gemini";
import { getCompanyAiSettingsRecord, getCompanyAiSettingsStatuses } from "@/lib/dashboard/company-ai-settings";
import type { CompanyAiSettingsStatus } from "@/lib/dashboard/company-ai-settings-types";
import type { CompanySettingsCompany } from "@/lib/dashboard/company-settings";

type AiSettingsSectionProps = {
  companies: CompanySettingsCompany[];
  selectedCompany: CompanySettingsCompany | null;
};

function buildSettingsHref(companyId?: string) {
  const searchParams = new URLSearchParams();
  searchParams.set("section", "ai");

  if (companyId) {
    searchParams.set("company", companyId);
  }

  return `/dashboard/configuracoes?${searchParams.toString()}`;
}

function formatDateTime(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsedDate);
}

function renderStatusBadge(status: CompanyAiSettingsStatus | null) {
  const tone = status?.isEnabled && status.hasApiKey
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : status?.hasApiKey
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-gray-200 bg-gray-100 text-ink/62";
  const label = status?.isEnabled && status.hasApiKey
    ? "Configurada"
    : status?.hasApiKey
      ? "Desabilitada"
      : "Pendente";

  return <span className={["rounded-full border px-3 py-1 text-xs font-medium", tone].join(" ")}>{label}</span>;
}

export async function AiSettingsSection({ companies, selectedCompany }: AiSettingsSectionProps) {
  const aiStatuses = await getCompanyAiSettingsStatuses(companies.map((company) => company.id));
  const selectedAiStatus = selectedCompany ? aiStatuses.get(selectedCompany.id) ?? null : null;
  const selectedAiRecord = selectedCompany ? await getCompanyAiSettingsRecord(selectedCompany.id) : null;
  let availableGeminiModels: Awaited<ReturnType<typeof listGeminiModels>> = [];
  let modelsError: string | null = null;

  if (selectedAiRecord?.apiKey && selectedAiRecord.provider === "gemini") {
    try {
      availableGeminiModels = await listGeminiModels(selectedAiRecord.apiKey);
    } catch (error) {
      modelsError = error instanceof Error ? error.message : "Não foi possível listar os modelos do Gemini.";
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Provider</p>
            <h3 className="mt-2 text-xl font-semibold text-ink">Gemini por empresa</h3>
            <p className="mt-2 text-sm text-ink/68">
              Defina a credencial, escolha um modelo existente e controle se a IA está habilitada para a empresa selecionada.
            </p>
          </div>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/8 text-accent"><Sparkles className="h-5 w-5" /></span>
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Empresas disponíveis</p>
          {companies.length ? (
            companies.map((company) => {
              const isSelected = company.id === selectedCompany?.id;
              const aiStatus = aiStatuses.get(company.id) ?? null;

              return (
                <a
                  className={[
                    "block rounded-[1.4rem] border px-4 py-4 transition",
                    isSelected
                      ? "border-accent/30 bg-accent/[0.06] shadow-card"
                      : "border-gray-200 bg-background/70 hover:border-accent/20 hover:bg-accent/[0.03]",
                  ].join(" ")}
                  href={buildSettingsHref(company.id)}
                  key={company.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{company.name}</p>
                      <p className="mt-1 text-sm text-ink/62">{company.slug}</p>
                    </div>
                    {renderStatusBadge(aiStatus)}
                  </div>
                </a>
              );
            })
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-gray-200 bg-background/55 px-4 py-8 text-center text-sm text-ink/58">Cadastre uma empresa para liberar a configuração de IA.</div>
          )}
        </div>
      </article>

      {selectedCompany ? (
        <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Empresa selecionada</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink">IA de {selectedCompany.name}</h3>
              <p className="mt-2 max-w-3xl text-sm text-ink/68">
                Salve a API key do Gemini, carregue os modelos existentes da conta e escolha qual modelo a empresa deve usar no relatório de vendas.
              </p>
            </div>
            {renderStatusBadge(selectedAiStatus)}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-[1.35rem] border border-gray-200 bg-background/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Provider</p>
              <p className="mt-2 text-sm font-medium text-ink">{selectedAiStatus?.provider?.toUpperCase() ?? "GEMINI"}</p>
            </div>
            <div className="rounded-[1.35rem] border border-gray-200 bg-background/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Modelo atual</p>
              <p className="mt-2 text-sm font-medium text-ink">{selectedAiStatus?.model ?? "Ainda não definido"}</p>
            </div>
            <div className="rounded-[1.35rem] border border-gray-200 bg-background/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">API key</p>
              <p className="mt-2 text-sm font-medium text-ink">{selectedAiStatus?.hasApiKey ? "Chave salva" : "Sem chave"}</p>
            </div>
            <div className="rounded-[1.35rem] border border-gray-200 bg-background/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Última atualização</p>
              <p className="mt-2 text-sm font-medium text-ink">{selectedAiStatus?.updatedAt ? formatDateTime(selectedAiStatus.updatedAt) : "Sem registro"}</p>
            </div>
          </div>

          {modelsError ? (
            <div className="mt-6 rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
              {modelsError}
            </div>
          ) : null}

          <form action={saveCompanyAiSettingsAction} className="mt-8 space-y-6">
            <input name="companyId" type="hidden" value={selectedCompany.id} />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-ink" htmlFor="ai-provider">Provider</label>
                <input className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none" defaultValue="gemini" id="ai-provider" name="provider" readOnly type="text" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-ink" htmlFor="ai-model">Modelo</label>
                <select className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none transition focus:border-accent/45 focus:ring-2 focus:ring-accent/12 disabled:cursor-not-allowed disabled:opacity-60" defaultValue={selectedAiStatus?.model ?? availableGeminiModels[0]?.value ?? ""} disabled={!availableGeminiModels.length} id="ai-model" name="model" required={availableGeminiModels.length > 0}>
                  {availableGeminiModels.length ? (
                    availableGeminiModels.map((model) => (
                      <option key={model.value} value={model.value}>{model.label}{model.description ? ` - ${model.description}` : ""}</option>
                    ))
                  ) : (
                    <option value="">{selectedAiStatus?.hasApiKey ? "Nenhum modelo carregado para esta chave" : "Salve uma API key válida para carregar modelos"}</option>
                  )}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink" htmlFor="ai-api-key">API key</label>
              <input className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-accent/45 focus:ring-2 focus:ring-accent/12" id="ai-api-key" name="apiKey" placeholder={selectedAiStatus?.hasApiKey ? "Deixe em branco para manter a chave atual" : "Cole a API key do Gemini e salve para carregar modelos"} type="password" />
              <p className="text-xs text-ink/55">{selectedAiStatus?.hasApiKey ? "A chave atual já está salva. Preencha o campo apenas se quiser substituir a credencial e atualizar a lista de modelos." : "A lista de modelos é carregada a partir da API key salva da empresa."}</p>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
              <button className="inline-flex items-center justify-center rounded-2xl bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-accent/92" type="submit">Salvar configuração de IA</button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-100 pt-6">
            <form action={toggleCompanyAiSettingsActiveAction}>
              <input name="companyId" type="hidden" value={selectedCompany.id} />
              <input name="nextIsEnabled" type="hidden" value={selectedAiStatus?.isEnabled ? "false" : "true"} />
              <button className={["inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium transition", selectedAiStatus?.isEnabled ? "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"].join(" ")} type="submit">{selectedAiStatus?.isEnabled ? "Desabilitar IA" : "Habilitar IA"}</button>
            </form>

            <form action={clearCompanyAiApiKeyAction}>
              <input name="companyId" type="hidden" value={selectedCompany.id} />
              <button className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition hover:bg-red-100" type="submit">Apagar API key</button>
            </form>
          </div>
        </article>
      ) : (
        <div className="rounded-[1.75rem] border border-dashed border-gray-200 bg-background/55 px-6 py-14 text-center shadow-card">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/8 text-accent"><Sparkles className="h-6 w-6" /></div>
          <h3 className="mt-5 text-xl font-semibold text-ink">Nenhuma empresa selecionada</h3>
          <p className="mt-3 max-w-md text-sm text-ink/65">Selecione uma empresa para configurar a API key, escolher um modelo disponível e controlar o status da IA.</p>
        </div>
      )}
    </div>
  );
}
