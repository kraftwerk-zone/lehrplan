-- Lehrplan: initial schema
-- Run in Supabase SQL Editor or via: supabase db push

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.subjects (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null check (color in ('blue', 'emerald', 'amber', 'sky', 'rose')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.topics (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text not null references public.subjects (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sub_topics (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id text not null references public.topics (id) on delete cascade,
  name text not null,
  duration_in_days integer not null default 2,
  buffer_in_days integer not null default 1,
  differentiation_support text not null default '',
  differentiation_challenge text not null default '',
  points jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.materials (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  sub_topic_id text not null references public.sub_topics (id) on delete cascade,
  name text not null,
  folder text,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scheduled_blocks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id text not null,
  subject_id text not null references public.subjects (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  understanding_level integer not null default 65 check (understanding_level between 0 and 100),
  completed_sub_topics integer not null default 0,
  differentiation_support text not null default '',
  differentiation_challenge text not null default '',
  topic_snapshot jsonb not null,
  materials jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subjects_updated_at on public.subjects;
create trigger subjects_updated_at before update on public.subjects
for each row execute function public.set_updated_at();

drop trigger if exists students_updated_at on public.students;
create trigger students_updated_at before update on public.students
for each row execute function public.set_updated_at();

drop trigger if exists topics_updated_at on public.topics;
create trigger topics_updated_at before update on public.topics
for each row execute function public.set_updated_at();

drop trigger if exists sub_topics_updated_at on public.sub_topics;
create trigger sub_topics_updated_at before update on public.sub_topics
for each row execute function public.set_updated_at();

drop trigger if exists materials_updated_at on public.materials;
create trigger materials_updated_at before update on public.materials
for each row execute function public.set_updated_at();

drop trigger if exists scheduled_blocks_updated_at on public.scheduled_blocks;
create trigger scheduled_blocks_updated_at before update on public.scheduled_blocks
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.subjects enable row level security;
alter table public.students enable row level security;
alter table public.topics enable row level security;
alter table public.sub_topics enable row level security;
alter table public.materials enable row level security;
alter table public.scheduled_blocks enable row level security;

create policy "subjects: own rows"
  on public.subjects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "students: own rows"
  on public.students for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "topics: own rows"
  on public.topics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sub_topics: own rows"
  on public.sub_topics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "materials: own rows"
  on public.materials for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "scheduled_blocks: own rows"
  on public.scheduled_blocks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket for material files
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('materials', 'materials', true)
on conflict (id) do nothing;

create policy "materials storage: read"
  on storage.objects for select
  using (bucket_id = 'materials');

create policy "materials storage: upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'materials'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "materials storage: update own"
  on storage.objects for update
  using (
    bucket_id = 'materials'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "materials storage: delete own"
  on storage.objects for delete
  using (
    bucket_id = 'materials'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
