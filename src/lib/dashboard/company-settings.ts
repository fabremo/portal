import "server-only";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

type CompanyRow = {
  created_at: string;
  id: string;
  name: string;
  slug: string;
  tracking_enabled: boolean | null;
};

type CompanyMembershipRow = {
  company_id: string;
  user_id: string;
};

type CompanyProductRow = {
  company_id: string;
  hotmart_product_id: number;
  id: string;
  is_active: boolean;
  product_name: string;
};

type CompanyAdAccountBindingRow = {
  ad_account_id: string;
  ad_account_name: string | null;
  company_id: string;
  created_at: string;
  id: string;
  is_active: boolean;
  updated_at: string;
};

type AdAccountRow = {
  id: string;
  is_active: boolean;
  name: string;
};

type ProfileRow = {
  id: string;
};

type AuthUserRow = {
  email?: string | null;
  id: string;
};

export type CompanyMembership = {
  email: string;
  userId: string;
};

export type CompanySettingsUser = {
  email: string;
  id: string;
};

export type CompanySettingsProduct = {
  companyId: string;
  hotmartProductId: number;
  id: string;
  isActive: boolean;
  productName: string;
};

export type CompanySettingsAdAccountBinding = {
  adAccountId: string;
  adAccountName: string;
  companyId: string;
  createdAt: string;
  id: string;
  isActive: boolean;
  updatedAt: string;
};

export type CompanySettingsAvailableAdAccount = {
  boundCompanyId: string | null;
  boundCompanyName: string | null;
  id: string;
  isActive: boolean;
  isBound: boolean;
  name: string;
};

export type CompanySettingsCompany = {
  activeAdAccountCount: number;
  activeProductCount: number;
  adAccounts: CompanySettingsAdAccountBinding[];
  createdAt: string;
  id: string;
  memberCount: number;
  memberships: CompanyMembership[];
  name: string;
  products: CompanySettingsProduct[];
  slug: string;
  trackingEnabled: boolean;
};

export type CompanySettingsData = {
  availableAdAccounts: CompanySettingsAvailableAdAccount[];
  companies: CompanySettingsCompany[];
  users: CompanySettingsUser[];
};

function normalizeEmail(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

async function listAllAuthUsers() {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  const users: AuthUserRow[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error("Não foi possível carregar os usuários cadastrados.");
    }

    users.push(...(data.users as AuthUserRow[]));

    if (!data.nextPage || !data.users.length) {
      break;
    }

    page = data.nextPage;
  }

  return users;
}

