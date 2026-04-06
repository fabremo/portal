import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Crosshair,
  Database,
  Link2,
  Package,
  Settings,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  Users,
} from "lucide-react";

import { getDashboardAccessContext } from "@/lib/dashboard/access";
import { getCompanySettingsData } from "@/lib/dashboard/company-settings";

import {
  createAdAccountAction,
  createCompanyAction,
  createCompanyAdAccountAction,
  createCompanyProductAction,
  toggleAdAccountActiveAction,
  toggleCompanyAdAccountActiveAction,
  toggleCompanyProductActiveAction,
  updateCompanyAction,
  updateCompanyProductAction,
} from "./actions";
import { AiSettingsSection } from "./ai-settings-section";

export const metadata: Metadata = {
  title: "Configurações",
};

type SettingsSection = "ad-accounts" | "ai" | "companies";

type DashboardSettingsPageProps = {
  searchParams?: Promise<{
    company?: string;
    message?: string;
    section?: string;
    status?: string;
  }>;
};

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

function buildSettingsHref(section: SettingsSection, companyId?: string) {
  const searchParams = new URLSearchParams();
  searchParams.set("section", section);

  if (companyId) {
    searchParams.set("company", companyId);
  }

  return `/dashboard/configuracoes?${searchParams.toString()}`;
}

