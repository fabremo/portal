"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, KeyRound, LoaderCircle, LockKeyhole } from "lucide-react";

import { clearMetaReportsSessionCache } from "@/components/dashboard/meta-reports-provider";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const MIN_PASSWORD_LENGTH = 6;

type PasswordFlow = "invite" | "recovery";

type UpdatePasswordFormProps = {
  flow: PasswordFlow;
};

export function UpdatePasswordForm({ flow }: UpdatePasswordFormProps) {
  const router = useRouter();
  const [supabase] = useState(createBrowserSupabaseClient);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(supabase));
  const [canUpdatePassword, setCanUpdatePassword] = useState(false);

  const environmentError = !supabase
    ? "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para habilitar a autenticação."
    : "";
  const formTitle = flow === "invite" ? "Crie sua senha de acesso" : "Crie sua nova senha";
  const formDescription =
    flow === "invite"
      ? "Use o link do convite para definir sua senha inicial e concluir a ativação da conta."
      : "Use o link recebido por e-mail para definir uma nova senha e voltar ao portal com segurança.";
  const invalidLinkMessage =
    flow === "invite"
      ? "Este link de convite é inválido ou expirou. Solicite um novo convite ao administrador."
      : "Este link de recuperação é inválido ou expirou. Solicite um novo link na tela de login.";

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let isMounted = true;

    async function syncRecoverySession() {
      const {
        data: { session },
      } = await client.auth.getSession();

      if (!isMounted) {
        return;
      }

      setCanUpdatePassword(Boolean(session));
      setIsCheckingSession(false);
    }

    void syncRecoverySession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setCanUpdatePassword(Boolean(session));
        setIsCheckingSession(false);
        setError("");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError("Use uma senha com pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("A confirmação da senha precisa ser igual à nova senha.");
      return;
    }

    if (!supabase) {
      setError(environmentError);
      return;
    }

    setIsLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError("Não foi possível salvar a senha. Solicite um novo link e tente novamente.");
      setIsLoading(false);
      return;
    }

    clearMetaReportsSessionCache();
    await supabase.auth.signOut();
    setSuccess("Senha definida com sucesso. Faça login para continuar.");
    setPassword("");
    setConfirmPassword("");
    setIsLoading(false);
    router.replace("/login?skipRedirect=1&passwordUpdated=1");
    router.refresh();
  }

  const isSubmitDisabled =
    isLoading || isCheckingSession || !canUpdatePassword || Boolean(environmentError);

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-black/5 bg-surface p-8 shadow-soft sm:p-10">
      <div className="mb-8 space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
          <KeyRound className="h-3.5 w-3.5" />
          {flow === "invite" ? "Ativação da conta" : "Atualização de senha"}
        </span>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{formTitle}</h1>
          <p>{formDescription}</p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-ink">Nova senha</span>
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition focus-within:border-accent">
            <LockKeyhole className="h-4 w-4 text-ink/40" />
            <input
              autoComplete="new-password"
              className="w-full border-0 bg-transparent text-sm text-ink placeholder:text-ink/35 focus:outline-none"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite sua nova senha"
              required
              type="password"
              value={password}
            />
          </div>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-ink">Confirmar nova senha</span>
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition focus-within:border-accent">
            <LockKeyhole className="h-4 w-4 text-ink/40" />
            <input
              autoComplete="new-password"
              className="w-full border-0 bg-transparent text-sm text-ink placeholder:text-ink/35 focus:outline-none"
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repita sua nova senha"
              required
              type="password"
              value={confirmPassword}
            />
          </div>
        </label>

        {environmentError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {environmentError}
          </div>
        ) : null}

        {isCheckingSession ? (
          <div className="rounded-xl border border-gray-200 bg-background px-4 py-3 text-sm text-ink/70">
            Validando o link seguro...
          </div>
        ) : null}

        {!environmentError && !isCheckingSession && !canUpdatePassword ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {invalidLinkMessage}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitDisabled}
          type="submit"
        >
          {isLoading ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Salvando senha...
            </>
          ) : (
            <>
              Salvar nova senha
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-4 text-sm">
        <p className="text-ink/55">
          {flow === "invite"
            ? "Se o convite tiver expirado, solicite um novo link ao administrador do portal."
            : "Se o link tiver expirado, volte para o login e solicite uma nova recuperação de senha."}
        </p>

        <Link
          className="inline-flex font-medium text-accent transition hover:text-accent/80"
          href="/login?skipRedirect=1"
        >
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
