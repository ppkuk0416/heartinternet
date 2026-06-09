create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create type public.app_role as enum ('user', 'moderator', 'admin');
create type public.contributor_status as enum ('standard', 'invited', 'trusted', 'suspended');
create type public.deck_format as enum ('standard', 'wild', 'twist');
create type public.strategy_type as enum ('aggro', 'tempo', 'midrange', 'control', 'combo', 'other');
create type public.deck_difficulty as enum ('easy', 'medium', 'hard');
create type public.deck_status as enum ('draft', 'pending', 'published', 'hidden', 'rejected', 'archived');
create type public.verification_status as enum ('unverified', 'source_checked', 'admin_verified');
create type public.parse_status as enum ('valid', 'unsupported', 'invalidated');
create type public.source_type as enum ('community', 'ranked', 'creator', 'tournament', 'external_stats');
create type public.evidence_status as enum ('self_reported', 'source_linked', 'reviewed', 'rejected');
create type public.tag_category as enum ('audience', 'cost', 'difficulty', 'goal', 'editorial');
create type public.comment_status as enum ('visible', 'hidden', 'deleted');
create type public.report_target_type as enum ('deck', 'comment', 'user');
create type public.report_reason as enum ('spam', 'abuse', 'false_claim', 'copyright', 'other');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle varchar(32) not null unique check (handle ~ '^[a-z0-9][a-z0-9_-]{2,31}$'),
  display_name varchar(40) not null check (char_length(display_name) between 1 and 40),
  avatar_url text,
  bio varchar(240),
  role public.app_role not null default 'user',
  contributor_status public.contributor_status not null default 'standard',
  locale varchar(16) not null default 'ko-KR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.hearthstone_classes (
  id smallint primary key,
  slug varchar(32) not null unique,
  name_ko varchar(24) not null unique,
  name_en varchar(32) not null unique,
  card_class_id integer not null unique check (card_class_id > 0),
  color_token varchar(32) not null,
  icon_url text,
  sort_order smallint not null unique,
  is_active boolean not null default true
);

create table public.archetypes (
  id uuid primary key default extensions.gen_random_uuid(),
  slug varchar(80) not null unique,
  name_ko varchar(80) not null,
  name_en varchar(100),
  class_id smallint references public.hearthstone_classes(id) on delete restrict,
  strategy_type public.strategy_type not null default 'other',
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, name_ko)
);

create table public.patches (
  id uuid primary key default extensions.gen_random_uuid(),
  version varchar(24) not null unique,
  released_at timestamptz not null,
  ended_at timestamptz,
  is_current boolean not null default false,
  notes_url text,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= released_at)
);

create unique index patches_one_current_idx
  on public.patches (is_current)
  where is_current;

create table public.cards (
  id uuid primary key default extensions.gen_random_uuid(),
  dbf_id integer not null unique check (dbf_id > 0),
  card_id varchar(80) not null unique,
  name_ko varchar(120) not null,
  name_en varchar(120) not null,
  class_id smallint references public.hearthstone_classes(id) on delete restrict,
  card_type varchar(32) not null,
  mana_cost smallint not null default 0 check (mana_cost >= 0),
  rarity varchar(24),
  set_slug varchar(64) not null,
  crafting_cost integer check (crafting_cost is null or crafting_cost >= 0),
  image_url_ko text,
  is_collectible boolean not null default false,
  is_standard_legal boolean not null default false,
  is_legendary boolean not null default false,
  is_active boolean not null default true,
  last_synced_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default extensions.gen_random_uuid(),
  slug varchar(64) not null unique,
  name_ko varchar(40) not null unique,
  category public.tag_category not null,
  description text,
  is_editorial boolean not null default false,
  is_active boolean not null default true,
  sort_order smallint not null default 0
);

