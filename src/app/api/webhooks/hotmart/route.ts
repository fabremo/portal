import { NextResponse } from "next/server";

import { createServiceRoleSupabaseClient, hasServiceRoleSupabaseEnv } from "@/lib/supabase/service-role";

const webhookSecret = process.env.HOTMART_WEBHOOK_SECRET;
const APPROVED_EVENT = "PURCHASE_APPROVED";
const REFUNDED_EVENT = "PURCHASE_REFUNDED";
const CHARGEBACK_EVENT = "PURCHASE_CHARGEBACK";

type HotmartWebhookPayload = {
  hottok?: string;
  id?: string;
  event?: string;
  creation_date?: number;
  data?: {
    buyer?: {
      address?: {
        address?: string;
        city?: string;
        complement?: string;
        country?: string;
        country_iso?: string;
        neighborhood?: string;
        state?: string;
        zipcode?: string;
      };
      checkout_phone?: string;
      checkout_phone_code?: string;
      document?: string;
      document_type?: string;
      email?: string;
      first_name?: string;
      last_name?: string;
      name?: string;
    };
    product?: {
      id?: number;
      name?: string;
      ucode?: string;
      warranty_date?: string;
    };
    purchase?: {
      approved_date?: number;
      business_model?: string;
      checkout_country?: {
        iso?: string;
        name?: string;
      };
      full_price?: {
        currency_value?: string;
        value?: number;
      };
      invoice_by?: string;
      is_funnel?: boolean;
      offer?: {
        code?: string;
        name?: string;
      };
      order_bump?: {
        is_order_bump?: boolean;
      };
      order_date?: number;
      original_offer_price?: {
        currency_value?: string;
        value?: number;
      };
      origin?: {
        sck?: string;
        xcod?: string;
      };
      payment?: {
        installments_number?: number;
        type?: string;
      };
      price?: {
        currency_value?: string;
        value?: number;
      };
      status?: string;
      transaction?: string;
    };
  };
};

type WebhookLogInsert = {
  buyer_email: string | null;
  company_id: string | null;
  creation_date: string | null;
  event: string;
  payload: HotmartWebhookPayload;
  transaction: string | null;
  webhook_id: string;
};

type ContactUpsert = {
  address_complement: string | null;
  city: string | null;
  country: string | null;
  country_iso: string | null;
  document: string | null;
  document_type: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
  neighborhood: string | null;
  phone: string | null;
  phone_country_code: string | null;
  state: string | null;
  street_address: string | null;
  updated_at: string;
  zipcode: string | null;
};

type PurchaseUpsert = {
  approved_date: string | null;
  business_model: string | null;
  chargeback_date?: string | null;
  checkout_country_iso: string | null;
  checkout_country_name: string | null;
  company_id: string;
  contact_id: string;
  full_price_currency: string | null;
  full_price_value: number | null;
  hotmart_webhook_id: string;
  installments_number: number | null;
  invoice_by: string | null;
  is_funnel: boolean | null;
  is_order_bump: boolean | null;
  offer_code: string | null;
  offer_name: string | null;
  order_date: string | null;
  original_offer_price_currency: string | null;
  original_offer_price_value: number | null;
  payment_type: string | null;
  price_currency: string | null;
  price_value: number | null;
  product_id: number | null;
  product_name: string;
  product_ucode: string | null;
  refunded_date?: string | null;
  sck: string | null;
  status: string;
  transaction: string;
  warranty_date: string | null;
  xcod: string | null;
};

type RequiredPurchaseFields = {
  buyerEmail: string;
  productName: string;
  transaction: string;
};

type ResolvedCompany = {
  companyId: string;
  source: "product_id" | "product_ucode";
};

type PurchaseLifecycleRow = {
  company_id: string | null;
  transaction: string;
};

function isJsonRequest(contentType: string | null) {
  return typeof contentType === "string" && contentType.includes("application/json");
}

