// Estilos visuales. Se aplican con data-estilo en <html> y se recuerdan.
// Cada estilo redefine los tokens y añade sus propias reglas en estilos.css

export const ESTILOS = [
  { id: 'limpio',      nombre: 'Actual',        descripcion: 'Sobrio, glass suave' },
  { id: 'glass',       nombre: 'Vision Glass',  descripcion: 'Vidro forte + aurora' },
  { id: 'neobrutalo',  nombre: 'Neobrutalismo', descripcion: 'Bordes gruesos y sombras duras' },
  { id: 'hud',         nombre: 'HUD Neón',      descripcion: 'Panel técnico oscuro' },
];

const CLAVE = 'caldaw_estilo';

export function estiloActual() {
  const guardado = localStorage.getItem(CLAVE);
  return ESTILOS.some(e => e.id === guardado) ? guardado : 'limpio';
}

export function setEstilo(id) {
  const valido = ESTILOS.some(e => e.id === id) ? id : 'limpio';
  localStorage.setItem(CLAVE, valido);
  document.documentElement.dataset.estilo = valido;
  return valido;
}

export function initEstilo() {
  document.documentElement.dataset.estilo = estiloActual();
}