create table public.decks (
  id uuid primary key default extensions.gen_random_uuid(),
  slug varchar(120) not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,119}$'),
  author_id uuid not null references public.profiles(id) on delete restrict,
  title varchar(120) not null check (char_length(title) between 3 and 120),
  class_id smallint not null references public.hearthstone_classes(id) on delete restrict,
  archetype_id uuid references public.archetypes(id) on delete set null,
  format public.deck_format not null default 'standard',
  summary varchar(320) not null check (char_length(summary) between 20 and 320),
  recommended_for text not null default '',
  difficulty public.deck_difficulty not null default 'medium',
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  game_plan text not null default '',
  mulligan_guide text not null default '',
  card_choices text,
  matchup_notes text,
  status public.deck_status not null default 'draft',
  verification_status public.verification_status not null default 'unverified',
  current_deck_code_id uuid,
  view_count bigint not null default 0 check (view_count >= 0),
  copy_count bigint not null default 0 check (copy_count >= 0),
  recommendation_count bigint not null default 0 check (recommendation_count >= 0),
  favorite_count bigint not null default 0 check (favorite_count >= 0),
  comment_count bigint not null default 0 check (comment_count >= 0),
  published_at timestamptz,
  last_content_update_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (format = 'standard' or status <> 'published'),
  check (
    status <> 'published'
    or (
      current_deck_code_id is not null
      and published_at is not null
      and char_length(game_plan) >= 20
      and char_length(mulligan_guide) >= 10
    )
  )
);

create table public.deck_codes (
  id uuid primary key default extensions.gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  raw_code text not null check (char_length(raw_code) between 20 and 4096),
  code_hash char(64) not null,
  version_number integer not null check (version_number > 0),
  patch_id uuid not null references public.patches(id) on delete restrict,
  format public.deck_format not null,
  class_id smallint not null references public.hearthstone_classes(id) on delete restrict,
  hero_dbf_id integer not null check (hero_dbf_id > 0),
  card_count smallint not null check (card_count = 30),
  parse_status public.parse_status not null,
  parser_version varchar(32) not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (deck_id, version_number),
  unique (deck_id, code_hash)
);

alter table public.decks
  add constraint decks_current_deck_code_fk
  foreign key (current_deck_code_id)
  references public.deck_codes(id)
  on delete restrict
  deferrable initially deferred;

create table public.deck_cards (
  id uuid primary key default extensions.gen_random_uuid(),
  deck_code_id uuid not null references public.deck_codes(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete restrict,
  quantity smallint not null check (quantity between 1 and 30),
  sideboard_for_card_id uuid references public.cards(id) on delete restrict,
  sort_order smallint not null default 0,
  unique nulls not distinct (deck_code_id, card_id, sideboard_for_card_id)
);

create table public.source_evidence (
  id uuid primary key default extensions.gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  source_type public.source_type not null,
  source_url text,
  source_name varchar(120),
  claimed_rank varchar(80),
  wins integer check (wins is null or wins >= 0),
  losses integer check (losses is null or losses >= 0),
  played_from date,
  played_to date,
  evidence_status public.evidence_status not null default 'self_reported',
  evidence_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((wins is null) = (losses is null)),
  check (played_to is null or played_from is null or played_to >= played_from),
  check (
    evidence_status not in ('source_linked', 'reviewed')
    or source_url is not null
  ),
  check (
    evidence_status <> 'reviewed'
    or (reviewed_by is not null and reviewed_at is not null)
  )
);

create table public.deck_tags (
  deck_id uuid not null references public.decks(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (deck_id, tag_id)
);

create table public.deck_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, deck_id)
);

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, deck_id)
);

create table public.comments (
  id uuid primary key default extensions.gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  parent_id uuid references public.comments(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 2000),
  status public.comment_status not null default 'visible',
  helpful_count bigint not null default 0 check (helpful_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (parent_id is null)
);

create table public.comment_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);

