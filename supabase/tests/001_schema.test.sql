begin;
select plan(42);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'decks', 'decks table exists');
select has_table('public', 'deck_codes', 'deck_codes table exists');
select has_table('public', 'deck_cards', 'deck_cards table exists');
select has_table('public', 'card_classes', 'multi-class card relation exists');
select has_table('public', 'source_evidence', 'source evidence table exists');
select has_table('public', 'comments', 'comments table exists');
select has_table('public', 'comment_likes', 'comment helpful reactions table exists');
select has_table('public', 'reports', 'reports table exists');
select has_table('public', 'moderation_audits', 'moderation audit table exists');
select has_table('public', 'deck_tracking_sources', 'deck tracking sources exist');
select has_table('public', 'deck_tracking_runs', 'deck tracking runs exist');
select has_table('public', 'deck_candidates', 'deck candidate queue exists');
select has_table('public', 'deck_candidate_observations', 'candidate observations exist');
select has_table('public', 'patch_transitions', 'patch transition audit exists');

select col_is_pk('public', 'deck_likes', array['user_id', 'deck_id'], 'recommendations are unique per user and deck');
select col_is_pk('public', 'favorites', array['user_id', 'deck_id'], 'favorites are unique per user and deck');
select col_is_pk('public', 'comment_likes', array['user_id', 'comment_id'], 'helpful reactions are unique per user and comment');
select has_index('public', 'patches', 'patches_one_current_idx', 'only one current patch index exists');
select has_index('public', 'deck_codes', 'deck_codes_hash_idx', 'deck code hash index exists');
select has_index('public', 'decks', 'decks_published_idx', 'published deck index exists');
select has_index('public', 'reports', 'reports_open_idx', 'open report index exists');
select has_index('public', 'deck_candidates', 'deck_candidates_review_queue_idx', 'candidate review queue index exists');
select has_index('public', 'deck_candidates', 'deck_candidates_validation_queue_idx', 'candidate validation queue index exists');
select has_index('public', 'decks', 'decks_public_trending_idx', 'public trend ordering index exists');

select policies_are(
  'public',
  'decks',
  array['published decks are public', 'users create own drafts', 'authors update own decks'],
  'deck RLS policies are explicit'
);
select policies_are(
  'public',
  'favorites',
  array['users see own favorites', 'users save own favorites', 'users remove own favorites'],
  'favorites remain owner-only'
);
select policies_are(
  'public',
  'reports',
  array['users see own reports', 'users create own reports', 'moderators update reports'],
  'report policies separate user and moderator access'
);
select policies_are(
  'public',
  'source_evidence',
  array[
    'published evidence is public',
    'authors manage evidence',
    'authors update unreviewed evidence',
    'moderators review evidence'
  ],
  'evidence review is separated from author edits'
);
select policies_are(
  'public',
  'card_classes',
  array['active card classes are public'],
  'active multi-class memberships are public'
);

select function_returns('public', 'record_deck_copy', array['uuid', 'text'], 'boolean', 'copy recorder returns whether a unique event was stored');
select function_returns('public', 'is_moderator', array[]::text[], 'boolean', 'moderator helper returns boolean');
select has_function(
  'public',
  'search_public_decks',
  array['text', 'text', 'text', 'text', 'text', 'boolean', 'text', 'integer', 'integer'],
  'public deck catalog query exists'
);
select has_function(
  'public',
  'review_deck_candidate',
  array['uuid', 'deck_candidate_status', 'uuid', 'text'],
  'moderator candidate review function exists'
);
select has_function(
  'public',
  'create_deck_candidate_draft',
  array[
    'uuid', 'text', 'text', 'text', 'deck_difficulty', 'text', 'text',
    'text', 'text', 'text', 'text', 'integer', 'jsonb'
  ],
  'approved candidate draft creation function exists'
);
select has_function(
  'public',
  'activate_hearthstone_patch',
  array['text', 'timestamptz', 'text', 'boolean'],
  'service patch activation function exists'
);
select has_function(
  'public',
  'resolve_content_report',
  array['uuid', 'text', 'text'],
  'moderator report resolution function exists'
);
select has_column(
  'public',
  'deck_candidates',
  'code_validation_status',
  'candidate code validation status exists'
);
select trigger_is('public', 'deck_codes', 'deck_codes_immutable', 'public', 'protect_immutable_deck_code', 'deck code versions are immutable');
select trigger_is('public', 'deck_cards', 'deck_cards_validate_total', 'public', 'validate_deck_card_total', 'card rows must match deck card count');
select trigger_is('public', 'decks', 'decks_validate_active_code', 'public', 'validate_active_deck_code', 'published deck active code is validated');
select trigger_is('public', 'comment_likes', 'comment_likes_update_count', 'public', 'update_comment_helpful_count', 'comment helpful counts are maintained by trigger');

select * from finish();
rollback;
