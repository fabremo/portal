import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const ACTIVE_AD_ACCOUNT_COOKIE_NAME = "portal_active_ad_account";
export const ACTIVE_COMPANY_COOKIE_NAME = "portal_active_company";
export type UserRole = "admin" | "common";

export type AccessibleAdAccount = {
  id: string;
  isDefault: boolean;
  name: string;
};

export type AccessibleCompany = {
  id: string;
  name: string;
  slug: string;
};

export type DashboardAccessContext = {
  accessibleAccounts: AccessibleAdAccount[];
  accessibleCompanies: AccessibleCompany[];
  accessibleCompanyIds: string[];
  accountCompanyIds: Record<string, string>;
  activeAdAccount: AccessibleAdAccount | null;
  activeCompany: AccessibleCompany | null;
  activeCompanyId: string | null;
  isAdmin: boolean;
  role: UserRole;
  userEmail: string;
  userId: string;
};

type JoinedAdAccount = {
  id: string;
  is_active: boolean;
  name: string;
};

type UserAdAccountRow = {
  ad_accounts: JoinedAdAccount[] | JoinedAdAccount | null;
  is_active: boolean;
  is_default: boolean;
};

type ProfileRow = {
  role: string | null;
};

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
};

type UserCompanyRow = {
  companies: CompanyRow[] | CompanyRow | null;
};

type CompanyAdAccountRow = {
  ad_account_id: string;
  ad_account_name: string | null;
  company_id: string;
  is_active: boolean;
};

export function canAccessBuyersModule(
  accessContext: Pick<DashboardAccessContext, "accessibleCompanyIds" | "isAdmin">
) {
  return accessContext.isAdmin || accessContext.accessibleCompanyIds.length > 0;
}

function resolveActiveAdAccount(accessibleAccounts: AccessibleAdAccount[], cookieAccountId?: string) {
  if (!accessibleAccounts.length) {
    return null;
  }

  const cookieSelectedAccount = accessibleAccounts.find((account) => account.id === cookieAccountId);

  if (cookieSelectedAccount) {
    return cookieSelectedAccount;
  }

  const defaultAccount = accessibleAccounts.find((account) => account.isDefault);

  if (defaultAccount) {
    return defaultAccount;
  }

  return accessibleAccounts[0];
}

function resolveActiveCompany(
  accessibleCompanies: AccessibleCompany[],
  cookieCompanyId?: string,
  preferredCompanyIds: string[] = []
) {
  if (!accessibleCompanies.length) {
    return null;
  }

  const cookieSelectedCompany = accessibleCompanies.find((company) => company.id === cookieCompanyId);

  if (cookieSelectedCompany) {
    return cookieSelectedCompany;
  }

  for (const companyId of preferredCompanyIds) {
    const preferredCompany = accessibleCompanies.find((company) => company.id === companyId);

    if (preferredCompany) {
      return preferredCompany;
    }
  }

  return accessibleCompanies[0];
}

function getJoinedAdAccount(row: UserAdAccountRow) {
  if (Array.isArray(row.ad_accounts)) {
    return row.ad_accounts[0] ?? null;
  }

  return row.ad_accounts;
}

function getJoinedCompany(row: UserCompanyRow) {
  if (Array.isArray(row.companies)) {
    return row.companies[0] ?? null;
  }

  return row.companies;
}

function normalizeRole(role: string | null | undefined): UserRole {
  return role === "admin" ? "admin" : "common";
}

async function resolveUserRole(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  userId: string
) {
  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();

  if (error) {
    return "common" satisfies UserRole;
  }

  return normalizeRole((data as ProfileRow | null)?.role);
}

