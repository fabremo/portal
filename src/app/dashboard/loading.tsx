import { BellDot, LoaderCircle } from "lucide-react";

export default function DashboardLoading() {
  return (
    <section className="space-y-6">
      <header className="section-shell px-6 py-6 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              <BellDot className="h-3.5 w-3.5" />
              Carregando dashboard
            </span>
            <div>
              <h2 className="text-3xl font-semibold">Preparando a visao geral</h2>
              <p className="mt-2 max-w-3xl text-ink/72">
                Estamos validando a sua sessao e consultando os dados da conta ativa.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-black/5 bg-background px-5 py-4 text-sm text-ink/70">
            <LoaderCircle className="h-4 w-4 animate-spin text-accent" />
            Carregando painel...
          </div>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2].map((item) => (
          <article
            className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-7"
            key={item}
          >
            <div className="space-y-4">
              <div className="h-4 w-32 animate-pulse rounded-xl bg-background" />
              <div className="h-10 w-40 animate-pulse rounded-2xl bg-background" />
              <div className="h-4 w-full animate-pulse rounded-xl bg-background" />
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}
