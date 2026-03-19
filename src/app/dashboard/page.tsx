import {
  Activity,
  BellDot,
  BriefcaseBusiness,
  CircleCheckBig,
} from "lucide-react";

import { getFacebookAccountStatus } from "@/lib/facebook/status";

const highlights = [
  {
    title: "Custo por lead",
    value: "R$ 42",
    detail: "8% melhor que no mês anterior",
    icon: Activity,
  },
  {
    title: "Leads qualificados",
    value: "184",
    detail: "Volume dentro da meta planejada",
    icon: CircleCheckBig,
  },
  {
    title: "Vendas confirmadas",
    value: "12",
    detail: "Campanhas com impacto direto no comercial",
    icon: BriefcaseBusiness,
  },
];

const timelineEntries = [
  {
    title: "Atualização da campanha principal",
    detail: "Nova rodada publicada hoje às 09:12",
    done: true,
  },
  {
    title: "Ajustes na qualificação de leads",
    detail: "Em validação com o time comercial",
    done: false,
  },
  {
    title: "Revisão do painel executivo",
    detail: "Aguardando aprovação final",
    done: false,
  },
];

const supportChannels = [
  {
    title: "Suporte estratégico",
    detail: "Alinhamentos sobre campanha, mídia e otimização",
  },
  {
    title: "Financeiro",
    detail: "Tratativas de cobrança, orçamento e faturamento",
  },
  {
    title: "Sucesso do cliente",
    detail: "Acompanhamento da operação e próximos ciclos de crescimento",
  },
];

const toneStyles = {
  danger: "border-red-200 bg-red-50 text-red-700",
  neutral: "border-gray-200 bg-white text-ink",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
} as const;

export default async function DashboardPage() {
  const facebookStatus = await getFacebookAccountStatus();
  const lastCheckedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(facebookStatus.lastCheckedAt));
  const shouldShowRawStatusCode =
    facebookStatus.statusTone === "warning" || facebookStatus.statusTone === "danger";

  return (
    <section className="space-y-6">
      <header className="section-shell px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              <BellDot className="h-3.5 w-3.5" />
              Resumo da operação
            </span>
            <div>
              <h2 className="text-3xl font-semibold">Visão geral do cliente</h2>
              <p className="mt-2 max-w-2xl">
                Aqui você acompanha os principais números da sua operação de marketing
                e vendas, com foco em leitura clara e tomada de decisão.
              </p>
            </div>
          </div>
          <div
            className={[
              "w-full max-w-sm rounded-2xl border px-5 py-4 shadow-card",
              toneStyles[facebookStatus.statusTone],
            ].join(" ")}
          >
            <p className="text-xs uppercase tracking-[0.22em] opacity-70">
              Status da conta no Facebook
            </p>
            <p className="mt-2 text-xl font-semibold">{facebookStatus.statusLabel}</p>
            <div className="mt-3 space-y-1 text-sm">
              <p>{facebookStatus.accountName}</p>
              <p>ID: {facebookStatus.accountId}</p>
              {shouldShowRawStatusCode ? (
                <p>Código bruto: {facebookStatus.rawStatusCode ?? "N/A"}</p>
              ) : null}
              {facebookStatus.disableReasonText ? (
                <p>Motivo: {facebookStatus.disableReasonText}</p>
              ) : null}
              <p>Última consulta: {lastCheckedAt}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-3">
        {highlights.map(({ title, value, detail, icon: Icon }) => (
          <article
            className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card"
            key={title}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink/62">{title}</span>
              <div className="rounded-2xl bg-brand/10 p-3 text-brand">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-8 text-4xl font-semibold text-ink">{value}</p>
            <p className="mt-3 text-sm">{detail}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">Linha do tempo das entregas</h3>
              <p className="mt-2 max-w-xl text-sm">
                Acompanhe rapidamente o que já foi publicado, o que está em validação
                e o que depende de aprovação.
              </p>
            </div>
            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Atualizado hoje
            </span>
          </div>

          <div className="mt-8 space-y-4">
            {timelineEntries.map(({ title, detail, done }) => (
              <div
                className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-background px-4 py-4"
                key={title}
              >
                <div
                  className={[
                    "mt-1 h-3 w-3 rounded-full",
                    done ? "bg-accent" : "bg-brand",
                  ].join(" ")}
                />
                <div>
                  <p className="font-medium text-ink">{title}</p>
                  <p className="mt-1 text-sm">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-8">
          <h3 className="text-xl font-semibold">Canais de atendimento</h3>
          <p className="mt-2 text-sm">
            Um atalho claro para falar com o time certo em cada etapa da operação.
          </p>

          <div className="mt-8 space-y-4">
            {supportChannels.map(({ title, detail }) => (
              <div className="rounded-2xl border border-gray-200 p-4" key={title}>
                <p className="font-medium text-ink">{title}</p>
                <p className="mt-1 text-sm">{detail}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