function mapUserAdAccountRows(data: UserAdAccountRow[]) {
  return data
    .filter((row) => row.is_active)
    .map((row) => {
      const joinedAdAccount = getJoinedAdAccount(row);

      return {
        id: joinedAdAccount?.id || "",
        isActive: joinedAdAccount?.is_active ?? false,
        isDefault: row.is_default,
        name: joinedAdAccount?.name || "Conta sem nome",
      };
    })
    .filter((account) => account.id && account.isActive)
    .map(({ isActive: _isActive, ...account }) => account)
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

function mapCompanyBindingAccounts(data: CompanyAdAccountRow[]) {
  return data
    .filter((row) => row.is_active)
    .map((row) => ({
      id: row.ad_account_id,
      isDefault: false,
      name: row.ad_account_name || "Conta sem nome",
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

async function resolveAccessibleCompanies(isAdmin: boolean, userId: string) {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    return [] as AccessibleCompany[];
  }

  if (isAdmin) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, slug")
      .order("name", { ascending: true });

    if (error) {
      throw new Error("Não foi possível carregar as empresas disponíveis para o usuário.");
    }

    return ((data ?? []) as CompanyRow[]).map((company) => ({
      id: company.id,
      name: company.name,
      slug: company.slug,
    }));
  }

  const { data, error } = await supabase
    .from("user_companies")
    .select(
      `
      companies!inner (
        id,
        name,
        slug
      )
    `
    )
    .eq("user_id", userId);

  if (error) {
    throw new Error("Não foi possível carregar as empresas disponíveis para o usuário.");
  }

  const companies = ((data ?? []) as UserCompanyRow[])
    .map((row) => getJoinedCompany(row))
    .filter((company): company is CompanyRow => Boolean(company?.id))
    .map((company) => ({
      id: company.id,
      name: company.name,
      slug: company.slug,
    }));

  const uniqueCompanies = Array.from(new Map(companies.map((company) => [company.id, company])).values());

  return uniqueCompanies.sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

async function resolveCompanyAdAccountBindings(companyIds: string[], accountIds?: string[]) {
  if (!companyIds.length) {
    return [] as CompanyAdAccountRow[];
  }

  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    return [] as CompanyAdAccountRow[];
  }

  let query = supabase
    .from("company_ad_accounts")
    .select("ad_account_id, ad_account_name, company_id, is_active")
    .in("company_id", companyIds)
    .eq("is_active", true);

  if (accountIds?.length) {
    query = query.in("ad_account_id", accountIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Não foi possível carregar os vínculos entre empresas e contas de anúncio.");
  }

  return (data ?? []) as CompanyAdAccountRow[];
}

export const getDashboardAccessContext = cache(async (): Promise<DashboardAccessContext | null> => {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const role = await resolveUserRole(supabase, user.id);
  const isAdmin = role === "admin";
  const accountQuery = isAdmin
    ? null
    : supabase
        .from("user_ad_accounts")
        .select(
          `
          is_active,
          is_default,
          ad_accounts!inner (
            id,
            is_active,
            name
          )
        `
        )
        .eq("user_id", user.id)
        .eq("is_active", true)
        .eq("ad_accounts.is_active", true);

  const [accountResult, accessibleCompanies] = await Promise.all([
    accountQuery ? accountQuery : Promise.resolve({ data: null, error: null }),
    resolveAccessibleCompanies(isAdmin, user.id),
  ]);

  if (accountResult?.error) {
    throw new Error("Não foi possível carregar as contas de anúncio do usuário.");
  }

  const cookieStore = await cookies();
  const cookieAccountId = cookieStore.get(ACTIVE_AD_ACCOUNT_COOKIE_NAME)?.value;
  const cookieCompanyId = cookieStore.get(ACTIVE_COMPANY_COOKIE_NAME)?.value;

  if (isAdmin) {
    const companyBindings = await resolveCompanyAdAccountBindings(
      accessibleCompanies.map((company) => company.id)
    );
    const companyIdsWithAccounts = Array.from(new Set(companyBindings.map((binding) => binding.company_id)));
    const activeCompany = resolveActiveCompany(accessibleCompanies, cookieCompanyId, companyIdsWithAccounts);
    const accessibleAccounts = activeCompany
      ? mapCompanyBindingAccounts(companyBindings.filter((binding) => binding.company_id === activeCompany.id))
      : [];
    const activeAdAccount = resolveActiveAdAccount(accessibleAccounts, cookieAccountId);
    const activeCompanyId = activeCompany?.id ?? null;

    return {
      accessibleAccounts,
      accessibleCompanies,
      accessibleCompanyIds: accessibleCompanies.map((company) => company.id),
      accountCompanyIds: Object.fromEntries(
        accessibleAccounts.map((account) => [account.id, activeCompanyId ?? ""])
      ),
      activeAdAccount,
      activeCompany,
      activeCompanyId,
      isAdmin,
      role,
      userEmail: user.email || "usuario@empresa.com",
      userId: user.id,
    };
  }

  const rawAccessibleAccounts = mapUserAdAccountRows((accountResult?.data ?? []) as UserAdAccountRow[]);
  const companyAccountBindings = await resolveCompanyAdAccountBindings(
    accessibleCompanies.map((company) => company.id),
    rawAccessibleAccounts.map((account) => account.id)
  );
  const companyByAccountId = new Map(
    companyAccountBindings.map((binding) => [binding.ad_account_id, binding.company_id])
  );
  const accountNameById = new Map(
    companyAccountBindings
      .filter((binding) => binding.ad_account_name)
      .map((binding) => [binding.ad_account_id, binding.ad_account_name as string])
  );
  const accessibleAccounts = rawAccessibleAccounts
    .filter((account) => companyByAccountId.has(account.id))
    .map((account) => ({
      ...account,
      name: accountNameById.get(account.id) || account.name,
    }));
  const activeAdAccount = resolveActiveAdAccount(accessibleAccounts, cookieAccountId);
  const activeCompanyId = activeAdAccount ? companyByAccountId.get(activeAdAccount.id) ?? null : null;
  const activeCompany =
    activeCompanyId ? accessibleCompanies.find((company) => company.id === activeCompanyId) ?? null : null;

  return {
    accessibleAccounts,
    accessibleCompanies,
    accessibleCompanyIds: accessibleCompanies.map((company) => company.id),
    accountCompanyIds: Object.fromEntries(companyByAccountId.entries()),
    activeAdAccount,
    activeCompany,
    activeCompanyId,
    isAdmin,
    role,
    userEmail: user.email || "usuario@empresa.com",
    userId: user.id,
  };
});