export async function getCompanySettingsData(): Promise<CompanySettingsData> {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  const [
    companiesResponse,
    membershipsResponse,
    productsResponse,
    companyAdAccountsResponse,
    adAccountsResponse,
    profilesResponse,
    authUsers,
  ] = await Promise.all([
    supabase.from("companies").select("id, name, slug, tracking_enabled, created_at").order("name", { ascending: true }),
    supabase.from("user_companies").select("company_id, user_id"),
    supabase
      .from("company_products")
      .select("id, company_id, hotmart_product_id, product_name, is_active")
      .order("product_name", { ascending: true }),
    supabase
      .from("company_ad_accounts")
      .select("id, company_id, ad_account_id, ad_account_name, is_active, created_at, updated_at")
      .order("ad_account_name", { ascending: true }),
    supabase.from("ad_accounts").select("id, name, is_active").order("name", { ascending: true }),
    supabase.from("profiles").select("id"),
    listAllAuthUsers(),
  ]);

  if (companiesResponse.error) {
    throw new Error("Não foi possível carregar as empresas cadastradas.");
  }

  if (membershipsResponse.error) {
    throw new Error("Não foi possível carregar os vínculos das empresas.");
  }

  if (productsResponse.error) {
    throw new Error("Não foi possível carregar os produtos cadastrados.");
  }

  if (companyAdAccountsResponse.error) {
    throw new Error("Não foi possível carregar as contas de anúncio vinculadas.");
  }

  if (adAccountsResponse.error) {
    throw new Error("Não foi possível carregar as contas de anúncio disponíveis.");
  }

  if (profilesResponse.error) {
    throw new Error("Não foi possível carregar os perfis de usuário.");
  }

  const companiesRows = (companiesResponse.data ?? []) as CompanyRow[];
  const companiesById = new Map(companiesRows.map((company) => [company.id, company]));

  const profileIds = new Set(((profilesResponse.data ?? []) as ProfileRow[]).map((profile) => profile.id));
  const users = authUsers
    .filter((user) => profileIds.has(user.id))
    .map((user) => ({
      email: normalizeEmail(user.email) || "usuario-sem-email",
      id: user.id,
    }))
    .sort((left, right) => left.email.localeCompare(right.email, "pt-BR"));

  const usersById = new Map(users.map((user) => [user.id, user.email]));
  const membershipsByCompanyId = new Map<string, CompanyMembership[]>();

  for (const membership of (membershipsResponse.data ?? []) as CompanyMembershipRow[]) {
    const companyMemberships = membershipsByCompanyId.get(membership.company_id) ?? [];

    companyMemberships.push({
      email: usersById.get(membership.user_id) || "Usuário sem e-mail",
      userId: membership.user_id,
    });

    membershipsByCompanyId.set(membership.company_id, companyMemberships);
  }

  const productsByCompanyId = new Map<string, CompanySettingsProduct[]>();

  for (const product of (productsResponse.data ?? []) as CompanyProductRow[]) {
    const companyProducts = productsByCompanyId.get(product.company_id) ?? [];

    companyProducts.push({
      companyId: product.company_id,
      hotmartProductId: product.hotmart_product_id,
      id: product.id,
      isActive: product.is_active,
      productName: product.product_name,
    });

    productsByCompanyId.set(product.company_id, companyProducts);
  }

  const adAccountsByCompanyId = new Map<string, CompanySettingsAdAccountBinding[]>();
  const boundAccountIds = new Set<string>();
  const boundCompanyByAccountId = new Map<string, { id: string; name: string }>();

  for (const binding of (companyAdAccountsResponse.data ?? []) as CompanyAdAccountBindingRow[]) {
    const companyBindings = adAccountsByCompanyId.get(binding.company_id) ?? [];

    companyBindings.push({
      adAccountId: binding.ad_account_id,
      adAccountName: binding.ad_account_name || "Conta sem nome",
      companyId: binding.company_id,
      createdAt: binding.created_at,
      id: binding.id,
      isActive: binding.is_active,
      updatedAt: binding.updated_at,
    });

    adAccountsByCompanyId.set(binding.company_id, companyBindings);
    boundAccountIds.add(binding.ad_account_id);

    const company = companiesById.get(binding.company_id);
    if (company) {
      boundCompanyByAccountId.set(binding.ad_account_id, {
        id: company.id,
        name: company.name,
      });
    }
  }

  const availableAdAccounts = ((adAccountsResponse.data ?? []) as AdAccountRow[])
    .map((account) => {
      const boundCompany = boundCompanyByAccountId.get(account.id);

      return {
        boundCompanyId: boundCompany?.id ?? null,
        boundCompanyName: boundCompany?.name ?? null,
        id: account.id,
        isActive: account.is_active,
        isBound: boundAccountIds.has(account.id),
        name: account.name || "Conta sem nome",
      };
    })
    .sort((left, right) => {
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1;
      }

      return left.name.localeCompare(right.name, "pt-BR");
    });

  const companies = companiesRows
    .map((company) => {
      const memberships = (membershipsByCompanyId.get(company.id) ?? []).sort((left, right) =>
        left.email.localeCompare(right.email, "pt-BR")
      );
      const products = (productsByCompanyId.get(company.id) ?? []).sort((left, right) => {
        if (left.isActive !== right.isActive) {
          return left.isActive ? -1 : 1;
        }

        return left.productName.localeCompare(right.productName, "pt-BR");
      });
      const adAccounts = (adAccountsByCompanyId.get(company.id) ?? []).sort((left, right) => {
        if (left.isActive !== right.isActive) {
          return left.isActive ? -1 : 1;
        }

        return left.adAccountName.localeCompare(right.adAccountName, "pt-BR");
      });

      return {
        activeAdAccountCount: adAccounts.filter((adAccount) => adAccount.isActive).length,
        activeProductCount: products.filter((product) => product.isActive).length,
        adAccounts,
        createdAt: company.created_at,
        id: company.id,
        memberCount: memberships.length,
        memberships,
        name: company.name,
        products,
        slug: company.slug,
        trackingEnabled: Boolean(company.tracking_enabled),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));

  return {
    availableAdAccounts,
    companies,
    users,
  };
}
