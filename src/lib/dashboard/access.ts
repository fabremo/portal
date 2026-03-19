import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const ACTIVE_AD_ACCOUNT_COOKIE_NAME = "portal_active_ad_account";

export type AccessibleAdAccount = {
  id: string;
  isDefault: boolean;
  name: string;
};

export type DashboardAccessContext = {
  accessibleAccounts: AccessibleAdAccount[];
  activeAdAccount: AccessibleAdAccount | null;
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

  const { data, error } = await supabase
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

  if (error) {
    throw new Error("Nao foi possivel carregar as contas de anuncio do usuario.");
  }

  const accessibleAccounts = ((data ?? []) as unknown as UserAdAccountRow[])
    .filter((row) => row.is_active)
    .map((row) => {
      const joinedAdAccount = getJoinedAdAccount(row);

      return {
        id: joinedAdAccount?.id ?? "",
        isActive: joinedAdAccount?.is_active ?? false,
        isDefault: row.is_default,
        name: joinedAdAccount?.name ?? "Conta sem nome",
      };
    })
    .filter((account) => account.id && account.isActive)
    .map(({ isActive: _isActive, ...account }) => account)
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));

  const cookieStore = await cookies();
  const cookieAccountId = cookieStore.get(ACTIVE_AD_ACCOUNT_COOKIE_NAME)?.value;

  return {
    accessibleAccounts,
    activeAdAccount: resolveActiveAdAccount(accessibleAccounts, cookieAccountId),
    userEmail: user.email ?? "usuario@empresa.com",
    userId: user.id,
  };
});
