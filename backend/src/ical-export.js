import './load-env.js';
import { Router } from 'express';
import { supabaseAdmin } from './db.js';

export const router = Router();

// iCal export con colores por módulo para Apple Calendar
const COLORES = {
  ipe:  { hex: '#8b5cf6', apple: 'purple' },
  dwec: { hex: '#3b82f6', apple: 'blue' },
  dwes: { hex: '#10b981', apple: 'green' },
  daw:  { hex: '#f97316', apple: 'orange' },
  diw:  { hex: '#ec4899', apple: 'pink' },
  en:   { hex: '#06b6d4', apple: 'cyan' },
  opt:  { hex: '#eab308', apple: 'yellow' },
  proy: { hex: '#ef4444', apple: 'red' },
  otro: { hex: '#6b7280', apple: 'gray' },
};

// Colores de Apple Calendar soportados por X-APPLE-CALENDAR-COLOR
const APPLE_COLOR = {
  purple: '1', blue: '2', green: '3', orange: '4', pink: '5',
  red: '6', yellow: '7', gray: '0',
};

function prefix(ev) {
  const t = ev.tipo_id === 'examen' ? '📝 ' : ev.tipo_id === 'entrega' ? '📦 ' : '';
  const estado = ev.completado ? ' ✅' : '';
  return `${t}[${ev.modulo_id?.toUpperCase()}] ${ev.titulo}${estado}`;
}

router.get('/ics', async (req, res) => {
  try {
    const { sala } = req.query;
    if (sala !== process.env.SALA_CODIGO) {
      return res.status(401).send('No autorizado');
    }

    const { data: eventos } = await supabaseAdmin
      .from('eventos').select('*').order('fecha_inicio', { ascending: true });

    const lineas = [];
    lineas.push('BEGIN:VCALENDAR');
    lineas.push('VERSION:2.0');
    lineas.push('PRODID:-//Calendario DAW 2//ES');
    lineas.push('CALSCALE:GREGORIAN');
    lineas.push('METHOD:PUBLISH');
    lineas.push('X-WR-CALNAME:Calendario DAW 2º Córdoba');
    lineas.push('X-WR-TIMEZONE:Europe/Madrid');
    lineas.push('REFRESH-INTERVAL;VALUE=DURATION:PT1H');
    lineas.push('X-PUBLISHED-TTL:PT1H');

    const nowIcs = toICSDate(new Date());
    for (const ev of eventos || []) {
      lineas.push('BEGIN:VEVENT');
      lineas.push(`UID:${ev.id}@calendario-daw`);
      lineas.push(`DTSTAMP:${nowIcs}`);

      if (ev.todo_el_dia) {
        const f = new Date(ev.fecha_inicio);
        const fStr = f.toISOString().slice(0, 10).replace(/-/g, '');
        const fFin = new Date(f.getTime() + 24 * 60 * 60 * 1000);
        const fFinStr = fFin.toISOString().slice(0, 10).replace(/-/g, '');
        lineas.push(`DTSTART;VALUE=DATE:${fStr}`);
        lineas.push(`DTEND;VALUE=DATE:${fFinStr}`);
      } else {
        lineas.push(`DTSTART:${toICSDate(new Date(ev.fecha_inicio))}`);
        lineas.push(`DTEND:${toICSDate(ev.fecha_fin ? new Date(ev.fecha_fin) : new Date(new Date(ev.fecha_inicio).getTime() + 60 * 60 * 1000))}`);
      }

      lineas.push(`SUMMARY:${escapeICS(prefix(ev))}`);
      if (ev.descripcion) lineas.push(`DESCRIPTION:${escapeICS(ev.descripcion)}`);

      // URL para abrir en el navegador
      const urlFinal = ev.enlace || ev.moodle_url;
      if (urlFinal) {
        lineas.push(`URL:${escapeICS(urlFinal)}`);
        lineas.push(`LOCATION:${escapeICS(urlFinal)}`);
      }

      const cat = COLORES[ev.modulo_id] || COLORES.otro;
      lineas.push(`CATEGORIES:${ev.modulo_id?.toUpperCase() || 'OTRO'}`);

      // Color específico de Apple Calendar por evento
      lineas.push(`X-APPLE-CALENDAR-COLOR:${appleColor(cat.apple)}`);

      // Un evento pendiente no es "provisional": en Google/Apple TENTATIVE
      // lo pinta rayado y con hora dudosa.
      lineas.push('STATUS:CONFIRMED');

      // Recordatorio 1 día antes (VEVALARM)
      if (!ev.completado && new Date(ev.fecha_inicio) > new Date()) {
        lineas.push('BEGIN:VALARM');
        lineas.push('TRIGGER:-P1D');
        lineas.push('ACTION:DISPLAY');
        lineas.push(`DESCRIPTION:${escapeICS('📅 ' + ev.titulo + ' - mañana')}`);
        lineas.push('END:VALARM');
      }

      lineas.push('END:VEVENT');
    }

    lineas.push('END:VCALENDAR');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="calendario-daw.ics"');
    res.send(lineas.map(plegar).join('\r\n'));
  } catch (err) {
    console.error('Error ICS export:', err);
    res.status(500).send('Error');
  }
});

function appleColor(nombre) {
  return APPLE_COLOR[nombre] || '0';
}

function toICSDate(d) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICS(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r/g, '');
}

/**
 * RFC 5545: ninguna línea debe pasar de 75 octetos. Las continuaciones
 * empiezan por un espacio (que también cuenta). Sin esto, una descripción
 * larga rompe el calendario en algunos clientes.
 */
function plegar(linea) {
  const trozos = [];
  let actual = '';
  for (const ch of String(linea)) {
    const ancho = Buffer.byteLength(actual, 'utf8') + Buffer.byteLength(ch, 'utf8');
    if (ancho > 75) {
      trozos.push(actual);
      actual = ' ';
    }
    actual += ch;
  }
  trozos.push(actual);
  return trozos.join('\r\n');
}
