import { useState, useEffect } from 'react';

// Debe coincidir con el breakpoint de index.css (640px)
const mql = window.matchMedia('(max-width: 640px)');

// true mientras la pantalla sea estrecha (móvil). Se reevalúa al rotar/redimensionar.
export default function useEsMovil() {
  const [movil, setMovil] = useState(mql.matches);
  useEffect(() => {
    const onChange = (e) => setMovil(e.matches);
    setMovil(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return movil;
}

// Bloquea el scroll del fondo mientras hay un modal o una hoja abierta (molesto en móvil)
export function useBloquearScroll(activo) {
  useEffect(() => {
    if (!activo) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previo; };
  }, [activo]);
}
