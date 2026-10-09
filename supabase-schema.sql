create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  data jsonb not null,
  template text not null default 'simple' check (template in ('simple', 'modern', 'creative')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portfolios enable row level security;

drop policy if exists "Public portfolio access" on public.portfolios;
create policy "Public portfolio access"
  on public.portfolios
  for all
  to anon, authenticated
  using (true)
  with check (true);

create or replace function public.set_portfolio_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists portfolios_updated_at on public.portfolios;
create trigger portfolios_updated_at
  before update on public.portfolios
  for each row execute function public.set_portfolio_updated_at();

grant select, insert, update, delete on public.portfolios to anon, authenticated;
