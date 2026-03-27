import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertCircle, BadgeCheck, ChevronDown, ContactRound, CreditCard, ShoppingBag } from "lucide-react";

import { canAccessBuyersModule, getDashboardAccessContext } from "@/lib/dashboard/access";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

type JoinedContactRow = {
  created_at: string;
  email: string;
  id: string;
  name: string;
  phone: string | null;
  phone_country_code: string | null;
};

type JoinedCompanyRow = {
  name: string | null;
};

type PurchaseQueryRow = {
  approved_date: string | null;
  companies: JoinedCompanyRow[] | JoinedCompanyRow | null;
  company_id: string | null;
  contacts: JoinedContactRow[] | JoinedContactRow | null;
  created_at: string;
  installments_number: number | null;
  is_order_bump: boolean | null;
  price_currency: string | null;
  price_value: number | null;
  product_name: string;
  status: string;
  transaction: string;
};

type PurchaseRow = {
  approved_date: string | null;
  companyName: string | null;
  created_at: string;
  installments_number: number | null;
  is_order_bump: boolean | null;
  price_currency: string | null;
  price_value: number | null;
  product_name: string;
  status: string;
  transaction: string;
};

type ContactRow = {
  created_at: string;
  email: string;
  id: string;
  name: string;
  phone: string | null;
  phone_country_code: string | null;
  purchases: PurchaseRow[];
};

const CONTACT_ROW_GRID_CLASS =
  "grid min-w-[980px] grid-cols-[minmax(280px,1.35fr)_minmax(240px,1.1fr)_120px_190px_72px] items-start";

export const metadata: Metadata = {
  title: "Contatos",
};

function getJoinedContact(row: PurchaseQueryRow) {
  if (Array.isArray(row.contacts)) {
    return row.contacts[0] ?? null;
  }

  return row.contacts;
}

function getJoinedCompany(row: PurchaseQueryRow) {
  if (Array.isArray(row.companies)) {
    return row.companies[0] ?? null;
  }

  return row.companies;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsedDate);
}

function formatCurrency(value: number | null, currency: string | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  }).format(value);
}

function formatPhone(phone: string | null) {
  if (!phone) {
    return "-";
  }

  return phone;
}

function formatOrderBump(value: boolean | null) {
  if (value === null) {
    return "-";
  }

  return value ? "Sim" : "Não";
}

