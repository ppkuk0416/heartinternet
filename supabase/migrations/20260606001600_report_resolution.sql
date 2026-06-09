create or replace function public.resolve_content_report(
  target_report_id uuid,
  decision text,
  decision_note text
)
returns table (report_status public.report_status, target_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_report public.reports;
  before_state jsonb;
  after_state jsonb;
  resolved_status public.report_status;
  content_status text;
begin
  if not public.is_moderator() then
    raise exception 'Moderator role required';
  end if;
  if decision not in ('reviewing', 'dismissed', 'hidden') then
    raise exception 'Invalid report decision';
  end if;
  if char_length(btrim(coalesce(decision_note, ''))) < 3 then
    raise exception 'Decision note is required';
  end if;

  select * into target_report
  from public.reports
  where id = target_report_id
  for update;

  if not found then
    raise exception 'Report not found';
  end if;
  if target_report.status not in ('open', 'reviewing') then
    raise exception 'Report is already resolved';
  end if;

  if decision = 'reviewing' then
    update public.reports
    set
      status = 'reviewing',
      reviewed_by = auth.uid(),
      resolution_note = decision_note
    where id = target_report_id
    returning status into resolved_status;

    return query select resolved_status, null::text;
    return;
  end if;

  if decision = 'dismissed' then
    update public.reports
    set
      status = 'dismissed',
      reviewed_by = auth.uid(),
      resolution_note = decision_note,
      resolved_at = now()
    where id = target_report_id
    returning status into resolved_status;

    return query select resolved_status, null::text;
    return;
  end if;

  if target_report.target_type = 'deck' then
    select to_jsonb(deck) into before_state
    from public.decks deck
    where deck.id = target_report.target_id
    for update;
    if before_state is null then raise exception 'Target deck not found'; end if;

    update public.decks
    set status = 'hidden'
    where id = target_report.target_id;

    select to_jsonb(deck), deck.status::text into after_state, content_status
    from public.decks deck
    where deck.id = target_report.target_id;
  elsif target_report.target_type = 'comment' then
    select to_jsonb(comment) into before_state
    from public.comments comment
    where comment.id = target_report.target_id
    for update;
    if before_state is null then raise exception 'Target comment not found'; end if;

    update public.comments
    set status = 'hidden'
    where id = target_report.target_id;

    select to_jsonb(comment), comment.status::text into after_state, content_status
    from public.comments comment
    where comment.id = target_report.target_id;
  else
    raise exception 'This report target cannot be hidden here';
  end if;

  insert into public.moderation_audits (
    actor_id, action, target_type, target_id, before_state, after_state, reason
  ) values (
    auth.uid(), 'report_target_hidden', target_report.target_type::text,
    target_report.target_id, before_state, after_state, decision_note
  );

  update public.reports
  set
    status = 'resolved',
    reviewed_by = auth.uid(),
    resolution_note = decision_note,
    resolved_at = now()
  where id = target_report_id
  returning status into resolved_status;

  return query select resolved_status, content_status;
end;
$$;

revoke all on function public.resolve_content_report(uuid, text, text)
from public, anon;
grant execute on function public.resolve_content_report(uuid, text, text)
to authenticated;