create table public.reports (
  id uuid primary key default extensions.gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason public.report_reason not null,
  details text check (details is null or char_length(details) <= 2000),
  status public.report_status not null default 'open',
  reviewed_by uuid references public.profiles(id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (
    status not in ('resolved', 'dismissed')
    or (reviewed_by is not null and resolved_at is not null)
  )
);

create unique index reports_one_open_per_user_target_idx
  on public.reports (reporter_id, target_type, target_id)
  where status in ('open', 'reviewing');

create table public.moderation_audits (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action varchar(80) not null,
  target_type varchar(40) not null,
  target_id uuid not null,
  before_state jsonb,
  after_state jsonb,
  reason text not null check (char_length(reason) between 3 and 1000),
  created_at timestamptz not null default now()
);

create table public.deck_copy_events (
  id bigint generated always as identity primary key,
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_hash char(64),
  occurred_on date not null default current_date,
  created_at timestamptz not null default now(),
  check (user_id is not null or anonymous_hash is not null)
);

create unique index deck_copy_events_user_daily_idx
  on public.deck_copy_events (deck_id, user_id, occurred_on)
  where user_id is not null;

create unique index deck_copy_events_anonymous_daily_idx
  on public.deck_copy_events (deck_id, anonymous_hash, occurred_on)
  where anonymous_hash is not null;

create index decks_published_idx
  on public.decks (published_at desc)
  where status = 'published' and deleted_at is null;
create index decks_class_archetype_idx
  on public.decks (class_id, archetype_id, published_at desc)
  where status = 'published' and deleted_at is null;
create index decks_verification_idx
  on public.decks (verification_status, published_at desc)
  where status = 'published' and deleted_at is null;
create index decks_title_trgm_idx
  on public.decks using gin (title extensions.gin_trgm_ops);
create index archetypes_name_ko_trgm_idx
  on public.archetypes using gin (name_ko extensions.gin_trgm_ops);
create index deck_codes_hash_idx on public.deck_codes (code_hash);
create index deck_codes_patch_format_class_idx on public.deck_codes (patch_id, format, class_id);
create index deck_cards_code_idx on public.deck_cards (deck_code_id, sort_order);
create index comments_deck_visible_idx
  on public.comments (deck_id, created_at desc)
  where status = 'visible';
create index deck_likes_deck_idx on public.deck_likes (deck_id);
create index favorites_user_idx on public.favorites (user_id, created_at desc);
create index deck_tags_tag_idx on public.deck_tags (tag_id, deck_id);
create index reports_open_idx
  on public.reports (created_at)
  where status in ('open', 'reviewing');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
create trigger archetypes_set_updated_at
before update on public.archetypes
for each row execute function public.set_updated_at();
create trigger decks_set_updated_at
before update on public.decks
for each row execute function public.set_updated_at();
create trigger comments_set_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

create or replace function public.protect_comment_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
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

create trigger comments_protect_fields
before update on public.comments
for each row execute function public.protect_comment_fields();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_handle text;
begin
  base_handle := lower(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'user_name', split_part(coalesce(new.email, 'player'), '@', 1)),
    '[^a-zA-Z0-9_-]',
    '',
    'g'
  ));
  if char_length(base_handle) < 3 then
    base_handle := 'player';
  end if;

  insert into public.profiles (id, handle, display_name)
  values (
    new.id,
    left(base_handle, 24) || '-' || left(replace(new.id::text, '-', ''), 6),
    left(coalesce(new.raw_user_meta_data ->> 'display_name', base_handle), 40)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('moderator', 'admin')
      and deleted_at is null
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and deleted_at is null
  );
$$;

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     or new.contributor_status is distinct from old.contributor_status then
    if not public.is_admin() then
      raise exception 'Only administrators may change profile privileges';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_privileges
before update on public.profiles
for each row execute function public.protect_profile_privileged_fields();

create or replace function public.protect_deck_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.internal_counter_update', true), 'false') <> 'true'
     and not public.is_moderator() then
    if new.author_id is distinct from old.author_id
       or new.verification_status is distinct from old.verification_status
       or new.view_count is distinct from old.view_count
       or new.copy_count is distinct from old.copy_count
       or new.recommendation_count is distinct from old.recommendation_count
       or new.favorite_count is distinct from old.favorite_count
       or new.comment_count is distinct from old.comment_count
       or new.status in ('hidden', 'rejected', 'archived') then
      raise exception 'Attempted update of privileged deck fields';
    end if;
  end if;
  new.last_content_update_at := now();
  return new;
end;
$$;

create trigger decks_protect_privileges
before update on public.decks
for each row execute function public.protect_deck_privileged_fields();

create or replace function public.validate_active_deck_code()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  active_code public.deck_codes;
begin
  if new.current_deck_code_id is null then
    return new;
  end if;

  select * into active_code
  from public.deck_codes
  where id = new.current_deck_code_id;

  if not found
     or active_code.deck_id <> new.id
     or active_code.class_id <> new.class_id
     or active_code.format <> new.format
     or active_code.parse_status <> 'valid' then
    raise exception 'Current deck code must be a valid code version for this deck';
  end if;

  return new;
end;
$$;

create constraint trigger decks_validate_active_code
after insert or update of current_deck_code_id, class_id, format, status
on public.decks
deferrable initially deferred
for each row execute function public.validate_active_deck_code();

