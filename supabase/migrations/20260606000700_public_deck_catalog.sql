create or replace function public.search_public_decks(
  p_query text default null,
  p_class text default null,
  p_tag text default null,
  p_evidence text default null,
  p_source text default null,
  p_current_patch_only boolean default true,
  p_sort text default 'recommended',
  p_limit integer default 18,
  p_offset integer default 0
)
returns table (
  total_count bigint,
  deck_id uuid,
  slug text,
  title text,
  summary text,
  recommended_for text,
  difficulty text,
  class_name text,
  archetype_name text,
  strategy text,
  author_name text,
  patch_version text,
  is_current_patch boolean,
  raw_code text,
  evidence_status text,
  source_type text,
  source_url text,
  source_name text,
  claimed_rank text,
  wins integer,
  losses integer,
  evidence_note text,
  tags text[],
  recommendation_count bigint,
  comment_count bigint,
  copy_count bigint,
  published_at timestamptz,
  updated_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  with catalog as (
    select
      d.id as deck_id,
      d.slug::text,
      d.title::text,
      d.summary::text,
      d.recommended_for,
      d.difficulty::text,
      hc.name_ko::text as class_name,
      coalesce(a.name_ko, '커뮤니티 덱')::text as archetype_name,
      coalesce(a.strategy_type::text, 'other') as strategy,
      p.display_name::text as author_name,
      patch.version::text as patch_version,
      patch.is_current as is_current_patch,
      dc.raw_code,
      coalesce(se.evidence_status::text, 'self_reported') as evidence_status,
      coalesce(se.source_type::text, 'community') as source_type,
      se.source_url,
      se.source_name::text,
      se.claimed_rank::text,
      se.wins,
      se.losses,
      se.evidence_note,
      coalesce(
        (
          select array_agg(t.name_ko::text order by t.sort_order, t.name_ko)
          from public.deck_tags dt
          join public.tags t on t.id = dt.tag_id
          where dt.deck_id = d.id
            and t.is_active
        ),
        '{}'::text[]
      ) as tags,
      d.recommendation_count,
      d.comment_count,
      d.copy_count,
      d.published_at,
      d.updated_at
    from public.decks d
    join public.hearthstone_classes hc on hc.id = d.class_id
    join public.profiles p on p.id = d.author_id
    join public.deck_codes dc on dc.id = d.current_deck_code_id
    join public.patches patch on patch.id = dc.patch_id
    left join public.archetypes a on a.id = d.archetype_id
    left join lateral (
      select evidence.*
      from public.source_evidence evidence
      where evidence.deck_id = d.id
        and evidence.evidence_status <> 'rejected'
      order by
        case evidence.evidence_status
          when 'reviewed' then 1
          when 'source_linked' then 2
          else 3
        end,
        evidence.created_at desc
      limit 1
    ) se on true
    where d.status = 'published'
      and d.deleted_at is null
  ),
  filtered as (
    select *
    from catalog
    where (
        nullif(btrim(p_query), '') is null
        or title ilike '%' || btrim(p_query) || '%'
        or summary ilike '%' || btrim(p_query) || '%'
        or archetype_name ilike '%' || btrim(p_query) || '%'
      )
      and (nullif(p_class, '') is null or class_name = p_class)
      and (nullif(p_tag, '') is null or p_tag = any(tags))
      and (
        nullif(p_evidence, '') is null
        or (
          p_evidence = 'trusted'
          and evidence_status in ('reviewed', 'source_linked')
        )
        or evidence_status = p_evidence
      )
      and (nullif(p_source, '') is null or source_type = p_source)
      and (not p_current_patch_only or is_current_patch)
  )
  select
    count(*) over() as total_count,
    filtered.deck_id,
    filtered.slug,
    filtered.title,
    filtered.summary,
    filtered.recommended_for,
    filtered.difficulty,
    filtered.class_name,
    filtered.archetype_name,
    filtered.strategy,
    filtered.author_name,
    filtered.patch_version,
    filtered.is_current_patch,
    filtered.raw_code,
    filtered.evidence_status,
    filtered.source_type,
    filtered.source_url,
    filtered.source_name,
    filtered.claimed_rank,
    filtered.wins,
    filtered.losses,
    filtered.evidence_note,
    filtered.tags,
    filtered.recommendation_count,
    filtered.comment_count,
    filtered.copy_count,
    filtered.published_at,
    filtered.updated_at
  from filtered
  order by
    case when p_sort = 'copies' then copy_count end desc,
    case when p_sort = 'latest' then published_at end desc,
    case when p_sort = 'popular'
      then recommendation_count + comment_count
    end desc,
    case when p_sort = 'recommended' then recommendation_count end desc,
    published_at desc,
    deck_id asc
  limit greatest(1, least(coalesce(p_limit, 18), 24))
  offset greatest(coalesce(p_offset, 0), 0)
$$;

revoke all on function public.search_public_decks(
  text, text, text, text, text, boolean, text, integer, integer
) from public;

grant execute on function public.search_public_decks(
  text, text, text, text, text, boolean, text, integer, integer
) to anon, authenticated;
