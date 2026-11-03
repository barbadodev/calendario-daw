import './load-env.js';
import { Router } from 'express';
import { supabaseAdmin } from './db.js';

export const router = Router();

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
    res.json({ evento: data });
  } catch (err) {
    console.error('Error en POST /eventos:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { sala } = req.body;
    if (sala !== process.env.SALA_CODIGO) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { data, error } = await supabaseAdmin
      .from('eventos')
      .update(req.body.evento)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ evento: data });
  } catch (err) {
    console.error('Error en PUT /eventos:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { sala } = req.body;
    if (sala !== process.env.SALA_CODIGO) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { error } = await supabaseAdmin
      .from('eventos')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('Error en DELETE /eventos:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

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
    res.json({ nota: data });
  } catch (err) {
    console.error('Error en POST notas:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

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
