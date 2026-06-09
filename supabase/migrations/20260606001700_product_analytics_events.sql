create table public.product_events (
  id uuid primary key default extensions.gen_random_uuid(),
  event_name varchar(80) not null check (
    event_name in (
      'deck_list_viewed',
      'deck_detail_viewed',
      'deck_code_copied',
      'deck_submit_started',
      'deck_preview_succeeded',
      'deck_draft_created'
    )
  ),
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_hash char(64),
  deck_id uuid references public.decks(id) on delete set null,
  path varchar(240),
  referrer varchar(240),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(metadata) = 'object'),
  check (user_id is not null or anonymous_hash is not null)
);

create index product_events_name_created_idx
  on public.product_events (event_name, created_at desc);
create index product_events_deck_created_idx
  on public.product_events (deck_id, created_at desc)
  where deck_id is not null;
create index product_events_user_created_idx
  on public.product_events (user_id, created_at desc)
  where user_id is not null;

alter table public.product_events enable row level security;

create policy "analytics events can be inserted"
on public.product_events
for insert
with check (
  (auth.uid() is not null and user_id = auth.uid() and anonymous_hash is null)
  or
  (auth.uid() is null and user_id is null and anonymous_hash ~ '^[a-f0-9]{64}$')
);

create policy "moderators read analytics events"
on public.product_events
for select
using (public.is_moderator());

grant insert on public.product_events to anon, authenticated;
grant select on public.product_events to authenticated;
