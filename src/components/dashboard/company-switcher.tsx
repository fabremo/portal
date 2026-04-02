"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";

type AccessibleCompany = {
  id: string;
  name: string;
  slug: string;
};

type CompanySwitcherProps = {
  activeCompanyId: string;
  companies: AccessibleCompany[];
};

export function CompanySwitcher({ activeCompanyId, companies }: CompanySwitcherProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const pathname = usePathname();

  return (
    <form action="/dashboard/select-company" className="space-y-2" method="post" ref={formRef}>
      <input name="redirectTo" type="hidden" value={pathname} />
      <label className="block text-xs uppercase tracking-[0.22em] text-white/55" htmlFor="companyId">
        Empresa
      </label>
      <select
        className="w-full rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25"
        defaultValue={activeCompanyId}
        id="companyId"
        name="companyId"
        onChange={() => formRef.current?.requestSubmit()}
      >
        {companies.map((company) => (
          <option className="text-ink" key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>
    </form>
  );
}
