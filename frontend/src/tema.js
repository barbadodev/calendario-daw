// Sistema de tema claro/oscuro.
// Se guarda en localStorage y respeta la preferencia del sistema si no hay elección.

const CLAVE = 'caldaw_tema';

export function temaPreferido() {
  const guardado = localStorage.getItem(CLAVE);
  if (guardado === 'claro' || guardado === 'oscuro') return guardado;
  const prefiereClaro = window.matchMedia?.('(prefers-color-scheme: light)').matches;
  return prefiereClaro ? 'claro' : 'oscuro';
}

export function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
  document.documentElement.style.colorScheme = tema === 'claro' ? 'light' : 'dark';
  // El color de la barra del navegador en el móvil (manifest/theme-color)
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', tema === 'claro' ? '#f8fafc' : '#0f172a');
}

export function initTema() {
  aplicarTema(temaPreferido());
  // Si el sistema cambia y el usuario no ha elegido, seguimos al sistema
  window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', () => {
    if (!localStorage.getItem(CLAVE)) aplicarTema(temaPreferido());
  });
}

export function setTema(tema) {
  localStorage.setItem(CLAVE, tema);
  aplicarTema(tema);
}

/** 'sistema' borra la elección y vuelve a seguir al SO. */
export function setModo(modo) {
  if (modo === 'sistema') localStorage.removeItem(CLAVE);
  else localStorage.setItem(CLAVE, modo);
  aplicarTema(temaPreferido());
}

export function modoActual() {
  return localStorage.getItem(CLAVE) || 'sistema';
}

export function temaActual() {
  return document.documentElement.dataset.tema || 'oscuro';
}
