create or replace function public.protect_comment_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.internal_counter_update', true), 'false') <> 'true'
     and not public.is_moderator() then
    if new.deck_id is distinct from old.deck_id
       or new.author_id is distinct from old.author_id
       or new.parent_id is distinct from old.parent_id
       or new.helpful_count is distinct from old.helpful_count
       or old.status = 'deleted'
       or new.status not in ('visible', 'deleted') then
      raise exception 'Attempted update of protected comment fields';
    end if;
    if new.status = 'deleted' then
      new.deleted_at := coalesce(new.deleted_at, now());
    else
      new.deleted_at := null;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.update_comment_helpful_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.internal_counter_update', 'true', true);
  update public.comments
  set helpful_count = (
    select count(*)
    from public.comment_likes
    where comment_id = coalesce(new.comment_id, old.comment_id)
  )
  where id = coalesce(new.comment_id, old.comment_id);
  perform set_config('app.internal_counter_update', 'false', true);
  return null;
end;
$$;

create trigger comment_likes_update_count
after insert or delete on public.comment_likes
for each row execute function public.update_comment_helpful_count();

drop policy "users recommend comments as themselves" on public.comment_likes;
create policy "users recommend comments as themselves"
on public.comment_likes for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.comments
    where comments.id = comment_likes.comment_id
      and comments.status = 'visible'
      and comments.author_id <> auth.uid()
  )
);
