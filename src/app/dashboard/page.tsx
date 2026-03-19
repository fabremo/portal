import { BellDot } from "lucide-react";

import { getDashboardAccessContext } from "@/lib/dashboard/access";
import { getFacebookAccountStatus } from "@/lib/facebook/status";

const toneStyles = {
  danger: "border-red-200 bg-red-50 text-red-700",
  neutral: "border-gray-200 bg-white text-ink",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
} as const;

export default async function DashboardPage() {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext?.activeAdAccount) {
    return null;
  }

  const facebookStatus = await getFacebookAccountStatus(accessContext.activeAdAccount.id);
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
              Resumo da operacao
            </span>
            <div>
              <h2 className="text-3xl font-semibold">Visao geral do cliente</h2>
              <p className="mt-2 max-w-2xl">
                Aqui voce acompanha o status da sua conta de anuncios e confirma qual conta esta
                ativa no portal.
              </p>
              <p className="mt-1 text-sm text-ink/70">
                Conta ativa:{" "}
                <span className="font-medium text-ink">{accessContext.activeAdAccount.name}</span>
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
              {shouldShowRawStatusCode ? (
                <p>Codigo bruto: {facebookStatus.rawStatusCode ?? "N/A"}</p>
              ) : null}
              {facebookStatus.disableReasonText ? (
                <p>Motivo: {facebookStatus.disableReasonText}</p>
              ) : null}
              <p>Ultima consulta: {lastCheckedAt}</p>
            </div>
          </div>
        </div>
      </header>
    </section>
  );
}
