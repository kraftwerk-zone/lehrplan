-- Einmalig: Demo-Themen für alle Nutzer wiederherstellen (löscht NICHTS)
-- Nur ausführen wenn Themen fehlen.

do $$
declare
  r record;
begin
  for r in select id from auth.users where id is not null loop
    perform public.seed_curriculum_for_user(r.id);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
