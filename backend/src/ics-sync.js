import './load-env.js';
import ical from 'node-ical';
import { supabaseAdmin } from './db.js';

const PATRONES_MODULO = [
  { id: 'dwec', patrones: [/\bdwec?\b/i, /\bjavascript\b/i, /\bhtml\b/i, /\bcss\b/i, /\bdom\b/i, /\bentorno cliente\b/i, /\breact\b/i, /\bvue\b/i, /\bbootstrap\b/i, /\bxml\b/i] },
  { id: 'dwes', patrones: [/\bdwes?\b/i, /\bphp\b/i, /\bservidor\b/i, /\blaravel\b/i, /\bmariadb\b/i, /\bmysql\b/i, /\bsql\b/i, /\bbbdd\b/i, /\bentorno servidor\b/i, /\bcookie/i] },
  { id: 'daw',  patrones: [/\bdaw\b/i, /\bdespliegue\b/i, /\bdocker\b/i, /\bkubernetes\b/i, /\bcontenedor/i, /\bvirtualiza/i, /\bhipervisor/i, /\bvps\b/i, /\blxc\b/i, /\bhosting\b/i] },
  { id: 'diw',  patrones: [/\bdiw\b/i, /\bdise[ñn]o de interfaces/i, /\bdise[ñn]o web\b/i, /\bdise[ñn]o y prototipo/i, /\bfigma\b/i, /\bprototipo\b/i, /\bmaquetaci/i, /\baccesibilidad\b/i, /\bresponsive\b/i] },
  { id: 'en',   patrones: [/\bingle[sñ]s?\b/i, /\benglish\b/i, /\bingl[ée]s\b/i] },
  { id: 'ipe',  patrones: [/\bipe\b/i, /\bitinerario personal/i, /\bempleabilidad\b/i, /\binserci[oó]n laboral/i] },
  { id: 'opt',  patrones: [/\boptativa\b/i] },
  { id: 'proy', patrones: [/\bproyecto\b/i, /\bptv\b/i, /\btrabajo de fin de ciclo/i] },
];

function quitarUrls(txt) { return (txt || '').replace(/https?:\/\/\S+/g, ' '); }

/**
 * Limpia la descripción que manda Moodle:
 * - Convierte HTML a texto plano
 * - Colapsa espacios/tabs/saltos de línea múltiples
 * - Quita los "Links:" de referencia [n] con URLs que van al final
 */
function limpiarDescripcion(raw) {
  if (!raw) return null;
  let t = String(raw);

  // Quitar bloques "Links:" o "References:" con URLs al final
  t = t.replace(/\n\s*Links?:[\s\S]*$/i, '');
  t = t.replace(/\n-{2,}\s*\[1\][\s\S]*$/i, '');

  // Convertir entidades HTML
  t = t
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '…');

  // Convertir algunos tags a saltos
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n');
  t = t.replace(/<li[^>]*>/gi, '  • ');
  t = t.replace(/<[^>]+>/g, '');

  // Normalizar tabs y espacios múltiples
  t = t.replace(/\t/g, '  ');
  t = t.replace(/ {3,}/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  t = t.replace(/^\s+|\s+$/g, '');

  // Cortar descripciones kilométricas
  if (t.length > 3000) t = t.slice(0, 3000) + '\n\n… (descripción larga, abre el enlace en Moodle)';

  return t || null;
}

function detectarModulo(ev) {
  const titulo = quitarUrls(ev.summary);
  for (const { id, patrones } of PATRONES_MODULO) {
    if (patrones.some(p => p.test(titulo))) return id;
  }
  const desc = quitarUrls(ev.description);
  for (const { id, patrones } of PATRONES_MODULO) {
    if (patrones.some(p => p.test(desc))) return id;
  }
  return 'otro';
}

function detectarTipo(ev) {
  const titulo = (ev.summary || '');
  if (/vencimiento de\s+(sesi[oó]n|pr[áa]ctica|tarea|entrega|trabajo)/i.test(titulo)) return 'entrega';
  if (/^se (abre|cierra)\b.*\b(test|prueba|examen)/i.test(titulo)) return 'examen';
  if (/^se (abre|cierra)\b/i.test(titulo)) return 'entrega';
  if (/examen|prueba evaluada|test \d/i.test(titulo)) return 'examen';
  if (/entrega|pr[áa]ctica|tarea|actividad/i.test(titulo)) return 'entrega';
  if (/clase|sesi[oó]n|reuni[oó]n|videoconferencia/i.test(titulo)) return 'clase';
  return 'otro';
}

