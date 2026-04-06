export type CompanyAiSettingsStatus = {
  companyId: string;
  hasApiKey: boolean;
  isEnabled: boolean;
  isConfigured: boolean;
  model: string | null;
  provider: string | null;
  updatedAt: string | null;
};

export type CompanyAiSettingsRecord = {
  apiKey: string | null;
  companyId: string;
  isEnabled: boolean;
  model: string;
  provider: string;
};
