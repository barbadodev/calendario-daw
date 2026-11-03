-- Migración 001: funciones añadidas
-- Ejecutar en Supabase SQL Editor

-- 1. Columnas extra en eventos
alter table public.eventos add column if not exists completado boolean default false;
alter table public.eventos add column if not exists enlace text;
alter table public.eventos add column if not exists revisar boolean default false;
alter table public.eventos add column if not exists parent_evento uuid references public.eventos(id) on delete set null;

-- 2. Notas globales por módulo (chat de asignatura)
create table if not exists public.notas_modulo (
  id uuid primary key default gen_random_uuid(),
  modulo_id text not null,
  contenido text not null,
  autor_id uuid references public.usuarios(id),
  created_at timestamptz default now()
);
create index if not exists idx_notas_modulo on public.notas_modulo(modulo_id);

alter table public.notas_modulo enable row level security;
create policy "notas_modulo_leer" on public.notas_modulo for select using (true);
create policy "notas_modulo_insertar" on public.notas_modulo for insert with check (true);
create policy "notas_modulo_borrar" on public.notas_modulo for delete using (true);

-- 3. Config del grupo (semanas de exámenes, etc.)
create table if not exists public.config_grupo (
  id serial primary key,
  clave text unique not null,
  valor jsonb not null,
  updated_at timestamptz default now()
);
alter table public.config_grupo enable row level security;
create policy "config_leer" on public.config_grupo for select using (true);
create policy "config_escribir" on public.config_grupo for all using (true) with check (true);

-- 4. Sembrar config por defecto (semana de exámenes vacía)
insert into public.config_grupo (clave, valor)
values ('semana_examen', '{"desde": null, "hasta": null}'::jsonb)
on conflict (clave) do nothing;

alter table public.notas_modulo replica identity full;
alter publication supabase_realtime add table public.notas_modulo;
