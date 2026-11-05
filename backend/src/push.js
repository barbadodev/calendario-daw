import './load-env.js';
import { Router } from 'express';
import webpush from 'web-push';
import { supabaseAdmin } from './db.js';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export const router = Router();

router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

router.post('/suscribir', async (req, res) => {
  try {
    const { sala, usuarioId, suscripcion } = req.body;
    if (sala !== process.env.SALA_CODIGO) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { data, error } = await supabaseAdmin
      .from('suscripciones_push')
      .upsert(
        { usuario_id: usuarioId, endpoint: suscripcion.endpoint, datos: suscripcion },
        { onConflict: 'endpoint' }
      )
      .select()
      .single();

    if (error) throw error;
    res.json({ ok: true, suscripcion: data });
  } catch (err) {
    console.error('Error en POST /push/suscribir:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/push/test
// Envía una notificación de prueba a todas las suscripciones registradas.
// Body opcional: { sala, titulo, cuerpo, url }
router.post('/test', async (req, res) => {
  try {
    const { sala, titulo, cuerpo, url } = req.body || {};
    if (sala && sala !== process.env.SALA_CODIGO) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { data: subs } = await supabaseAdmin
      .from('suscripciones_push').select('id, datos, usuario_id');

    if (!subs || subs.length === 0) {
      return res.json({
        enviadas: 0,
        avisos: 0,
        msg: 'Nadie tiene suscripciones activas todavía. Abrid la PWA y pulsad "Activar notificaciones" primero.',
      });
    }

    const payload = JSON.stringify({
      titulo: titulo || '🧪 Notificación de prueba',
      cuerpo: cuerpo || 'Si ves esto, las notificaciones push están funcionando correctamente 🎉',
      url: url || null,
    });

    let enviadas = 0, avisos = 0, errores = [];

    for (const s of subs) {
      try {
        await webpush.sendNotification(s.datos, payload);
        enviadas++;
      } catch (err) {
        const detalle = {
          id: s.usuario_id,
          status: err.statusCode,
          error: err.message,
          bodyRespuesta: err.body?.slice(0, 400) || null,
          endpoint: s.datos?.endpoint?.slice(0, 50),
        };
        if (err.statusCode === 410) {
          await supabaseAdmin.from('suscripciones_push').delete().eq('id', s.id);
          avisos++;
        } else {
          errores.push(detalle);
        }
      }
    }

    res.json({ enviadas, caducadas: avisos, errores });
  } catch (err) {
    console.error('Error en POST /push/test:', err);
    res.status(500).json({ error: err.message });
  }
});

// Notifica al resto de usuarios que se ha creado/modificado/borrado algo.
// Devuelve cuántas PERSONAS (no dispositivos) recibieron el aviso.
export async function notificarCambio({ exceptoUsuarioId, titulo, cuerpo, url }) {
  const { data: usuarios } = await supabaseAdmin
    .from('usuarios').select('id').neq('id', exceptoUsuarioId || '00000000-0000-0000-0000-000000000000');

  if (!usuarios || usuarios.length === 0) return { enviadas: 0, personas: 0 };

  const payload = JSON.stringify({ titulo, cuerpo, url });
  let enviadas = 0;
  const personas = new Set();

  for (const u of usuarios) {
    const { data: subs } = await supabaseAdmin
      .from('suscripciones_push').select('id, datos').eq('usuario_id', u.id);
    for (const s of subs || []) {
      try {
        await webpush.sendNotification(s.datos, payload);
        enviadas++;
        personas.add(u.id);
      } catch (err) {
        if (err.statusCode === 410) {
          await supabaseAdmin.from('suscripciones_push').delete().eq('id', s.id);
        }
      }
    }
  }
  return { enviadas, personas: personas.size };
}

/**
 * Confirmación para QUIEN hizo la acción. Así tiene certeza de que
 * se registró y de cuántos compañeros fueron avisados de verdad.
 */
export async function confirmarAccion({ usuarioId, titulo, cuerpo, url }) {
  if (!usuarioId) return { enviadas: 0 };
  const { data: subs } = await supabaseAdmin
    .from('suscripciones_push').select('id, datos').eq('usuario_id', usuarioId);
  if (!subs || subs.length === 0) return { enviadas: 0 };

  const payload = JSON.stringify({ titulo, cuerpo, url });
  let enviadas = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(s.datos, payload);
      enviadas++;
    } catch (err) {
      if (err.statusCode === 410) {
        await supabaseAdmin.from('suscripciones_push').delete().eq('id', s.id);
      }
    }
  }
  return { enviadas };
}

async function notificarUsuario(usuarioId, titulo, cuerpo, url) {
  const { data: subs } = await supabaseAdmin
    .from('suscripciones_push')
    .select('*')
    .eq('usuario_id', usuarioId);

  if (!subs || subs.length === 0) return;

  const payload = JSON.stringify({ titulo, cuerpo, url });

  for (const s of subs) {
    try {
      await webpush.sendNotification(s.datos, payload);
    } catch (err) {
      if (err.statusCode === 410) {
        await supabaseAdmin.from('suscripciones_push').delete().eq('id', s.id);
      }
    }
  }
}

/**
 * Alerta de cierre inminente.
 * Revisa entregas pendientes cuyo plazo de cierre cae en menos de 24 h
 * y avisa una sola vez por nivel (24h → 12h → 3h), para no spamear.
 */
const NIVEL_URGENCIA = { '24h': 1, '12h': 2, '3h': 3 };

export async function revisarCierresProximos() {
  try {
    const ahora = Date.now();
    const en24h = ahora + 24 * 3600 * 1000;

    const { data: entregas } = await supabaseAdmin
      .from('eventos')
      .select('id, titulo, modulo_id, fecha_fin, fecha_inicio, alerta_cierre, enlace, moodle_url')
      .eq('tipo_id', 'entrega')
      .eq('completado', false);

    if (!entregas || entregas.length === 0) return;

    for (const ev of entregas) {
      // El cierre real es fecha_fin; si no viene, se usa la propia fecha
      const deadline = new Date(ev.fecha_fin || ev.fecha_inicio).getTime();
      if (Number.isNaN(deadline)) continue;
      if (deadline <= ahora || deadline > en24h) continue;

      const horasRestantes = (deadline - ahora) / 3600000;
      const nivel = horasRestantes <= 3 ? '3h' : horasRestantes <= 12 ? '12h' : '24h';

      // Solo se avisa si se sube de urgencia (no repetir el mismo nivel)
      const previo = NIVEL_URGENCIA[ev.alerta_cierre] || 0;
      if (NIVEL_URGENCIA[nivel] <= previo) continue;

      const mod = String(ev.modulo_id || 'otro').toUpperCase();
      const queda = nivel === '24h'
        ? `cierra en ${Math.round(horasRestantes)} h`
        : nivel === '12h'
          ? `⚠️ cierra en ${Math.round(horasRestantes)} h`
          : `🚨 cierra en ${Math.max(1, Math.round(horasRestantes))} h`;

      const { enviadas } = await notificarTodos({
        titulo: `⏰ ${mod}: ${queda}`,
        cuerpo: `${ev.titulo} — ¿ya lo subiste a Moodle?`,
        url: ev.moodle_url || ev.enlace || 'https://calendario-daw-1.onrender.com',
      });

      if (enviadas > 0) {
        await supabaseAdmin.from('eventos').update({ alerta_cierre: nivel }).eq('id', ev.id);
        console.log(`⏰ Alerta de cierre [${nivel}] → ${ev.titulo} (${enviadas} disp.)`);
      }
    }
  } catch (err) {
    console.error('Error revisando cierres:', err.message);
  }
}

// Envía a TODO el grupo (a diferencia de notificarCambio, que excluye al autor)
export async function notificarTodos({ titulo, cuerpo, url }) {
  const { data: subs } = await supabaseAdmin.from('suscripciones_push').select('id, datos');
  if (!subs || subs.length === 0) return { enviadas: 0 };

  const payload = JSON.stringify({ titulo, cuerpo, url });
  let enviadas = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(s.datos, payload);
      enviadas++;
    } catch (err) {
      if (err.statusCode === 410) {
        await supabaseAdmin.from('suscripciones_push').delete().eq('id', s.id);
      }
    }
  }
  return { enviadas };
}

