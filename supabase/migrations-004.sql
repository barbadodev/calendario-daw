-- Migración 004: identificación individual de dispositivos push
alter table public.suscripciones_push add column if not exists etiqueta text;
alter table public.suscripciones_push add column if not exists plataforma text;
alter table public.suscripciones_push add column if not exists ultima_vez timestamptz;
