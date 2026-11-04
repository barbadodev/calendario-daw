// Fuente única de módulos, tipos y utilidades de color.

export const MODULOS = [
  { id: 'ipe',  nombre: 'IPE',      color: '#6a5a9e' },
  { id: 'dwec', nombre: 'DWEC',     color: '#3f6fa8' },
  { id: 'dwes', nombre: 'DWES',     color: '#3d7a5c' },
  { id: 'daw',  nombre: 'DAW',      color: '#a85f33' },
  { id: 'diw',  nombre: 'DIW',      color: '#a1517a' },
  { id: 'en',   nombre: 'Inglés',   color: '#3d7f8c' },
  { id: 'opt',  nombre: 'Optativa', color: '#8a6a26' },
  { id: 'proy', nombre: 'Proyecto', color: '#a04a44' },
];

export const TIPOS = [
  { id: 'examen',  nombre: 'Examen' },
  { id: 'entrega', nombre: 'Entrega' },
  { id: 'apunte',  nombre: 'Apunte / nota del profesor' },
  { id: 'clase',   nombre: 'Clase' },
  { id: 'reunion', nombre: 'Reunión de grupo' },
  { id: 'otro',    nombre: 'Otro' },
];

export const NOMBRE_TIPO = Object.fromEntries(TIPOS.map(t => [t.id, t.nombre]));

export function getModulo(id) {
  return MODULOS.find(m => m.id === id) || {
    id,
    nombre: id ? String(id).toUpperCase() : 'OTRO',
    color: '#74716a',
  };
}

/** Devuelve el color en rgba con la transparencia indicada (para fondos suaves). */
export function tinte(hex, alfa) {
  const limpio = String(hex).replace('#', '');
  const completo = limpio.length === 3
    ? limpio.split('').map(c => c + c).join('')
    : limpio;
  const r = parseInt(completo.slice(0, 2), 16);
  const g = parseInt(completo.slice(2, 4), 16);
  const b = parseInt(completo.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alfa})`;
}
