import "server-only";

const META_GRAPH_VERSION = "v25.0";
const META_BUSINESS_ID = "196217288123195";

type MetaAdAccountResponse = {
  account_status: number;
  disable_reason?: number | null;
  id: string;
  name: string;
};

type MetaGraphErrorResponse = {
  error?: {
    code?: number;
    message?: string;
    type?: string;
  };
};

export type FacebookAccountStatus = {
  accountId: string;
  accountName: string;
  disableReasonText: string | null;
  lastCheckedAt: string;
  rawStatusCode: number | null;
  statusLabel: string;
  statusTone: "success" | "warning" | "danger" | "neutral";
};

function mapAccountStatus(accountStatus: number | null): Pick<
  FacebookAccountStatus,
  "statusLabel" | "statusTone"
> {
  switch (accountStatus) {
    case 1:
      return { statusLabel: "Ativa", statusTone: "success" };
    case 2:
    case 101:
      return { statusLabel: "Desativada", statusTone: "danger" };
    case 3:
    case 7:
    case 8:
    case 9:
    case 100:
      return { statusLabel: "Com restrição", statusTone: "warning" };
    case null:
      return { statusLabel: "Indisponível", statusTone: "neutral" };
    default:
      return { statusLabel: "Status não mapeado", statusTone: "neutral" };
  }
}

function mapDisableReason(disableReason?: number | null) {
  switch (disableReason) {
    case null:
    case undefined:
    case 0:
      return null;
    case 1:
      return "Restrição aplicada pela Meta por política ou integridade da conta.";
    case 2:
      return "A conta exige regularização de cobrança ou limite financeiro.";
    case 3:
      return "A conta precisa de revisão administrativa para voltar a operar.";
    case 4:
      return "A conta está em análise ou com limitação operacional temporária.";
    default:
      return `Motivo informado pela Meta (código ${disableReason}).`;
  }
}

function createUnavailableStatus(
  adAccountId: string,
  statusLabel: FacebookAccountStatus["statusLabel"]
) {
  return {
    accountId: adAccountId,
    accountName: "Conta não disponível",
    disableReasonText: null,
    lastCheckedAt: new Date().toISOString(),
    rawStatusCode: null,
    statusLabel,
    statusTone: "neutral",
  } satisfies FacebookAccountStatus;
}

export async function getFacebookAccountStatus(adAccountId: string): Promise<FacebookAccountStatus> {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!accessToken) {
    return createUnavailableStatus(adAccountId, "Não configurado");
  }

  const params = new URLSearchParams({
    access_token: accessToken,
    fields: "id,name,account_status,disable_reason",
  });

  try {
    const response = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${adAccountId}?${params.toString()}`,
      {
        cache: "no-store",
      }
    );

    const payload = (await response.json()) as MetaAdAccountResponse & MetaGraphErrorResponse;

    if (!response.ok || payload.error) {
      return createUnavailableStatus(adAccountId, "Indisponível");
    }

    const mappedStatus = mapAccountStatus(payload.account_status ?? null);

    return {
      accountId: payload.id || adAccountId,
      accountName: payload.name || "Conta sem nome",
      disableReasonText: mapDisableReason(payload.disable_reason),
      lastCheckedAt: new Date().toISOString(),
      rawStatusCode: payload.account_status ?? null,
      statusLabel: mappedStatus.statusLabel,
      statusTone: mappedStatus.statusTone,
    };
  } catch {
    return createUnavailableStatus(adAccountId, "Indisponível");
  }
}

export const facebookAccountReference = {
  businessId: META_BUSINESS_ID,
};
