import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  LifeBuoy,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const highlights = [
  {
    title: "Campanhas em andamento",
    description:
      "Acompanhe investimento, alcance, volume de leads e desempenho das campanhas de anúncios.",
    icon: Sparkles,
  },
  {
    title: "Vendas e oportunidades",
    description:
      "Veja a evolução comercial da sua empresa com foco em oportunidades, conversões e receita.",
    icon: ShieldCheck,
  },
  {
    title: "Relação com a equipe",
    description:
      "Tenha um ponto central para consultar dados, alinhar estratégia e acompanhar os próximos passos.",
    icon: LifeBuoy,
  },
];

const portalItems = [
  ["Campanhas ativas", "08"],
  ["Leads no mês", "246"],
  ["Oportunidades", "37"],
  ["Vendas geradas", "12"],
];

const experiencePoints = [
  "Resumo de campanhas de tráfego pago com leitura executiva.",
  "Acompanhamento de leads, oportunidades e vendas da empresa.",
  "Acesso centralizado para cliente e time consultivo trabalharem com mais transparência.",
];

export default function Home() {
  return (
    <main className="page-shell px-4 py-6 md:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col gap-6">
        <header className="section-shell overflow-hidden px-6 py-6 md:px-8">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-6">
              <span className="inline-flex items-center rounded-full border border-brand/15 bg-brand/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-brand">
                Fabremo | Portal de Clientes
              </span>
              <div className="space-y-4">
                <h1 className="max-w-2xl text-5xl font-semibold leading-tight md:text-6xl">
                  Acompanhe suas campanhas, seus leads e as vendas da sua empresa em um só lugar.
                </h1>
                <p className="max-w-2xl text-lg">
                  A Fabremo atua na estratégia e na operação digital para gerar crescimento
                  com mais previsibilidade. Neste portal, você acompanha os principais dados
                  das campanhas de anúncios, a entrada de oportunidades e a evolução das vendas.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand/92"
                  href="/login"
                >
                  Acessar portal
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-accent/25 hover:text-accent"
                  href="/dashboard"
                >
                  Ver painel
                </Link>
              </div>
            </div>

            <div className="w-full max-w-xl rounded-[2rem] border border-black/5 bg-white p-5 shadow-soft md:p-6">
              <div className="rounded-[1.5rem] bg-ink px-5 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-white/55">
                      Panorama do cliente
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">
                      Marketing e vendas com leitura rápida
                    </h2>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <BriefcaseBusiness className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {portalItems.map(([label, value]) => (
                    <div
                      className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4"
                      key={label}
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-white/48">
                        {label}
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {highlights.map(({ title, description, icon: Icon }) => (
            <article
              className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card"
              key={title}
            >
              <div className="inline-flex rounded-2xl bg-accent/10 p-3 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-6 text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm">{description}</p>
            </article>
          ))}
        </section>

        <section className="section-shell grid gap-6 px-6 py-8 md:grid-cols-[1fr_0.8fr] md:px-8">
          <div className="space-y-4">
            <span className="inline-flex rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Sobre a experiência
            </span>
            <h2 className="text-3xl font-semibold">
              Um portal pensado para dar clareza ao que está sendo investido e ao que está voltando em resultado.
            </h2>
            <p className="max-w-2xl">
              O cliente entende rapidamente quem é a Fabremo, entra com segurança no ambiente
              e encontra uma visão objetiva sobre campanhas, performance comercial e próximos passos.
            </p>
          </div>

          <div className="grid gap-3 rounded-[1.75rem] border border-gray-200 bg-background p-4">
            {experiencePoints.map((item) => (
              <div
                className="rounded-2xl bg-white px-4 py-4 text-sm text-ink/72 shadow-card"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
