-- Migración 003: control de avisos de cierre inminente
-- Guarda el último nivel de alerta enviado por evento, para no repetir el mismo aviso
alter table public.eventos add column if not exists alerta_cierre text;

-- Niveles usados: '24h', '12h', '3h'  (null = nunca avisado)
create index if not exists idx_eventos_cierre on public.eventos(fecha_fin)
  where completado = false and tipo_id = 'entrega';
