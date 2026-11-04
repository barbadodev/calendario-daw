import {
  ClipboardList, Package, NotebookPen, BookOpen, Users, Star,
  CalendarDays, GraduationCap, Link2, TriangleAlert, Siren, Clock,
  Settings, LogOut, MessageSquare, BarChart3, RefreshCw, Download,
  Info, Share2, Bell, Sun, Moon, Monitor, Check, Plus, X, Zap,
} from 'lucide-react';

/** Icono por tipo de evento. Sustituye a los emojis anteriores. */
export const ICONO_TIPO = {
  examen:  ClipboardList,
  entrega: Package,
  apunte:  NotebookPen,
  clase:   BookOpen,
  reunion: Users,
  otro:    Star,
};

export function IconoTipo({ tipoId, size = 14, className = '', strokeWidth = 2 }) {
  const Icono = ICONO_TIPO[tipoId] || Star;
  return <Icono size={size} className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}

export const ICONOS = {
  CalendarDays, GraduationCap, Link2, TriangleAlert, Siren, Clock,
  Settings, LogOut, MessageSquare, BarChart3, RefreshCw, Download,
  Info, Share2, Bell, Sun, Moon, Monitor, Check, Plus, X, Zap, Users, BookOpen,
};