function normalizeString(value: string | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function normalizeNumber(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeEpochDate(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
}

function normalizeIsoDate(value: string | undefined) {
  const normalizedValue = normalizeString(value);

  if (!normalizedValue) {
    return null;
  }

  const parsedDate = new Date(normalizedValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
}

function buildWebhookLogInsert(payload: HotmartWebhookPayload, companyId: string | null): WebhookLogInsert | null {
  if (!payload.id || !payload.event) {
    return null;
  }

  return {
    buyer_email: normalizeString(payload.data?.buyer?.email),
    company_id: companyId,
    creation_date: normalizeEpochDate(payload.creation_date),
    event: payload.event,
    payload,
    transaction: normalizeString(payload.data?.purchase?.transaction),
    webhook_id: payload.id,
  };
}

function resolveContactName(payload: HotmartWebhookPayload, buyerEmail: string) {
  const buyer = payload.data?.buyer;
  const fullName = normalizeString(buyer?.name);

  if (fullName) {
    return fullName;
  }

  const firstName = normalizeString(buyer?.first_name);
  const lastName = normalizeString(buyer?.last_name);
  const composedName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return composedName || buyerEmail;
}

function getRequiredPurchaseFields(payload: HotmartWebhookPayload): RequiredPurchaseFields | null {
  const buyerEmail = normalizeString(payload.data?.buyer?.email);
  const transaction = normalizeString(payload.data?.purchase?.transaction);
  const productName = normalizeString(payload.data?.product?.name);

  if (!buyerEmail || !transaction || !productName) {
    return null;
  }

  return {
    buyerEmail,
    productName,
    transaction,
  };
}

function buildContactUpsert(payload: HotmartWebhookPayload, buyerEmail: string): ContactUpsert {
  const buyer = payload.data?.buyer;
  const address = buyer?.address;

  return {
    address_complement: normalizeString(address?.complement),
    city: normalizeString(address?.city),
    country: normalizeString(address?.country),
    country_iso: normalizeString(address?.country_iso),
    document: normalizeString(buyer?.document),
    document_type: normalizeString(buyer?.document_type),
    email: buyerEmail,
    first_name: normalizeString(buyer?.first_name),
    last_name: normalizeString(buyer?.last_name),
    name: resolveContactName(payload, buyerEmail),
    neighborhood: normalizeString(address?.neighborhood),
    phone: normalizeString(buyer?.checkout_phone),
    phone_country_code: normalizeString(buyer?.checkout_phone_code),
    state: normalizeString(address?.state),
    street_address: normalizeString(address?.address),
    updated_at: new Date().toISOString(),
    zipcode: normalizeString(address?.zipcode),
  };
}

function buildPurchaseUpsert(
  payload: HotmartWebhookPayload,
  companyId: string,
  contactId: string,
  webhookId: string,
  requiredFields: RequiredPurchaseFields
): PurchaseUpsert {
  const product = payload.data?.product;
  const purchase = payload.data?.purchase;

  return {
    approved_date: normalizeEpochDate(purchase?.approved_date),
    business_model: normalizeString(purchase?.business_model),
    checkout_country_iso: normalizeString(purchase?.checkout_country?.iso),
    checkout_country_name: normalizeString(purchase?.checkout_country?.name),
    company_id: companyId,
    contact_id: contactId,
    full_price_currency: normalizeString(purchase?.full_price?.currency_value),
    full_price_value: normalizeNumber(purchase?.full_price?.value),
    hotmart_webhook_id: webhookId,
    installments_number: normalizeNumber(purchase?.payment?.installments_number),
    invoice_by: normalizeString(purchase?.invoice_by),
    is_funnel: typeof purchase?.is_funnel === "boolean" ? purchase.is_funnel : null,
    is_order_bump:
      typeof purchase?.order_bump?.is_order_bump === "boolean"
        ? purchase.order_bump.is_order_bump
        : null,
    offer_code: normalizeString(purchase?.offer?.code),
    offer_name: normalizeString(purchase?.offer?.name),
    order_date: normalizeEpochDate(purchase?.order_date),
    original_offer_price_currency: normalizeString(purchase?.original_offer_price?.currency_value),
    original_offer_price_value: normalizeNumber(purchase?.original_offer_price?.value),
    payment_type: normalizeString(purchase?.payment?.type),
    price_currency: normalizeString(purchase?.price?.currency_value),
    price_value: normalizeNumber(purchase?.price?.value),
    product_id: normalizeNumber(product?.id),
    product_name: requiredFields.productName,
    product_ucode: normalizeString(product?.ucode),
    sck: normalizeString(purchase?.origin?.sck),
    status: normalizeString(purchase?.status) ?? "APPROVED",
    transaction: requiredFields.transaction,
    warranty_date: normalizeIsoDate(product?.warranty_date),
    xcod: normalizeString(purchase?.origin?.xcod),
  };
}

async function resolveCompanyFromProduct(payload: HotmartWebhookPayload): Promise<ResolvedCompany | null> {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  const hotmartProductId = normalizeNumber(payload.data?.product?.id);

  if (hotmartProductId !== null) {
    const { data, error } = await supabase
      .from("company_products")
      .select("company_id")
      .eq("hotmart_product_id", hotmartProductId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw new Error("Não foi possível resolver a empresa pelo ID do produto Hotmart.");
    }

    if (data?.company_id) {
      return {
        companyId: data.company_id as string,
        source: "product_id",
      };
    }
  }

  const hotmartProductUcode = normalizeString(payload.data?.product?.ucode);

  if (hotmartProductUcode) {
    const { data, error } = await supabase
      .from("company_products")
      .select("company_id")
      .eq("hotmart_product_ucode", hotmartProductUcode)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw new Error("Não foi possível resolver a empresa pelo ucode do produto Hotmart.");
    }

    if (data?.company_id) {
      return {
        companyId: data.company_id as string,
        source: "product_ucode",
      };
    }
  }

  return null;
}

async function setWebhookProcessingState(
  webhookId: string,
  updates: { processed: boolean; processing_error: string | null }
) {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    return;
  }

  await supabase.from("webhook_logs").update(updates).eq("webhook_id", webhookId);
}

async function upsertContact(payload: HotmartWebhookPayload, buyerEmail: string) {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  const { data, error } = await supabase
    .from("contacts")
    .upsert(buildContactUpsert(payload, buyerEmail), { onConflict: "email" })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error("Não foi possível salvar o contato.");
  }

  return data.id as string;
}