export default async function DashboardSettingsPage({ searchParams }: DashboardSettingsPageProps) {
  const accessContext = await getDashboardAccessContext();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (!accessContext) {
    redirect("/login");
  }

  if (!accessContext.isAdmin) {
    redirect("/dashboard");
  }

  const { availableAdAccounts, companies, users } = await getCompanySettingsData();
  const activeSection: SettingsSection =
    resolvedSearchParams?.section === "ad-accounts"
      ? "ad-accounts"
      : resolvedSearchParams?.section === "ai"
        ? "ai"
        : "companies";
  const selectedCompanyId = resolvedSearchParams?.company;
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) ?? companies[0] ?? null;
  const selectedUserIds = new Set(selectedCompany?.memberships.map((membership) => membership.userId) ?? []);
  const linkableAdAccounts = availableAdAccounts.filter((account) => !account.isBound);
  const message = resolvedSearchParams?.message;
  const status = resolvedSearchParams?.status === "success" ? "success" : "error";

  return (
    <section className="space-y-6">
      <header className="section-shell px-6 py-6 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              <ShieldCheck className="h-3.5 w-3.5" />
              Área administrativa
            </span>
            <div>
              <h2 className="text-3xl font-semibold">Configurações do portal</h2>
              <p className="mt-2 max-w-3xl text-ink/72">
                Organize o catálogo global de contas de anúncio e configure, por empresa, usuários, vínculos e produtos Hotmart.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-black/5 bg-background px-5 py-4 text-sm text-ink/70">
            <Settings className="h-4 w-4 text-accent" />
            Somente administradores
          </div>
        </div>
      </header>

      <nav className="flex flex-wrap gap-3">
        <a
          className={[
            "inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition",
            activeSection === "companies"
              ? "border-accent/30 bg-accent/[0.08] text-accent shadow-card"
              : "border-gray-200 bg-white text-ink/72 hover:border-accent/20 hover:text-accent",
          ].join(" ")}
          href={buildSettingsHref("companies", selectedCompany?.id)}
        >
          <Building2 className="h-4 w-4" />
          Empresas
        </a>
        <a
          className={[
            "inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition",
            activeSection === "ad-accounts"
              ? "border-accent/30 bg-accent/[0.08] text-accent shadow-card"
              : "border-gray-200 bg-white text-ink/72 hover:border-accent/20 hover:text-accent",
          ].join(" ")}
          href={buildSettingsHref("ad-accounts")}
        >
          <Database className="h-4 w-4" />
          Contas de anúncio
        </a>
        <a
          className={[
            "inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition",
            activeSection === "ai"
              ? "border-accent/30 bg-accent/[0.08] text-accent shadow-card"
              : "border-gray-200 bg-white text-ink/72 hover:border-accent/20 hover:text-accent",
          ].join(" ")}
          href={buildSettingsHref("ai", selectedCompany?.id)}
        >
          <Sparkles className="h-4 w-4" />
          IA
        </a>
      </nav>

      {message ? (
        <article
          className={[
            "rounded-[1.5rem] border px-5 py-4 text-sm shadow-card",
            status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700",
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{message}</p>
          </div>
        </article>
      ) : null}
      {activeSection === "companies" ? (
        <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
          <div className="space-y-6">
            <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Nova empresa</p>
                  <h3 className="mt-2 text-xl font-semibold text-ink">Cadastrar empresa</h3>
                  <p className="mt-2 text-sm text-ink/68">
                    Crie a empresa e, em seguida, organize usuários, contas vinculadas e produtos Hotmart.
                  </p>
                </div>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/8 text-accent">
                  <Building2 className="h-5 w-5" />
                </span>
              </div>

              <form action={createCompanyAction} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink" htmlFor="company-name">Nome da empresa</label>
                  <input className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-accent/45 focus:ring-2 focus:ring-accent/12" id="company-name" name="name" placeholder="Ex.: Portal Clientes" required type="text" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink" htmlFor="company-slug">Slug</label>
                  <input className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-accent/45 focus:ring-2 focus:ring-accent/12" id="company-slug" name="slug" placeholder="portal-clientes" required type="text" />
                  <p className="text-xs text-ink/55">O slug será normalizado automaticamente com letras minúsculas e hífens.</p>
                </div>

                <button className="inline-flex w-full items-center justify-center rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-ink/92" type="submit">Cadastrar empresa</button>
              </form>
            </article>

            <article className="rounded-[1.75rem] border border-gray-200 bg-white p-4 shadow-card md:p-5">
              <div className="flex items-center justify-between gap-3 px-2 pb-3">
                <div>
                  <h3 className="text-lg font-semibold text-ink">Empresas cadastradas</h3>
                  <p className="mt-1 text-sm text-ink/65">{companies.length} {companies.length === 1 ? "empresa cadastrada" : "empresas cadastradas"}</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  <Users className="h-3.5 w-3.5" />
                  Admin
                </span>
              </div>

              <div className="space-y-3">
                {companies.length ? (
                  companies.map((company) => {
                    const isSelected = company.id === selectedCompany?.id;

                    return (
                      <a className={[
                        "block rounded-[1.4rem] border px-4 py-4 transition",
                        isSelected ? "border-accent/30 bg-accent/[0.06] shadow-card" : "border-gray-200 bg-background/70 hover:border-accent/20 hover:bg-accent/[0.03]",
                      ].join(" ")} href={buildSettingsHref("companies", company.id)} key={company.id}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">{company.name}</p>
                            <p className="mt-1 text-sm text-ink/62">{company.slug}</p>
                          </div>
                          <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-ink/65">{company.memberCount} {company.memberCount === 1 ? "usuário" : "usuários"}</span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink/58">
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1"><Package className="h-3.5 w-3.5" />{company.products.length} {company.products.length === 1 ? "produto" : "produtos"}</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1"><Link2 className="h-3.5 w-3.5" />{company.adAccounts.length} {company.adAccounts.length === 1 ? "conta" : "contas"}</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1"><Crosshair className="h-3.5 w-3.5" />{company.trackingEnabled ? "Tracking ativo" : "Tracking desabilitado"}</span>
                        </div>
                      </a>
                    );
                  })
                ) : (
                  <div className="rounded-[1.4rem] border border-dashed border-gray-200 bg-background/55 px-4 py-8 text-center text-sm text-ink/58">Nenhuma empresa foi cadastrada até o momento.</div>
                )}
              </div>
            </article>
          </div>

          <div className="space-y-6">
            {selectedCompany ? (
              <>
                <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-7">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Empresa selecionada</p>
                      <h3 className="mt-2 text-2xl font-semibold text-ink">{selectedCompany.name}</h3>
                      <p className="mt-2 max-w-2xl text-sm text-ink/68">Centralize aqui a configuração da empresa, os vínculos com usuários, as contas oficiais e os produtos Hotmart.</p>
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-background px-4 py-3 text-sm text-ink/68">Criada em {formatDateTime(selectedCompany.createdAt)}</div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2 text-xs text-ink/60">
                    <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5"><Users className="h-3.5 w-3.5 text-accent" />{selectedCompany.memberCount} {selectedCompany.memberCount === 1 ? "usuário" : "usuários"}</span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5"><Link2 className="h-3.5 w-3.5 text-accent" />{selectedCompany.activeAdAccountCount} contas ativas</span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5"><Package className="h-3.5 w-3.5 text-accent" />{selectedCompany.activeProductCount} produtos ativos</span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5"><Crosshair className="h-3.5 w-3.5 text-accent" />{selectedCompany.trackingEnabled ? "Tracking habilitado" : "Tracking desabilitado"}</span>
                  </div>
                </article>

                <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Dados da empresa</p>
                      <h3 className="mt-2 text-xl font-semibold text-ink">Informações principais</h3>
                    </div>
                  </div>

                  <form action={updateCompanyAction} className="mt-6 space-y-6">
                    <input name="companyId" type="hidden" value={selectedCompany.id} />

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-ink" htmlFor="selected-company-name">Nome da empresa</label>
                        <input className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-accent/45 focus:ring-2 focus:ring-accent/12" defaultValue={selectedCompany.name} id="selected-company-name" name="name" required type="text" />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-ink" htmlFor="selected-company-slug">Slug</label>
                        <input className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-accent/45 focus:ring-2 focus:ring-accent/12" defaultValue={selectedCompany.slug} id="selected-company-slug" name="slug" required type="text" />
                      </div>
                    </div>

                    <label className="flex items-start gap-3 rounded-[1.4rem] border border-gray-200 bg-background/55 px-4 py-4 text-sm text-ink transition hover:border-accent/25">
                      <input className="mt-1 h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" defaultChecked={selectedCompany.trackingEnabled} name="trackingEnabled" type="checkbox" value="1" />
                      <span>
                        <span className="block font-medium text-ink">Habilitar tracking</span>
                        <span className="mt-1 block text-ink/62">Libera o endpoint público de tracking para esta empresa e exibe o módulo na navegação quando esta empresa estiver ativa.</span>
                      </span>
                    </label>

                    <div className="flex justify-end border-t border-gray-100 pt-6">
                      <button className="inline-flex items-center justify-center rounded-2xl bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-accent/92" type="submit">Salvar empresa</button>
                    </div>
                  </form>
                </article>

                <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Usuários</p>
                      <h3 className="mt-2 text-xl font-semibold text-ink">Usuários vinculados</h3>
                      <p className="mt-2 text-sm text-ink/65">Marque os usuários que devem fazer parte desta empresa.</p>
                    </div>
                    <div className="rounded-full border border-gray-200 bg-background px-3 py-1.5 text-xs font-medium text-ink/62">{selectedCompany.memberCount} {selectedCompany.memberCount === 1 ? "usuário selecionado" : "usuários selecionados"}</div>
                  </div>

                  <form action={updateCompanyAction} className="mt-6 space-y-6">
                    <input name="companyId" type="hidden" value={selectedCompany.id} />
                    <input name="name" type="hidden" value={selectedCompany.name} />
                    <input name="slug" type="hidden" value={selectedCompany.slug} />
                    <input name="trackingEnabled" type="hidden" value={selectedCompany.trackingEnabled ? "1" : "0"} />

                    {users.length ? (
                      <div className="grid max-h-[28rem] gap-3 overflow-y-auto rounded-[1.4rem] border border-gray-200 bg-background/60 p-4 md:grid-cols-2">
                        {users.map((user) => (
                          <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink transition hover:border-accent/25" key={user.id}>
                            <input className="mt-1 h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" defaultChecked={selectedUserIds.has(user.id)} name="userIds" type="checkbox" value={user.id} />
                            <span className="min-w-0 break-all">{user.email}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[1.4rem] border border-dashed border-gray-200 bg-background/55 px-4 py-8 text-center text-sm text-ink/58">Nenhum usuário disponível para vínculo.</div>
                    )}

                    <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-ink/62">Os vínculos são muitos-para-muitos: o mesmo usuário pode participar de várias empresas.</p>
                      <button className="inline-flex items-center justify-center rounded-2xl bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-accent/92" type="submit">Salvar usuários</button>
                    </div>
                  </form>
                </article>
                <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-7">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Contas vinculadas</p>
                      <h3 className="mt-2 text-xl font-semibold text-ink">Contas oficiais da empresa</h3>
                      <p className="mt-2 max-w-3xl text-sm text-ink/68">Selecione uma conta já cadastrada no catálogo global e vincule-a a esta empresa.</p>
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-background px-4 py-3 text-sm text-ink/68">{selectedCompany.adAccounts.length} {selectedCompany.adAccounts.length === 1 ? "conta vinculada" : "contas vinculadas"}</div>
                  </div>

                  <div className="mt-8 rounded-[1.5rem] border border-gray-200 bg-background/55 p-5 md:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-lg font-semibold text-ink">Vincular conta existente</h4>
                        <p className="mt-1 text-sm text-ink/65">Contas já vinculadas a outra empresa não aparecem nessa seleção.</p>
                      </div>
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-accent"><Link2 className="h-5 w-5" /></span>
                    </div>

                    <form action={createCompanyAdAccountAction} className="mt-6 grid gap-4 xl:grid-cols-[minmax(220px,1fr)_minmax(240px,1.4fr)_auto]">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-ink" htmlFor="new-ad-account-company">Empresa</label>
                        <select className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-accent/45 focus:ring-2 focus:ring-accent/12" defaultValue={selectedCompany.id} id="new-ad-account-company" name="companyId">
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-ink" htmlFor="new-ad-account-id">Conta de anúncio</label>
                        <select className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-accent/45 focus:ring-2 focus:ring-accent/12" disabled={!linkableAdAccounts.length} id="new-ad-account-id" name="adAccountId">
                          <option value="">{linkableAdAccounts.length ? "Selecione uma conta" : "Nenhuma conta disponível"}</option>
                          {linkableAdAccounts.map((account) => (
                            <option key={account.id} value={account.id}>{account.name}{account.isActive ? "" : " - inativa"}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col justify-end gap-3">
                        <label className="inline-flex items-center gap-2 text-sm text-ink/72">
                          <input defaultChecked name="isActive" type="checkbox" value="1" />
                          Ativo
                        </label>
                        <button className="inline-flex items-center justify-center rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-ink/92 disabled:cursor-not-allowed disabled:opacity-55" disabled={!linkableAdAccounts.length} type="submit">Vincular conta</button>
                      </div>
                    </form>
                  </div>

                  <div className="mt-8 space-y-4">
                    {selectedCompany.adAccounts.length ? (
                      selectedCompany.adAccounts.map((binding) => (
                        <div className="rounded-[1.5rem] border border-gray-200 bg-white p-5" key={binding.id}>
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-lg font-semibold text-ink">{binding.adAccountName}</h4>
                                <span className={[
                                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                                  binding.isActive ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-gray-200 bg-gray-100 text-ink/62",
                                ].join(" ")}>
                                  <ToggleLeft className="h-3.5 w-3.5" />
                                  {binding.isActive ? "Ativa" : "Inativa"}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-ink/62">ID da conta: {binding.adAccountId}</p>
                              <p className="mt-1 text-sm text-ink/62">Criada em {formatDateTime(binding.createdAt)}. Última atualização em {formatDateTime(binding.updatedAt)}.</p>
                            </div>

                            <form action={toggleCompanyAdAccountActiveAction}>
                              <input name="bindingId" type="hidden" value={binding.id} />
                              <input name="companyId" type="hidden" value={selectedCompany.id} />
                              <input name="nextIsActive" type="hidden" value={binding.isActive ? "false" : "true"} />
                              <button className={[
                                "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium transition",
                                binding.isActive ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                              ].join(" ")} type="submit">{binding.isActive ? "Desativar conta" : "Reativar conta"}</button>
                            </form>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.4rem] border border-dashed border-gray-200 bg-background/55 px-4 py-10 text-center text-sm text-ink/58">Esta empresa ainda não possui contas de anúncio vinculadas.</div>
                    )}
                  </div>
                </article>

                <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-7">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Produtos Hotmart</p>
                      <h3 className="mt-2 text-xl font-semibold text-ink">Produtos usados no webhook</h3>
                      <p className="mt-2 max-w-3xl text-sm text-ink/68">Cadastre aqui os produtos Hotmart que pertencem a esta empresa para que o webhook consiga identificar o <code>company_id</code> corretamente.</p>
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-background px-4 py-3 text-sm text-ink/68">{selectedCompany.products.length} {selectedCompany.products.length === 1 ? "produto cadastrado" : "produtos cadastrados"}</div>
                  </div>

                  <div className="mt-8 rounded-[1.5rem] border border-gray-200 bg-background/55 p-5 md:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-lg font-semibold text-ink">Novo produto Hotmart</h4>
                        <p className="mt-1 text-sm text-ink/65">O vínculo com a empresa é obrigatório e o ID do produto Hotmart precisa ser único no sistema.</p>
                      </div>
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-accent"><Package className="h-5 w-5" /></span>
                    </div>

                    <form action={createCompanyProductAction} className="mt-6 grid gap-4 xl:grid-cols-[minmax(180px,0.9fr)_minmax(160px,0.8fr)_minmax(220px,1.2fr)_auto]">
                      <div className="space-y-2 xl:col-span-1">
                        <label className="text-sm font-medium text-ink" htmlFor="new-product-company">Empresa</label>
                        <select className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-accent/45 focus:ring-2 focus:ring-accent/12" defaultValue={selectedCompany.id} id="new-product-company" name="companyId">
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-ink" htmlFor="new-product-id">ID Hotmart</label>
                        <input className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-accent/45 focus:ring-2 focus:ring-accent/12" id="new-product-id" inputMode="numeric" name="hotmartProductId" placeholder="123456" required type="number" />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-ink" htmlFor="new-product-name">Nome do produto</label>
                        <input className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-accent/45 focus:ring-2 focus:ring-accent/12" id="new-product-name" name="productName" placeholder="Nome exibido na Hotmart" required type="text" />
                      </div>

                      <div className="flex flex-col justify-end gap-3">
                        <label className="inline-flex items-center gap-2 text-sm text-ink/72"><input defaultChecked name="isActive" type="checkbox" value="1" />Ativo</label>
                        <button className="inline-flex items-center justify-center rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-ink/92" type="submit">Cadastrar produto</button>
                      </div>
                    </form>
                  </div>
                  <div className="mt-8 space-y-4">
                    {selectedCompany.products.length ? (
                      selectedCompany.products.map((product) => (
                        <div className="rounded-[1.5rem] border border-gray-200 bg-white p-5" key={product.id}>
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-lg font-semibold text-ink">{product.productName}</h4>
                                <span className={[
                                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                                  product.isActive ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-gray-200 bg-gray-100 text-ink/62",
                                ].join(" ")}>
                                  <ToggleLeft className="h-3.5 w-3.5" />
                                  {product.isActive ? "Ativo" : "Inativo"}
                                </span>
                              </div>
                            </div>

                            <form action={toggleCompanyProductActiveAction}>
                              <input name="companyId" type="hidden" value={selectedCompany.id} />
                              <input name="productId" type="hidden" value={product.id} />
                              <input name="nextIsActive" type="hidden" value={product.isActive ? "false" : "true"} />
                              <button className={[
                                "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium transition",
                                product.isActive ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                              ].join(" ")} type="submit">{product.isActive ? "Desativar produto" : "Reativar produto"}</button>
                            </form>
                          </div>

                          <form action={updateCompanyProductAction} className="mt-6 grid gap-4 xl:grid-cols-[minmax(180px,0.9fr)_minmax(160px,0.8fr)_minmax(240px,1.2fr)_auto]">
                            <input name="productId" type="hidden" value={product.id} />

                            <div className="space-y-2">
                              <label className="text-sm font-medium text-ink">Empresa</label>
                              <select className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none transition focus:border-accent/45 focus:ring-2 focus:ring-accent/12" defaultValue={product.companyId} name="companyId">
                                {companies.map((company) => (
                                  <option key={`${product.id}-${company.id}`} value={company.id}>{company.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium text-ink">ID Hotmart</label>
                              <input className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none transition focus:border-accent/45 focus:ring-2 focus:ring-accent/12" defaultValue={product.hotmartProductId} inputMode="numeric" name="hotmartProductId" required type="number" />
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium text-ink">Nome do produto</label>
                              <input className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none transition focus:border-accent/45 focus:ring-2 focus:ring-accent/12" defaultValue={product.productName} name="productName" required type="text" />
                            </div>

                            <div className="flex flex-col justify-end gap-3">
                              <label className="inline-flex items-center gap-2 text-sm text-ink/72"><input checked={product.isActive} name="isActive" readOnly type="checkbox" value="1" />Ativo</label>
                              <button className="inline-flex items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition hover:bg-accent/92" type="submit">Salvar produto</button>
                            </div>
                          </form>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.4rem] border border-dashed border-gray-200 bg-background/55 px-4 py-10 text-center text-sm text-ink/58">Esta empresa ainda não possui produtos Hotmart cadastrados.</div>
                    )}
                  </div>
                </article>
              </>
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-gray-200 bg-background/55 px-6 py-14 text-center shadow-card">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/8 text-accent"><Settings className="h-6 w-6" /></div>
                <h3 className="mt-5 text-xl font-semibold text-ink">Nenhuma empresa selecionada</h3>
                <p className="mt-3 max-w-md text-sm text-ink/65">Cadastre a primeira empresa na coluna ao lado para liberar a configuração de usuários, contas vinculadas e produtos Hotmart.</p>
              </div>
            )}
          </div>
        </div>
      ) : activeSection === "ai" ? (
        <AiSettingsSection companies={companies} selectedCompany={selectedCompany} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Catálogo global</p>
                <h3 className="mt-2 text-xl font-semibold text-ink">Cadastrar conta de anúncio</h3>
                <p className="mt-2 text-sm text-ink/68">Cadastre aqui as contas disponíveis no sistema. O vínculo com a empresa continua sendo feito na área de Empresas.</p>
              </div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/8 text-accent"><Database className="h-5 w-5" /></span>
            </div>

            <form action={createAdAccountAction} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-ink" htmlFor="global-ad-account-id">ID da conta</label>
                <input className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-accent/45 focus:ring-2 focus:ring-accent/12" id="global-ad-account-id" name="adAccountId" placeholder="act_123456789" required type="text" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-ink" htmlFor="global-ad-account-name">Nome da conta</label>
                <input className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-accent/45 focus:ring-2 focus:ring-accent/12" id="global-ad-account-name" name="adAccountName" placeholder="Conta principal Meta Ads" required type="text" />
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-ink/72"><input defaultChecked name="isActive" type="checkbox" value="1" />Ativa para uso</label>

              <button className="inline-flex w-full items-center justify-center rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-ink/92" type="submit">Cadastrar conta</button>
            </form>
          </article>

          <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Catálogo global</p>
                <h3 className="mt-2 text-2xl font-semibold text-ink">Contas cadastradas</h3>
                <p className="mt-2 max-w-3xl text-sm text-ink/68">Visualize o status de cada conta e veja rapidamente se ela já foi vinculada a alguma empresa.</p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-background px-4 py-3 text-sm text-ink/68">{availableAdAccounts.length} {availableAdAccounts.length === 1 ? "conta cadastrada" : "contas cadastradas"}</div>
            </div>

            <div className="mt-8 space-y-4">
              {availableAdAccounts.length ? (
                availableAdAccounts.map((account) => (
                  <div className="rounded-[1.5rem] border border-gray-200 bg-white p-5" key={account.id}>
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-lg font-semibold text-ink">{account.name}</h4>
                          <span className={[
                            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                            account.isActive ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-gray-200 bg-gray-100 text-ink/62",
                          ].join(" ")}><ToggleLeft className="h-3.5 w-3.5" />{account.isActive ? "Ativa" : "Inativa"}</span>
                          <span className={[
                            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                            account.isBound ? "border border-accent/20 bg-accent/[0.08] text-accent" : "border border-gray-200 bg-gray-100 text-ink/62",
                          ].join(" ")}><Link2 className="h-3.5 w-3.5" />{account.isBound ? "Vinculada" : "Sem vínculo"}</span>
                        </div>
                        <p className="mt-2 text-sm text-ink/62">ID da conta: {account.id}</p>
                        {account.boundCompanyName ? (
                          <p className="mt-1 text-sm text-ink/62">Vinculada à empresa <a className="font-medium text-accent hover:underline" href={buildSettingsHref("companies", account.boundCompanyId ?? undefined)}>{account.boundCompanyName}</a>.</p>
                        ) : (
                          <p className="mt-1 text-sm text-ink/62">Disponível para vínculo na área de Empresas.</p>
                        )}
                      </div>

                      <form action={toggleAdAccountActiveAction}>
                        <input name="adAccountId" type="hidden" value={account.id} />
                        <input name="nextIsActive" type="hidden" value={account.isActive ? "false" : "true"} />
                        <button className={[
                          "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium transition",
                          account.isActive ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                        ].join(" ")} type="submit">{account.isActive ? "Desativar conta" : "Reativar conta"}</button>
                      </form>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-gray-200 bg-background/55 px-4 py-10 text-center text-sm text-ink/58">Nenhuma conta de anúncio foi cadastrada até o momento.</div>
              )}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
