type NoAdAccountAccessProps = {
  activeCompanyName?: string | null;
  isAdmin?: boolean;
};

export function NoAdAccountAccess({ activeCompanyName, isAdmin = false }: NoAdAccountAccessProps) {
  const title = activeCompanyName
    ? `Nenhuma conta de anúncio vinculada a ${activeCompanyName}`
    : "Nenhuma conta de anúncio vinculada";
  const description = isAdmin
    ? activeCompanyName
      ? "Selecione outra empresa ou vincule uma conta de anúncio na área de configurações para liberar o dashboard operacional."
      : "Selecione uma empresa no menu lateral e vincule uma conta de anúncio na área de configurações para liberar o dashboard operacional."
    : "Seu acesso ao portal foi validado, mas ainda não existe uma conta de anúncio liberada para o seu usuário.";
  const helper = isAdmin
    ? "Assim que a empresa tiver uma conta vinculada em Configurações, o dashboard passará a mostrar os dados normalmente."
    : "Peça ao time responsável para vincular sua conta no Supabase. Assim que a permissão for cadastrada, o dashboard passará a mostrar os dados da sua conta de anúncio.";

  return (
    <section className="space-y-6">
      <header className="section-shell px-6 py-6 md:px-8">
        <div className="space-y-3">
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
            Acesso pendente
          </span>
          <div>
            <h2 className="text-3xl font-semibold">{title}</h2>
            <p className="mt-2 max-w-2xl">{description}</p>
          </div>
        </div>
      </header>

      <article className="rounded-[1.75rem] border border-amber-200 bg-white p-6 shadow-card md:p-8">
        <h3 className="text-xl font-semibold">O que fazer agora</h3>
        <p className="mt-3 text-sm text-ink/72">{helper}</p>
      </article>
    </section>
  );
}
