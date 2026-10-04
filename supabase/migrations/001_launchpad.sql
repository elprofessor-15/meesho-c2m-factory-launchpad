create table if not exists public.workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  constraint workspace_state_is_object check (jsonb_typeof(state) = 'object')
);

alter table public.workspaces enable row level security;

create policy "Workspace owners can read their state"
  on public.workspaces for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "Workspace owners can create their state"
  on public.workspaces for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Workspace owners can update their state"
  on public.workspaces for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create table if not exists public.quota_counters (
  scope text not null,
  usage_day date not null,
  quota_kind text not null check (quota_kind in ('turns', 'model', 'stt', 'tts')),
  used bigint not null default 0 check (used >= 0),
  primary key (scope, usage_day, quota_kind)
);

alter table public.quota_counters enable row level security;
revoke all on public.quota_counters from anon, authenticated;

create or replace function public.bootstrap_workspace(initial_state jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  saved_state jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.workspaces (owner_id, state)
  values (current_user_id, initial_state)
  on conflict (owner_id) do nothing;

  select state into saved_state
  from public.workspaces
  where owner_id = current_user_id;

  return saved_state;
end;
$$;

create or replace function public.save_workspace(expected_version bigint, next_state jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.workspaces
  set state = next_state, updated_at = now()
  where owner_id = current_user_id
    and (state ->> 'version')::bigint = expected_version;

  return found;
end;
$$;

create or replace function public.consume_quota(
  quota_kind text,
  amount bigint,
  max_value bigint,
  project_scope boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  counter_scope text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if quota_kind not in ('turns', 'model', 'stt', 'tts')
    or amount <= 0 or max_value <= 0 then
    raise exception 'Invalid quota request';
  end if;

  counter_scope := case
    when project_scope then 'project'
    else 'user:' || current_user_id::text
  end;

  insert into public.quota_counters (scope, usage_day, quota_kind, used)
  values (counter_scope, (now() at time zone 'utc')::date, quota_kind, 0)
  on conflict (scope, usage_day, quota_kind) do nothing;

  update public.quota_counters as counter
  set used = counter.used + $2
  where counter.scope = counter_scope
    and counter.usage_day = (now() at time zone 'utc')::date
    and counter.quota_kind = $1
    and counter.used + $2 <= $3;

  return found;
end;
$$;

revoke all on function public.bootstrap_workspace(jsonb) from public, anon;
revoke all on function public.save_workspace(bigint, jsonb) from public, anon;
revoke all on function public.consume_quota(text, bigint, bigint, boolean) from public, anon;
grant execute on function public.bootstrap_workspace(jsonb) to authenticated;
grant execute on function public.save_workspace(bigint, jsonb) to authenticated;
grant execute on function public.consume_quota(text, bigint, bigint, boolean) to authenticated;