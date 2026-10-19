-- Reorganização Financeira Familiar
-- Cole este script no SQL Editor do projeto Supabase e execute uma vez.
-- O aplicativo envia o cabeçalho x-household-key e cada aparelho só lê a própria família.
-- O payload reúne rendas, datas, despesas, diário, contrato CAIXA, pagamentos e fundo.

create table if not exists public.household_state (
  household_key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.household_state drop constraint if exists household_state_key_format;
alter table public.household_state
  add constraint household_state_key_format
  check (household_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

alter table public.household_state enable row level security;

create or replace function public.request_household_key()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    nullif(current_setting('request.headers', true), '')::json->>'x-household-key',
    ''
  );
$$;

revoke all on function public.request_household_key() from public;
grant execute on function public.request_household_key() to anon, authenticated;

drop policy if exists "household_state_isolation" on public.household_state;

create policy "household_state_isolation"
on public.household_state
for all
to anon, authenticated
using (household_key = public.request_household_key())
with check (household_key = public.request_household_key());

grant select, insert, update, delete on table public.household_state to anon, authenticated;

comment on table public.household_state is
  'Um registro por família. O payload guarda o mapa financeiro completo.';
