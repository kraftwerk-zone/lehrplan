-- Fix: seed_curriculum_for_user bricht ab, wenn p_user_id null ist
-- (passiert im SQL-Editor bei auth.uid() ohne Login-Kontext)

create or replace function public.user_id_prefix(p_user_id uuid)
returns text
language sql
immutable
as $$
  select left(replace(p_user_id::text, '-', ''), 8);
$$;

create or replace function public.scoped_id(p_user_id uuid, raw_id text)
returns text
language sql
immutable
as $$
  select public.user_id_prefix(p_user_id) || '-' || raw_id;
$$;

create or replace function public.seed_curriculum_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s_math text;
  s_deutsch text;
  s_sachkunde text;
  s_musik text;

  t_zahlenraum text;
  t_addition text;
  t_lesen text;
  t_wetter text;
  t_rhythmus text;

  linked_topics integer;
begin
  if p_user_id is null then
    raise exception 'p_user_id ist null. Im SQL-Editor ist auth.uid() ohne JWT oft null – nutze: select id from auth.users;';
  end if;

  if auth.uid() is not null and p_user_id != auth.uid() then
    raise exception 'Forbidden';
  end if;

  delete from public.materials m
  where m.user_id = p_user_id
    and m.sub_topic_id in (
      select st.id
      from public.sub_topics st
      join public.topics t on t.id = st.topic_id and t.user_id = p_user_id
      where not exists (
        select 1 from public.subjects s
        where s.id = t.subject_id and s.user_id = p_user_id
      )
    );

  delete from public.sub_topics st
  where st.user_id = p_user_id
    and st.topic_id in (
      select t.id from public.topics t
      where t.user_id = p_user_id
        and not exists (
          select 1 from public.subjects s
          where s.id = t.subject_id and s.user_id = p_user_id
        )
    );

  delete from public.topics t
  where t.user_id = p_user_id
    and not exists (
      select 1 from public.subjects s
      where s.id = t.subject_id and s.user_id = p_user_id
    );

  if not exists (select 1 from public.subjects where user_id = p_user_id) then
    insert into public.subjects (id, user_id, name, color) values
      (public.scoped_id(p_user_id, 's-math'), p_user_id, 'Mathematik', 'blue'),
      (public.scoped_id(p_user_id, 's-deutsch'), p_user_id, 'Deutsch', 'rose'),
      (public.scoped_id(p_user_id, 's-sachkunde'), p_user_id, 'Sachunterricht', 'emerald'),
      (public.scoped_id(p_user_id, 's-musik'), p_user_id, 'Musik', 'amber'),
      (public.scoped_id(p_user_id, 's-sport'), p_user_id, 'Sport', 'sky')
    on conflict (id) do nothing;

    insert into public.students (id, user_id, name) values
      (public.scoped_id(p_user_id, 'c-1'), p_user_id, 'Anna B.'),
      (public.scoped_id(p_user_id, 'c-2'), p_user_id, 'Ben K.'),
      (public.scoped_id(p_user_id, 'c-3'), p_user_id, 'Clara M.'),
      (public.scoped_id(p_user_id, 'c-4'), p_user_id, 'David P.')
    on conflict (id) do nothing;
  end if;

  select count(*)::integer into linked_topics
  from public.topics t
  inner join public.subjects s on s.id = t.subject_id and s.user_id = p_user_id
  where t.user_id = p_user_id;

  if linked_topics > 0 then
    return;
  end if;

  s_math := coalesce(
    (select id from public.subjects where user_id = p_user_id and id = public.scoped_id(p_user_id, 's-math')),
    (select id from public.subjects where user_id = p_user_id and name = 'Mathematik' limit 1)
  );
  s_deutsch := coalesce(
    (select id from public.subjects where user_id = p_user_id and id = public.scoped_id(p_user_id, 's-deutsch')),
    (select id from public.subjects where user_id = p_user_id and name = 'Deutsch' limit 1)
  );
  s_sachkunde := coalesce(
    (select id from public.subjects where user_id = p_user_id and id = public.scoped_id(p_user_id, 's-sachkunde')),
    (select id from public.subjects where user_id = p_user_id and name = 'Sachunterricht' limit 1)
  );
  s_musik := coalesce(
    (select id from public.subjects where user_id = p_user_id and id = public.scoped_id(p_user_id, 's-musik')),
    (select id from public.subjects where user_id = p_user_id and name = 'Musik' limit 1)
  );

  t_zahlenraum := public.scoped_id(p_user_id, 't-zahlenraum');
  t_addition := public.scoped_id(p_user_id, 't-addition');
  t_lesen := public.scoped_id(p_user_id, 't-lesen');
  t_wetter := public.scoped_id(p_user_id, 't-wetter');
  t_rhythmus := public.scoped_id(p_user_id, 't-rhythmus');

  if s_math is not null then
    insert into public.topics (id, user_id, subject_id, name) values
      (t_zahlenraum, p_user_id, s_math, 'Zahlenraum 100'),
      (t_addition, p_user_id, s_math, 'Halbschriftliche Addition')
    on conflict (id) do nothing;

    insert into public.sub_topics (
      id, user_id, topic_id, name, duration_in_days, buffer_in_days,
      differentiation_support, differentiation_challenge, points, sort_order
    ) values
      (
        public.scoped_id(p_user_id, 'st-orientierung'), p_user_id, t_zahlenraum,
        'Orientierung im Hunderterfeld', 3, 1,
        'Zahlenreihe bis 20 als Brücke, Partnerarbeit',
        'Zahlenrätsel bis 1000, freie Muster erfinden',
        '{}'::jsonb, 0
      ),
      (
        public.scoped_id(p_user_id, 'st-buendeln'), p_user_id, t_zahlenraum,
        'Bündeln & Stellenwert', 4, 2,
        'Konkretes Legen mit Zehnerstangen',
        'Stellenwerttabelle bis Tausender',
        '{}'::jsonb, 1
      ),
      (
        public.scoped_id(p_user_id, 'st-add-strategien'), p_user_id, t_addition,
        'Rechenstrategien entwickeln', 5, 2,
        'Schrittweises Rechnen mit Zahlenstrahl',
        'Eigene Strategien begründen & vergleichen',
        '{}'::jsonb, 0
      )
    on conflict (id) do nothing;

    insert into public.materials (id, user_id, sub_topic_id, name) values
      (public.scoped_id(p_user_id, 'm-1'), p_user_id, public.scoped_id(p_user_id, 'st-orientierung'), 'Hunderterfeld (laminiert)'),
      (public.scoped_id(p_user_id, 'm-2'), p_user_id, public.scoped_id(p_user_id, 'st-orientierung'), 'Arbeitsblatt Zahlenreihe'),
      (public.scoped_id(p_user_id, 'm-3'), p_user_id, public.scoped_id(p_user_id, 'st-buendeln'), 'Dienes-Material'),
      (public.scoped_id(p_user_id, 'm-4'), p_user_id, public.scoped_id(p_user_id, 'st-add-strategien'), 'Rechenkonferenz-Karten')
    on conflict (id) do nothing;
  end if;

  if s_deutsch is not null then
    insert into public.topics (id, user_id, subject_id, name) values
      (t_lesen, p_user_id, s_deutsch, 'Lesen: Ganzschrift')
    on conflict (id) do nothing;

    insert into public.sub_topics (
      id, user_id, topic_id, name, duration_in_days, buffer_in_days,
      differentiation_support, differentiation_challenge, points, sort_order
    ) values
      (
        public.scoped_id(p_user_id, 'st-einstieg-buch'), p_user_id, t_lesen,
        'Einstieg & Leseerwartung', 2, 1,
        'Hörbuch parallel, reduzierte Kapitel',
        'Lesetagebuch mit Reflexionsfragen',
        '{}'::jsonb, 0
      ),
      (
        public.scoped_id(p_user_id, 'st-lesetagebuch'), p_user_id, t_lesen,
        'Lesetagebuch führen', 6, 2,
        'Satzanfänge vorgegeben',
        'Perspektivwechsel schreiben',
        '{}'::jsonb, 1
      )
    on conflict (id) do nothing;

    insert into public.materials (id, user_id, sub_topic_id, name) values
      (public.scoped_id(p_user_id, 'm-5'), p_user_id, public.scoped_id(p_user_id, 'st-einstieg-buch'), 'Klassensatz Lektüre'),
      (public.scoped_id(p_user_id, 'm-6'), p_user_id, public.scoped_id(p_user_id, 'st-lesetagebuch'), 'Vorlage Lesetagebuch')
    on conflict (id) do nothing;
  end if;

  if s_sachkunde is not null then
    insert into public.topics (id, user_id, subject_id, name) values
      (t_wetter, p_user_id, s_sachkunde, 'Wetter & Jahreszeiten')
    on conflict (id) do nothing;

    insert into public.sub_topics (
      id, user_id, topic_id, name, duration_in_days, buffer_in_days,
      differentiation_support, differentiation_challenge, points, sort_order
    ) values
      (
        public.scoped_id(p_user_id, 'st-wetter-beobachten'), p_user_id, t_wetter,
        'Wetter beobachten & messen', 4, 1,
        'Symbolkarten für Wetterphänomene',
        'Messreihe über zwei Wochen auswerten',
        '{}'::jsonb, 0
      )
    on conflict (id) do nothing;

    insert into public.materials (id, user_id, sub_topic_id, name) values
      (public.scoped_id(p_user_id, 'm-7'), p_user_id, public.scoped_id(p_user_id, 'st-wetter-beobachten'), 'Wetterstation (Set)')
    on conflict (id) do nothing;
  end if;

  if s_musik is not null then
    insert into public.topics (id, user_id, subject_id, name) values
      (t_rhythmus, p_user_id, s_musik, 'Rhythmus & Notation')
    on conflict (id) do nothing;

    insert into public.sub_topics (
      id, user_id, topic_id, name, duration_in_days, buffer_in_days,
      differentiation_support, differentiation_challenge, points, sort_order
    ) values
      (
        public.scoped_id(p_user_id, 'st-bodypercussion'), p_user_id, t_rhythmus,
        'Bodypercussion', 2, 0,
        'Feste Bewegungsmuster nachmachen',
        'Eigene Rhythmen komponieren',
        '{}'::jsonb, 0
      )
    on conflict (id) do nothing;

    insert into public.materials (id, user_id, sub_topic_id, name) values
      (public.scoped_id(p_user_id, 'm-8'), p_user_id, public.scoped_id(p_user_id, 'st-bodypercussion'), 'Rhythmuskarten')
    on conflict (id) do nothing;
  end if;
end;
$$;

grant execute on function public.seed_curriculum_for_user(uuid) to authenticated;

notify pgrst, 'reload schema';

-- Backfill mit echter User-UUID (nicht auth.uid())
do $$
declare
  r record;
begin
  for r in select id from auth.users where id is not null loop
    perform public.seed_curriculum_for_user(r.id);
  end loop;
end;
$$;