export async function enviarNotificacionesRecordatorio() {
  try {
    const ahora = new Date();
    const hasta = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { data: eventos } = await supabaseAdmin
      .from('eventos')
      .select('*')
      .gte('fecha_inicio', ahora.toISOString())
      .lte('fecha_inicio', hasta.toISOString());

    if (!eventos) return;

    for (const ev of eventos) {
      const inicio = new Date(ev.fecha_inicio);
      const msHastaEvento = inicio.getTime() - ahora.getTime();
      const minutos = msHastaEvento / 60_000;

      let notificar = false;
      let etiqueta = '';

      // Ventana de 5 min: el bucle corre cada 5 min, así que un rango mayor
      // repetiría el mismo aviso una y otra vez durante la hora previa.
      if (minutos > 55 && minutos <= 60) {
        notificar = true;
        etiqueta = '1h antes';
      } else if (minutos > 24 * 60 - 5 && minutos <= 24 * 60) {
        notificar = true;
        etiqueta = '1 día antes';
      } else if (minutos > 3 * 24 * 60 - 5 && minutos <= 3 * 24 * 60) {
        notificar = true;
        etiqueta = '3 días antes';
      } else if (minutos > 7 * 24 * 60 - 5 && minutos <= 7 * 24 * 60) {
        notificar = true;
        etiqueta = '1 semana antes';
      }

      if (notificar) {
        console.log(`🔔 Recordatorio [${etiqueta}]: ${ev.titulo}`);
        const { data: usuarios } = await supabaseAdmin
          .from('usuarios')
          .select('id');

        for (const u of usuarios) {
          await notificarUsuario(
            u.id,
            `📅 ${ev.titulo}`,
            `${etiqueta} · ${ev.descripcion || 'Evento en el calendario'}`,
            ev.moodle_url
          );
        }
      }
    }
  } catch (err) {
    console.error('Error enviando recordatorios:', err);
  }
}
