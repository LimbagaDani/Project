create extension if not exists pgcrypto;

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  address text,
  about text,
  education text,
  skills text,
  projects jsonb default '[]'::jsonb,
  experience jsonb default '[]'::jsonb,
  social_links text,
  profile_picture_url text,
  template_id text default 'simple',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_portfolio_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists portfolios_updated_at on public.portfolios;
create trigger portfolios_updated_at
before update on public.portfolios
for each row execute function public.handle_portfolio_updated_at();

alter table public.portfolios enable row level security;

create policy "Users can manage own portfolio"
  on public.portfolios for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;
