"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  FileText,
  LifeBuoy,
  MessageSquareText,
  WalletCards,
} from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";

type DashboardSidebarProps = {
  userEmail: string;
};

const reportLinks = [
  {
    disabled: true,
    href: "#",
    label: "Leads",
  },
  {
    disabled: true,
    href: "#",
    label: "Vendas",
  },
  {
    disabled: false,
    href: "/dashboard/relatorios/mensagens",
    label: "Mensagens",
  },
];

export function DashboardSidebar({ userEmail }: DashboardSidebarProps) {
  const pathname = usePathname();
  const isOverviewActive = pathname === "/dashboard";
  const isReportsRoute = pathname.startsWith("/dashboard/relatorios");
  const [isReportsExpanded, setIsReportsExpanded] = useState(isReportsRoute);

  return (
    <aside className="flex flex-col rounded-[2rem] bg-ink p-6 text-white shadow-soft">
      <div className="rounded-2xl border border-white/10 bg-white/6 p-5">
        <p className="text-xs uppercase tracking-[0.26em] text-white/55">
          Portal de clientes
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Painel do cliente</h1>
        <p className="mt-2 text-sm leading-6 text-white/68">
          Visualize campanhas, oportunidades e indicadores de vendas com leitura rápida.
        </p>
      </div>

      <nav className="mt-8 space-y-2">
        <Link
          className={[
            "flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition",
            isOverviewActive
              ? "bg-white text-ink shadow-card"
              : "text-white/74 hover:bg-white/8 hover:text-white",
          ].join(" ")}
          href="/dashboard"
        >
          <span className="flex items-center gap-3">
            <BarChart3 className="h-4 w-4" />
            Visão geral
          </span>
          <ChevronRight className="h-4 w-4" />
        </Link>

        <div className="rounded-2xl border border-white/8 bg-white/4 px-2 py-2">
          <button
            className={[
              "flex w-full items-center justify-between rounded-2xl px-2 py-2 text-sm",
              isReportsExpanded || isReportsRoute ? "text-white" : "text-white/74",
            ].join(" ")}
            onClick={() => setIsReportsExpanded((current) => !current)}
            type="button"
          >
            <span className="flex items-center gap-3">
              <FileText className="h-4 w-4" />
              Relatórios
            </span>
            <ChevronDown
              className={[
                "h-4 w-4 transition",
                isReportsExpanded || isReportsRoute ? "rotate-0" : "-rotate-90",
              ].join(" ")}
            />
          </button>

          {isReportsExpanded || isReportsRoute ? (
            <div className="mt-2 space-y-1 px-2 pb-1">
              {reportLinks.map(({ disabled, href, label }) =>
                disabled ? (
                  <div
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-white/40"
                    key={label}
                  >
                    <span>{label}</span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]">
                      Em breve
                    </span>
                  </div>
                ) : (
                  <Link
                    className={[
                      "flex items-center justify-between rounded-xl px-3 py-2 text-sm transition",
                      pathname === href
                        ? "bg-white text-ink shadow-card"
                        : "text-white/74 hover:bg-white/8 hover:text-white",
                    ].join(" ")}
                    href={href}
                    key={label}
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquareText className="h-4 w-4" />
                      {label}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )
              )}
            </div>
          ) : null}
        </div>

        {[
          { href: "#", icon: WalletCards, label: "Financeiro" },
          { href: "#", icon: LifeBuoy, label: "Suporte" },
        ].map(({ href, icon: Icon, label }) => (
          <Link
            className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm text-white/74 transition hover:bg-white/8 hover:text-white"
            href={href}
            key={label}
          >
            <span className="flex items-center gap-3">
              <Icon className="h-4 w-4" />
              {label}
            </span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ))}
      </nav>

      <div className="mt-auto rounded-3xl border border-white/10 bg-white/6 p-5">
        <p className="text-sm text-white/68">Sessão ativa como</p>
        <p className="mt-2 break-all text-sm font-medium text-white">{userEmail}</p>
        <div className="mt-5">
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}

