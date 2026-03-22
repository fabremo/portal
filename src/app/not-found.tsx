import Link from "next/link";
import { ArrowLeft, Compass, House, SearchX } from "lucide-react";

const quickLinks = [
  {
    title: "Voltar para o início",
    description: "Retorne para a apresentação do portal e siga para a área desejada.",
    href: "/",
    icon: House,
  },
  {
    title: "Ir para o login",
    description: "Entre na sua conta para acessar dashboards, relatórios e histórico.",
    href: "/login",
    icon: Compass,
  },
];

export default function NotFound() {
  return (
    <main className="page-shell relative flex min-h-screen items-center overflow-hidden px-4 py-16 md:px-6 lg:px-8">
      <div className="absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgba(245,130,32,0.14),transparent)]" />
      <div className="absolute -left-12 bottom-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute -right-10 top-20 h-80 w-80 rounded-full bg-brand/12 blur-3xl" />

      <section className="relative mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="section-shell px-6 py-8 md:px-8 md:py-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-brand">
            <SearchX className="h-4 w-4" />
            Erro 404
          </span>

          <div className="mt-6 space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-ink/48">
              Página não encontrada
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
              A rota que você tentou acessar não existe ou foi movida.
            </h1>
            <p className="max-w-2xl text-base text-ink/72 md:text-lg">
              Confira o endereço digitado ou use um dos atalhos abaixo para voltar com rapidez ao
              portal da Fabremo.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand/92"
              href="/"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para a home
            </Link>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-accent/25 hover:text-accent"
              href="/login"
            >
              Acessar login
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <article className="rounded-[2rem] border border-black/5 bg-ink p-6 text-white shadow-soft md:p-8">
            <p className="text-xs uppercase tracking-[0.22em] text-white/55">Localização</p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-6xl font-semibold leading-none">404</p>
                <p className="mt-3 max-w-xs text-sm text-white/72">
                  Esse endereço não levou a uma página válida dentro do portal.
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <SearchX className="h-6 w-6" />
              </div>
            </div>
          </article>

          <div className="grid gap-4">
            {quickLinks.map(({ title, description, href, icon: Icon }) => (
              <Link
                className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:border-accent/20"
                href={href}
                key={title}
              >
                <div className="inline-flex rounded-2xl bg-accent/10 p-3 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-xl font-semibold text-ink">{title}</h2>
                <p className="mt-2 text-sm text-ink/72">{description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
