import './load-env.js';
import { Router } from 'express';
import { supabaseAdmin } from './db.js';

export const router = Router();

// GET /api/export/ics?sala=xxx&token=<sala_code>
// Devuelve un calendario iCal generado desde nuestros eventos.
// Se puede pegar en Google Calendar → "Crear calendario desde URL"
// y aparecerá integrado junto al resto.
router.get('/ics', async (req, res) => {
  try {
    const { sala } = req.query;
    if (sala !== process.env.SALA_CODIGO) {
      return res.status(401).send('No autorizado');
    }

    const { data: eventos } = await supabaseAdmin
      .from('eventos')
      .select('*')
      .order('fecha_inicio', { ascending: true });

    // iCal standard
    const lineas = [];
    lineas.push('BEGIN:VCALENDAR');
    lineas.push('VERSION:2.0');
    lineas.push('PRODID:-//Calendario DAW 2//ES');
    lineas.push('CALSCALE:GREGORIAN');
    lineas.push('METHOD:PUBLISH');
    lineas.push('X-WR-CALNAME:Calendario DAW 2º Córdoba');
    lineas.push('X-WR-TIMEZONE:Europe/Madrid');

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
      if (ev.enlace) lineas.push(`URL:${escapeICS(ev.enlace)}`);
      lineas.push(`CATEGORIES:${ev.modulo_id?.toUpperCase() || 'OTRO'}`);
      lineas.push(`STATUS:${ev.completado ? 'CONFIRMED' : 'TENTATIVE'}`);
      lineas.push('END:VEVENT');
    }

    lineas.push('END:VCALENDAR');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="calendario-daw.ics"');
    res.send(lineas.join('\r\n'));
  } catch (err) {
    console.error('Error ICS export:', err);
    res.status(500).send('Error');
  }
});

function prefix(ev) {
  const t = ev.tipo_id === 'examen' ? '📝 ' : ev.tipo_id === 'entrega' ? '📦 ' : '';
  const estado = ev.completado ? ' ✅' : '';
  return `${t}[${ev.modulo_id?.toUpperCase()}] ${ev.titulo}${estado}`;
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
