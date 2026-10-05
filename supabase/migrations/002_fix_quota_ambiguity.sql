-- Repair the installed RPC without changing counters or resetting any quotas.
-- ON CONFLICT column names collide with PL/pgSQL parameter names in the old RPC.
create or replace function public.consume_quota(
  quota_kind text, amount bigint, max_value bigint, project_scope boolean default false
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  counter_scope text;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if $1 not in ('turns','model','stt','tts') or $2 <= 0 or $3 <= 0 then
    raise exception 'Invalid quota request';
  end if;
  counter_scope := case when $4 then 'project' else 'user:' || current_user_id::text end;
  insert into public.quota_counters(scope,usage_day,quota_kind,used)
  values(counter_scope,(now() at time zone 'utc')::date,$1,0)
  on conflict on constraint quota_counters_pkey do nothing;
  update public.quota_counters as counter set used=counter.used+$2
  where counter.scope=counter_scope
    and counter.usage_day=(now() at time zone 'utc')::date
    and counter.quota_kind=$1 and counter.used+$2 <= $3;
  return found;
end;
$$;
revoke all on function public.consume_quota(text,bigint,bigint,boolean) from public,anon;
grant execute on function public.consume_quota(text,bigint,bigint,boolean) to authenticated;
