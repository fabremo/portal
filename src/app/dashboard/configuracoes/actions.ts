"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDashboardAccessContext } from "@/lib/dashboard/access";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

const SETTINGS_PATH = "/dashboard/configuracoes";
const UNIQUE_VIOLATION_ERROR_CODE = "23505";

type RedirectState = {
  companyId?: string;
  message: string;
  status: "error" | "success";
};

function normalizeCompanySlug(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function redirectToSettings({ companyId, message, status }: RedirectState): never {
  const searchParams = new URLSearchParams();

  if (companyId) {
    searchParams.set("company", companyId);
  }

  searchParams.set("message", message);
  searchParams.set("status", status);

  redirect(`${SETTINGS_PATH}?${searchParams.toString()}`);
}

async function ensureAdminAccess() {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext) {
    redirect("/login");
  }

  if (!accessContext.isAdmin) {
    redirect("/dashboard");
  }

  return accessContext;
}

async function ensureServiceRoleClient() {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  return supabase;
}

function getTrimmedString(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value.trim() : "";
}

function getSelectedUserIds(formData: FormData) {
  return formData
    .getAll("userIds")
    .map((value) => (typeof value === "string" ? value : ""))
    .filter(Boolean);
}

function parseRequiredHotmartProductId(value: string) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || !Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function isChecked(formData: FormData, fieldName: string) {
  return formData.get(fieldName) === "1";
}

async function ensureUniqueSlug(slug: string, currentCompanyId?: string) {
  const supabase = await ensureServiceRoleClient();
  const { data, error } = await supabase.from("companies").select("id").eq("slug", slug).maybeSingle();

  if (error) {
    throw new Error("Não foi possível validar o slug informado.");
  }

  if (data && data.id !== currentCompanyId) {
    return false;
  }

  return true;
}

async function ensureCompanyExists(companyId: string) {
  const supabase = await ensureServiceRoleClient();
  const { data, error } = await supabase.from("companies").select("id").eq("id", companyId).maybeSingle();

  if (error) {
    throw new Error("Não foi possível validar a empresa selecionada.");
  }

  return Boolean(data?.id);
}

async function ensureUniqueHotmartProductId(hotmartProductId: number, currentProductId?: string) {
  const supabase = await ensureServiceRoleClient();
  const { data, error } = await supabase
    .from("company_products")
    .select("id")
    .eq("hotmart_product_id", hotmartProductId)
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível validar o ID do produto Hotmart.");
  }

  if (data && data.id !== currentProductId) {
    return false;
  }

  return true;
}

async function validateSelectedUsers(userIds: string[]) {
  if (!userIds.length) {
    return [];
  }

  const supabase = await ensureServiceRoleClient();
  const uniqueUserIds = [...new Set(userIds)];
  const { data, error } = await supabase.from("profiles").select("id").in("id", uniqueUserIds);

  if (error) {
    throw new Error("Não foi possível validar os usuários selecionados.");
  }

  const validUserIds = new Set((data ?? []).map((profile) => profile.id));

  if (validUserIds.size !== uniqueUserIds.length) {
    throw new Error("Há usuários inválidos na seleção informada.");
  }

  return uniqueUserIds;
}

export async function createCompanyAction(formData: FormData) {
  await ensureAdminAccess();

  const name = getTrimmedString(formData, "name");
  const rawSlug = getTrimmedString(formData, "slug");
  const slug = normalizeCompanySlug(rawSlug);

  if (!name) {
    redirectToSettings({
      message: "Informe o nome da empresa antes de salvar.",
      status: "error",
    });
  }

  if (!slug) {
    redirectToSettings({
      message: "Informe um slug válido para a empresa.",
      status: "error",
    });
  }

  const isUniqueSlug = await ensureUniqueSlug(slug);

  if (!isUniqueSlug) {
    redirectToSettings({
      message: "Este slug já está em uso por outra empresa.",
      status: "error",
    });
  }

  const supabase = await ensureServiceRoleClient();
  const { data, error } = await supabase.from("companies").insert({ name, slug }).select("id").single();

  if (error?.code === UNIQUE_VIOLATION_ERROR_CODE) {
    redirectToSettings({
      message: "Este slug já está em uso por outra empresa.",
      status: "error",
    });
  }

  if (error || !data) {
    redirectToSettings({
      message: "Não foi possível cadastrar a empresa.",
      status: "error",
    });
  }

  revalidatePath(SETTINGS_PATH);
  redirectToSettings({
    companyId: data.id,
    message: "Empresa cadastrada com sucesso.",
    status: "success",
  });
}

