create table public.webhook_logs (
  id uuid primary key default gen_random_uuid(),

  webhook_id text not null unique,
  event text not null,
  creation_date timestamptz,

  transaction text,
  buyer_email text,

  payload jsonb not null,

  processed boolean not null default false,
  processing_attempts integer not null default 0,
  processing_error text,
  first_failure_stage text,
  first_processing_error text,
  initial_processing_duration_ms integer,
  initial_response_status_code integer,
  last_processing_attempt_at timestamptz,
  last_processing_success_at timestamptz,
  last_reprocessing_result text,
  last_reprocessing_error text,

  created_at timestamptz not null default now()
);

create index idx_webhook_logs_event
  on public.webhook_logs (event);

create index idx_webhook_logs_transaction
  on public.webhook_logs (transaction);

create index idx_webhook_logs_buyer_email
  on public.webhook_logs (buyer_email);

create index idx_webhook_logs_created_at
  on public.webhook_logs (created_at desc);

  -----------------------------

  create table public.contacts (
  id uuid primary key default gen_random_uuid(),

  email text not null unique,
  name text not null,
  first_name text,
  last_name text,

  phone text,
  phone_country_code text,

  document text,
  document_type text,

  street_address text,
  address_complement text,
  neighborhood text,
  city text,
  state text,
  zipcode text,
  country text,
  country_iso text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_contacts_document
  on public.contacts (document);

create index idx_contacts_name
  on public.contacts (name);

create index idx_contacts_created_at
  on public.contacts (created_at desc);

  -----------------

  create table public.purchases (
  id uuid primary key default gen_random_uuid(),

  contact_id uuid not null references public.contacts(id),

  transaction text not null unique,
  status text not null,

  product_id bigint,
  product_ucode text,
  product_name text not null,

  offer_code text,
  offer_name text,

  price_value numeric(12,2),
  price_currency text,

  full_price_value numeric(12,2),
  full_price_currency text,

  original_offer_price_value numeric(12,2),
  original_offer_price_currency text,

  payment_type text,
  installments_number integer,

  order_date timestamptz,
  approved_date timestamptz,
  warranty_date timestamptz,

  checkout_country_name text,
  checkout_country_iso text,

  xcod text,
  sck text,

  invoice_by text,
  business_model text,
  is_funnel boolean,
  is_order_bump boolean,

  hotmart_webhook_id text,

  created_at timestamptz not null default now()
);

create index idx_purchases_contact_id
  on public.purchases (contact_id);

create index idx_purchases_product_name
  on public.purchases (product_name);

create index idx_purchases_approved_date
  on public.purchases (approved_date desc);

create index idx_purchases_xcod
  on public.purchases (xcod);

create index idx_purchases_sck
  on public.purchases (sck);

alter table public.webhook_logs enable row level security;
alter table public.contacts enable row level security;
alter table public.purchases enable row level security;

alter table public.purchases
add column refunded_date timestamptz,
add column chargeback_date timestamptz;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.user_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create index idx_user_companies_company_id
  on public.user_companies (company_id);

create table public.company_products (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null references public.companies(id) on delete cascade,

  hotmart_product_id bigint not null unique,
  hotmart_product_ucode text,
  product_name text not null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_company_products_company_id
  on public.company_products (company_id);

create index idx_company_products_hotmart_product_ucode
  on public.company_products (hotmart_product_ucode);

alter table public.webhook_logs
add column company_id uuid references public.companies(id);

create index idx_webhook_logs_company_id
  on public.webhook_logs (company_id);

alter table public.purchases
add column company_id uuid references public.companies(id);

create index idx_purchases_company_id
  on public.purchases (company_id);

create table public.company_contacts (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null references public.companies(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,

  created_at timestamptz not null default now(),

  unique (company_id, contact_id)
);

create index idx_company_contacts_company_id
  on public.company_contacts (company_id);

create index idx_company_contacts_contact_id
  on public.company_contacts (contact_id);


alter table public.companies enable row level security;
alter table public.user_companies enable row level security;
alter table public.company_products enable row level security;
alter table public.company_contacts enable row level security;

alter table public.webhook_logs
add column if not exists processing_attempts integer not null default 0,
add column if not exists first_failure_stage text,
add column if not exists first_processing_error text,
add column if not exists initial_processing_duration_ms integer,
add column if not exists initial_response_status_code integer,
add column if not exists last_processing_attempt_at timestamptz,
add column if not exists last_processing_success_at timestamptz,
add column if not exists last_reprocessing_result text,
add column if not exists last_reprocessing_error text;

create table public.meta_daily_ad_insights (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null references public.companies(id) on delete cascade,
  ad_account_id text not null,

  insight_date date not null,

  campaign_id text,
  campaign_name text,

  adset_id text,
  adset_name text,

  ad_id text not null,
  ad_name text,

  spend numeric(14,2) not null default 0,
  impressions integer not null default 0,
  reach integer not null default 0,

  clicks integer not null default 0,
  inline_link_clicks integer not null default 0,
  landing_page_views integer not null default 0,

  purchases integer not null default 0,
  purchase_value numeric(14,2) not null default 0,

  leads integer not null default 0,
  messaging_conversations_started integer not null default 0,

  video_plays integer not null default 0,
  video_play_actions integer not null default 0,
  video_p25_watched integer not null default 0,
  video_p50_watched integer not null default 0,
  video_p75_watched integer not null default 0,
  video_p95_watched integer not null default 0,
  video_p100_watched integer not null default 0,
  thruplays integer not null default 0,

  raw_payload jsonb not null,

  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, ad_account_id, insight_date, campaign_id, adset_id, ad_id)
);


create index idx_meta_daily_ad_insights_company_account_date
  on public.meta_daily_ad_insights (company_id, ad_account_id, insight_date desc);

create index idx_meta_daily_ad_insights_company_campaign_date
  on public.meta_daily_ad_insights (company_id, campaign_id, insight_date desc);

create index idx_meta_daily_ad_insights_company_ad_date
  on public.meta_daily_ad_insights (company_id, ad_id, insight_date desc);

create index idx_meta_daily_ad_insights_company_campaign_name
  on public.meta_daily_ad_insights (company_id, campaign_name);

create index idx_meta_daily_ad_insights_company_ad_name
  on public.meta_daily_ad_insights (company_id, ad_name);

create index idx_meta_daily_ad_insights_raw_payload_gin
  on public.meta_daily_ad_insights
  using gin (raw_payload);


create table public.meta_sync_state (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null references public.companies(id) on delete cascade,
  ad_account_id text not null,

  status text not null default 'idle'
    check (status in ('idle', 'running', 'failed')),

  current_run_id uuid,
  started_by_user_id uuid references public.profiles(id) on delete set null,

  locked_at timestamptz,
  lock_expires_at timestamptz,

  sync_from_date date,
  sync_until_date date,
  last_synced_until date,

  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, ad_account_id)
);

create index idx_meta_sync_state_status
  on public.meta_sync_state (status);

create index idx_meta_sync_state_lock_expires_at
  on public.meta_sync_state (lock_expires_at);

create index idx_meta_sync_state_company_status
  on public.meta_sync_state (company_id, status);

create index idx_meta_sync_state_company_account
  on public.meta_sync_state (company_id, ad_account_id);


create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_meta_sync_state_set_updated_at
on public.meta_sync_state;

create trigger trg_meta_sync_state_set_updated_at
before update on public.meta_sync_state
for each row
execute function public.set_updated_at();

create table public.company_ad_accounts (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null references public.companies(id) on delete cascade,
  ad_account_id text not null,

  ad_account_name text,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, ad_account_id)
);

create index idx_company_ad_accounts_company_id
  on public.company_ad_accounts (company_id);

create index idx_company_ad_accounts_ad_account_id
  on public.company_ad_accounts (ad_account_id);

create index idx_company_ad_accounts_company_active
  on public.company_ad_accounts (company_id, is_active);

alter table public.meta_daily_ad_insights enable row level security;
alter table public.meta_sync_state enable row level security;
alter table public.company_ad_accounts enable row level security;

drop trigger if exists trg_meta_daily_ad_insights_set_updated_at
on public.meta_daily_ad_insights;

create trigger trg_meta_daily_ad_insights_set_updated_at
before update on public.meta_daily_ad_insights
for each row
execute function public.set_updated_at();

drop trigger if exists trg_company_ad_accounts_set_updated_at
on public.company_ad_accounts;

create trigger trg_company_ad_accounts_set_updated_at
before update on public.company_ad_accounts
for each row
execute function public.set_updated_at();