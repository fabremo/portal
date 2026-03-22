import { KeyRound } from "lucide-react";

import { UpdatePasswordForm } from "@/components/auth/update-password-form";

type UpdatePasswordPageProps = {
  searchParams?: Promise<{
    flow?: string;
  }>;
};

export default async function UpdatePasswordPage({ searchParams }: UpdatePasswordPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const flow = resolvedSearchParams?.flow === "invite" ? "invite" : "recovery";
  const eyebrow = flow === "invite" ? "Ativação segura de acesso" : "Recuperação segura de acesso";
  const title =
    flow === "invite"
      ? "Defina sua senha para ativar o acesso ao portal."
      : "Atualize sua senha para voltar ao portal com rapidez.";
  const description =
    flow === "invite"
      ? "Este fluxo confirma o convite enviado para o seu e-mail e prepara o primeiro acesso da sua conta com segurança."
      : "Este fluxo protege o acesso da sua equipe e permite retomar o acompanhamento das campanhas e resultados sem depender de suporte manual.";
  const cards =
    flow === "invite"
      ? [
          ["Convite válido", "O acesso é liberado a partir do link seguro enviado pelo Supabase."],
          ["Nova senha", "Defina uma senha inicial para concluir a ativação da sua conta."],
          ["Próximo passo", "Depois disso, faça login no portal com o seu e-mail e a nova senha."],
        ]
      : [
          ["Link seguro", "A redefinição acontece a partir do e-mail enviado pelo Supabase."],
          ["Nova senha", "Defina uma senha atualizada para continuar usando o portal."],
          ["Acesso rápido", "Conclua a troca e volte ao login com o novo acesso."],
        ];

  return (
    <main className="page-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div className="absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgba(245,130,32,0.14),transparent)]" />
      <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-accent/8 blur-3xl" />
      <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="hidden space-y-8 lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-4 py-2 text-sm font-medium text-accent">
            <KeyRound className="h-4 w-4" />
            {eyebrow}
          </div>
          <div className="space-y-4">
            <h1 className="max-w-xl text-5xl font-semibold leading-tight">{title}</h1>
            <p className="max-w-xl text-lg">{description}</p>
          </div>
          <div className="grid max-w-2xl gap-4 md:grid-cols-3">
            {cards.map(([cardTitle, copy]) => (
              <article
                className="rounded-3xl border border-black/5 bg-white/88 p-5 shadow-card backdrop-blur"
                key={cardTitle}
              >
                <h2 className="text-base font-semibold text-ink">{cardTitle}</h2>
                <p className="mt-2 text-sm">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <UpdatePasswordForm flow={flow} />
      </div>
    </main>
  );
}
