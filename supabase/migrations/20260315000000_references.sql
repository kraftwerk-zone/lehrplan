-- Verweise pro Unterthema mit Bewertungen pro Kind (inkl. NA)

alter table public.sub_topics
  add column if not exists reference_items jsonb not null default '[]'::jsonb;

-- Legacy: alte Punkte-Tabelle in einen Verweis überführen
update public.sub_topics st
set reference_items = jsonb_build_array(
  jsonb_build_object(
    'id', 'ref-legacy-' || st.id,
    'type', 'other',
    'text', 'Übernommene Punkte',
    'ratings', st.points
  )
)
where reference_items = '[]'::jsonb
  and points is not null
  and points <> '{}'::jsonb;
