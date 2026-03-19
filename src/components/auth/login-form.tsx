"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle, LockKeyhole, Mail } from "lucide-react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type FormState = {
  email: string;
  password: string;
};

const initialState: FormState = {
  email: "",
  password: "",
};

export function LoginForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const supabase = createBrowserSupabaseClient();

    if (!supabase) {
      setError(
        "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para habilitar o login."
      );
      setIsLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (signInError) {
      setError("Não foi possível entrar. Verifique seu e-mail e sua senha.");
      setIsLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-black/5 bg-surface p-8 shadow-soft sm:p-10">
      <div className="mb-8 space-y-3">
        <span className="inline-flex items-center rounded-full border border-brand/15 bg-brand/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-brand">
          Acesso ao portal
        </span>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Entrar na sua conta</h1>
          <p>
            Use seu e-mail corporativo para acessar campanhas, oportunidades e indicadores
            de vendas da sua empresa.
          </p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-ink">E-mail</span>
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition focus-within:border-accent">
            <Mail className="h-4 w-4 text-ink/40" />
            <input
              autoComplete="email"
              className="w-full border-0 bg-transparent text-sm text-ink placeholder:text-ink/35 focus:outline-none"
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="voce@empresa.com"
              required
              type="email"
              value={form.email}
            />
          </div>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-ink">Senha</span>
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition focus-within:border-accent">
            <LockKeyhole className="h-4 w-4 text-ink/40" />
            <input
              autoComplete="current-password"
              className="w-full border-0 bg-transparent text-sm text-ink placeholder:text-ink/35 focus:outline-none"
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="Digite sua senha"
              required
              type="password"
              value={form.password}
            />
          </div>
        </label>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            <>
              Entrar
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink/55">
        Ainda está configurando o projeto? Atualize as variáveis do Supabase no ambiente e
        teste com um usuário criado no painel.
      </p>

      <Link
        className="mt-6 inline-flex text-sm font-medium text-accent transition hover:text-accent/80"
        href="/"
      >
        Voltar para a página inicial
      </Link>
    </div>
  );
}
