create or replace function public.record_server_deck_copy(
  target_deck_id uuid,
  attributed_user_id uuid default null,
  anonymous_visitor_hash text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_id bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role is required';
  end if;

  if not exists (
    select 1 from public.decks
    where id = target_deck_id and status = 'published' and deleted_at is null
  ) then
    return false;
  end if;

  if (attributed_user_id is null) = (anonymous_visitor_hash is null) then
    raise exception 'Exactly one copy actor is required';
  end if;

  if attributed_user_id is not null and not exists (
    select 1 from public.profiles where id = attributed_user_id
  ) then
    raise exception 'Copy user does not exist';
  end if;

  if anonymous_visitor_hash is not null
     and anonymous_visitor_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'A SHA-256 anonymous visitor hash is required';
  end if;

  insert into public.deck_copy_events (deck_id, user_id, anonymous_hash)
  values (target_deck_id, attributed_user_id, anonymous_visitor_hash)
  on conflict do nothing
  returning id into inserted_id;

  if inserted_id is not null then
    perform set_config('app.internal_counter_update', 'true', true);
    update public.decks set copy_count = copy_count + 1 where id = target_deck_id;
    perform set_config('app.internal_counter_update', 'false', true);
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.record_deck_copy(uuid, text)
from public, anon, authenticated, service_role;

revoke all on function public.record_server_deck_copy(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.record_server_deck_copy(uuid, uuid, text)
to service_role;

revoke insert on public.product_events from anon, authenticated;
grant insert on public.product_events to service_role;
