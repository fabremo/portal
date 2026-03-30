"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ContactRound,
  FileText,
  MessageSquareText,
  PanelLeft,
  Settings,
  ShoppingCart,
  Webhook,
} from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { AccountSwitcher } from "@/components/dashboard/account-switcher";

type AccessibleAdAccount = {
  id: string;
  isDefault: boolean;
  name: string;
};

type DashboardSidebarProps = {
  accessibleAccounts: AccessibleAdAccount[];
  activeAdAccount: AccessibleAdAccount | null;
  canAccessBuyersModule: boolean;
  isAdmin: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  userEmail: string;
};

type GroupLink = {
  disabled?: boolean;
  href: string;
  label: string;
};

const reportLinks: GroupLink[] = [
  {
    disabled: true,
    href: "#",
    label: "Leads",
  },
  {
    disabled: false,
    href: "/dashboard/relatorios/vendas",
    label: "Vendas",
  },
  {
    disabled: false,
    href: "/dashboard/relatorios/mensagens",
    label: "Mensagens",
  },
];

const buyersLinks: GroupLink[] = [
  {
    href: "/dashboard/compradores",
    label: "Visão geral",
  },
  {
    href: "/dashboard/compradores/contatos",
    label: "Contatos",
  },
  {
    href: "/dashboard/compradores/webhooks",
    label: "Logs de webhook",
  },
];

function getLinkIcon(href: string, label: string) {
  if (href === "/dashboard") {
    return <BarChart3 className="h-4 w-4 shrink-0" />;
  }

  if (href.endsWith("/mensagens")) {
    return <MessageSquareText className="h-4 w-4 shrink-0" />;
  }

  if (href.endsWith("/webhooks")) {
    return <Webhook className="h-4 w-4 shrink-0" />;
  }

  if (href.endsWith("/contatos")) {
    return <ContactRound className="h-4 w-4 shrink-0" />;
  }

  if (href.startsWith("/dashboard/compradores")) {
    return <ShoppingCart className="h-4 w-4 shrink-0" />;
  }

  if (href.startsWith("/dashboard/relatorios")) {
    return <BarChart3 className="h-4 w-4 shrink-0" />;
  }

  if (label === "Relatórios") {
    return <FileText className="h-4 w-4 shrink-0" />;
  }

  return <Settings className="h-4 w-4 shrink-0" />;
}

function renderNavLink({
  href,
  icon,
  isActive,
  isCollapsed,
  label,
}: {
  href: string;
  icon: ReactNode;
  isActive: boolean;
  isCollapsed: boolean;
  label: string;
}) {
  return (
    <Link
      className={[
        "flex items-center rounded-2xl text-sm transition",
        isCollapsed ? "justify-center px-3 py-3" : "justify-between px-4 py-3",
        isActive ? "bg-white text-ink shadow-card" : "text-white/74 hover:bg-white/8 hover:text-white",
      ].join(" ")}
      href={href}
      title={isCollapsed ? label : undefined}
    >
      <span className={["flex items-center", isCollapsed ? "justify-center" : "gap-3"].join(" ")}>
        {icon}
        {!isCollapsed ? label : <span className="sr-only">{label}</span>}
      </span>
      {!isCollapsed ? <ChevronRight className="h-4 w-4 shrink-0" /> : null}
    </Link>
  );
}

function renderGroupButton({
  icon,
  isCollapsed,
  isExpanded,
  isRouteActive,
  label,
  onClick,
}: {
  icon: ReactNode;
  isCollapsed: boolean;
  isExpanded: boolean;
  isRouteActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "flex w-full items-center rounded-2xl text-sm transition",
        isCollapsed ? "justify-center px-3 py-3" : "justify-between px-2 py-2",
        isExpanded || isRouteActive ? "text-white" : "text-white/74 hover:text-white",
      ].join(" ")}
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      type="button"
    >
      <span className={["flex items-center", isCollapsed ? "justify-center" : "gap-3"].join(" ")}>
        {icon}
        {!isCollapsed ? label : <span className="sr-only">{label}</span>}
      </span>
      {!isCollapsed ? (
        <ChevronDown
          className={[
            "h-4 w-4 transition",
            isExpanded || isRouteActive ? "rotate-0" : "-rotate-90",
          ].join(" ")}
        />
      ) : null}
    </button>
  );
}

