// Constantes compartidas entre backend y frontend

export const MODULOS = [
  { id: 'ipe',    nombre: 'IPE',        color: '#8b5cf6' }, // morado
  { id: 'dwec',   nombre: 'DWEC',       color: '#3b82f6' }, // azul
  { id: 'dwes',   nombre: 'DWES',       color: '#10b981' }, // verde
  { id: 'daw',    nombre: 'DAW',        color: '#f97316' }, // naranja
  { id: 'diw',    nombre: 'DIW',        color: '#ec4899' }, // rosa
  { id: 'en',     nombre: 'Inglés',     color: '#06b6d4' }, // turquesa
  { id: 'opt',    nombre: 'Optativa',   color: '#eab308' }, // amarillo
  { id: 'proy',   nombre: 'Proyecto',   color: '#ef4444' }, // rojo
];

export const TIPOS_EVENTO = [
  { id: 'examen',   nombre: 'Examen',     icono: '📝', color: '#ef4444' },
  { id: 'entrega',  nombre: 'Entrega',    icono: '📦', color: '#f97316' },
  { id: 'apunte',   nombre: 'Apunte',     icono: '📝', color: '#3b82f6' },
  { id: 'clase',    nombre: 'Clase',      icono: '📚', color: '#10b981' },
  { id: 'reunion',  nombre: 'Reunión',    icono: '👥', color: '#8b5cf6' },
  { id: 'otro',     nombre: 'Otro',       icono: '⭐', color: '#6b7280' },
];

export const REMINDERS = [
  { id: 'none',    nombre: 'Sin recordatorio' },
  { id: '1h',      nombre: '1 hora antes' },
  { id: '1d',      nombre: '1 día antes' },
  { id: '3d',      nombre: '3 días antes' },
  { id: '1w',      nombre: '1 semana antes' },
];