async function upsertCompanyContact(companyId: string, contactId: string) {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  const { error } = await supabase.from("company_contacts").upsert(
    {
      company_id: companyId,
      contact_id: contactId,
    },
    {
      onConflict: "company_id,contact_id",
    }
  );

  if (error) {
    throw new Error("Não foi possível vincular o contato à empresa.");
  }
}

async function upsertPurchase(
  payload: HotmartWebhookPayload,
  companyId: string,
  contactId: string,
  webhookId: string,
  requiredFields: RequiredPurchaseFields
) {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  const { error } = await supabase
    .from("purchases")
    .upsert(buildPurchaseUpsert(payload, companyId, contactId, webhookId, requiredFields), {
      onConflict: "transaction",
    });

  if (error) {
    throw new Error("Não foi possível salvar a compra.");
  }
}

async function processApprovedPurchase(payload: HotmartWebhookPayload, webhookId: string, companyId: string | null) {
  if (!companyId) {
    throw new Error("Produto Hotmart não cadastrado ou inativo. Não foi possível identificar a empresa da compra.");
  }

  const requiredFields = getRequiredPurchaseFields(payload);

  if (!requiredFields) {
    throw new Error("Webhook aprovado sem e-mail, transação ou nome do produto.");
  }

  const contactId = await upsertContact(payload, requiredFields.buyerEmail);
  await upsertCompanyContact(companyId, contactId);
  await upsertPurchase(payload, companyId, contactId, webhookId, requiredFields);
}

