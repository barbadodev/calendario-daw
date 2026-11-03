import './load-env.js';
import ical from 'node-ical';
import { supabaseAdmin } from './db.js';

/**
 * Patrones por módulo. Prioridad sobre el TÍTULO, y si no, sobre la descripción.
 * Regex con \b (word boundaries) para no tragar dentro de otras palabras.
 */
const PATRONES_MODULO = [
  { id: 'dwec', patrones: [/\bdwec?\b/i, /\bjavascript\b/i, /\bhtml\b/i, /\bcss\b/i, /\bdom\b/i, /\bentorno cliente\b/i, /\breact\b/i, /\bvue\b/i, /\bbootstrap\b/i, /\bxml\b/i] },
  { id: 'dwes', patrones: [/\bdwes?\b/i, /\bphp\b/i, /\bservidor\b/i, /\blaravel\b/i, /\bmariadb\b/i, /\bmysql\b/i, /\bsql\b/i, /\bbbdd\b/i, /\bentorno servidor\b/i, /\bcookie/i, /\bsesi[oó]n (de|del|usuario|cliente)/i] },
  { id: 'daw',  patrones: [/\bdaw\b/i, /\bdespliegue\b/i, /\bdocker\b/i, /\bkubernetes\b/i, /\bcontenedor/i, /\bvirtualiza/i, /\bhipervisor/i, /\bvps\b/i, /\blxc\b/i, /\bhosting\b/i] },
  { id: 'diw',  patrones: [/\bdiw\b/i, /\bdise[ñn]o de interfaces/i, /\bdise[ñn]o web\b/i, /\bdise[ñn]o y prototipo/i, /\bfigma\b/i, /\bprototipo\b/i, /\bmaquetaci/i, /\baccesibilidad\b/i, /\bresponsive\b/i, /\bportal de un festival/i] },
  { id: 'en',   patrones: [/\bingle[sñ]s?\b/i, /\benglish\b/i, /\bb[\d.]+ english\b/i, /\bunit (one|two|three|four|five)\b/i] },
  { id: 'ipe',  patrones: [/\bipe\b/i, /\bitinerario personal/i, /\bempleabilidad\b/i, /\binserci[oó]n laboral/i] },
  { id: 'opt',  patrones: [/\boptativa\b/i] },
  { id: 'proy', patrones: [/\bproyecto\b/i, /\bptv\b/i, /\btrabajo de fin de ciclo/i] },
];

function quitarUrls(txt) { return (txt || '').replace(/https?:\/\/\S+/g, ' '); }

function detectarModulo(evento) {
  const titulo = quitarUrls(evento.summary);
  // 1. Buscar en el título (muy fiable)
  for (const { id, patrones } of PATRONES_MODULO) {
    if (patrones.some(p => p.test(titulo))) return id;
  }
  // 2. Buscar en descripción (sin URLs)
  const desc = quitarUrls(evento.description);
  for (const { id, patrones } of PATRONES_MODULO) {
    if (patrones.some(p => p.test(desc))) return id;
  }
  return 'otro';
}

function detectarTipo(evento) {
  const titulo = (evento.summary || '');
  // Patrones típicos de Moodle en español
  if (/vencimiento de\s+(sesi[oó]n|pr[áa]ctica|tarea|entrega|trabajo)/i.test(titulo)) return 'entrega';
  if (/^se (abre|cierra)\b.*\b(test|prueba|examen)/i.test(titulo)) return 'examen';
  if (/^se (abre|cierra)\b/i.test(titulo)) return 'entrega';
  if (/examen|prueba evaluada|test \d/i.test(titulo)) return 'examen';
  if (/entrega|pr[áa]ctica|tarea|actividad/i.test(titulo)) return 'entrega';
  if (/clase|sesi[oó]n|reuni[oó]n|videoconferencia/i.test(titulo)) return 'clase';
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
    let creados = 0, actualizados = 0;

    for (const ev of eventosMoodle) {
      const uid = ev.uid || `${ev.start?.toISOString()}-${(ev.summary || '').substring(0, 30)}`;
      const inicio = ev.start;
      const fin = ev.end || ev.start;
      if (!inicio) continue;

      const modId = detectarModulo(ev);
      const tipoId = detectarTipo(ev);

      const { data: existentes } = await supabaseAdmin
        .from('eventos')
        .select('id, modulo_id, tipo_id, titulo')
        .eq('moodle_uid', uid)
        .limit(1);

      const payload = {
        titulo: (ev.summary || 'Evento Moodle').substring(0, 200),
        descripcion: ev.description || null,
        modulo_id: modId,
        tipo_id: tipoId,
        fecha_inicio: inicio.toISOString(),
        fecha_fin: fin.toISOString(),
        todo_el_dia: ev.datetype === 'date',
        origen: 'moodle',
        moodle_uid: uid,
        moodle_url: ev.url || null,
      };

      if (existentes && existentes.length > 0) {
        const ex = existentes[0];
        const cambio = ex.modulo_id !== modId || ex.tipo_id !== tipoId || ex.titulo !== payload.titulo;
        await supabaseAdmin.from('eventos').update(payload).eq('moodle_uid', uid);
        if (cambio) actualizados++;
      } else {
        await supabaseAdmin.from('eventos').insert(payload);
        creados++;
      }
    }

    console.log(`✅ Moodle sincronizado (${creados} nuevos, ${actualizados} reclasificados)`);
  } catch (err) {
    console.error('❌ Error sincronizando Moodle:', err.message);
  }
}

export function iniciarSincronizacionMoodle() {
  setTimeout(() => sincronizarFeed(), 20_000);
  setInterval(() => sincronizarFeed(), 15 * 60 * 1000);
  import('./push.js').then(m => {
    setInterval(() => m.enviarNotificacionesRecordatorio(), 5 * 60 * 1000);
    setTimeout(() => m.enviarNotificacionesRecordatorio(), 60_000);
  });
}
