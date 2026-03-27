create table public.webhook_logs (
  id uuid primary key default gen_random_uuid(),

  webhook_id text not null unique,
  event text not null,
  creation_date timestamptz,

  transaction text,
  buyer_email text,

  payload jsonb not null,

  processed boolean not null default false,
  processing_error text,

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