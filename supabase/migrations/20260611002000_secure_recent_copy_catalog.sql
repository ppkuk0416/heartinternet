alter function public.search_public_decks(
  text, text, text, text, text, boolean, text, integer, integer
) security definer;

revoke all on function public.search_public_decks(
  text, text, text, text, text, boolean, text, integer, integer
) from public;

grant execute on function public.search_public_decks(
  text, text, text, text, text, boolean, text, integer, integer
) to anon, authenticated;
