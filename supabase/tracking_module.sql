alter table public.companies
add column if not exists tracking_enabled boolean not null default false;

create table if not exists public.checkout_click_tracking (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null references public.companies(id) on delete cascade,

  xcod text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,

  fbclid text,
  gclid text,
  _fbp text,
  _fbc text,

  user_agent text,
  language text,
  timezone text,
  page_url text,
  referrer text,

  clicked_at timestamptz not null,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists idx_checkout_click_tracking_company_id
  on public.checkout_click_tracking (company_id);

create index if not exists idx_checkout_click_tracking_xcod
  on public.checkout_click_tracking (xcod);

create index if not exists idx_checkout_click_tracking_clicked_at
  on public.checkout_click_tracking (clicked_at desc);

create index if not exists idx_checkout_click_tracking_created_at
  on public.checkout_click_tracking (created_at desc);

alter table public.checkout_click_tracking enable row level security;