create or replace function public.protect_immutable_deck_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deck_id is distinct from old.deck_id
     or new.raw_code is distinct from old.raw_code
     or new.code_hash is distinct from old.code_hash
     or new.version_number is distinct from old.version_number
     or new.patch_id is distinct from old.patch_id
     or new.format is distinct from old.format
     or new.class_id is distinct from old.class_id
     or new.hero_dbf_id is distinct from old.hero_dbf_id
     or new.card_count is distinct from old.card_count
     or new.parser_version is distinct from old.parser_version
     or new.created_by is distinct from old.created_by then
    raise exception 'Deck code versions are immutable';
  end if;
  return new;
end;
$$;

create trigger deck_codes_immutable
before update on public.deck_codes
for each row execute function public.protect_immutable_deck_code();

create or replace function public.validate_deck_card_quantity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  legendary boolean;
begin
  select is_legendary into legendary
  from public.cards
  where id = new.card_id;

  if new.sideboard_for_card_id is null
     and ((legendary and new.quantity > 1) or (not legendary and new.quantity > 2)) then
    raise exception 'Card quantity exceeds constructed deck limit';
  end if;
  return new;
end;
$$;

create trigger deck_cards_validate_quantity
before insert or update on public.deck_cards
for each row execute function public.validate_deck_card_quantity();

create or replace function public.validate_deck_card_total()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_code_id uuid;
  expected_count integer;
  actual_count integer;
begin
  target_code_id := coalesce(new.deck_code_id, old.deck_code_id);
  select card_count into expected_count
  from public.deck_codes
  where id = target_code_id;

  select coalesce(sum(quantity), 0)::integer into actual_count
  from public.deck_cards
  where deck_code_id = target_code_id
    and sideboard_for_card_id is null;

  if actual_count <> expected_count then
    raise exception 'Deck card rows total % but deck code requires %', actual_count, expected_count;
  end if;
  return null;
end;
$$;

create constraint trigger deck_cards_validate_total
after insert or update or delete on public.deck_cards
deferrable initially deferred
for each row execute function public.validate_deck_card_total();

create or replace function public.update_deck_recommendation_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.internal_counter_update', 'true', true);
  update public.decks
  set recommendation_count = (
    select count(*) from public.deck_likes where deck_id = coalesce(new.deck_id, old.deck_id)
  )
  where id = coalesce(new.deck_id, old.deck_id);
  perform set_config('app.internal_counter_update', 'false', true);
  return null;
end;
$$;

create trigger deck_likes_update_count
after insert or delete on public.deck_likes
for each row execute function public.update_deck_recommendation_count();

create or replace function public.update_deck_favorite_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.internal_counter_update', 'true', true);
  update public.decks
  set favorite_count = (
    select count(*) from public.favorites where deck_id = coalesce(new.deck_id, old.deck_id)
  )
  where id = coalesce(new.deck_id, old.deck_id);
  perform set_config('app.internal_counter_update', 'false', true);
  return null;
end;
$$;

create trigger favorites_update_count
after insert or delete on public.favorites
for each row execute function public.update_deck_favorite_count();

create or replace function public.update_deck_comment_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.internal_counter_update', 'true', true);
  update public.decks
  set comment_count = (
    select count(*) from public.comments
    where deck_id = coalesce(new.deck_id, old.deck_id)
      and status = 'visible'
  )
  where id = coalesce(new.deck_id, old.deck_id);
  perform set_config('app.internal_counter_update', 'false', true);
  return null;
end;
$$;

create trigger comments_update_count
after insert or update of status or delete on public.comments
for each row execute function public.update_deck_comment_count();