export function DashboardSidebar({
  accessibleAccounts,
  activeAdAccount,
  canAccessBuyersModule,
  isAdmin,
  isCollapsed,
  onToggleCollapse,
  userEmail,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const isOverviewActive = pathname === "/dashboard";
  const isReportsRoute = pathname.startsWith("/dashboard/relatorios");
  const isBuyersModuleRoute = pathname.startsWith("/dashboard/compradores");
  const isSettingsActive = pathname === "/dashboard/configuracoes";
  const [isReportsExpanded, setIsReportsExpanded] = useState(isReportsRoute);
  const [isBuyersExpanded, setIsBuyersExpanded] = useState(isBuyersModuleRoute);

  return (
    <aside
      className={[
        "flex h-full flex-col rounded-[2rem] bg-ink text-white shadow-soft transition-all duration-300",
        isCollapsed ? "p-3" : "p-6",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={[
            "rounded-2xl border border-white/10 bg-white/6 transition-all duration-300",
            isCollapsed ? "flex h-14 w-14 items-center justify-center p-0" : "flex-1 p-5",
          ].join(" ")}
        >
          {isCollapsed ? (
            <PanelLeft className="h-5 w-5 text-white" />
          ) : (
            <>
              <p className="text-xs uppercase tracking-[0.26em] text-white/55">Portal de clientes</p>
              <h1 className="mt-3 text-2xl font-semibold text-white">Painel do cliente</h1>
              <p className="mt-2 text-sm leading-6 text-white/68">
                Visualize campanhas, oportunidades e indicadores de vendas com leitura rápida.
              </p>
            </>
          )}
        </div>

        <button
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/74 transition hover:bg-white/10 hover:text-white"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expandir menu" : "Retrair menu"}
          type="button"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <div
        className={[
          "mt-6 rounded-2xl border border-white/10 bg-white/6 transition-all duration-300",
          isCollapsed ? "p-3" : "p-5",
        ].join(" ")}
      >
        {isCollapsed ? (
          <div className="flex justify-center">
            <div
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-sm font-medium text-white"
              title={activeAdAccount ? activeAdAccount.name : "Nenhuma conta liberada"}
            >
              {(activeAdAccount?.name ?? "-").slice(0, 1).toUpperCase()}
            </div>
          </div>
        ) : accessibleAccounts.length > 1 && activeAdAccount ? (
          <AccountSwitcher accounts={accessibleAccounts} activeAccountId={activeAdAccount.id} />
        ) : activeAdAccount ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-white/55">Conta de anúncio</p>
            <p className="text-sm font-medium text-white">{activeAdAccount.name}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-white/55">Conta de anúncio</p>
            <p className="text-sm text-white/70">Nenhuma conta liberada</p>
          </div>
        )}
      </div>

      <nav className={["mt-8 space-y-2", isCollapsed ? "flex flex-col items-center" : ""].join(" ")}>
        <div className={isCollapsed ? "w-full" : undefined}>
          {renderNavLink({
            href: "/dashboard",
            icon: getLinkIcon("/dashboard", "Visão geral"),
            isActive: isOverviewActive,
            isCollapsed,
            label: "Visão geral",
          })}
        </div>

        <div
          className={[
            "rounded-2xl border border-white/8 bg-white/4",
            isCollapsed ? "w-full px-0 py-0" : "px-2 py-2",
          ].join(" ")}
        >
          {renderGroupButton({
            icon: <FileText className="h-4 w-4 shrink-0" />,
            isCollapsed,
            isExpanded: isReportsExpanded,
            isRouteActive: isReportsRoute,
            label: "Relatórios",
            onClick: () => {
              if (isCollapsed) {
                onToggleCollapse();
                return;
              }

              setIsReportsExpanded((current) => !current);
            },
          })}

          {!isCollapsed && (isReportsExpanded || isReportsRoute) ? (
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
                  <div key={label}>
                    {renderNavLink({
                      href,
                      icon: getLinkIcon(href, label),
                      isActive: pathname === href,
                      isCollapsed: false,
                      label,
                    })}
                  </div>
                )
              )}
            </div>
          ) : null}
        </div>

        {canAccessBuyersModule ? (
          <div
            className={[
              "rounded-2xl border border-white/8 bg-white/4",
              isCollapsed ? "w-full px-0 py-0" : "px-2 py-2",
            ].join(" ")}
          >
            {renderGroupButton({
              icon: <ShoppingCart className="h-4 w-4 shrink-0" />,
              isCollapsed,
              isExpanded: isBuyersExpanded,
              isRouteActive: isBuyersModuleRoute,
              label: "Sistema de Compradores",
              onClick: () => {
                if (isCollapsed) {
                  onToggleCollapse();
                  return;
                }

                setIsBuyersExpanded((current) => !current);
              },
            })}

            {!isCollapsed && (isBuyersExpanded || isBuyersModuleRoute) ? (
              <div className="mt-2 space-y-1 px-2 pb-1">
                {buyersLinks.map(({ href, label }) => (
                  <div key={label}>
                    {renderNavLink({
                      href,
                      icon: getLinkIcon(href, label),
                      isActive: pathname === href,
                      isCollapsed: false,
                      label,
                    })}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {isAdmin ? (
          <div className={isCollapsed ? "w-full" : undefined}>
            {renderNavLink({
              href: "/dashboard/configuracoes",
              icon: <Settings className="h-4 w-4 shrink-0" />,
              isActive: isSettingsActive,
              isCollapsed,
              label: "Configurações",
            })}
          </div>
        ) : null}
      </nav>

      <div
        className={[
          "mt-auto rounded-3xl border border-white/10 bg-white/6 transition-all duration-300",
          isCollapsed ? "p-3" : "p-5",
        ].join(" ")}
      >
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-sm font-medium text-white"
              title={userEmail}
            >
              {userEmail.slice(0, 1).toUpperCase()}
            </div>
            <SignOutButton
              className="border-white/10 bg-white/8 text-white hover:border-white/20 hover:text-white"
              compact
              title="Sair"
            />
          </div>
        ) : (
          <>
            <p className="text-sm text-white/68">Sessão ativa como</p>
            <p className="mt-2 break-all text-sm font-medium text-white">{userEmail}</p>
            <div className="mt-5">
              <SignOutButton />
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
