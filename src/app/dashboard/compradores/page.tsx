import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, ContactRound, ShieldCheck, ShoppingCart, Webhook } from "lucide-react";

import { canAccessBuyersModule, getDashboardAccessContext } from "@/lib/dashboard/access";

export const metadata: Metadata = {
  title: "Sistema de Compradores",
};

export default async function DashboardBuyersPage() {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext) {
    redirect("/login");
  }

  if (!canAccessBuyersModule(accessContext)) {
    redirect("/dashboard");
  }

  return (
    <section className="space-y-6">
      <header className="section-shell px-6 py-6 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              <ShieldCheck className="h-3.5 w-3.5" />
              Acesso restrito
            </span>
            <div>
              <h2 className="text-3xl font-semibold">Sistema de Compradores</h2>
              <p className="mt-2 max-w-3xl text-ink/72">
                Acompanhe os registros recebidos da Hotmart dentro do escopo das empresas acessíveis na sua sessão.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-black/5 bg-background px-5 py-4 text-sm text-ink/70">
            <ShoppingCart className="h-4 w-4 text-accent" />
            {accessContext.isAdmin
              ? "Visão administrativa completa"
              : `${accessContext.accessibleCompanies.length} ${accessContext.accessibleCompanies.length === 1 ? "empresa liberada" : "empresas liberadas"}`}
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-8">
          <h3 className="text-xl font-semibold">Consultas do módulo</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/72">
            Acesse os contatos já incluídos e acompanhe os webhooks recebidos para validar a entrada dos dados do módulo de compradores em cada empresa.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-ink/92"
              href="/dashboard/compradores/contatos"
            >
              <ContactRound className="h-4 w-4" />
              Abrir contatos
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-ink transition hover:bg-background"
              href="/dashboard/compradores/webhooks"
            >
              <Webhook className="h-4 w-4" />
              Abrir logs de webhook
            </Link>
          </div>
        </article>

        <aside className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-8">
          <h3 className="text-lg font-semibold">Escopo atual</h3>
          <p className="mt-3 text-sm leading-6 text-ink/72">
            O módulo já aplica contexto de empresa para produtos Hotmart, compras, contatos vinculados e logs operacionais do webhook.
          </p>
          {!accessContext.isAdmin ? (
            <div className="mt-5 space-y-2">
              {accessContext.accessibleCompanies.map((company) => (
                <div
                  className="inline-flex w-full items-center gap-2 rounded-2xl border border-accent/15 bg-accent/8 px-4 py-3 text-sm text-accent"
                  key={company.id}
                >
                  <BadgeCheck className="h-4 w-4" />
                  {company.name}
                </div>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
