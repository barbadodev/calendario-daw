import './load-env.js';
import ical from 'node-ical';
import { supabaseAdmin } from './db.js';

const MAPEO_MODULOS = {
  'ipe':      ['ipe', 'ipe ', 'IPE'],
  'dwec':     ['dwec', 'dwec ', 'DWEC', 'desarrollo web entorno cliente'],
  'dwes':     ['dwes', 'dwes ', 'DWES', 'desarrollo web entorno servidor'],
  'daw':      ['daw', 'daw ', 'DAW', 'despliegue aplicaciones'],
  'diw':      ['diw', 'diw ', 'DIW', 'diseño interfaces'],
  'en':       ['inglés', 'ingles', 'en'],
  'opt':      ['optativa', 'opt'],
  'proy':     ['proyecto', 'proy'],
};

function detectarModulo(evento) {
  const texto = ((evento.summary || '') + ' ' + (evento.description || '')).toLowerCase();
  for (const [modId, sinonimos] of Object.entries(MAPEO_MODULOS)) {
    if (sinonimos.some(s => texto.includes(s.toLowerCase()))) {
      return modId;
    }
  }
  return 'otro';
}

function detectarTipo(evento) {
  const texto = ((evento.summary || '') + ' ' + (evento.description || '')).toLowerCase();
  if (texto.includes('examen') || texto.includes('prueba')) return 'examen';
  if (texto.includes('entrega') || texto.includes('tarea') || texto.includes('trabajo')) return 'entrega';
  if (texto.includes('clase') || texto.includes('sesión')) return 'clase';
  return 'otro';
}

async function sincronizarFeed() {
  const url = process.env.MOODLE_ICAL_URL;
  if (!url) {
    console.log('⚠️  MOODLE_ICAL_URL no configurada, omitiendo sincronización');
    return;
  }

  try {
    const data = await ical.async.fromURL(url);
    const eventosMoodle = Object.values(data).filter(e => e.type === 'VEVENT');

    console.log(`📥 Moodle devuelve ${eventosMoodle.length} eventos`);

    for (const ev of eventosMoodle) {
      const uid = ev.uid || `${ev.start?.toISOString()}-${(ev.summary || '').substring(0, 30)}`;
      const inicio = ev.start;
      const fin = ev.end || ev.start;

      if (!inicio) continue;

      const { data: existentes } = await supabaseAdmin
        .from('eventos')
        .select('id')
        .eq('moodle_uid', uid)
        .limit(1);

      const payload = {
        titulo: (ev.summary || 'Evento Moodle').substring(0, 200),
        descripcion: ev.description || null,
        modulo_id: detectarModulo(ev),
        tipo_id: detectarTipo(ev),
        fecha_inicio: inicio.toISOString(),
        fecha_fin: fin.toISOString(),
        todo_el_dia: ev.datetype === 'date',
        origen: 'moodle',
        moodle_uid: uid,
        moodle_url: ev.url || null,
      };

      if (existentes && existentes.length > 0) {
        await supabaseAdmin.from('eventos').update(payload).eq('moodle_uid', uid);
      } else {
        await supabaseAdmin.from('eventos').insert(payload);
      }
    }

    console.log('✅ Sincronización Moodle completada');
  } catch (err) {
    console.error('❌ Error sincronizando Moodle:', err.message);
  }
}

export function iniciarSincronizacionMoodle() {
  setTimeout(() => sincronizarFeed(), 30_000);
  setInterval(() => sincronizarFeed(), 15 * 60 * 1000);
  import('./push.js').then(m => {
    setInterval(() => m.enviarNotificacionesRecordatorio(), 5 * 60 * 1000);
    setTimeout(() => m.enviarNotificacionesRecordatorio(), 60_000);
  });
}