/**
 * Fusiona eventos "Se abre X" + "Se cierra X" en un solo "X (abierto-del-al-cerrado)".
 * Devuelve lista limpia lista para insertar/update.
 */
function fusionarPares(eventosMoodle) {
  const pares = new Map(); // key: título base sin "se abre"/"se cierra" → { abre, cierra }
  const sueltos = [];

  for (const ev of eventosMoodle) {
    const t = (ev.summary || '').trim();
    const mAbre = t.match(/^se\s+abre\s+(.+)$/i);
    const mCierra = t.match(/^se\s+cierra\s+(.+)$/i);
    if (mAbre) {
      const key = mAbre[1].trim();
      if (!pares.has(key)) pares.set(key, {});
      pares.get(key).abre = { ...ev, base: key };
    } else if (mCierra) {
      const key = mCierra[1].trim();
      if (!pares.has(key)) pares.set(key, {});
      pares.get(key).cierra = { ...ev, base: key };
    } else {
      sueltos.push(ev);
    }
  }

  const fusionados = [];
  for (const [base, { abre, cierra }] of pares) {
    if (abre && cierra) {
      // Crear evento fusionado
      fusionados.push({
        summary: base,
        description: abre.description || cierra.description,
        start: abre.start,   // fecha de apertura (inicio de ventana)
        end: cierra.start,   // fecha de cierre (fin de ventana)
        uid: `fused-${abre.uid}-${cierra.uid}`,
        _fusionado: true,
        _ventana: true,
        _abreUid: abre.uid,
        _cierraUid: cierra.uid,
        datetype: 'date-time',
      });
    } else {
      // Solo uno de los dos
      const solo = abre || cierra;
      sueltos.push(solo);
    }
  }
  return [...sueltos, ...fusionados];
}

async function sincronizarFeed() {
  const url = process.env.MOODLE_ICAL_URL;
  if (!url) {
    console.log('⚠️  MOODLE_ICAL_URL no configurada, omitiendo sincronización');
    return;
  }

  try {
    const data = await ical.async.fromURL(url);
    const rawEvents = Object.values(data).filter(e => e.type === 'VEVENT');
    const eventos = fusionarPares(rawEvents);

    console.log(`📥 Moodle: ${rawEvents.length} crudos → ${eventos.length} tras fusionar aperturas/cierres`);
    let creados = 0, actualizados = 0;

    const uidsVistos = new Set();

    for (const ev of eventos) {
      const uid = ev.uid;
      uidsVistos.add(uid);
      const inicio = ev.start;
      const fin = ev.end || ev.start;
      if (!inicio) continue;

      const modId = detectarModulo(ev);
      const tipoId = detectarTipo(ev);

      const { data: existentes } = await supabaseAdmin
        .from('eventos')
        .select('id, modulo_id, tipo_id, titulo')
        .eq('moodle_uid', uid).limit(1);

      const payload = {
        titulo: (ev.summary || 'Evento Moodle').substring(0, 200),
        descripcion: limpiarDescripcion(ev.description),
        modulo_id: modId,
        tipo_id: tipoId,
        fecha_inicio: inicio.toISOString(),
        fecha_fin: fin.toISOString(),
        todo_el_dia: ev.datetype === 'date',
        origen: 'moodle',
        moodle_uid: uid,
        moodle_url: ev.url || null,
        revisar: modId === 'otro',
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

    // Eliminar eventos de Moodle que ya no están en el feed
    const { data: enDb } = await supabaseAdmin
      .from('eventos').select('id, moodle_uid').eq('origen', 'moodle');
    for (const e of enDb || []) {
      if (e.moodle_uid && !uidsVistos.has(e.moodle_uid)) {
        await supabaseAdmin.from('eventos').delete().eq('id', e.id);
      }
    }

    console.log(`✅ Moodle sincronizado (${creados} nuevos, ${actualizados} reclasificados)`);
  } catch (err) {
    console.error('❌ Error sincronizando Moodle:', err.message);
  }
}

export { sincronizarFeed };

export function iniciarSincronizacionMoodle() {
  setTimeout(() => sincronizarFeed(), 20_000);
  setInterval(() => sincronizarFeed(), 15 * 60 * 1000);
  import('./push.js').then(m => {
    setInterval(() => m.enviarNotificacionesRecordatorio(), 5 * 60 * 1000);
    setTimeout(() => m.enviarNotificacionesRecordatorio(), 60_000);
  });
}
