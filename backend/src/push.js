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

// --- Helpers de Fecha y Hora en España (Europe/Madrid) ---

function getInfoTiempoMadrid() {
  const ahora = new Date();
  const partes = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(ahora);

  const obj = {};
  for (const p of partes) obj[p.type] = p.value;
  const hoyStr = `${obj.year}-${obj.month}-${obj.day}`;
  const hora = parseInt(obj.hour, 10);
  const minuto = parseInt(obj.minute, 10);
  return { ahora, hoyStr, hora, minuto };
}

function getFechaStrMadrid(date) {
  const partes = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const obj = {};
  for (const p of partes) obj[p.type] = p.value;
  return `${obj.year}-${obj.month}-${obj.day}`;
}

function getHoraStrMadrid(date) {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function diffDias(fechaStrA, fechaStrB) {
  const a = new Date(`${fechaStrA}T00:00:00Z`);
  const b = new Date(`${fechaStrB}T00:00:00Z`);
  return Math.round((b.getTime() - a.getTime()) / (24 * 3600 * 1000));
}

function formatFechaHumana(date) {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

async function leerConfig(clave, porDefecto = null) {
  try {
    const { data } = await supabaseAdmin.from('config_grupo').select('valor').eq('clave', clave).single();
    return data?.valor ?? porDefecto;
  } catch {
    return porDefecto;
  }
}

async function escribirConfig(clave, valor) {
  try {
    await supabaseAdmin.from('config_grupo')
      .upsert({ clave, valor, updated_at: new Date().toISOString() }, { onConflict: 'clave' });
  } catch (err) {
    console.error('Error guardando config:', err.message);
  }
}

/**
 * Niveles de urgencia para evitar repetir el mismo aviso o uno de menor rango.
 */
const NIVELES_ALERTA = {
  'aviso_4d': 1,
  'aviso_3d': 2,
  'aviso_2d': 3,
  'aviso_1d': 4,
  'hoy_manana': 5,
  'hoy_6h': 6,
  'hoy_3h': 7,
  'hoy_1h': 8,
};

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

/**
 * Motor central de recordatorios inteligentes:
 * 1. Resumen matinal (09:00 AM): lista tareas/exámenes de los próximos 3-4 días no completados.
 * 2. Aviso del día previo: se envía por la mañana (09:00), no a la hora nocturna de entrega.
 * 3. Escalada intradía el día de la entrega (si no está completada):
 *    - 09:00 AM: ¡Vence HOY!
 *    - 6 horas antes: Recordatorio de tarde
 *    - 3 horas antes: Urgente
 *    - 1 hora antes: Última hora
 * 4. Si el alumno marca la tarea como hecha (completado = true), no recibe ni un aviso más.
 */
export async function revisarAlertasYRecordatorios({ forzarDigest = false } = {}) {
  try {
    const { ahora, hoyStr, hora } = getInfoTiempoMadrid();
    const esHoraManana = (hora >= 9 && hora < 14) || forzarDigest;

    // Buscar entregas y exámenes NO completados
    const { data: eventos, error } = await supabaseAdmin
      .from('eventos')
      .select('id, titulo, modulo_id, fecha_fin, fecha_inicio, alerta_cierre, enlace, moodle_url, tipo_id, completado')
      .in('tipo_id', ['entrega', 'examen'])
      .eq('completado', false);

    if (error) throw error;
    if (!eventos || eventos.length === 0) return;

    // Analizar fechas límite respecto al tiempo actual en Madrid
    const pendientes = eventos
      .map(ev => {
        const deadline = new Date(ev.fecha_fin || ev.fecha_inicio);
        const msRestantes = deadline.getTime() - ahora.getTime();
        const fechaLimiteStr = getFechaStrMadrid(deadline);
        const diasRestantes = diffDias(hoyStr, fechaLimiteStr);
        const horasRestantes = msRestantes / 3600000;
        const horaFin = getHoraStrMadrid(deadline);
        const mod = String(ev.modulo_id || 'otro').toUpperCase();
        const fechaHumana = formatFechaHumana(deadline);
        return {
          ...ev,
          deadline,
          msRestantes,
          diasRestantes,
          horasRestantes,
          horaFin,
          mod,
          fechaHumana,
        };
      })
      .filter(e => e.msRestantes > 0); // Descartar los ya vencidos

    // --- 1. RESUMEN MATINAL (09:00 AM) ---
    // Avisa 3 o 4 días antes listando las tareas no completadas para llevar todo al día.
    if (esHoraManana) {
      const ultimoDigest = await leerConfig('resumen_matinal_fecha', null);
      if (ultimoDigest !== hoyStr || forzarDigest) {
        // Tareas y exámenes en los próximos 4 días
        const proximos = pendientes
          .filter(e => e.diasRestantes >= 0 && e.diasRestantes <= 4)
          .sort((a, b) => a.msRestantes - b.msRestantes);

        if (proximos.length === 1) {
          const p = proximos[0];
          let tituloNotif, cuerpoNotif;
          if (p.diasRestantes === 0) {
            tituloNotif = `🚨 ¡VENCE HOY! (${p.mod}): ${p.titulo}`;
            cuerpoNotif = `Cierra hoy a las ${p.horaFin}. Aún la tienes pendiente.`;
          } else if (p.diasRestantes === 1) {
            tituloNotif = `⚠️ MAÑANA VENCE (${p.mod}): ${p.titulo}`;
            cuerpoNotif = `Plazo hasta mañana a las ${p.horaFin}. Recuerda completarla.`;
          } else {
            tituloNotif = `📅 Vence en ${p.diasRestantes} días (${p.mod}): ${p.titulo}`;
            cuerpoNotif = `Límite: ${p.fechaHumana}. Tienes pendiente completarla.`;
          }
          await notificarTodos({
            titulo: tituloNotif,
            cuerpo: cuerpoNotif,
            url: p.moodle_url || p.enlace || 'https://calendario-daw-1.onrender.com',
          });
          const nivel = p.diasRestantes === 0 ? 'hoy_manana' : p.diasRestantes === 1 ? 'aviso_1d' : `aviso_${p.diasRestantes}d`;
          await supabaseAdmin.from('eventos').update({ alerta_cierre: nivel }).eq('id', p.id);
          console.log(`📋 Aviso matinal individual [${nivel}] → ${p.titulo}`);
        } else if (proximos.length > 1) {
          const lineas = proximos.slice(0, 4).map(e => {
            const cuando = e.diasRestantes === 0
              ? `HOY ${e.horaFin}`
              : e.diasRestantes === 1
                ? `mañana ${e.horaFin}`
                : `en ${e.diasRestantes}d`;
            return `• [${e.mod}] ${e.titulo.slice(0, 30)} (${cuando})`;
          });
          const extra = proximos.length > 4 ? `\n(+ ${proximos.length - 4} más)` : '';
          await notificarTodos({
            titulo: `📋 ${proximos.length} tareas pendientes próximas`,
            cuerpo: `${lineas.join('\n')}${extra}`,
            url: 'https://calendario-daw-1.onrender.com',
          });
          // Actualizar marcas de aviso en las tareas incluidas
          for (const p of proximos) {
            const nivel = p.diasRestantes === 0 ? 'hoy_manana' : p.diasRestantes === 1 ? 'aviso_1d' : `aviso_${p.diasRestantes}d`;
            const previo = NIVELES_ALERTA[p.alerta_cierre] || 0;
            if ((NIVELES_ALERTA[nivel] || 0) > previo) {
              await supabaseAdmin.from('eventos').update({ alerta_cierre: nivel }).eq('id', p.id);
            }
          }
          console.log(`📋 Resumen matinal enviado con ${proximos.length} tareas pendientes`);
        }

        await escribirConfig('resumen_matinal_fecha', hoyStr);
      }
    }

    // --- 2. ESCALADA INTRADÍA Y AVISOS URGENTES ---
    // Si una tarea vence hoy y NO se completa, se envían varios avisos progresivos.
    for (const ev of pendientes) {
      const prioridad = NIVELES_ALERTA[ev.alerta_cierre] || 0;

      // El día de hoy (cierra hoy)
      if (ev.diasRestantes === 0) {
        // Menos de 1 hora
        if (ev.horasRestantes <= 1 && prioridad < NIVELES_ALERTA['hoy_1h']) {
          await notificarTodos({
            titulo: `🚨 ¡ÚLTIMA HORA! (${ev.mod}): ${ev.titulo}`,
            cuerpo: `Cierra en menos de 1 h (${ev.horaFin}). ¿Ya la has subido? Entrégala ya.`,
            url: ev.moodle_url || ev.enlace || 'https://calendario-daw-1.onrender.com',
          });
          await supabaseAdmin.from('eventos').update({ alerta_cierre: 'hoy_1h' }).eq('id', ev.id);
          console.log(`🚨 Alerta crítica [hoy_1h] → ${ev.titulo}`);
          continue;
        }

        // Menos de 3 horas
        if (ev.horasRestantes <= 3 && prioridad < NIVELES_ALERTA['hoy_3h']) {
          await notificarTodos({
            titulo: `⚠️ ¡Quedan 3h! (${ev.mod}): ${ev.titulo}`,
            cuerpo: `Cierra hoy a las ${ev.horaFin}. No lo dejes para el último momento.`,
            url: ev.moodle_url || ev.enlace || 'https://calendario-daw-1.onrender.com',
          });
          await supabaseAdmin.from('eventos').update({ alerta_cierre: 'hoy_3h' }).eq('id', ev.id);
          console.log(`⚠️ Alerta urgente [hoy_3h] → ${ev.titulo}`);
          continue;
        }

        // Menos de 6 horas (tarde)
        if (ev.horasRestantes <= 6 && prioridad < NIVELES_ALERTA['hoy_6h']) {
          await notificarTodos({
            titulo: `⏰ Quedan 6h (${ev.mod}): ${ev.titulo}`,
            cuerpo: `Cierra hoy a las ${ev.horaFin}. Recuerda subirla a Moodle y marcarla como completada.`,
            url: ev.moodle_url || ev.enlace || 'https://calendario-daw-1.onrender.com',
          });
          await supabaseAdmin.from('eventos').update({ alerta_cierre: 'hoy_6h' }).eq('id', ev.id);
          console.log(`⏰ Alerta tarde [hoy_6h] → ${ev.titulo}`);
          continue;
        }
      }

      // El día de antes (si aún no se había avisado, p. ej. tarea añadida por la tarde)
      if (ev.diasRestantes === 1 && prioridad < NIVELES_ALERTA['aviso_1d'] && !ev.alerta_cierre) {
        await notificarTodos({
          titulo: `⚠️ Mañana vence (${ev.mod}): ${ev.titulo}`,
          cuerpo: `Plazo hasta mañana a las ${ev.horaFin}. Tienes pendiente completarla.`,
          url: ev.moodle_url || ev.enlace || 'https://calendario-daw-1.onrender.com',
        });
        await supabaseAdmin.from('eventos').update({ alerta_cierre: 'aviso_1d' }).eq('id', ev.id);
        console.log(`⚠️ Alerta víspera [aviso_1d] → ${ev.titulo}`);
      }
    }
  } catch (err) {
    console.error('Error revisando recordatorios y alertas:', err.message);
  }
}

// Compatibilidad con las llamadas existentes en extra.js e ics-sync.js
export async function revisarCierresProximos() {
  await revisarAlertasYRecordatorios();
}

export async function enviarNotificacionesRecordatorio() {
  await revisarAlertasYRecordatorios();
}
