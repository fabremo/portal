import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const ACTIVE_AD_ACCOUNT_COOKIE_NAME = "portal_active_ad_account";
export type UserRole = "admin" | "common";

export type AccessibleAdAccount = {
  id: string;
  isDefault: boolean;
  name: string;
};

export type DashboardAccessContext = {
  accessibleAccounts: AccessibleAdAccount[];
  activeAdAccount: AccessibleAdAccount | null;
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

export function canAccessBuyersModule(role: UserRole) {
  return role === "admin";
}

function resolveActiveAdAccount(
  accessibleAccounts: AccessibleAdAccount[],
  cookieAccountId?: string
) {
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

function getJoinedAdAccount(row: UserAdAccountRow) {
  if (Array.isArray(row.ad_accounts)) {
    return row.ad_accounts[0] ?? null;
  }

  return row.ad_accounts;
}

function normalizeRole(role: string | null | undefined): UserRole {
  return role === "admin" ? "admin" : "common";
}

async function resolveUserRole(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  userId: string
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

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

function mapAdminAccounts(data: JoinedAdAccount[]) {
  return data
    .filter((account) => account.is_active)
    .map((account) => ({
      id: account.id,
      isDefault: false,
      name: account.name || "Conta sem nome",
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
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
    ? supabase.from("ad_accounts").select("id, is_active, name").eq("is_active", true)
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

  const { data, error } = await accountQuery;

  if (error) {
    throw new Error("Não foi possível carregar as contas de anúncio do usuário.");
  }

  const accessibleAccounts = isAdmin
    ? mapAdminAccounts((data ?? []) as JoinedAdAccount[])
    : mapUserAdAccountRows((data ?? []) as UserAdAccountRow[]);

  const cookieStore = await cookies();
  const cookieAccountId = cookieStore.get(ACTIVE_AD_ACCOUNT_COOKIE_NAME)?.value;

  return {
    accessibleAccounts,
    activeAdAccount: resolveActiveAdAccount(accessibleAccounts, cookieAccountId),
    isAdmin,
    role,
    userEmail: user.email || "usuario@empresa.com",
    userId: user.id,
  };
});
