import "server-only";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

type CompanyRow = {
  created_at: string;
  id: string;
  name: string;
  slug: string;
};

type CompanyMembershipRow = {
  company_id: string;
  user_id: string;
};

type CompanyProductRow = {
  company_id: string;
  created_at: string;
  hotmart_product_id: number;
  hotmart_product_ucode: string | null;
  id: string;
  is_active: boolean;
  product_name: string;
  updated_at: string;
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
  createdAt: string;
  hotmartProductId: number;
  hotmartProductUcode: string | null;
  id: string;
  isActive: boolean;
  productName: string;
  updatedAt: string;
};

export type CompanySettingsCompany = {
  activeProductCount: number;
  createdAt: string;
  id: string;
  memberCount: number;
  memberships: CompanyMembership[];
  name: string;
  products: CompanySettingsProduct[];
  slug: string;
};

export type CompanySettingsData = {
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

  const [companiesResponse, membershipsResponse, productsResponse, profilesResponse, authUsers] = await Promise.all([
    supabase.from("companies").select("id, name, slug, created_at").order("name", { ascending: true }),
    supabase.from("user_companies").select("company_id, user_id"),
    supabase
      .from("company_products")
      .select(
        "id, company_id, hotmart_product_id, hotmart_product_ucode, product_name, is_active, created_at, updated_at"
      )
      .order("product_name", { ascending: true }),
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

  if (profilesResponse.error) {
    throw new Error("Não foi possível carregar os perfis de usuário.");
  }

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
      createdAt: product.created_at,
      hotmartProductId: product.hotmart_product_id,
      hotmartProductUcode: product.hotmart_product_ucode,
      id: product.id,
      isActive: product.is_active,
      productName: product.product_name,
      updatedAt: product.updated_at,
    });

    productsByCompanyId.set(product.company_id, companyProducts);
  }

  const companies = ((companiesResponse.data ?? []) as CompanyRow[])
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

      return {
        activeProductCount: products.filter((product) => product.isActive).length,
        createdAt: company.created_at,
        id: company.id,
        memberCount: memberships.length,
        memberships,
        name: company.name,
        products,
        slug: company.slug,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));

  return {
    companies,
    users,
  };
}
