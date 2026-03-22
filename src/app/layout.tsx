import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Portal de Clientes",
    template: "%s | Portal de Clientes",
  },
  description: "Portal de clientes com autenticacao, campanhas e indicadores de vendas.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html data-scroll-behavior="smooth" lang="pt-BR">
      <body>
        <div className="min-h-screen">
          {children}
          <footer className="border-t border-black/5 bg-background px-4 py-6 md:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl text-center text-xs font-medium uppercase tracking-[0.18em] text-ink/52">
              FABREMO ESTRATEGIAS E SERVICOS DIGITAIS LTDA - CNPJ 41.015.598/0001-70
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
