"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";

type AccessibleAdAccount = {
  id: string;
  isDefault: boolean;
  name: string;
};

type AccountSwitcherProps = {
  accounts: AccessibleAdAccount[];
  activeAccountId: string;
};

export function AccountSwitcher({ accounts, activeAccountId }: AccountSwitcherProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const pathname = usePathname();

  return (
    <form action="/dashboard/select-account" className="space-y-2" method="post" ref={formRef}>
      <input name="redirectTo" type="hidden" value={pathname} />
      <label className="block text-xs uppercase tracking-[0.22em] text-white/55" htmlFor="adAccountId">
        Conta de anúncio
      </label>
      <select
        className="w-full rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25"
        defaultValue={activeAccountId}
        id="adAccountId"
        name="adAccountId"
        onChange={() => formRef.current?.requestSubmit()}
      >
        {accounts.map((account) => (
          <option className="text-ink" key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>
    </form>
  );
}
