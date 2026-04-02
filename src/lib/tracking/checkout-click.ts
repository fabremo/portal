import "server-only";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export type CheckoutClickTrackingPayload = {
  _fbc?: string | null;
  _fbp?: string | null;
  clicked_at?: string | null;
  company_slug?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  language?: string | null;
  page_url?: string | null;
  referrer?: string | null;
  timezone?: string | null;
  user_agent?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_medium?: string | null;
  utm_source?: string | null;
  utm_term?: string | null;
  xcod?: string | null;
};

export type CheckoutClickTrackingRow = {
  _fbc: string | null;
  _fbp: string | null;
  clicked_at: string;
  created_at: string;
  fbclid: string | null;
  gclid: string | null;
  id: string;
  language: string | null;
  page_url: string | null;
  referrer: string | null;
  timezone: string | null;
  user_agent: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_medium: string | null;
  utm_source: string | null;
  utm_term: string | null;
  xcod: string | null;
};

type TrackingCompanyRow = {
  id: string;
  name: string;
  slug: string;
  tracking_enabled: boolean | null;
};

export type ResolvedTrackingCompany = {
  companyId: string;
  companyName: string;
  companySlug: string;
  trackingEnabled: boolean;
};

export type CheckoutClickTrackingInsert = {
  _fbc: string | null;
  _fbp: string | null;
  clicked_at: string;
  company_id: string;
  fbclid: string | null;
  gclid: string | null;
  ip: string | null;
  language: string | null;
  page_url: string | null;
  referrer: string | null;
  timezone: string | null;
  user_agent: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_medium: string | null;
  utm_source: string | null;
  utm_term: string | null;
  xcod: string | null;
};

function normalizeString(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function normalizeClickedAt(value: string | null | undefined) {
  const normalizedValue = normalizeString(value);

  if (!normalizedValue) {
    return new Date().toISOString();
  }

  const parsedDate = new Date(normalizedValue);
  return Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
}

export async function resolveTrackingCompanyBySlug(companySlug: string) {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  const { data, error } = await supabase
    .from("companies")
    .select("id, name, slug, tracking_enabled")
    .eq("slug", companySlug)
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível localizar a empresa do tracking.");
  }

  const company = data as TrackingCompanyRow | null;

  if (!company?.id) {
    return null;
  }

  return {
    companyId: company.id,
    companyName: company.name,
    companySlug: company.slug,
    trackingEnabled: Boolean(company.tracking_enabled),
  } satisfies ResolvedTrackingCompany;
}

export function buildCheckoutClickTrackingInsert(
  payload: CheckoutClickTrackingPayload,
  companyId: string,
  requestUserAgent?: string | null
): CheckoutClickTrackingInsert {
  return {
    _fbc: normalizeString(payload._fbc),
    _fbp: normalizeString(payload._fbp),
    clicked_at: normalizeClickedAt(payload.clicked_at),
    company_id: companyId,
    fbclid: normalizeString(payload.fbclid),
    gclid: normalizeString(payload.gclid),
    ip: null,
    language: normalizeString(payload.language),
    page_url: normalizeString(payload.page_url),
    referrer: normalizeString(payload.referrer),
    timezone: normalizeString(payload.timezone),
    user_agent: normalizeString(payload.user_agent) ?? normalizeString(requestUserAgent),
    utm_campaign: normalizeString(payload.utm_campaign),
    utm_content: normalizeString(payload.utm_content),
    utm_medium: normalizeString(payload.utm_medium),
    utm_source: normalizeString(payload.utm_source),
    utm_term: normalizeString(payload.utm_term),
    xcod: normalizeString(payload.xcod),
  };
}

export async function insertCheckoutClickTracking(insertData: CheckoutClickTrackingInsert) {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  const query = insertData.xcod
    ? supabase.from("checkout_click_tracking").upsert(insertData, {
        onConflict: "company_id,xcod",
      })
    : supabase.from("checkout_click_tracking").insert(insertData);

  const { error } = await query;

  if (error) {
    throw new Error(
      `Não foi possível registrar o tracking de checkout. code=${error.code ?? "unknown"} message=${error.message}`
    );
  }
}

export async function listCheckoutClickTracking(companyId: string, limit = 50) {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  const { data, error } = await supabase
    .from("checkout_click_tracking")
    .select(
      "id, xcod, utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, gclid, _fbp, _fbc, user_agent, language, timezone, page_url, referrer, clicked_at, created_at"
    )
    .eq("company_id", companyId)
    .order("clicked_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error("Não foi possível carregar os registros de tracking.");
  }

  return (data ?? []) as CheckoutClickTrackingRow[];
}

export function buildElementorTrackingSnippet(companySlug: string, endpointUrl: string) {
  return `(function () {
  const endpoint = "${endpointUrl}";
  const companySlug = "${companySlug}";
  const checkoutSelector = 'a[href*="hotmart.com"], a[href*="pay.hotmart.com"]';

  function readCookie(name) {
    const prefix = name + "=";
    const parts = document.cookie.split(";");

    for (let index = 0; index < parts.length; index += 1) {
      const cookie = parts[index].trim();

      if (cookie.startsWith(prefix)) {
        return decodeURIComponent(cookie.slice(prefix.length));
      }
    }

    return null;
  }

  function readParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function buildPayload() {
    return {
      company_slug: companySlug,
      xcod: sessionStorage.getItem("user_id_mh"),
      utm_source: readParam("utm_source"),
      utm_medium: readParam("utm_medium"),
      utm_campaign: readParam("utm_campaign"),
      utm_content: readParam("utm_content"),
      utm_term: readParam("utm_term"),
      fbclid: readParam("fbclid"),
      gclid: readParam("gclid"),
      _fbp: readCookie("_fbp"),
      _fbc: readCookie("_fbc"),
      user_agent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      page_url: window.location.href,
      referrer: document.referrer || null,
      clicked_at: new Date().toISOString(),
    };
  }

  function sendTracking() {
    const body = JSON.stringify(buildPayload());

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const sent = navigator.sendBeacon(endpoint, blob);

      if (sent) {
        return;
      }
    }

    fetch(endpoint, {
      method: "POST",
      mode: "cors",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
      },
      body,
    }).catch(function () {
      return null;
    });
  }

  document.addEventListener(
    "click",
    function (event) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const checkoutLink = target.closest(checkoutSelector);

      if (!checkoutLink) {
        return;
      }

      sendTracking();
    },
    true
  );
})();`;
}
