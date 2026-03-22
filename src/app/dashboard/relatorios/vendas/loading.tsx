import { BarChart3, LoaderCircle } from "lucide-react";

export default function SalesReportLoading() {
  return (
    <section className="space-y-6">
      <header className="section-shell px-6 py-6 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              <BarChart3 className="h-3.5 w-3.5" />
              Relatório de vendas
            </span>
            <div>
              <h2 className="text-3xl font-semibold">Carregando campanhas de vendas</h2>
              <p className="mt-2 max-w-3xl text-ink/72">
                Estamos consultando a Meta e montando o relatório da conta selecionada.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-black/5 bg-background px-5 py-4 text-sm text-ink/70">
            <LoaderCircle className="h-4 w-4 animate-spin text-accent" />
            Buscando dados...
          </div>
        </div>
      </header>

      <article className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
        <div className="border-b border-gray-200 px-6 py-5">
          <h3 className="text-xl font-semibold">Preparando tabela de campanhas</h3>
          <p className="mt-2 text-sm text-ink/72">
            Isso pode levar alguns segundos enquanto os dados são consolidados.
          </p>
        </div>

        <div className="space-y-3 px-6 py-6">
          {[1, 2, 3].map((item) => (
            <div className="h-12 animate-pulse rounded-2xl bg-background" key={item} />
          ))}
        </div>
      </article>

      <article className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
        <div className="border-b border-gray-200 px-6 py-5">
          <h3 className="text-xl font-semibold">Preparando tabela por dia</h3>
        </div>

        <div className="space-y-3 px-6 py-6">
          {[1, 2, 3, 4].map((item) => (
            <div className="h-12 animate-pulse rounded-2xl bg-background" key={item} />
          ))}
        </div>
      </article>

      <article className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
        <div className="border-b border-gray-200 px-6 py-5">
          <h3 className="text-xl font-semibold">Preparando tabela por anúncio</h3>
        </div>

        <div className="space-y-3 px-6 py-6">
          {[1, 2, 3, 4].map((item) => (
            <div className="h-12 animate-pulse rounded-2xl bg-background" key={item} />
          ))}
        </div>
      </article>
    </section>
  );
}