async function updatePurchaseLifecycleEvent(
  payload: HotmartWebhookPayload,
  webhookId: string,
  event: typeof REFUNDED_EVENT | typeof CHARGEBACK_EVENT,
  resolvedCompanyId: string | null
) {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  const transaction = normalizeString(payload.data?.purchase?.transaction);

  if (!transaction) {
    throw new Error("Webhook sem transação para atualizar a compra.");
  }

  const eventDate = normalizeEpochDate(payload.creation_date);

  if (!eventDate) {
    throw new Error("Webhook sem creation_date válido para atualizar a compra.");
  }

  const nextStatus =
    normalizeString(payload.data?.purchase?.status) ??
    (event === REFUNDED_EVENT ? "REFUNDED" : "CHARGEBACK");

  const existingPurchaseResponse = await supabase
    .from("purchases")
    .select("transaction, company_id")
    .eq("transaction", transaction)
    .maybeSingle();

  if (existingPurchaseResponse.error) {
    throw new Error("Não foi possível localizar a compra para atualizar o evento recebido.");
  }

  const existingPurchase = existingPurchaseResponse.data as PurchaseLifecycleRow | null;

  if (!existingPurchase?.transaction) {
    throw new Error("Compra não encontrada para atualizar o evento recebido.");
  }

  const nextCompanyId = existingPurchase.company_id ?? resolvedCompanyId;
  const updatePayload =
    event === REFUNDED_EVENT
      ? {
          company_id: nextCompanyId,
          hotmart_webhook_id: webhookId,
          refunded_date: eventDate,
          status: nextStatus,
        }
      : {
          chargeback_date: eventDate,
          company_id: nextCompanyId,
          hotmart_webhook_id: webhookId,
          status: nextStatus,
        };

  const { error } = await supabase.from("purchases").update(updatePayload).eq("transaction", transaction);

  if (error) {
    throw new Error("Não foi possível atualizar a compra.");
  }

  if (nextCompanyId) {
    await supabase.from("webhook_logs").update({ company_id: nextCompanyId }).eq("webhook_id", webhookId);
  }
}

export async function POST(request: Request) {
  if (!isJsonRequest(request.headers.get("content-type"))) {
    return NextResponse.json({ message: "Payload JSON inválido." }, { status: 400 });
  }

  let payload: HotmartWebhookPayload;

  try {
    payload = (await request.json()) as HotmartWebhookPayload;
  } catch {
    return NextResponse.json({ message: "Payload JSON inválido." }, { status: 400 });
  }

  const requestSecret =
    request.headers.get("hottok") ??
    request.headers.get("x-webhook-secret") ??
    normalizeString(payload.hottok);

  if (!webhookSecret || requestSecret !== webhookSecret) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  if (!hasServiceRoleSupabaseEnv) {
    return NextResponse.json({ message: "Configuração do Supabase incompleta." }, { status: 500 });
  }

  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ message: "Configuração do Supabase incompleta." }, { status: 500 });
  }

  let resolvedCompany: ResolvedCompany | null = null;

  try {
    resolvedCompany = await resolveCompanyFromProduct(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao resolver a empresa pelo produto Hotmart.";

    return NextResponse.json({ message }, { status: 500 });
  }

  const insertData = buildWebhookLogInsert(payload, resolvedCompany?.companyId ?? null);

  if (!insertData) {
    return NextResponse.json({ message: "Campos obrigatórios ausentes." }, { status: 400 });
  }

  const { error } = await supabase.from("webhook_logs").insert(insertData);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ message: "Webhook já registrado." }, { status: 200 });
    }

    return NextResponse.json({ message: "Erro ao registrar webhook." }, { status: 500 });
  }

  try {
    if (insertData.event === APPROVED_EVENT) {
      await processApprovedPurchase(payload, insertData.webhook_id, resolvedCompany?.companyId ?? null);
    } else if (insertData.event === REFUNDED_EVENT || insertData.event === CHARGEBACK_EVENT) {
      await updatePurchaseLifecycleEvent(
        payload,
        insertData.webhook_id,
        insertData.event,
        resolvedCompany?.companyId ?? null
      );
    } else {
      return NextResponse.json({ message: "Webhook registrado com sucesso." }, { status: 201 });
    }

    await setWebhookProcessingState(insertData.webhook_id, {
      processed: true,
      processing_error: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao processar webhook.";

    await setWebhookProcessingState(insertData.webhook_id, {
      processed: false,
      processing_error: message,
    });

    return NextResponse.json({ message }, { status: 500 });
  }

  return NextResponse.json({ message: "Webhook registrado e compra processada com sucesso." }, { status: 201 });
}

