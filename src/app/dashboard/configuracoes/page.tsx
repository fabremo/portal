import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Package,
  Settings,
  ShieldCheck,
  ToggleLeft,
  Users,
} from "lucide-react";

import { getDashboardAccessContext } from "@/lib/dashboard/access";
import { getCompanySettingsData } from "@/lib/dashboard/company-settings";

import {
  createCompanyAction,
  createCompanyProductAction,
  toggleCompanyProductActiveAction,
  updateCompanyAction,
  updateCompanyProductAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Configurações",
};

type DashboardSettingsPageProps = {
  searchParams?: Promise<{
    company?: string;
    message?: string;
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

export default async function DashboardSettingsPage({ searchParams }: DashboardSettingsPageProps) {
  const accessContext = await getDashboardAccessContext();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (!accessContext) {
    redirect("/login");
  }

  if (!accessContext.isAdmin) {
    redirect("/dashboard");
  }

  const { companies, users } = await getCompanySettingsData();
  const selectedCompanyId = resolvedSearchParams?.company;
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) ?? companies[0] ?? null;
  const selectedUserIds = new Set(selectedCompany?.memberships.map((membership) => membership.userId) ?? []);
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
                Cadastre empresas, usuários vinculados e os produtos Hotmart usados para identificar a empresa no webhook.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-black/5 bg-background px-5 py-4 text-sm text-ink/70">
            <Settings className="h-4 w-4 text-accent" />
            Somente administradores
          </div>
        </div>
      </header>

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

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Nova empresa</p>
                <h3 className="mt-2 text-xl font-semibold text-ink">Cadastrar empresa</h3>
                <p className="mt-2 text-sm text-ink/68">
                  Cadastre a empresa e depois configure usuários e produtos Hotmart no painel ao lado.
                </p>
              </div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/8 text-accent">
                <Building2 className="h-5 w-5" />
              </span>
            </div>

            <form action={createCompanyAction} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-ink" htmlFor="company-name">
                  Nome da empresa
                </label>
                <input
                  className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-accent/45 focus:ring-2 focus:ring-accent/12"
                  id="company-name"
                  name="name"
                  placeholder="Ex.: Portal Clientes"
                  required
                  type="text"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-ink" htmlFor="company-slug">
                  Slug
                </label>
                <input
                  className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-accent/45 focus:ring-2 focus:ring-accent/12"
                  id="company-slug"
                  name="slug"
                  placeholder="portal-clientes"
                  required
                  type="text"
                />
                <p className="text-xs text-ink/55">
                  O slug será normalizado automaticamente com letras minúsculas e hífens.
                </p>
              </div>

              <button
                className="inline-flex w-full items-center justify-center rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-ink/92"
                type="submit"
              >
                Cadastrar empresa
              </button>
            </form>
          </article>

          <article className="rounded-[1.75rem] border border-gray-200 bg-white p-4 shadow-card md:p-5">
            <div className="flex items-center justify-between gap-3 px-2 pb-3">
              <div>
                <h3 className="text-lg font-semibold text-ink">Empresas cadastradas</h3>
                <p className="mt-1 text-sm text-ink/65">
                  {companies.length} {companies.length === 1 ? "empresa cadastrada" : "empresas cadastradas"}
                </p>
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
                    <a
                      className={[
                        "block rounded-[1.4rem] border px-4 py-4 transition",
                        isSelected
                          ? "border-accent/30 bg-accent/[0.06] shadow-card"
                          : "border-gray-200 bg-background/70 hover:border-accent/20 hover:bg-accent/[0.03]",
                      ].join(" ")}
                      href={`/dashboard/configuracoes?company=${company.id}`}
                      key={company.id}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{company.name}</p>
                          <p className="mt-1 text-sm text-ink/62">{company.slug}</p>
                        </div>
                        <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-ink/65">
                          {company.memberCount} {company.memberCount === 1 ? "usuário" : "usuários"}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink/58">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1">
                          <Package className="h-3.5 w-3.5" />
                          {company.products.length} {company.products.length === 1 ? "produto" : "produtos"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          {company.activeProductCount} ativos
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {company.memberships.length ? (
                          company.memberships.slice(0, 3).map((membership) => (
                            <span
                              className="rounded-full bg-white px-3 py-1 text-xs text-ink/62"
                              key={`${company.id}-${membership.userId}`}
                            >
                              {membership.email}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-ink/52">Nenhum usuário vinculado.</span>
                        )}

                        {company.memberships.length > 3 ? (
                          <span className="rounded-full bg-white px-3 py-1 text-xs text-ink/62">
                            +{company.memberships.length - 3} usuários
                          </span>
                        ) : null}
                      </div>
                    </a>
                  );
                })
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-gray-200 bg-background/55 px-4 py-8 text-center text-sm text-ink/58">
                  Nenhuma empresa foi cadastrada até o momento.
                </div>
              )}
            </div>
          </article>
        </div>

        <div className="space-y-6">
          <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-7">
            {selectedCompany ? (
              <>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
                      Empresa selecionada
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-ink">{selectedCompany.name}</h3>
                    <p className="mt-2 max-w-2xl text-sm text-ink/68">
                      Atualize os dados da empresa e defina quais usuários existentes fazem parte dela.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-background px-4 py-3 text-sm text-ink/68">
                    Criada em {formatDateTime(selectedCompany.createdAt)}
                  </div>
                </div>

                <form action={updateCompanyAction} className="mt-8 space-y-8">
                  <input name="companyId" type="hidden" value={selectedCompany.id} />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-ink" htmlFor="selected-company-name">
                        Nome da empresa
                      </label>
                      <input
                        className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-accent/45 focus:ring-2 focus:ring-accent/12"
                        defaultValue={selectedCompany.name}
                        id="selected-company-name"
                        name="name"
                        required
                        type="text"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-ink" htmlFor="selected-company-slug">
                        Slug
                      </label>
                      <input
                        className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-accent/45 focus:ring-2 focus:ring-accent/12"
                        defaultValue={selectedCompany.slug}
                        id="selected-company-slug"
                        name="slug"
                        required
                        type="text"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-lg font-semibold text-ink">Usuários vinculados</h4>
                        <p className="mt-1 text-sm text-ink/65">
                          Marque os usuários que devem fazer parte desta empresa.
                        </p>
                      </div>
                      <div className="rounded-full border border-gray-200 bg-background px-3 py-1.5 text-xs font-medium text-ink/62">
                        {selectedCompany.memberCount}{" "}
                        {selectedCompany.memberCount === 1 ? "usuário selecionado" : "usuários selecionados"}
                      </div>
                    </div>

                    {users.length ? (
                      <div className="grid max-h-[28rem] gap-3 overflow-y-auto rounded-[1.4rem] border border-gray-200 bg-background/60 p-4 md:grid-cols-2">
                        {users.map((user) => (
                          <label
                            className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink transition hover:border-accent/25"
                            key={user.id}
                          >
                            <input
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                              defaultChecked={selectedUserIds.has(user.id)}
                              name="userIds"
                              type="checkbox"
                              value={user.id}
                            />
                            <span className="min-w-0 break-all">{user.email}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[1.4rem] border border-dashed border-gray-200 bg-background/55 px-4 py-8 text-center text-sm text-ink/58">
                        Nenhum usuário disponível para vínculo.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-ink/62">
                      Os vínculos são muitos-para-muitos: o mesmo usuário pode participar de várias empresas.
                    </p>
                    <button
                      className="inline-flex items-center justify-center rounded-2xl bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-accent/92"
                      type="submit"
                    >
                      Salvar empresa
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-gray-200 bg-background/55 px-6 text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/8 text-accent">
                  <Settings className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-ink">Nenhuma empresa selecionada</h3>
                <p className="mt-3 max-w-md text-sm text-ink/65">
                  Cadastre a primeira empresa no painel ao lado para liberar a edição de dados e o gerenciamento de produtos Hotmart.
                </p>
              </div>
            )}
          </article>

          {selectedCompany ? (
            <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-7">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Produtos Hotmart</p>
                  <h3 className="mt-2 text-2xl font-semibold text-ink">Base de identificação da empresa</h3>
                  <p className="mt-2 max-w-3xl text-sm text-ink/68">
                    Cadastre aqui os produtos Hotmart que pertencem a esta empresa. O webhook usa esses dados para descobrir o <code>company_id</code> da compra recebida.
                  </p>
                </div>
                <div className="rounded-2xl border border-black/5 bg-background px-4 py-3 text-sm text-ink/68">
                  {selectedCompany.products.length} {selectedCompany.products.length === 1 ? "produto cadastrado" : "produtos cadastrados"}
                </div>
              </div>

              <div className="mt-8 rounded-[1.5rem] border border-gray-200 bg-background/55 p-5 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-semibold text-ink">Novo produto Hotmart</h4>
                    <p className="mt-1 text-sm text-ink/65">
                      O vínculo com a empresa é obrigatório e o ID do produto Hotmart precisa ser único no sistema.
                    </p>
                  </div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-accent">
                    <Package className="h-5 w-5" />
                  </span>
                </div>

                <form action={createCompanyProductAction} className="mt-6 grid gap-4 xl:grid-cols-[minmax(180px,0.9fr)_minmax(160px,0.8fr)_minmax(200px,1fr)_minmax(220px,1.2fr)_auto]">
                  <div className="space-y-2 xl:col-span-1">
                    <label className="text-sm font-medium text-ink" htmlFor="new-product-company">
                      Empresa
                    </label>
                    <select
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-accent/45 focus:ring-2 focus:ring-accent/12"
                      defaultValue={selectedCompany.id}
                      id="new-product-company"
                      name="companyId"
                    >
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-ink" htmlFor="new-product-id">
                      ID Hotmart
                    </label>
                    <input
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-accent/45 focus:ring-2 focus:ring-accent/12"
                      id="new-product-id"
                      inputMode="numeric"
                      name="hotmartProductId"
                      placeholder="123456"
                      required
                      type="number"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-ink" htmlFor="new-product-ucode">
                      Ucode
                    </label>
                    <input
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-accent/45 focus:ring-2 focus:ring-accent/12"
                      id="new-product-ucode"
                      name="hotmartProductUcode"
                      placeholder="abc123xyz"
                      type="text"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-ink" htmlFor="new-product-name">
                      Nome do produto
                    </label>
                    <input
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-accent/45 focus:ring-2 focus:ring-accent/12"
                      id="new-product-name"
                      name="productName"
                      placeholder="Nome exibido na Hotmart"
                      required
                      type="text"
                    />
                  </div>

                  <div className="flex flex-col justify-end gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-ink/72">
                      <input defaultChecked name="isActive" type="checkbox" value="1" />
                      Ativo
                    </label>
                    <button
                      className="inline-flex items-center justify-center rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-ink/92"
                      type="submit"
                    >
                      Cadastrar produto
                    </button>
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
                            <span
                              className={[
                                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                                product.isActive
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border border-gray-200 bg-gray-100 text-ink/62",
                              ].join(" ")}
                            >
                              <ToggleLeft className="h-3.5 w-3.5" />
                              {product.isActive ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-ink/62">
                            Criado em {formatDateTime(product.createdAt)}. Última atualização em {formatDateTime(product.updatedAt)}.
                          </p>
                        </div>

                        <form action={toggleCompanyProductActiveAction}>
                          <input name="companyId" type="hidden" value={selectedCompany.id} />
                          <input name="productId" type="hidden" value={product.id} />
                          <input name="nextIsActive" type="hidden" value={product.isActive ? "false" : "true"} />
                          <button
                            className={[
                              "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium transition",
                              product.isActive
                                ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                            ].join(" ")}
                            type="submit"
                          >
                            {product.isActive ? "Desativar produto" : "Reativar produto"}
                          </button>
                        </form>
                      </div>

                      <form action={updateCompanyProductAction} className="mt-6 grid gap-4 xl:grid-cols-[minmax(180px,0.9fr)_minmax(160px,0.8fr)_minmax(200px,1fr)_minmax(240px,1.2fr)_auto]">
                        <input name="productId" type="hidden" value={product.id} />

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-ink">Empresa</label>
                          <select
                            className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none transition focus:border-accent/45 focus:ring-2 focus:ring-accent/12"
                            defaultValue={product.companyId}
                            name="companyId"
                          >
                            {companies.map((company) => (
                              <option key={`${product.id}-${company.id}`} value={company.id}>
                                {company.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-ink">ID Hotmart</label>
                          <input
                            className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none transition focus:border-accent/45 focus:ring-2 focus:ring-accent/12"
                            defaultValue={product.hotmartProductId}
                            inputMode="numeric"
                            name="hotmartProductId"
                            required
                            type="number"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-ink">Ucode</label>
                          <input
                            className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none transition focus:border-accent/45 focus:ring-2 focus:ring-accent/12"
                            defaultValue={product.hotmartProductUcode ?? ""}
                            name="hotmartProductUcode"
                            type="text"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-ink">Nome do produto</label>
                          <input
                            className="w-full rounded-2xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink outline-none transition focus:border-accent/45 focus:ring-2 focus:ring-accent/12"
                            defaultValue={product.productName}
                            name="productName"
                            required
                            type="text"
                          />
                        </div>

                        <div className="flex flex-col justify-end gap-3">
                          <label className="inline-flex items-center gap-2 text-sm text-ink/72">
                            <input checked={product.isActive} name="isActive" readOnly type="checkbox" value="1" />
                            Ativo
                          </label>
                          <button
                            className="inline-flex items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition hover:bg-accent/92"
                            type="submit"
                          >
                            Salvar produto
                          </button>
                        </div>
                      </form>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.4rem] border border-dashed border-gray-200 bg-background/55 px-4 py-10 text-center text-sm text-ink/58">
                    Esta empresa ainda não possui produtos Hotmart cadastrados.
                  </div>
                )}
              </div>
            </article>
          ) : null}
        </div>
      </div>
    </section>
  );
}
