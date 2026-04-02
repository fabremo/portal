import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Activity, Clock3, Crosshair, ExternalLink, Globe2, ShieldCheck } from "lucide-react";

import { canAccessTrackingModule, getDashboardAccessContext } from "@/lib/dashboard/access";
import { buildElementorTrackingSnippet, listCheckoutClickTracking } from "@/lib/tracking/checkout-click";

export const metadata: Metadata = {
  title: "Tracking",
};

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
    timeStyle: "medium",
  }).format(parsedDate);
}

function formatText(value: string | null) {
  return value?.trim() ? value : "-";
}

export default async function DashboardTrackingPage() {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext) {
    redirect("/login");
  }

  if (!canAccessTrackingModule(accessContext) || !accessContext.activeCompanyId || !accessContext.activeCompany) {
    redirect("/dashboard");
  }

  const clicks = await listCheckoutClickTracking(accessContext.activeCompanyId, 50);
  const snippet = buildElementorTrackingSnippet(
    accessContext.activeCompany.slug,
    "https://SEU-DOMINIO.com/api/tracking/checkout-click"
  );

  return (
    <section className="space-y-6">
      <header className="section-shell px-6 py-6 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              <ShieldCheck className="h-3.5 w-3.5" />
              Tracking habilitado
            </span>
            <div>
              <h2 className="text-3xl font-semibold">Tracking de checkout</h2>
              <p className="mt-2 max-w-3xl text-ink/72">
                Visualize os cliques registrados em paralelo para a empresa ativa e copie o snippet base para uso no Elementor.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-black/5 bg-background px-5 py-4 text-sm text-ink/70">
            <Crosshair className="h-4 w-4 text-accent" />
            {accessContext.activeCompany.name}
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.5rem] border border-gray-200 bg-white px-5 py-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Registros</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{clicks.length}</p>
          <p className="mt-2 text-sm text-ink/65">Últimos eventos carregados para a empresa ativa.</p>
        </article>
        <article className="rounded-[1.5rem] border border-gray-200 bg-white px-5 py-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Slug da empresa</p>
          <p className="mt-3 text-xl font-semibold text-ink">{accessContext.activeCompany.slug}</p>
          <p className="mt-2 text-sm text-ink/65">Esse valor deve ser usado como `company_slug` no snippet do Elementor.</p>
        </article>
        <article className="rounded-[1.5rem] border border-gray-200 bg-white px-5 py-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">xcod preenchido</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{clicks.filter((click) => Boolean(click.xcod)).length}</p>
          <p className="mt-2 text-sm text-ink/65">Eventos que chegaram com `user_id_mh` convertido para `xcod`.</p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.95fr)]">
        <article className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-5 md:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Eventos recentes</p>
              <h3 className="mt-2 text-xl font-semibold text-ink">Cliques capturados</h3>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-background px-3 py-1.5 text-xs text-ink/60">
              <Clock3 className="h-3.5 w-3.5" />
              Ordenado por clique
            </div>
          </div>

          {clicks.length ? (
            <div className="divide-y divide-gray-100">
              {clicks.map((click) => (
                <article className="px-5 py-5 md:px-6" key={click.id}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 text-xs text-ink/60">
                        <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-accent">
                          <Activity className="h-3.5 w-3.5" />
                          Clique em {formatDateTime(click.clicked_at)}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-background px-3 py-1">
                          xcod: {formatText(click.xcod)}
                        </span>
                      </div>

                      <div className="grid gap-3 text-sm text-ink/72 md:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-2xl border border-gray-200 bg-background/70 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-ink/50">URL</p>
                          <p className="mt-2 break-all text-ink/80">{formatText(click.page_url)}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-background/70 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-ink/50">Referrer</p>
                          <p className="mt-2 break-all text-ink/80">{formatText(click.referrer)}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-background/70 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-ink/50">UTM campaign</p>
                          <p className="mt-2 break-all text-ink/80">{formatText(click.utm_campaign)}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-background/70 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-ink/50">UTM source / medium</p>
                          <p className="mt-2 break-all text-ink/80">{`${formatText(click.utm_source)} / ${formatText(click.utm_medium)}`}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-background/70 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-ink/50">fbclid / gclid</p>
                          <p className="mt-2 break-all text-ink/80">{`${formatText(click.fbclid)} / ${formatText(click.gclid)}`}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-background/70 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-ink/50">Idioma / timezone</p>
                          <p className="mt-2 break-all text-ink/80">{`${formatText(click.language)} / ${formatText(click.timezone)}`}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-ink/55">
                      <p>Registrado em</p>
                      <p className="mt-1 font-medium text-ink/72">{formatDateTime(click.created_at)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-ink/60">
              Ainda não há cliques registrados para a empresa ativa.
            </div>
          )}
        </article>

        <aside className="space-y-6">
          <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Snippet Elementor</p>
                <h3 className="mt-2 text-xl font-semibold text-ink">Script base de integração</h3>
                <p className="mt-2 text-sm text-ink/65">
                  O snippet já envia o tracking em paralelo com `sendBeacon`, usa fallback com `fetch keepalive` e não interfere no redirecionamento atual.
                </p>
              </div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/8 text-accent">
                <Globe2 className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-5 rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
              Substitua `https://SEU-DOMINIO.com` pelo domínio público deste app antes de publicar no Elementor.
            </div>

            <pre className="mt-5 overflow-x-auto rounded-[1.4rem] bg-ink px-4 py-4 text-xs leading-6 text-white">
              <code>{snippet}</code>
            </pre>
          </article>

          <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Endpoint público</p>
            <h3 className="mt-2 text-xl font-semibold text-ink">Contrato da integração</h3>
            <div className="mt-4 space-y-3 text-sm text-ink/68">
              <p>
                `POST /api/tracking/checkout-click` com `company_slug`, `xcod`, UTMs, cliques, cookies e contexto técnico do navegador.
              </p>
              <p>
                Se o tracking da empresa estiver desabilitado, a rota responde `403`. Se o slug for inválido, responde `400`.
              </p>
              <p className="inline-flex items-center gap-2 font-medium text-accent">
                <ExternalLink className="h-4 w-4" />
                O botão do checkout continua usando o fluxo atual da Hotmart sem espera por resposta.
              </p>
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
