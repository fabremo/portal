export type CompanyAiSettingsStatus = {
  companyId: string;
  hasApiKey: boolean;
  isConfigured: boolean;
  model: string | null;
  provider: string | null;
  updatedAt: string | null;
};

export type CompanyAiSettingsRecord = {
  apiKey: string;
  companyId: string;
  model: string;
  provider: string;
};