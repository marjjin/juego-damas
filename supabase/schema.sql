-- Esquema para el juego de damas online.
-- Ejecutalo una vez en Supabase: SQL Editor > New query > pegar y "Run".

create table if not exists public.rooms (
  code        text primary key,
  host_id     text not null,
  host_name   text not null,
  guest_id    text,
  guest_name  text,
  status      text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  state       jsonb not null,
  move_no     integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists rooms_updated_at_idx on public.rooms (updated_at);

-- Los jugadores no tienen cuenta (solo nombre), así que el acceso es con la clave anónima.
alter table public.rooms enable row level security;

drop policy if exists "rooms_select" on public.rooms;
drop policy if exists "rooms_insert" on public.rooms;
drop policy if exists "rooms_update" on public.rooms;

create policy "rooms_select" on public.rooms for select to anon using (true);
create policy "rooms_insert" on public.rooms for insert to anon with check (true);
create policy "rooms_update" on public.rooms for update to anon using (true) with check (true);

-- Envía los cambios de la tabla por Realtime.
alter table public.rooms replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end $$;

-- Opcional: borrar salas con más de 2 días sin actividad.
-- delete from public.rooms where updated_at < now() - interval '2 days';
