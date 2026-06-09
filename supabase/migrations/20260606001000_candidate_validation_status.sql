alter type public.deck_candidate_status
  add value if not exists 'needs_validation' before 'ready_for_review';
