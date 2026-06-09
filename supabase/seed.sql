insert into public.hearthstone_classes
  (id, slug, name_ko, name_en, card_class_id, color_token, sort_order)
values
  (1, 'death-knight', '죽음의 기사', 'Death Knight', 1, 'class-death-knight', 1),
  (2, 'demon-hunter', '악마사냥꾼', 'Demon Hunter', 2, 'class-demon-hunter', 2),
  (3, 'druid', '드루이드', 'Druid', 3, 'class-druid', 3),
  (4, 'hunter', '사냥꾼', 'Hunter', 4, 'class-hunter', 4),
  (5, 'mage', '마법사', 'Mage', 5, 'class-mage', 5),
  (6, 'paladin', '성기사', 'Paladin', 6, 'class-paladin', 6),
  (7, 'priest', '사제', 'Priest', 7, 'class-priest', 7),
  (8, 'rogue', '도적', 'Rogue', 8, 'class-rogue', 8),
  (9, 'shaman', '주술사', 'Shaman', 9, 'class-shaman', 9),
  (10, 'warlock', '흑마법사', 'Warlock', 10, 'class-warlock', 10),
  (11, 'warrior', '전사', 'Warrior', 11, 'class-warrior', 11)
on conflict (id) do update set
  slug = excluded.slug,
  name_ko = excluded.name_ko,
  name_en = excluded.name_en,
  card_class_id = excluded.card_class_id,
  color_token = excluded.color_token,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.patches
  (id, version, released_at, is_current)
values
  ('00000000-0000-4000-8000-000000000356', '35.6', '2026-06-02T00:00:00Z', true)
on conflict (version) do update set
  released_at = excluded.released_at,
  is_current = excluded.is_current;

insert into public.archetypes
  (id, slug, name_ko, name_en, class_id, strategy_type)
values
  ('10000000-0000-4000-8000-000000000001', 'tempo-demon-hunter', '템포 악마사냥꾼', 'Tempo Demon Hunter', 2, 'tempo'),
  ('10000000-0000-4000-8000-000000000002', 'discover-hunter', '발견 사냥꾼', 'Discover Hunter', 4, 'midrange'),
  ('10000000-0000-4000-8000-000000000003', 'aura-paladin', '오라 성기사', 'Aura Paladin', 6, 'aggro'),
  ('10000000-0000-4000-8000-000000000004', 'dragon-warrior', '용 전사', 'Dragon Warrior', 11, 'midrange'),
  ('10000000-0000-4000-8000-000000000005', 'control-priest', '컨트롤 사제', 'Control Priest', 7, 'control'),
  ('10000000-0000-4000-8000-000000000006', 'rainbow-death-knight', '무지개 죽음의 기사', 'Rainbow Death Knight', 1, 'control')
on conflict (id) do update set
  name_ko = excluded.name_ko,
  name_en = excluded.name_en,
  class_id = excluded.class_id,
  strategy_type = excluded.strategy_type,
  is_active = true;

insert into public.tags
  (id, slug, name_ko, category, is_editorial, sort_order)
values
  ('20000000-0000-4000-8000-000000000001', 'beginner', '초보 추천', 'audience', true, 10),
  ('20000000-0000-4000-8000-000000000002', 'low-dust', '저가루', 'cost', true, 20),
  ('20000000-0000-4000-8000-000000000003', 'fast-climb', '빠른 등반', 'goal', false, 30),
  ('20000000-0000-4000-8000-000000000004', 'easy', '쉬운 운영', 'difficulty', false, 40),
  ('20000000-0000-4000-8000-000000000005', 'legend-player', '전설 유저', 'editorial', true, 50),
  ('20000000-0000-4000-8000-000000000006', 'stable', '안정적', 'goal', false, 60),
  ('20000000-0000-4000-8000-000000000007', 'control', '컨트롤', 'goal', false, 70)
on conflict (id) do update set
  name_ko = excluded.name_ko,
  category = excluded.category,
  is_editorial = excluded.is_editorial,
  is_active = true,
  sort_order = excluded.sort_order;