create or replace function public.record_deck_copy(
  target_deck_id uuid,
  anonymous_visitor_hash text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_id bigint;
  current_user_id uuid := auth.uid();
begin
  if not exists (
    select 1 from public.decks
    where id = target_deck_id and status = 'published' and deleted_at is null
  ) then
    return false;
  end if;

  if current_user_id is null and (
    anonymous_visitor_hash is null
    or anonymous_visitor_hash !~ '^[a-f0-9]{64}$'
  ) then
    raise exception 'A SHA-256 anonymous visitor hash is required';
  end if;

  insert into public.deck_copy_events (deck_id, user_id, anonymous_hash)
  values (
    target_deck_id,
    current_user_id,
    case when current_user_id is null then anonymous_visitor_hash else null end
  )
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

create or replace function public.moderate_deck(
  target_deck_id uuid,
  next_status public.deck_status,
  moderation_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_row jsonb;
  after_row jsonb;
begin
  if not public.is_moderator() then
    raise exception 'Moderator role required';
  end if;
  if next_status not in ('published', 'hidden', 'rejected', 'archived') then
    raise exception 'Invalid moderation status';
  end if;
  if char_length(trim(moderation_reason)) < 3 then
    raise exception 'Moderation reason is required';
  end if;

  select to_jsonb(d) into before_row from public.decks d where id = target_deck_id for update;
  if before_row is null then
    raise exception 'Deck not found';
  end if;

  update public.decks
  set status = next_status
  where id = target_deck_id;

  select to_jsonb(d) into after_row from public.decks d where id = target_deck_id;
  insert into public.moderation_audits (
    actor_id, action, target_type, target_id, before_state, after_state, reason
  ) values (
    auth.uid(), 'deck_status_changed', 'deck', target_deck_id,
    before_row, after_row, moderation_reason
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.hearthstone_classes enable row level security;
alter table public.archetypes enable row level security;
alter table public.patches enable row level security;
alter table public.cards enable row level security;
alter table public.tags enable row level security;
alter table public.decks enable row level security;
alter table public.deck_codes enable row level security;
alter table public.deck_cards enable row level security;
alter table public.source_evidence enable row level security;
alter table public.deck_tags enable row level security;
alter table public.deck_likes enable row level security;
alter table public.favorites enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_audits enable row level security;
alter table public.deck_copy_events enable row level security;

create policy "profiles are public"
on public.profiles for select
using (deleted_at is null or public.is_moderator());
create policy "users update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "active classes are public"
on public.hearthstone_classes for select using (is_active);
create policy "active archetypes are public"
on public.archetypes for select using (is_active);
create policy "patches are public"
on public.patches for select using (true);
create policy "active cards are public"
on public.cards for select using (is_active);
create policy "active tags are public"
on public.tags for select using (is_active);

create policy "published decks are public"
on public.decks for select
using (
  (status = 'published' and deleted_at is null)
  or author_id = auth.uid()
  or public.is_moderator()
);
create policy "users create own drafts"
on public.decks for insert
to authenticated
with check (
  author_id = auth.uid()
  and status in ('draft', 'pending')
  and verification_status = 'unverified'
);
create policy "authors update own decks"
on public.decks for update
to authenticated
using (author_id = auth.uid() or public.is_moderator())
with check (author_id = auth.uid() or public.is_moderator());

create policy "current published deck codes are public"
on public.deck_codes for select
using (
  exists (
    select 1 from public.decks
    where decks.id = deck_codes.deck_id
      and (
        (decks.status = 'published' and decks.current_deck_code_id = deck_codes.id)
        or decks.author_id = auth.uid()
        or public.is_moderator()
      )
  )
);
create policy "authors insert deck code versions"
on public.deck_codes for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.decks
    where decks.id = deck_codes.deck_id
      and decks.author_id = auth.uid()
  )
);

create policy "published deck cards are public"
on public.deck_cards for select
using (
  exists (
    select 1
    from public.deck_codes dc
    join public.decks d on d.id = dc.deck_id
    where dc.id = deck_cards.deck_code_id
      and (
        (d.status = 'published' and d.current_deck_code_id = dc.id)
        or d.author_id = auth.uid()
        or public.is_moderator()
      )
  )
);
create policy "authors insert deck cards"
on public.deck_cards for insert
to authenticated
with check (
  exists (
    select 1
    from public.deck_codes dc
    join public.decks d on d.id = dc.deck_id
    where dc.id = deck_cards.deck_code_id
      and d.author_id = auth.uid()
  )
);

create policy "published evidence is public"
on public.source_evidence for select
using (
  exists (
    select 1 from public.decks
    where decks.id = source_evidence.deck_id
      and (
        decks.status = 'published'
        or decks.author_id = auth.uid()
        or public.is_moderator()
      )
  )
);
create policy "authors manage evidence"
on public.source_evidence for insert
to authenticated
with check (
  evidence_status in ('self_reported', 'source_linked')
  and reviewed_by is null
  and exists (
    select 1 from public.decks
    where decks.id = source_evidence.deck_id
      and decks.author_id = auth.uid()
  )
);
create policy "authors update unreviewed evidence"
on public.source_evidence for update
to authenticated
using (
  evidence_status in ('self_reported', 'source_linked')
  and exists (
    select 1 from public.decks
    where decks.id = source_evidence.deck_id
      and decks.author_id = auth.uid()
  )
)
with check (
  evidence_status in ('self_reported', 'source_linked')
  and reviewed_by is null
  and reviewed_at is null
);
create policy "moderators review evidence"
on public.source_evidence for update
to authenticated
using (public.is_moderator())
with check (public.is_moderator());

create policy "published deck tags are public"
on public.deck_tags for select
using (
  exists (
    select 1 from public.decks
    where decks.id = deck_tags.deck_id
      and (
        decks.status = 'published'
        or decks.author_id = auth.uid()
        or public.is_moderator()
      )
  )
);
create policy "authors assign non-editorial tags"
on public.deck_tags for insert
to authenticated
with check (
  assigned_by = auth.uid()
  and exists (
    select 1 from public.decks
    where decks.id = deck_tags.deck_id
      and (decks.author_id = auth.uid() or public.is_moderator())
  )
  and exists (
    select 1 from public.tags
    where tags.id = deck_tags.tag_id
      and (not tags.is_editorial or public.is_moderator())
  )
);
create policy "authors remove assigned tags"
on public.deck_tags for delete
to authenticated
using (
  exists (
    select 1 from public.decks
    where decks.id = deck_tags.deck_id
      and (decks.author_id = auth.uid() or public.is_moderator())
  )
);

create policy "deck recommendations are public"
on public.deck_likes for select using (true);
create policy "users recommend as themselves"
on public.deck_likes for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.decks
    where decks.id = deck_likes.deck_id and decks.status = 'published'
  )
);
create policy "users remove own recommendation"
on public.deck_likes for delete
to authenticated
using (user_id = auth.uid());

