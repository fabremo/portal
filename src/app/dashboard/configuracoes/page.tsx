import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Settings, ShieldCheck } from "lucide-react";

import { getDashboardAccessContext } from "@/lib/dashboard/access";

export const metadata: Metadata = {
  title: "Configurações",
};

export default async function DashboardSettingsPage() {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext) {
    redirect("/login");
  }

  if (!accessContext.isAdmin) {
    redirect("/dashboard");
  }

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
                Esta tela foi reservada para as configurações administrativas que virão na próxima etapa.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-black/5 bg-background px-5 py-4 text-sm text-ink/70">
            <Settings className="h-4 w-4 text-accent" />
            Somente administradores
          </div>
        </div>
      </header>

      <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-8">
        <h3 className="text-xl font-semibold">Espaço preparado para configurações</h3>
        <p className="mt-3 text-sm text-ink/72">
          O controle de acesso administrativo já está ativo. A próxima entrega pode adicionar aqui
          as ferramentas de configuração sem refazer a autorização.
        </p>
      </article>
    </section>
  );
}
