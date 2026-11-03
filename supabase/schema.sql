-- Esquema para Calendario DAW
-- Ejecutar en Supabase SQL Editor

-- Tabla de usuarios (sin email ni contraseña)
create table public.usuarios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  codigo_sala text not null,
  color_personal text,
  created_at timestamptz default now(),
  last_seen timestamptz default now()
);

-- Eventos del calendario (manuales y sincronizados)
create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  modulo_id text not null,
  tipo_id text not null default 'otro',
  fecha_inicio timestamptz not null,
  fecha_fin timestamptz,
  todo_el_dia boolean default false,
  origen text default 'manual', -- 'manual' | 'moodle'
  moodle_uid text unique, -- UID del evento en Moodle (si es sincronizado)
  moodle_url text,
  adjuntos jsonb default '[]'::jsonb,
  creado_por uuid references public.usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Notas/apuntes de clase asociadas a eventos
create table public.notas_evento (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references public.eventos(id) on delete cascade,
  autor_id uuid references public.usuarios(id),
  contenido text not null,
  created_at timestamptz default now()
);

-- Suscripciones push por usuario
create table public.suscripciones_push (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.usuarios(id) on delete cascade,
  endpoint text unique not null,
  datos jsonb,
  created_at timestamptz default now()
);

-- Recordatorios configurables por usuario
create table public.recordatorios_usuario (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.usuarios(id) on delete cascade,
  reminder_id text not null, -- '1h', '1d', '3d', '1w'
  activo boolean default true,
  constraint fk_usuario foreign key (usuario_id) references public.usuarios(id)
);

-- Índices
create index idx_eventos_fecha on public.eventos(fecha_inicio);
create index idx_eventos_modulo on public.eventos(modulo_id);
create index idx_usuarios_sala on public.usuarios(codigo_sala);
create index idx_moodle_uid on public.eventos(moodle_uid);

-- Habilitar Realtime para las tablas principales
alter publication supabase_realtime add table public.eventos;
alter publication supabase_realtime add table public.notas_evento;
alter publication supabase_realtime add table public.usuarios;

-- Política de seguridad: todos los usuarios autenticados pueden leer/escribir
-- En una app simple de 3 personas con código de sala, usamos la service key en el backend
-- y las RLS en el frontend solo para proteger contra acceso externo
alter table public.usuarios enable row level security;
alter table public.eventos enable row level security;
alter table public.notas_evento enable row level security;

-- Políticas abiertas (se valida el código de sala en el backend)
create policy "lectura_abierta" on public.usuarios for select using (true);
create policy "insercion_abierta" on public.usuarios for insert with check (true);
create policy "actualizacion_abierta" on public.usuarios for update using (true);

create policy "eventos_leer" on public.eventos for select using (true);
create policy "eventos_insertar" on public.eventos for insert with check (true);
create policy "eventos_actualizar" on public.eventos for update using (true) with check (true);
create policy "eventos_borrar" on public.eventos for delete using (true);

create policy "notas_leer" on public.notas_evento for select using (true);
create policy "notas_insertar" on public.notas_evento for insert with check (true);
create policy "notas_actualizar" on public.notas_evento for update using (true) with check (true);
create policy "notas_borrar" on public.notas_evento for delete using (true);

create policy "subs_leer" on public.suscripciones_push for select using (true);
create policy "subs_insertar" on public.suscripciones_push for insert with check (true);
create policy "subs_borrar" on public.suscripciones_push for delete using (true);
