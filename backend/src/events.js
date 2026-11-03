import './load-env.js';
import { Router } from 'express';
import { supabaseAdmin } from './db.js';
import { notificarCambio } from './push.js';

export const router = Router();

// Helpers ---------------------------------------------------------------

async function nombreUsuario(id) {
  if (!id) return null;
  const { data } = await supabaseAdmin.from('usuarios').select('nombre').eq('id', id).single();
  return data?.nombre || null;
}

function fmtFecha(iso) {
  return new Date(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

const EMOJI_TIPO = { examen: '📝', entrega: '📦', apunte: '📌', clase: '📚', reunion: '👥', otro: '⭐' };
const WEB_URL = 'https://calendario-daw-1.onrender.com';

// Rutas -----------------------------------------------------------------

// GET /api/eventos
router.get('/', async (req, res) => {
  try {
    const { sala, desde, hasta } = req.query;
    if (sala !== process.env.SALA_CODIGO) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    let query = supabaseAdmin
      .from('eventos')
      .select('*')
      .order('fecha_inicio', { ascending: true });

    if (desde) query = query.gte('fecha_inicio', desde);
    if (hasta) query = query.lte('fecha_inicio', hasta);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ eventos: data || [] });
  } catch (err) {
    console.error('Error en GET /eventos:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/eventos — crear + notificar al grupo
router.post('/', async (req, res) => {
  try {
    const { sala, evento } = req.body;
    if (sala !== process.env.SALA_CODIGO) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { data, error } = await supabaseAdmin
      .from('eventos')
      .insert({
        titulo: evento.titulo,
        descripcion: evento.descripcion || null,
        modulo_id: evento.modulo_id || 'otro',
        tipo_id: evento.tipo_id || 'otro',
        fecha_inicio: evento.fecha_inicio,
        fecha_fin: evento.fecha_fin || null,
        todo_el_dia: evento.todo_el_dia || false,
        origen: 'manual',
        creado_por: evento.creado_por || null,
        adjuntos: evento.adjuntos || [],
        enlace: evento.enlace || null,
        completado: evento.completado || false,
      })
      .select()
      .single();

    if (error) throw error;

    if (evento.creado_por) {
      const quien = await nombreUsuario(evento.creado_por) || 'Alguien';
      const emoji = EMOJI_TIPO[evento.tipo_id] || '📅';
      await notificarCambio({
        exceptoUsuarioId: evento.creado_por,
        titulo: `${emoji} ${String(evento.modulo_id || '').toUpperCase()}: ${evento.titulo}`,
        cuerpo: `${quien} añadió · ${fmtFecha(evento.fecha_inicio)}`,
        url: `${WEB_URL}?evento=${data.id}`,
      });
    }

    res.json({ evento: data });
  } catch (err) {
    console.error('Error en POST /eventos:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /api/eventos/:id — actualizar + notificar
router.put('/:id', async (req, res) => {
  try {
    const { sala, usuarioId } = req.body;
    if (sala !== process.env.SALA_CODIGO) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { data: antes } = await supabaseAdmin
      .from('eventos').select('titulo, fecha_inicio, modulo_id').eq('id', req.params.id).single();

    const { data, error } = await supabaseAdmin
      .from('eventos')
      .update(req.body.evento)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    if (usuarioId) {
      const quien = await nombreUsuario(usuarioId) || 'Alguien';
      const cambioFecha = antes && new Date(antes.fecha_inicio).getTime() !== new Date(data.fecha_inicio).getTime();
      const msg = cambioFecha
        ? `${quien} cambió la fecha a ${fmtFecha(data.fecha_inicio)}`
        : `${quien} actualizó este evento`;
      await notificarCambio({
        exceptoUsuarioId: usuarioId,
        titulo: `🔄 ${data.modulo_id?.toUpperCase()}: ${data.titulo}`,
        cuerpo: msg,
        url: `${WEB_URL}?evento=${data.id}`,
      });
    }

    res.json({ evento: data });
  } catch (err) {
    console.error('Error en PUT /eventos:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// DELETE /api/eventos/:id — borrar + notificar
router.delete('/:id', async (req, res) => {
  try {
    const { sala, usuarioId } = req.body;
    if (sala !== process.env.SALA_CODIGO) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // Sacar los datos antes de borrar (para el mensaje)
    const { data: evento } = await supabaseAdmin
      .from('eventos').select('titulo, modulo_id').eq('id', req.params.id).single();

    const { error } = await supabaseAdmin.from('eventos').delete().eq('id', req.params.id);
    if (error) throw error;

    if (usuarioId && evento) {
      const quien = await nombreUsuario(usuarioId) || 'Alguien';
      await notificarCambio({
        exceptoUsuarioId: usuarioId,
        titulo: `🗑️ Eliminado: ${evento.modulo_id?.toUpperCase()}`,
        cuerpo: `${quien} borró "${evento.titulo}"`,
        url: WEB_URL,
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error en DELETE /eventos:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/eventos/:id/notas — añadir nota + notificar
router.post('/:id/notas', async (req, res) => {
  try {
    const { sala, contenido, autor_id } = req.body;
    if (sala !== process.env.SALA_CODIGO) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { data, error } = await supabaseAdmin
      .from('notas_evento')
      .insert({
        evento_id: req.params.id,
        contenido,
        autor_id: autor_id || null
      })
      .select()
      .single();

    if (error) throw error;

    if (autor_id) {
      const { data: ev } = await supabaseAdmin
        .from('eventos').select('titulo, modulo_id').eq('id', req.params.id).single();
      const quien = await nombreUsuario(autor_id) || 'Alguien';
      const resumen = contenido.length > 60 ? contenido.slice(0, 60) + '…' : contenido;
      await notificarCambio({
        exceptoUsuarioId: autor_id,
        titulo: `💬 Nota en ${ev?.modulo_id?.toUpperCase() || 'un evento'}`,
        cuerpo: `${quien}: ${resumen}`,
        url: `${WEB_URL}?evento=${req.params.id}`,
      });
    }

    res.json({ nota: data });
  } catch (err) {
    console.error('Error en POST notas:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/eventos/:id/notas
router.get('/:id/notas', async (req, res) => {
  try {
    const { sala } = req.query;
    if (sala !== process.env.SALA_CODIGO) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { data, error } = await supabaseAdmin
      .from('notas_evento')
      .select('*, usuarios(nombre)')
      .eq('evento_id', req.params.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ notas: data || [] });
  } catch (err) {
    console.error('Error en GET notas:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});
