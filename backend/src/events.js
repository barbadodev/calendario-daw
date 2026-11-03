import './load-env.js';
import { Router } from 'express';
import { supabaseAdmin } from './db.js';
import { notificarCambio, confirmarAccion } from './push.js';

export const router = Router();

const EMOJI_TIPO = { examen: '📝', entrega: '📦', apunte: '📌', clase: '📚', reunion: '👥', otro: '⭐' };
const WEB_URL = 'https://calendario-daw-1.onrender.com';

async function nombreUsuario(id) {
  if (!id) return null;
  const { data } = await supabaseAdmin.from('usuarios').select('nombre').eq('id', id).single();
  return data?.nombre || null;
}

function fmtFecha(iso) {
  return new Date(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * Avisa al resto del grupo y manda confirmación al autor.
 * La confirmación le dice cuántos compañeros fueron avisados realmente,
 * para detectar en el momento a alguien con las notificaciones sin activar.
 */
async function avisar({ tipo, usuarioId, moduloId, tituloEvento, url }) {
  if (!usuarioId) return { personas: 0 };
  const quien = await nombreUsuario(usuarioId) || 'Alguien';
  const mod = String(moduloId || 'otro').toUpperCase();
  const nombre = tituloEvento.nombre || '';
  const emojiAccion = { creado: '📅', editado: '🔄', borrado: '🗑️', nota: '💬' }[tipo];

  // 1. Mensaje para el resto del grupo
  let tituloGrupo, cuerpoGrupo;
  if (tipo === 'creado') {
    tituloGrupo = `${EMOJI_TIPO[tituloEvento.tipo] || '📅'} ${mod}: ${nombre}`;
    cuerpoGrupo = `${quien} añadió · ${fmtFecha(tituloEvento.fecha)}`;
  } else if (tipo === 'editado') {
    tituloGrupo = `🔄 ${mod}: ${nombre}`;
    cuerpoGrupo = tituloEvento.cambioFecha
      ? `${quien} cambió la fecha a ${fmtFecha(tituloEvento.fecha)}`
      : `${quien} actualizó este evento`;
  } else if (tipo === 'borrado') {
    tituloGrupo = `🗑️ Eliminado: ${mod}`;
    cuerpoGrupo = `${quien} borró "${nombre}"`;
  } else { // nota
    tituloGrupo = `💬 Nota en ${mod}`;
    cuerpoGrupo = `${quien}: ${tituloEvento.nota}`;
  }

  const res = await notificarCambio({ exceptoUsuarioId: usuarioId, titulo: tituloGrupo, cuerpo: cuerpoGrupo, url });

  // 2. Confirmación para quien hizo la acción
  const aviso = res.personas > 0
    ? `avisados ${res.personas} compañero${res.personas === 1 ? '' : 's'}`
    : '⚠️ nadie tiene las notificaciones activas';

  const tituloYo = {
    creado: `📅 ${mod}: guardado`,
    editado: `✅ ${mod}: cambios guardados`,
    borrado: `🗑️ ${mod}: eliminado`,
    nota: `💬 ${mod}: nota guardada`,
  }[tipo];

  await confirmarAccion({
    usuarioId,
    titulo: tituloYo,
    cuerpo: tipo === 'borrado' || tipo === 'nota' ? aviso : `${nombre} · ${aviso}`,
    url,
  });

  return res;
}

// GET /api/eventos
router.get('/', async (req, res) => {
  try {
    const { sala, desde, hasta } = req.query;
    if (sala !== process.env.SALA_CODIGO) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    let query = supabaseAdmin.from('eventos').select('*').order('fecha_inicio', { ascending: true });
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

// POST /api/eventos — crear + avisar al grupo + confirmar al autor
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

    let avisados = 0;
    if (evento.creado_por) {
      const r = await avisar({
        tipo: 'creado',
        usuarioId: evento.creado_por,
        moduloId: data.modulo_id,
        tituloEvento: { nombre: data.titulo, fecha: data.fecha_inicio, tipo: data.tipo_id },
        url: `${WEB_URL}?evento=${data.id}`,
      });
      avisados = r?.personas ?? 0;
    }

    res.json({ evento: data, avisados });
  } catch (err) {
    console.error('Error en POST /eventos:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /api/eventos/:id — actualizar + avisar
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

    let avisados = 0;
    if (usuarioId) {
      const cambioFecha = antes && new Date(antes.fecha_inicio).getTime() !== new Date(data.fecha_inicio).getTime();
      const r = await avisar({
        tipo: 'editado',
        usuarioId,
        moduloId: data.modulo_id,
        tituloEvento: { nombre: data.titulo, fecha: data.fecha_inicio, cambioFecha },
        url: `${WEB_URL}?evento=${data.id}`,
      });
      avisados = r?.personas ?? 0;
    }

    res.json({ evento: data, avisados });
  } catch (err) {
    console.error('Error en PUT /eventos:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// DELETE /api/eventos/:id — borrar + avisar
router.delete('/:id', async (req, res) => {
  try {
    const { sala, usuarioId } = req.body;
    if (sala !== process.env.SALA_CODIGO) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { data: evento } = await supabaseAdmin
      .from('eventos').select('titulo, modulo_id').eq('id', req.params.id).single();

    const { error } = await supabaseAdmin.from('eventos').delete().eq('id', req.params.id);
    if (error) throw error;

    let avisados = 0;
    if (usuarioId && evento) {
      const r = await avisar({
        tipo: 'borrado',
        usuarioId,
        moduloId: evento.modulo_id,
        tituloEvento: { nombre: evento.titulo },
        url: WEB_URL,
      });
      avisados = r?.personas ?? 0;
    }

    res.json({ ok: true, avisados });
  } catch (err) {
    console.error('Error en DELETE /eventos:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/eventos/:id/notas — nota + avisar
router.post('/:id/notas', async (req, res) => {
  try {
    const { sala, contenido, autor_id } = req.body;
    if (sala !== process.env.SALA_CODIGO) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { data, error } = await supabaseAdmin
      .from('notas_evento')
      .insert({ evento_id: req.params.id, contenido, autor_id: autor_id || null })
      .select()
      .single();

    if (error) throw error;

    let avisados = 0;
    if (autor_id) {
      const { data: ev } = await supabaseAdmin
        .from('eventos').select('modulo_id').eq('id', req.params.id).single();
      const resumen = contenido.length > 70 ? contenido.slice(0, 70).trim() + '…' : contenido;
      const r = await avisar({
        tipo: 'nota',
        usuarioId: autor_id,
        moduloId: ev?.modulo_id,
        tituloEvento: { nota: resumen },
        url: `${WEB_URL}?evento=${req.params.id}`,
      });
      avisados = r?.personas ?? 0;
    }

    res.json({ nota: data, avisados });
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