export async function updateCompanyAction(formData: FormData) {
  await ensureAdminAccess();

  const companyId = getTrimmedString(formData, "companyId");
  const name = getTrimmedString(formData, "name");
  const rawSlug = getTrimmedString(formData, "slug");
  const slug = normalizeCompanySlug(rawSlug);
  const requestedUserIds = getSelectedUserIds(formData);

  if (!companyId) {
    redirectToSettings({
      message: "Selecione uma empresa antes de salvar.",
      status: "error",
    });
  }

  if (!name) {
    redirectToSettings({
      companyId,
      message: "Informe o nome da empresa antes de salvar.",
      status: "error",
    });
  }

  if (!slug) {
    redirectToSettings({
      companyId,
      message: "Informe um slug válido para a empresa.",
      status: "error",
    });
  }

  const isUniqueSlug = await ensureUniqueSlug(slug, companyId);

  if (!isUniqueSlug) {
    redirectToSettings({
      companyId,
      message: "Este slug já está em uso por outra empresa.",
      status: "error",
    });
  }

  const userIds = await validateSelectedUsers(requestedUserIds);
  const supabase = await ensureServiceRoleClient();

  const { error: updateError } = await supabase.from("companies").update({ name, slug }).eq("id", companyId);

  if (updateError?.code === UNIQUE_VIOLATION_ERROR_CODE) {
    redirectToSettings({
      companyId,
      message: "Este slug já está em uso por outra empresa.",
      status: "error",
    });
  }

  if (updateError) {
    redirectToSettings({
      companyId,
      message: "Não foi possível atualizar a empresa.",
      status: "error",
    });
  }

  const { error: deleteError } = await supabase.from("user_companies").delete().eq("company_id", companyId);

  if (deleteError) {
    redirectToSettings({
      companyId,
      message: "A empresa foi atualizada, mas houve erro ao limpar os vínculos anteriores.",
      status: "error",
    });
  }

  if (userIds.length) {
    const { error: insertError } = await supabase.from("user_companies").insert(
      userIds.map((userId) => ({
        company_id: companyId,
        user_id: userId,
      }))
    );

    if (insertError?.code === UNIQUE_VIOLATION_ERROR_CODE) {
      redirectToSettings({
        companyId,
        message: "Há usuários duplicados na seleção enviada.",
        status: "error",
      });
    }

    if (insertError) {
      redirectToSettings({
        companyId,
        message: "A empresa foi atualizada, mas houve erro ao salvar os vínculos.",
        status: "error",
      });
    }
  }

  revalidatePath(SETTINGS_PATH);
  redirectToSettings({
    companyId,
    message: "Empresa atualizada com sucesso.",
    status: "success",
  });
}

export async function createCompanyProductAction(formData: FormData) {
  await ensureAdminAccess();

  const companyId = getTrimmedString(formData, "companyId");
  const productName = getTrimmedString(formData, "productName");
  const hotmartProductUcode = getTrimmedString(formData, "hotmartProductUcode") || null;
  const hotmartProductId = parseRequiredHotmartProductId(getTrimmedString(formData, "hotmartProductId"));
  const isActive = isChecked(formData, "isActive");

  if (!companyId) {
    redirectToSettings({
      message: "Selecione uma empresa para cadastrar o produto.",
      status: "error",
    });
  }

  const companyExists = await ensureCompanyExists(companyId);

  if (!companyExists) {
    redirectToSettings({
      message: "A empresa selecionada não foi encontrada.",
      status: "error",
    });
  }

  if (!productName) {
    redirectToSettings({
      companyId,
      message: "Informe o nome do produto antes de salvar.",
      status: "error",
    });
  }

  if (hotmartProductId === null) {
    redirectToSettings({
      companyId,
      message: "Informe um ID de produto Hotmart válido.",
      status: "error",
    });
  }

  const isUniqueHotmartId = await ensureUniqueHotmartProductId(hotmartProductId);

  if (!isUniqueHotmartId) {
    redirectToSettings({
      companyId,
      message: "Este ID de produto Hotmart já está vinculado a outra empresa.",
      status: "error",
    });
  }

  const supabase = await ensureServiceRoleClient();
  const { error } = await supabase.from("company_products").insert({
    company_id: companyId,
    hotmart_product_id: hotmartProductId,
    hotmart_product_ucode: hotmartProductUcode,
    is_active: isActive,
    product_name: productName,
  });

  if (error?.code === UNIQUE_VIOLATION_ERROR_CODE) {
    redirectToSettings({
      companyId,
      message: "Este ID de produto Hotmart já está vinculado a outra empresa.",
      status: "error",
    });
  }

  if (error) {
    redirectToSettings({
      companyId,
      message: "Não foi possível cadastrar o produto Hotmart.",
      status: "error",
    });
  }

  revalidatePath(SETTINGS_PATH);
  redirectToSettings({
    companyId,
    message: "Produto Hotmart cadastrado com sucesso.",
    status: "success",
  });
}

