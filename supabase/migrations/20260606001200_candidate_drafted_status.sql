alter type public.deck_candidate_status
  add value if not exists 'drafted' after 'approved';
