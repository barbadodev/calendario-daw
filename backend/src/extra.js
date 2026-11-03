import './load-env.js';
import { Router } from 'express';
import { supabaseAdmin } from './db.js';
import { sincronizarFeed } from './ics-sync.js';

// === Rutas extra de eventos (montadas en /api/eventos) ===
export const routerEventosExtra = Router();

routerEventosExtra.post('/:id/completar', async (req, res) => {
  try {
    const { sala, valor } = req.body;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });

    const { data, error } = await supabaseAdmin
      .from('eventos')
      .update({ completado: !!valor, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ evento: data });
  } catch (err) {
    console.error('Error completar:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

routerEventosExtra.post('/:id/duplicar', async (req, res) => {
  try {
    const { sala } = req.body;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });

    const { data: original } = await supabaseAdmin
      .from('eventos').select('*').eq('id', req.params.id).single();
    if (!original) return res.status(404).json({ error: 'No existe' });

    const nuevo = {
      titulo: original.titulo,
      descripcion: original.descripcion,
      modulo_id: original.modulo_id,
      tipo_id: original.tipo_id,
      fecha_inicio: new Date(new Date(original.fecha_inicio).getTime() + 24 * 60 * 60 * 1000).toISOString(),
      fecha_fin: original.fecha_fin ? new Date(new Date(original.fecha_fin).getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
      todo_el_dia: original.todo_el_dia,
      origen: 'manual',
      creado_por: original.creado_por,
      enlace: original.enlace,
      parent_evento: original.id,
    };
    const { data: creado, error } = await supabaseAdmin.from('eventos').insert(nuevo).select().single();
    if (error) throw error;
    res.json({ evento: creado });
  } catch (err) {
    console.error('Error duplicar:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// === Rutas globales (montadas en /api) ===
export const routerGlobal = Router();

// GET /api/stats
routerGlobal.get('/stats', async (req, res) => {
  try {
    const { sala } = req.query;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });

    const { data: eventos } = await supabaseAdmin.from('eventos').select('*');
    const evs = eventos || [];

    const ahora = new Date();
    const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
    const porModulo = {};
    const porTipo = {};
    let pasados = 0, proximos7 = 0, entregados = 0, pendientesMes = 0;

    for (const e of evs) {
      porModulo[e.modulo_id] = (porModulo[e.modulo_id] || 0) + 1;
      porTipo[e.tipo_id] = (porTipo[e.tipo_id] || 0) + 1;
      const f = new Date(e.fecha_inicio);
      if (f < ahora) pasados++;
      else if (f < new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000)) proximos7++;
      if (e.completado) entregados++;
      if (!e.completado && f >= ahora && f < finMes) pendientesMes++;
    }

    res.json({
      total: evs.length,
      porModulo, porTipo,
      pasados, proximos7, entregados, pendientesMes,
      tasaCompletado: evs.length ? Math.round((entregados / evs.length) * 100) : 0,
    });
  } catch (err) {
    console.error('Error stats:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/sync/now  — fuerza sincronización Moodle
routerGlobal.post('/sync/now', async (req, res) => {
  try {
    const { sala } = req.body;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });
    await sincronizarFeed();
    res.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    console.error('Error sync now:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/keepalive — endpoint mínimo para evitar cold starts
routerGlobal.get('/keepalive', (req, res) => res.json({ ok: true }));

// GET /api/plan-estudio — semanas próximas con carga
routerGlobal.get('/plan-estudio', async (req, res) => {
  try {
    const { sala } = req.query;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });

    const { data: eventos } = await supabaseAdmin
      .from('eventos').select('*')
      .gte('fecha_inicio', new Date().toISOString())
      .order('fecha_inicio', { ascending: true });

    const semanas = {};
    for (const e of eventos || []) {
      const f = new Date(e.fecha_inicio);
      const iso = getISOWeek(f);
      if (!semanas[iso]) semanas[iso] = [];
      semanas[iso].push({
        id: e.id, titulo: e.titulo, fecha: e.fecha_inicio,
        tipo: e.tipo_id, modulo: e.modulo_id, completado: e.completado,
      });
    }

    const resumen = Object.entries(semanas).map(([semana, evs]) => ({
      semana,
      total: evs.length,
      examenes: evs.filter(e => e.tipo === 'examen').length,
      entregas: evs.filter(e => e.tipo === 'entrega').length,
      cargaHorasEstimadas: evs.filter(e => e.tipo === 'examen').length * 6 + evs.filter(e => e.tipo === 'entrega').length * 4,
      eventos: evs,
    })).sort((a, b) => a.semana.localeCompare(b.semana));

    res.json({ semanas: resumen });
  } catch (err) {
    console.error('Error plan-estudio:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// === Notas por módulo ===
export const routerNotasModulo = Router();

routerNotasModulo.get('/:moduloId', async (req, res) => {
  try {
    const { sala } = req.query;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });

    const { data, error } = await supabaseAdmin
      .from('notas_modulo').select('*, usuarios(nombre)')
      .eq('modulo_id', req.params.moduloId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ notas: data || [] });
  } catch (err) {
    console.error('Error notas modulo:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

routerNotasModulo.post('/:moduloId', async (req, res) => {
  try {
    const { sala, contenido, autor_id } = req.body;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });
    if (!contenido?.trim()) return res.status(400).json({ error: 'Contenido vacío' });

    const { data, error } = await supabaseAdmin
      .from('notas_modulo').insert({
        modulo_id: req.params.moduloId,
        contenido: contenido.trim(),
        autor_id: autor_id || null,
      }).select().single();
    if (error) throw error;
    res.json({ nota: data });
  } catch (err) {
    console.error('Error crear nota modulo:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// === Config del grupo (semana exámenes) ===
export const routerConfig = Router();

routerConfig.get('/semana-examen', async (req, res) => {
  try {
    const { sala } = req.query;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });
    const { data } = await supabaseAdmin.from('config_grupo').select('*').eq('clave', 'semana_examen').single();
    res.json({ config: data?.valor || { desde: null, hasta: null } });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

routerConfig.post('/semana-examen', async (req, res) => {
  try {
    const { sala, desde, hasta } = req.body;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });
    const { error } = await supabaseAdmin
      .from('config_grupo')
      .upsert({ clave: 'semana_examen', valor: { desde, hasta }, updated_at: new Date().toISOString() }, { onConflict: 'clave' });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('Error config semana:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