export async function updateCompanyProductAction(formData: FormData) {
  await ensureAdminAccess();

  const productId = getTrimmedString(formData, "productId");
  const companyId = getTrimmedString(formData, "companyId");
  const productName = getTrimmedString(formData, "productName");
  const hotmartProductUcode = getTrimmedString(formData, "hotmartProductUcode") || null;
  const hotmartProductId = parseRequiredHotmartProductId(getTrimmedString(formData, "hotmartProductId"));
  const isActive = isChecked(formData, "isActive");

  if (!productId) {
    redirectToSettings({
      companyId,
      message: "Selecione um produto válido antes de salvar.",
      status: "error",
    });
  }

  if (!companyId) {
    redirectToSettings({
      message: "Selecione uma empresa para o produto.",
      status: "error",
    });
  }

  const companyExists = await ensureCompanyExists(companyId);

  if (!companyExists) {
    redirectToSettings({
      message: "A empresa selecionada não foi encontrada.",
      status: "error",
    });
  }

  if (!productName) {
    redirectToSettings({
      companyId,
      message: "Informe o nome do produto antes de salvar.",
      status: "error",
    });
  }

  if (hotmartProductId === null) {
    redirectToSettings({
      companyId,
      message: "Informe um ID de produto Hotmart válido.",
      status: "error",
    });
  }

  const isUniqueHotmartId = await ensureUniqueHotmartProductId(hotmartProductId, productId);

  if (!isUniqueHotmartId) {
    redirectToSettings({
      companyId,
      message: "Este ID de produto Hotmart já está vinculado a outra empresa.",
      status: "error",
    });
  }

  const supabase = await ensureServiceRoleClient();
  const { error } = await supabase
    .from("company_products")
    .update({
      company_id: companyId,
      hotmart_product_id: hotmartProductId,
      hotmart_product_ucode: hotmartProductUcode,
      is_active: isActive,
      product_name: productName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error?.code === UNIQUE_VIOLATION_ERROR_CODE) {
    redirectToSettings({
      companyId,
      message: "Este ID de produto Hotmart já está vinculado a outra empresa.",
      status: "error",
    });
  }

  if (error) {
    redirectToSettings({
      companyId,
      message: "Não foi possível atualizar o produto Hotmart.",
      status: "error",
    });
  }

  revalidatePath(SETTINGS_PATH);
  redirectToSettings({
    companyId,
    message: "Produto Hotmart atualizado com sucesso.",
    status: "success",
  });
}

export async function toggleCompanyProductActiveAction(formData: FormData) {
  await ensureAdminAccess();

  const productId = getTrimmedString(formData, "productId");
  const companyId = getTrimmedString(formData, "companyId");
  const nextIsActive = getTrimmedString(formData, "nextIsActive") === "true";

  if (!productId) {
    redirectToSettings({
      companyId,
      message: "Selecione um produto válido antes de alterar o status.",
      status: "error",
    });
  }

  const supabase = await ensureServiceRoleClient();
  const { error } = await supabase
    .from("company_products")
    .update({
      is_active: nextIsActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error) {
    redirectToSettings({
      companyId,
      message: "Não foi possível atualizar o status do produto Hotmart.",
      status: "error",
    });
  }

  revalidatePath(SETTINGS_PATH);
  redirectToSettings({
    companyId,
    message: nextIsActive
      ? "Produto Hotmart reativado com sucesso."
      : "Produto Hotmart desativado com sucesso.",
    status: "success",
  });
}
