import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Login",
};

type LoginPageProps = {
  searchParams?: Promise<{
    skipRedirect?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const shouldSkipRedirect = resolvedSearchParams?.skipRedirect === "1";
  const supabase = await createServerSupabaseClient();

  if (supabase && !shouldSkipRedirect) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/dashboard");
    }
  }

  return (
    <main className="page-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div className="absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgba(245,130,32,0.14),transparent)]" />
      <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-accent/8 blur-3xl" />
      <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="hidden space-y-8 lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-4 py-2 text-sm font-medium text-accent">
            <ShieldCheck className="h-4 w-4" />
            Ambiente seguro e rastreável
          </div>
          <div className="space-y-4">
            <h1 className="max-w-xl text-5xl font-semibold leading-tight">
              Entre no portal para acompanhar seus resultados com clareza.
            </h1>
            <p className="max-w-xl text-lg">
              Aqui você visualiza campanhas de anúncios, geração de oportunidades e o avanço das
              vendas da sua empresa em uma experiência leve, profissional e objetiva.
            </p>
          </div>
          <div className="grid max-w-2xl gap-4 md:grid-cols-3">
            {[
              ["Campanhas", "Acompanhe mídia ativa, investimento e desempenho por período."],
              ["Oportunidades", "Veja o volume de leads e a evolução do funil comercial."],
              ["Resultados", "Tenha uma leitura executiva das vendas e dos próximos passos."],
            ].map(([title, copy]) => (
              <article
                className="rounded-3xl border border-black/5 bg-white/88 p-5 shadow-card backdrop-blur"
                key={title}
              >
                <h2 className="text-base font-semibold text-ink">{title}</h2>
                <p className="mt-2 text-sm">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <LoginForm />
      </div>
    </main>
  );
}
