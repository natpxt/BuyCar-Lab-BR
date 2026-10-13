-- BuyCar Lab - BR: estrutura inicial da garagem por conta.
-- Execute uma vez no SQL Editor do projeto correto, após revisar o arquivo.
-- A execução não configura Auth, SMTP, Vercel nem altera a aplicação.
-- vehicle_data e financing_input preservam as entradas TypeScript atuais;
-- TCO, cronogramas e demais resultados derivados não são armazenados.

begin;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  created_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_role text not null check (vehicle_role in ('current', 'candidate')),
  sort_order integer not null default 0 check (sort_order >= 0),
  vehicle_data jsonb not null check (jsonb_typeof(vehicle_data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create unique index vehicles_one_current_per_user
  on public.vehicles (user_id)
  where vehicle_role = 'current';

create unique index vehicles_candidate_order_per_user
  on public.vehicles (user_id, sort_order)
  where vehicle_role = 'candidate';

create index vehicles_user_order
  on public.vehicles (user_id, vehicle_role, sort_order);

create table public.financing_configs (
  candidate_id uuid primary key,
  user_id uuid not null,
  financing_input jsonb not null check (jsonb_typeof(financing_input) = 'object'),
  updated_at timestamptz not null default now(),
  foreign key (user_id, candidate_id)
    references public.vehicles (user_id, id) on delete cascade
);

create index financing_configs_user
  on public.financing_configs (user_id);

create table public.garage_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  selected_comparison_candidate_id uuid,
  selected_financing_candidate_id uuid,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.financing_configs enable row level security;
alter table public.garage_settings enable row level security;

-- O visitante usa somente localStorage; não recebe acesso às tabelas.
revoke all on table public.profiles from anon;
revoke all on table public.vehicles from anon;
revoke all on table public.financing_configs from anon;
revoke all on table public.garage_settings from anon;

-- Projetos Supabase podem conceder permissões padrão amplas, inclusive
-- TRUNCATE, que ignora RLS. Remova-as antes dos GRANTs específicos abaixo.
revoke all on table public.profiles from authenticated;
revoke all on table public.vehicles from authenticated;
revoke all on table public.financing_configs from authenticated;
revoke all on table public.garage_settings from authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.vehicles to authenticated;
grant select, insert, update, delete on table public.financing_configs to authenticated;
grant select, insert, update, delete on table public.garage_settings to authenticated;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "vehicles_select_own" on public.vehicles
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "vehicles_insert_own" on public.vehicles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "vehicles_update_own" on public.vehicles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "vehicles_delete_own" on public.vehicles
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "financing_configs_select_own" on public.financing_configs
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "financing_configs_insert_own" on public.financing_configs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "financing_configs_update_own" on public.financing_configs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "financing_configs_delete_own" on public.financing_configs
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "garage_settings_select_own" on public.garage_settings
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "garage_settings_insert_own" on public.garage_settings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "garage_settings_update_own" on public.garage_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "garage_settings_delete_own" on public.garage_settings
  for delete to authenticated
  using ((select auth.uid()) = user_id);

commit;
