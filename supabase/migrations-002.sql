-- Migración 002: curso-id de Moodle, estado de sincronización y mapa de cursos
alter table public.eventos add column if not exists moodle_course_id text;

create index if not exists idx_eventos_course on public.eventos(moodle_course_id);

-- Estado de sincronización y mapa curso→módulo
insert into public.config_grupo (clave, valor) values
  ('moodle_sync', '{"last_ok": null, "last_error": null, "error": null, "eventos": 0}'::jsonb),
  ('moodle_course_map', '{}'::jsonb)
on conflict (clave) do nothing;