function renderPurchaseStatusBadge(status: string) {
  const normalizedStatus = status.trim().toUpperCase();
  const isNegativeStatus = normalizedStatus === "REFUNDED" || normalizedStatus === "CHARGEBACK";

  if (isNegativeStatus) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
        <AlertCircle className="h-3.5 w-3.5" />
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
      <CreditCard className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

function sortPurchases(purchases: PurchaseRow[]) {
  return [...purchases].sort((left, right) => {
    const leftTimestamp = Date.parse(left.approved_date ?? left.created_at);
    const rightTimestamp = Date.parse(right.approved_date ?? right.created_at);

    if (Number.isNaN(leftTimestamp) && Number.isNaN(rightTimestamp)) {
      return 0;
    }

    if (Number.isNaN(leftTimestamp)) {
      return 1;
    }

    if (Number.isNaN(rightTimestamp)) {
      return -1;
    }

    return rightTimestamp - leftTimestamp;
  });
}

function getLatestPurchase(purchases: PurchaseRow[]) {
  return purchases[0] ?? null;
}

async function getContactsWithPurchases(accessContext: Awaited<ReturnType<typeof getDashboardAccessContext>>) {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  let query = supabase
    .from("purchases")
    .select(
      `
      transaction,
      status,
      product_name,
      price_value,
      price_currency,
      installments_number,
      is_order_bump,
      approved_date,
      created_at,
      company_id,
      companies (
        name
      ),
      contacts!inner (
        id,
        name,
        email,
        phone,
        phone_country_code,
        created_at
      )
    `
    )
    .order("created_at", { ascending: false });

  if (accessContext && !accessContext.isAdmin) {
    query = query.in("company_id", accessContext.accessibleCompanyIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Não foi possível carregar os contatos.");
  }

  const contactsById = new Map<string, ContactRow>();

  for (const row of (data ?? []) as PurchaseQueryRow[]) {
    const contact = getJoinedContact(row);

    if (!contact?.id) {
      continue;
    }

    const existingContact = contactsById.get(contact.id) ?? {
      created_at: contact.created_at,
      email: contact.email,
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      phone_country_code: contact.phone_country_code,
      purchases: [],
    };

    existingContact.purchases.push({
      approved_date: row.approved_date,
      companyName: getJoinedCompany(row)?.name ?? null,
      created_at: row.created_at,
      installments_number: row.installments_number,
      is_order_bump: row.is_order_bump,
      price_currency: row.price_currency,
      price_value: row.price_value,
      product_name: row.product_name,
      status: row.status,
      transaction: row.transaction,
    });

    contactsById.set(contact.id, existingContact);
  }

  return Array.from(contactsById.values())
    .map((contact) => ({
      ...contact,
      purchases: sortPurchases(contact.purchases),
    }))
    .sort((left, right) => {
      const leftLatest = Date.parse(getLatestPurchase(left.purchases)?.approved_date ?? left.created_at);
      const rightLatest = Date.parse(getLatestPurchase(right.purchases)?.approved_date ?? right.created_at);

      if (Number.isNaN(leftLatest) && Number.isNaN(rightLatest)) {
        return 0;
      }

      if (Number.isNaN(leftLatest)) {
        return 1;
      }

      if (Number.isNaN(rightLatest)) {
        return -1;
      }

      return rightLatest - leftLatest;
    });
}

export default async function DashboardBuyersContactsPage() {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext) {
    redirect("/login");
  }

  if (!canAccessBuyersModule(accessContext)) {
    redirect("/dashboard");
  }

  const contacts = await getContactsWithPurchases(accessContext);

  return (
    <section className="space-y-6">
      <header className="section-shell px-6 py-6 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              <ContactRound className="h-3.5 w-3.5" />
              Base de contatos
            </span>
            <div>
              <h2 className="text-3xl font-semibold">Contatos incluídos</h2>
              <p className="mt-2 max-w-3xl text-ink/72">
                Consulte os contatos das empresas acessíveis na sua sessão e expanda cada linha para ver as compras associadas.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-black/5 bg-background px-5 py-4 text-sm text-ink/70">
            <ShoppingBag className="h-4 w-4 text-accent" />
            {contacts.length} {contacts.length === 1 ? "contato carregado" : "contatos carregados"}
          </div>
        </div>
      </header>

      <article className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <div className="min-w-[980px] divide-y divide-gray-200 text-sm">
            <div className={`${CONTACT_ROW_GRID_CLASS} bg-ink/[0.03] text-left text-xs uppercase tracking-[0.18em] text-ink/55`}>
              <div className="px-5 py-4 font-semibold">Contato</div>
              <div className="px-5 py-4 font-semibold">Telefone</div>
              <div className="px-5 py-4 font-semibold">Compras</div>
              <div className="px-5 py-4 font-semibold">Última compra</div>
              <div className="px-5 py-4" aria-label="Expandir" />
            </div>

            <div className="divide-y divide-gray-100">
              {contacts.length ? (
                contacts.map((contact) => {
                  const latestPurchase = getLatestPurchase(contact.purchases);

                  return (
                    <details className="group w-full" key={contact.id}>
                      <summary className={`${CONTACT_ROW_GRID_CLASS} cursor-pointer list-none transition hover:bg-black/[0.015]`}>
                        <div className="min-w-0 px-5 py-4">
                          <p className="font-medium text-ink">{contact.name}</p>
                          <p className="mt-1 break-all text-sm text-ink/72">{contact.email}</p>
                          <p className="mt-1 text-xs text-ink/55">Incluído em {formatDateTime(contact.created_at)}</p>
                        </div>
                        <div className="min-w-0 px-5 py-4 text-ink/72">{formatPhone(contact.phone)}</div>
                        <div className="px-5 py-4 text-ink/72">{contact.purchases.length}</div>
                        <div className="px-5 py-4 text-ink/72">
                          {latestPurchase ? formatDateTime(latestPurchase.approved_date ?? latestPurchase.created_at) : "-"}
                        </div>
                        <div className="flex justify-end px-5 py-4">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-ink/55 transition group-open:border-accent/30 group-open:text-accent">
                            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                          </span>
                        </div>
                      </summary>

                      <div className="border-t border-gray-100 px-5 pb-5 pt-4">
                        <div className="w-full rounded-2xl border border-gray-200 bg-background/80 p-4 md:p-5">
                          {contact.purchases.length ? (
                            <div className="space-y-3">
                              {contact.purchases.map((purchase) => (
                                <div
                                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 md:px-5"
                                  key={purchase.transaction}
                                >
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="space-y-2">
                                      <div>
                                        <p className="font-medium text-ink">{purchase.product_name}</p>
                                        <p className="text-sm text-ink/72">Transação: {purchase.transaction}</p>
                                      </div>
                                      {purchase.companyName ? (
                                        <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-medium text-accent">
                                          <BadgeCheck className="h-3.5 w-3.5" />
                                          {purchase.companyName}
                                        </span>
                                      ) : null}
                                    </div>
                                    {renderPurchaseStatusBadge(purchase.status)}
                                  </div>

                                  <div className="mt-4 grid gap-3 text-sm text-ink/72 md:grid-cols-2 xl:grid-cols-4">
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.16em] text-ink/50">Valor</p>
                                      <p className="mt-1 font-medium text-ink">
                                        {formatCurrency(purchase.price_value, purchase.price_currency)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.16em] text-ink/50">Parcelas</p>
                                      <p className="mt-1 font-medium text-ink">
                                        {purchase.installments_number ?? "-"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.16em] text-ink/50">Order bump</p>
                                      <p className="mt-1 font-medium text-ink">
                                        {formatOrderBump(purchase.is_order_bump)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.16em] text-ink/50">Aprovada em</p>
                                      <p className="mt-1 font-medium text-ink">
                                        {formatDateTime(purchase.approved_date)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-ink/60">Este contato ainda não possui compras relacionadas.</p>
                          )}
                        </div>
                      </div>
                    </details>
                  );
                })
              ) : (
                <div className="px-5 py-10 text-center text-sm text-ink/60">
                  Nenhum contato foi incluído até o momento para as empresas acessíveis nesta sessão.
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
