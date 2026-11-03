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

      if (minutos > 0 && minutos <= 60) {
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
