import {
  Settings, LogOut, Plus, Check, X, ChevronLeft, ChevronRight,
  Link2, TriangleAlert, Clock, CalendarDays, Sun, Moon, Monitor,
} from 'lucide-react';

/**
 * Envoltorio fino sobre lucide-react.
 * Unifica el grosor de trazo para que todos los iconos pesen lo mismo.
 */
function crear(Icono) {
  return function IconoBase({ size = 18, strokeWidth = 1.9, ...props }) {
    return <Icono size={size} strokeWidth={strokeWidth} aria-hidden="true" {...props} />;
  };
}

export const IconoAjustes = crear(Settings);
export const IconoSalir = crear(LogOut);
export const IconoMas = crear(Plus);
export const IconoCheck = crear(Check);
export const IconoCerrar = crear(X);
export const IconoIzquierda = crear(ChevronLeft);
export const IconoDerecha = crear(ChevronRight);
export const IconoEnlace = crear(Link2);
export const IconoAlerta = crear(TriangleAlert);
export const IconoReloj = crear(Clock);
export const IconoCalendario = crear(CalendarDays);
export const IconoSol = crear(Sun);
export const IconoLuna = crear(Moon);
export const IconoMonitor = crear(Monitor);