create policy "users see own favorites"
on public.favorites for select
to authenticated using (user_id = auth.uid());
create policy "users save own favorites"
on public.favorites for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.decks
    where decks.id = favorites.deck_id and decks.status = 'published'
  )
);
create policy "users remove own favorites"
on public.favorites for delete
to authenticated using (user_id = auth.uid());

create policy "visible comments are public"
on public.comments for select
using (
  status = 'visible'
  or author_id = auth.uid()
  or public.is_moderator()
);
create policy "users comment as themselves"
on public.comments for insert
to authenticated
with check (
  author_id = auth.uid()
  and status = 'visible'
  and exists (
    select 1 from public.decks
    where decks.id = comments.deck_id and decks.status = 'published'
  )
);
create policy "authors update own comments"
on public.comments for update
to authenticated
using (author_id = auth.uid() or public.is_moderator())
with check (
  (author_id = auth.uid() and status in ('visible', 'deleted'))
  or public.is_moderator()
);

create policy "comment recommendations are public"
on public.comment_likes for select using (true);
create policy "users recommend comments as themselves"
on public.comment_likes for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.comments
    where comments.id = comment_likes.comment_id and comments.status = 'visible'
  )
);
create policy "users remove own comment recommendation"
on public.comment_likes for delete
to authenticated using (user_id = auth.uid());

create policy "users see own reports"
on public.reports for select
to authenticated
using (reporter_id = auth.uid() or public.is_moderator());
create policy "users create own reports"
on public.reports for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and status = 'open'
  and reviewed_by is null
  and resolved_at is null
);
create policy "moderators update reports"
on public.reports for update
to authenticated
using (public.is_moderator())
with check (public.is_moderator());

create policy "moderators read audit log"
on public.moderation_audits for select
to authenticated using (public.is_moderator());

revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.hearthstone_classes, public.archetypes,
  public.patches, public.cards, public.tags, public.decks, public.deck_codes,
  public.deck_cards, public.source_evidence, public.deck_tags, public.deck_likes,
  public.comments, public.comment_likes
to anon, authenticated;
grant update on public.profiles to authenticated;
grant insert, update on public.decks to authenticated;
grant insert on public.deck_codes, public.deck_cards to authenticated;
grant insert, update on public.source_evidence to authenticated;
grant insert, delete on public.deck_tags, public.deck_likes, public.comment_likes,
  public.favorites
to authenticated;
grant select on public.favorites, public.reports, public.moderation_audits
to authenticated;
grant insert, update on public.comments, public.reports to authenticated;
grant usage, select on sequence public.deck_copy_events_id_seq to anon, authenticated;

revoke all on function public.is_moderator() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.moderate_deck(uuid, public.deck_status, text) from public;
revoke all on function public.record_deck_copy(uuid, text) from public;
grant execute on function public.is_moderator() to anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.record_deck_copy(uuid, text) to anon, authenticated;
grant execute on function public.moderate_deck(uuid, public.deck_status, text) to authenticated;
