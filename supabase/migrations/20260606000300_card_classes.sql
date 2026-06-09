create table public.card_classes (
  card_id uuid not null references public.cards(id) on delete cascade,
  class_id smallint not null references public.hearthstone_classes(id) on delete restrict,
  primary key (card_id, class_id)
);

create index card_classes_class_idx
  on public.card_classes (class_id, card_id);

alter table public.card_classes enable row level security;

create policy "active card classes are public"
on public.card_classes for select
using (
  exists (
    select 1
    from public.cards
    where cards.id = card_classes.card_id
      and cards.is_active
  )
);

grant select on public.card_classes to anon, authenticated;
