import './load-env.js';
import { Router } from 'express';
import { supabaseAdmin } from './db.js';
import { sincronizarFeed } from './ics-sync.js';
import { revisarCierresProximos } from './push.js';

export const routerEventosExtra = Router();

// POST /api/eventos/:id/completar (individual por usuario)
routerEventosExtra.post('/:id/completar', async (req, res) => {
  try {
    const { sala, valor, usuarioId } = req.body;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });

    const { data: ev, error: fetchErr } = await supabaseAdmin
      .from('eventos')
      .select('id, adjuntos, completado')
      .eq('id', req.params.id)
      .single();
    if (fetchErr || !ev) return res.status(404).json({ error: 'Evento no encontrado' });

    let lista = Array.isArray(ev.adjuntos) ? [...ev.adjuntos] : [];
    if (usuarioId) {
      if (valor) {
        if (!lista.includes(usuarioId)) lista.push(usuarioId);
      } else {
        lista = lista.filter(id => id !== usuarioId);
      }
    }

    const { data, error } = await supabaseAdmin
      .from('eventos')
      .update({
        adjuntos: lista,
        completado: lista.length > 0,
        updated_at: new Date().toISOString(),
      })
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

// POST /api/eventos/:id/duplicar
routerEventosExtra.post('/:id/duplicar', async (req, res) => {
  try {
    const { sala } = req.body;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });
    const { data: o } = await supabaseAdmin.from('eventos').select('*').eq('id', req.params.id).single();
    if (!o) return res.status(404).json({ error: 'No existe' });
    const day = 24 * 60 * 60 * 1000;
    const { data, error } = await supabaseAdmin.from('eventos').insert({
      titulo: o.titulo, descripcion: o.descripcion, modulo_id: o.modulo_id, tipo_id: o.tipo_id,
      fecha_inicio: new Date(new Date(o.fecha_inicio).getTime() + day).toISOString(),
      fecha_fin: o.fecha_fin ? new Date(new Date(o.fecha_fin).getTime() + day).toISOString() : null,
      todo_el_dia: o.todo_el_dia, origen: 'manual', creado_por: o.creado_por,
      enlace: o.enlace, parent_evento: o.id,
    }).select().single();
    if (error) throw error;
    res.json({ evento: data });
  } catch (err) {
    console.error('Error duplicar:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

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
    const porModulo = {}, porTipo = {};
    let pasados = 0, proximos7 = 0, entregados = 0, pendientesMes = 0;
    for (const e of evs) {
      porModulo[e.modulo_id] = (porModulo[e.modulo_id] || 0) + 1;
      porTipo[e.tipo_id] = (porTipo[e.tipo_id] || 0) + 1;
      const f = new Date(e.fecha_inicio);
      if (f < ahora) pasados++;
      else if (f < new Date(ahora.getTime() + 7 * 86400000)) proximos7++;
      if (e.completado) entregados++;
      if (!e.completado && f >= ahora && f < finMes) pendientesMes++;
    }
    res.json({
      total: evs.length, porModulo, porTipo, pasados, proximos7, entregados, pendientesMes,
      tasaCompletado: evs.length ? Math.round((entregados / evs.length) * 100) : 0,
    });
  } catch (err) {
    console.error('Error stats:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/sync/now
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

// GET /api/keepalive
routerGlobal.get('/keepalive', (req, res) => res.json({ ok: true }));

// GET /api/cierres-proximos — entregas pendientes con plazo que vence pronto
// Devuelve también las de 48 h para que la app pueda colorear por urgencia.
routerGlobal.get('/cierres-proximos', async (req, res) => {
  try {
    const { sala, usuarioId } = req.query;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });

    const ahora = Date.now();
    const { data } = await supabaseAdmin
      .from('eventos')
      .select('id, titulo, modulo_id, fecha_fin, fecha_inicio, alerta_cierre, moodle_url, enlace, origen, adjuntos')
      .eq('tipo_id', 'entrega');

    const cierres = (data || []).map(ev => {
      const deadline = new Date(ev.fecha_fin || ev.fecha_inicio).getTime();
      return { ...ev, deadline, horas: (deadline - ahora) / 3600000 };
    })
      .filter(e => {
        if (Number.isNaN(e.deadline) || e.horas <= 0 || e.horas > 48) return false;
        if (usuarioId && Array.isArray(e.adjuntos) && e.adjuntos.includes(usuarioId)) return false;
        return true;
      })
      .sort((a, b) => a.horas - b.horas)
      .map(e => ({
        id: e.id,
        titulo: e.titulo,
        modulo_id: e.modulo_id,
        horas: Math.round(e.horas * 10) / 10,
        nivel: e.horas <= 3 ? 'critico' : e.horas <= 12 ? 'urgente' : 'proximo',
        deadline: new Date(e.deadline).toISOString(),
        enlace: e.moodle_url || e.enlace,
        origen: e.origen,
      }));

    res.json({ cierres, total: cierres.length });
  } catch (err) {
    console.error('Error cierres-proximos:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/cierres/revisar — fuerza la revisión de avisos ahora
routerGlobal.post('/cierres/revisar', async (req, res) => {
  try {
    const { sala } = req.body;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });
    await revisarCierresProximos();
    res.json({ ok: true });
  } catch (err) {
    console.error('Error revisar cierres:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/moodle-status — salud de la sincronización con Moodle
routerGlobal.get('/moodle-status', async (req, res) => {
  try {
    const { sala } = req.query;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });
    const { data } = await supabaseAdmin.from('config_grupo').select('clave, valor').in('clave', ['moodle_sync', 'moodle_course_map']);
    const sync = data?.find(d => d.clave === 'moodle_sync')?.valor || {};
    const mapa = data?.find(d => d.clave === 'moodle_course_map')?.valor || {};
    const ultimo = sync.last_ok ? new Date(sync.last_ok) : null;
    const horasSinSync = ultimo ? (Date.now() - ultimo.getTime()) / 3600000 : null;
    res.json({
      ok: !sync.error && horasSinSync !== null && horasSinSync < 26,
      last_ok: sync.last_ok || null,
      last_error: sync.last_error || null,
      error_actual: sync.error || null,
      horas_desde_sync: horasSinSync === null ? null : Math.round(horasSinSync * 10) / 10,
      eventos: sync.eventos || 0,
      cursos_reconocidos: mapa,
    });
  } catch (err) {
    console.error('Error moodle-status:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/resumen-semana — texto listo para pegar en WhatsApp
routerGlobal.get('/resumen-semana', async (req, res) => {
  try {
    const { sala, dias } = req.query;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });
    const n = Math.min(Math.max(parseInt(dias, 10) || 7, 1), 31);
    const desde = new Date(); desde.setHours(0, 0, 0, 0);
    const hasta = new Date(desde.getTime() + n * 86400000);
    const { data: eventos } = await supabaseAdmin
      .from('eventos').select('*')
      .gte('fecha_inicio', desde.toISOString())
      .lt('fecha_inicio', hasta.toISOString())
      .order('fecha_inicio', { ascending: true });

    const NOMBRES = { ipe: 'IPE', dwec: 'DWEC', dwes: 'DWES', daw: 'DAW', diw: 'DIW', en: 'Inglés', opt: 'Optativa', proy: 'Proyecto', otro: 'Otro' };
    const porDia = {};
    for (const e of eventos || []) {
      const f = new Date(e.fecha_inicio);
      const k = f.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
      (porDia[k] ||= []).push(e);
    }
    const totalEx = (eventos || []).filter(e => e.tipo_id === 'examen').length;
    const totalEn = (eventos || []).filter(e => e.tipo_id === 'entrega').length;

    let txt = `📅 *Calendario DAW* — próximos ${n} días\n`;
    txt += `📝 ${totalEx} exámenes · 📦 ${totalEn} entregas\n\n`;
    if (!Object.keys(porDia).length) txt += '(Sin eventos) ✅\n';
    for (const [d, evs] of Object.entries(porDia)) {
      txt += `*${d.charAt(0).toUpperCase() + d.slice(1)}*\n`;
      for (const e of evs) {
        const icono = { examen: '📝', entrega: '📦', apunte: '📌', clase: '📚', reunion: '👥' }[e.tipo_id] || '⭐';
        const hora = e.todo_el_dia ? '' : ` ${new Date(e.fecha_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
        const hecho = e.completado ? ' ✅' : '';
        txt += `${icono} ${NOMBRES[e.modulo_id] || e.modulo_id}: ${e.titulo}${hora}${hecho}\n`;
      }
      txt += `\n`;
    }
    res.json({ texto: txt.trim(), eventos: (eventos || []).length });
  } catch (err) {
    console.error('Error resumen-semana:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/backup — JSON con todos los datos (para descargar / versionar)
routerGlobal.get('/backup', async (req, res) => {
  try {
    const { sala } = req.query;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });
    const [ev, notas, notasMod, usuarios, config] = await Promise.all([
      supabaseAdmin.from('eventos').select('*'),
      supabaseAdmin.from('notas_evento').select('*'),
      supabaseAdmin.from('notas_modulo').select('*'),
      supabaseAdmin.from('usuarios').select('*'),
      supabaseAdmin.from('config_grupo').select('*'),
    ]);
    const volcado = {
      _meta: { generado: new Date().toISOString(), version: '1.1', origen: 'calendario-daw' },
      eventos: ev.data || [], notas_evento: notas.data || [], notas_modulo: notasMod.data || [],
      usuarios: usuarios.data || [], config: config.data || [],
    };
    res.setHeader('Content-Disposition', `attachment; filename="backup-caldaw-${Date.now()}.json"`);
    res.json(volcado);
  } catch (err) {
    console.error('Error backup:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/plan-estudio
routerGlobal.get('/plan-estudio', async (req, res) => {
  try {
    const { sala } = req.query;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });
    const { data: eventos } = await supabaseAdmin.from('eventos').select('*')
      .gte('fecha_inicio', new Date().toISOString())
      .order('fecha_inicio', { ascending: true });
    const semanas = {};
    for (const e of eventos || []) {
      const iso = getISOWeek(new Date(e.fecha_inicio));
      (semanas[iso] ||= []).push({
        id: e.id, titulo: e.titulo, fecha: e.fecha_inicio,
        tipo: e.tipo_id, modulo: e.modulo_id, completado: e.completado,
      });
    }
    const resumen = Object.entries(semanas).map(([semana, evs]) => ({
      semana, total: evs.length,
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

export const routerNotasModulo = Router();

routerNotasModulo.get('/:moduloId', async (req, res) => {
  try {
    const { sala } = req.query;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });
    const { data, error } = await supabaseAdmin.from('notas_modulo').select('*, usuarios(nombre)')
      .eq('modulo_id', req.params.moduloId).order('created_at', { ascending: false }).limit(50);
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
    const { data, error } = await supabaseAdmin.from('notas_modulo').insert({
      modulo_id: req.params.moduloId, contenido: contenido.trim(), autor_id: autor_id || null,
    }).select().single();
    if (error) throw error;
    res.json({ nota: data });
  } catch (err) {
    console.error('Error crear nota modulo:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

export const routerConfig = Router();

routerConfig.get('/semana-examen', async (req, res) => {
  try {
    const { sala } = req.query;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });
    const { data } = await supabaseAdmin.from('config_grupo').select('valor').eq('clave', 'semana_examen').single();
    res.json({ config: data?.valor || { desde: null, hasta: null } });
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

routerConfig.post('/semana-examen', async (req, res) => {
  try {
    const { sala, desde, hasta } = req.body;
    if (sala !== process.env.SALA_CODIGO) return res.status(401).json({ error: 'No autorizado' });
    const { error } = await supabaseAdmin.from('config_grupo').upsert(
      { clave: 'semana_examen', valor: { desde, hasta }, updated_at: new Date().toISOString() },
      { onConflict: 'clave' });
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
