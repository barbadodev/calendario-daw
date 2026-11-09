import './load-env.js';
import ical from 'node-ical';
import { supabaseAdmin } from './db.js';
import { notificarTodos, notificarCambio } from './push.js';

const BASE_MOODLE = (() => {
  try {
    const u = new URL(process.env.MOODLE_ICAL_URL || '');
    return `${u.protocol}//${u.host}/centros/cordoba`;
  } catch { return null; }
})();

/** Patrones para el PRIMER contacto con un curso. Luego se memoriza su ID. */
const PATRONES_MODULO = [
  { id: 'dwec', patrones: [/\bdwec?\b/i, /\bjavascript\b/i, /\bhtml\b/i, /\bcss\b/i, /\bdom\b/i, /\bentorno cliente\b/i, /\breact\b/i, /\bvue\b/i, /\bbootstrap\b/i, /\bxml\b/i] },
  { id: 'dwes', patrones: [/\bdwes?\b/i, /\bphp\b/i, /\bservidor\b/i, /\blaravel\b/i, /\bmariadb\b/i, /\bmysql\b/i, /\bsql\b/i, /\bbbdd\b/i, /\bentorno servidor\b/i, /\bcookie/i] },
  { id: 'daw',  patrones: [/\bdaw\b/i, /\bdespliegue\b/i, /\bdocker\b/i, /\bkubernetes\b/i, /\bcontenedor/i, /\bvirtualiza/i, /\bhipervisor/i, /\bvps\b/i, /\blxc\b/i, /\bhosting\b/i] },
  { id: 'diw',  patrones: [/\bdiw\b/i, /\bdise[ñn]o de interfaces/i, /\bdise[ñn]o web\b/i, /\bdise[ñn]o y prototipo/i, /\bfigma\b/i, /\bprototipo\b/i, /\bmaquetaci/i, /\baccesibilidad\b/i, /\bresponsive\b/i] },
  { id: 'en',   patrones: [/\bingle[sñ]s?\b/i, /\benglish\b/i, /\bingl[ée]s\b/i, /\bwriting\b/i, /\bspeaking\b/i, /\breading\b/i, /\blistening\b/i, /\bvocabulary\b/i, /\bgrammar\b/i, /\bessay\b/i] },
  { id: 'ipe',  patrones: [/\bipe\b/i, /\bitinerario personal/i, /\bempleabilidad\b/i, /\binserci[oó]n laboral/i] },
  { id: 'opt',  patrones: [/\boptativa\b/i] },
  { id: 'proy', patrones: [/\bproyecto\b/i, /\bptv\b/i, /\btrabajo de fin de ciclo/i] },
];

function quitarUrls(txt) { return (txt || '').replace(/https?:\/\/\S+/g, ' '); }

/** Convierte la descripción HTML de Moodle en texto plano legible. */
function limpiarDescripcion(raw) {
  if (!raw) return null;
  let t = String(raw);
  t = t.replace(/\n\s*Links?:[\s\S]*$/i, '');
  t = t.replace(/\n-{2,}\s*\[1\][\s\S]*$/i, '');
  t = t
    .replace(/&amp;/gi, '&').replace(/&nbsp;/gi, ' ').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'").replace(/&lsquo;/gi, "'").replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–').replace(/&hellip;/gi, '…');
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n');
  t = t.replace(/<li[^>]*>/gi, '  • ');
  t = t.replace(/<[^>]+>/g, '');
  t = t.replace(/\t/g, '  ').replace(/ {3,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (t.length > 3000) t = t.slice(0, 3000) + '\n\n… (descripción larga, abre el curso en Moodle)';
  return t || null;
}

function detectarPorTexto(ev) {
  const titulo = quitarUrls(ev.summary);
  for (const { id, patrones } of PATRONES_MODULO) {
    if (patrones.some(p => p.test(titulo))) return id;
  }
  const desc = quitarUrls(ev.description);
  for (const { id, patrones } of PATRONES_MODULO) {
    if (patrones.some(p => p.test(desc))) return id;
  }
  return null;
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

function nombreTipo(tipoId) {
  switch (tipoId) {
    case 'examen': return 'Examen';
    case 'entrega': return 'Tarea / Entrega';
    case 'clase': return 'Clase / Sesión';
    default: return 'Publicación';
  }
}

function formatearFechaNotif(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Madrid',
    });
  } catch {
    return '';
  }
}

/** Comprueba si dos marcas temporales difieren de forma significativa (> 60 segundos). */
function fechasDifieren(f1, f2) {
  if (!f1 && !f2) return false;
  if (!f1 || !f2) return true;
  const t1 = new Date(f1).getTime();
  const t2 = new Date(f2).getTime();
  if (isNaN(t1) || isNaN(t2)) return f1 !== f2;
  return Math.abs(t1 - t2) > 60000;
}

/** Fusiona "Se abre X" + "Se cierra X" en un único evento con ventana de tiempo. */
function fusionarPares(eventosMoodle) {
  const pares = new Map();
  const sueltos = [];
  for (const ev of eventosMoodle) {
    const t = (ev.summary || '').trim();
    const abre = t.match(/^se\s+abre\s+(.+)$/i);
    const cierra = t.match(/^se\s+cierra\s+(.+)$/i);
    if (abre) {
      const k = abre[1].trim();
      pares.set(k, { ...(pares.get(k) || {}), abre: { ...ev, base: k } });
    } else if (cierra) {
      const k = cierra[1].trim();
      pares.set(k, { ...(pares.get(k) || {}), cierra: { ...ev, base: k } });
    } else {
      sueltos.push(ev);
    }
  }
  const out = [...sueltos];
  for (const [base, { abre, cierra }] of pares) {
    if (abre && cierra) {
      out.push({
        summary: base,
        description: abre.description || cierra.description,
        start: abre.start,
        end: cierra.start,
        uid: `fused-${abre.uid}__${cierra.uid}`,
        categories: abre.categories || cierra.categories,
        _fusionado: true,
      });
    } else {
      out.push(abre || cierra);
    }
  }
  return out;
}

// --- Estado de sincronización y mapa de cursos (persistidos en config_grupo) ---
async function leerConfig(clave, porDefecto) {
  const { data } = await supabaseAdmin.from('config_grupo').select('valor').eq('clave', clave).single();
  return data?.valor ?? porDefecto;
}
async function escribirConfig(clave, valor) {
  await supabaseAdmin.from('config_grupo')
    .upsert({ clave, valor, updated_at: new Date().toISOString() }, { onConflict: 'clave' });
}

async function sincronizarFeed() {
  const url = process.env.MOODLE_ICAL_URL;
  if (!url) {
    console.log('⚠️  MOODLE_ICAL_URL no configurada');
    return;
  }
  try {
    const data = await ical.async.fromURL(url);
    const raw = Object.values(data).filter(e => e.type === 'VEVENT');
    const eventos = fusionarPares(raw);
    const cursoMap = await leerConfig('moodle_course_map', {});
    const prevSync = await leerConfig('moodle_sync', null);
    const esPrimeraSincronizacion = !prevSync || !prevSync.last_ok;
    let nuevosCursos = 0;

    console.log(`📥 Moodle: ${raw.length} crudos → ${eventos.length} tras fusionar`);
    let creados = 0, actualizados = 0;
    const uidsVistos = new Set();
    const nuevosEventos = [];
    const eventosModificados = [];

    for (const ev of eventos) {
      const uid = ev.uid;
      uidsVistos.add(uid);
      const inicio = ev.start, fin = ev.end || ev.start;
      if (!inicio) continue;

      const courseId = String((Array.isArray(ev.categories) ? ev.categories[0] : ev.categories) || '');
      let modId = cursoMap[courseId] || null;
      if (!modId) {
        modId = detectarPorTexto(ev);
        if (modId && courseId) { cursoMap[courseId] = modId; nuevosCursos++; }
      }
      const moduloFinal = modId || 'otro';

      const moodleUrl = BASE_MOODLE && courseId
        ? `${BASE_MOODLE}/course/view.php?id=${courseId}`
        : (ev.url || null);

      const { data: existentes } = await supabaseAdmin
        .from('eventos').select('id, modulo_id, tipo_id, titulo, fecha_inicio, fecha_fin, descripcion, moodle_url, revisar')
        .eq('moodle_uid', uid).limit(1);

      const payload = {
        titulo: (ev.summary || 'Evento Moodle').substring(0, 200),
        descripcion: limpiarDescripcion(ev.description),
        modulo_id: moduloFinal,
        tipo_id: detectarTipo(ev),
        fecha_inicio: inicio.toISOString(),
        fecha_fin: fin.toISOString(),
        todo_el_dia: ev.datetype === 'date',
        origen: 'moodle',
        moodle_uid: uid,
        moodle_url: moodleUrl,
        moodle_course_id: courseId || null,
        revisar: !modId,
      };

      if (existentes?.length) {
        const ex = existentes[0];
        const cambioClasificacion =
          (ex.modulo_id || '') !== (payload.modulo_id || '') ||
          (ex.tipo_id || '') !== (payload.tipo_id || '') ||
          (ex.titulo || '').trim() !== (payload.titulo || '').trim();

        const cambioFechas =
          fechasDifieren(ex.fecha_inicio, payload.fecha_inicio) ||
          fechasDifieren(ex.fecha_fin, payload.fecha_fin);

        const cambioDetalles =
          (ex.descripcion || '') !== (payload.descripcion || '') ||
          (ex.moodle_url || '') !== (payload.moodle_url || '') ||
          Boolean(ex.revisar) !== Boolean(payload.revisar);

        if (cambioFechas) {
          actualizados++;
          payload.alerta_cierre = null; // Reiniciar alertas solo si la fecha límite realmente ha cambiado
          if (!esPrimeraSincronizacion) {
            const fechaFinEv = new Date(payload.fecha_fin || payload.fecha_inicio);
            if (fechaFinEv.getTime() > Date.now() - 24 * 3600 * 1000) {
              eventosModificados.push(payload);
            }
          }
          await supabaseAdmin.from('eventos').update(payload).eq('moodle_uid', uid);
        } else if (cambioClasificacion || cambioDetalles) {
          actualizados++;
          await supabaseAdmin.from('eventos').update(payload).eq('moodle_uid', uid);
        }
      } else {
        await supabaseAdmin.from('eventos').insert(payload);
        creados++;
        if (!esPrimeraSincronizacion) {
          const fechaFinEv = new Date(payload.fecha_fin || payload.fecha_inicio);
          if (fechaFinEv.getTime() > Date.now() - 24 * 3600 * 1000) {
            nuevosEventos.push(payload);
          }
        }
      }
    }

    // Dar de baja eventos de Moodle que ya no existen
    const { data: enDb } = await supabaseAdmin.from('eventos').select('id, moodle_uid').eq('origen', 'moodle');
    let borrados = 0;
    for (const e of enDb || []) {
      if (e.moodle_uid && !uidsVistos.has(e.moodle_uid)) {
        await supabaseAdmin.from('eventos').delete().eq('id', e.id);
        borrados++;
      }
    }

    if (nuevosCursos > 0) {
      await escribirConfig('moodle_course_map', cursoMap);
      console.log(`🧠 Nuevo curso reconocido: ${JSON.stringify(cursoMap)}`);
    }

    // --- Enviar Notificaciones Push de Moodle al Grupo ---
    if (!esPrimeraSincronizacion) {
      try {
        if (nuevosEventos.length > 0 && nuevosEventos.length <= 3) {
          for (const ev of nuevosEventos) {
            const mod = (ev.modulo_id || 'Moodle').toUpperCase();
            const tipo = nombreTipo(ev.tipo_id);
            const fecha = formatearFechaNotif(ev.fecha_fin || ev.fecha_inicio);
            await notificarTodos({
              titulo: `🎓 ${mod} (Moodle): ${tipo}`,
              cuerpo: `${ev.titulo}${fecha ? ` · Límite: ${fecha}` : ''}`,
              url: ev.moodle_url || 'https://calendario-daw-1.onrender.com',
            });
          }
          console.log(`📢 Push enviado: ${nuevosEventos.length} nuevo(s) evento(s) Moodle`);
        } else if (nuevosEventos.length > 3) {
          await notificarTodos({
            titulo: `🎓 Moodle: ${nuevosEventos.length} nuevas publicaciones`,
            cuerpo: 'Los profesores han subido nuevas tareas o exámenes. Pulsa para ver el calendario.',
            url: 'https://calendario-daw-1.onrender.com',
          });
          console.log(`📢 Push resumen enviado: ${nuevosEventos.length} nuevos eventos Moodle`);
        }

        if (eventosModificados.length > 0 && eventosModificados.length <= 3) {
          for (const ev of eventosModificados) {
            const mod = (ev.modulo_id || 'Moodle').toUpperCase();
            const fecha = formatearFechaNotif(ev.fecha_fin || ev.fecha_inicio);
            await notificarTodos({
              titulo: `🔄 ${mod} (Moodle): Fecha modificada`,
              cuerpo: `${ev.titulo}${fecha ? ` · Nueva fecha: ${fecha}` : ''}`,
              url: ev.moodle_url || 'https://calendario-daw-1.onrender.com',
            });
          }
          console.log(`📢 Push enviado: ${eventosModificados.length} evento(s) Moodle modificado(s)`);
        } else if (eventosModificados.length > 3) {
          const ahoraMs = Date.now();
          const ultimoPushModif = await leerConfig('ultimo_push_moodle_modificados', 0);
          const minutosDesdeUltimo = (ahoraMs - Number(ultimoPushModif)) / 60000;

          if (minutosDesdeUltimo >= 60) {
            await notificarTodos({
              titulo: `🔄 Moodle: ${eventosModificados.length} fechas actualizadas`,
              cuerpo: 'Se han modificado plazos de entregas o exámenes. Pulsa para ver los cambios.',
              url: 'https://calendario-daw-1.onrender.com',
            });
            await escribirConfig('ultimo_push_moodle_modificados', ahoraMs);
            console.log(`📢 Push resumen enviado: ${eventosModificados.length} eventos Moodle actualizados`);
          } else {
            console.log(`⏳ Push resumen omitido por cooldown antispam (${Math.round(minutosDesdeUltimo)} min desde el último)`);
          }
        }
      } catch (errNotif) {
        console.error('Error enviando notificaciones push Moodle:', errNotif.message);
      }
    }

    await escribirConfig('moodle_sync', {
      last_ok: new Date().toISOString(),
      eventos: eventos.length,
      creados, actualizados, borrados,
      error: null,
      fallos_consecutivos: 0,
      aviso_enviado: false,
    });

    console.log(`✅ Moodle OK (${creados} nuevos, ${actualizados} reclasificados, ${borrados} dados de baja)`);
  } catch (err) {
    console.error('❌ Error sincronizando Moodle:', err.message);
    const prev = await leerConfig('moodle_sync', {});
    const fallos = (prev?.fallos_consecutivos || 0) + 1;
    const esErrorCredenciales = /401|403|404|unauthorized|forbidden|invalid/i.test(err.message || '');
    // Avisa si el token/URL es inválido de inmediato, o si lleva 3 intentos fallidos consecutivos (45 min)
    const debeAvisar = esErrorCredenciales || fallos >= 3;

    await escribirConfig('moodle_sync', {
      ...prev,
      last_error: new Date().toISOString(),
      error: err.message,
      fallos_consecutivos: fallos,
      aviso_enviado: debeAvisar ? true : (prev?.aviso_enviado || false),
    });

    if (debeAvisar && !prev?.aviso_enviado) {
      try {
        await notificarCambio({
          exceptoUsuarioId: null,
          titulo: '⚠️ Moodle deja de sincronizar',
          cuerpo: esErrorCredenciales
            ? 'El enlace de Moodle ha caducado o no es válido. Antonio debe regenerar la URL del calendario.'
            : 'Moodle lleva más de 45 minutos sin responder. Comprueba el estado de la plataforma.',
        });
      } catch { /* no romper el arranque */ }
    }
  }
}

export { sincronizarFeed };

export function iniciarSincronizacionMoodle() {
  setTimeout(() => sincronizarFeed(), 15_000);
  setInterval(() => sincronizarFeed(), 15 * 60 * 1000);
  import('./push.js').then(m => {
    setTimeout(() => m.revisarAlertasYRecordatorios(), 30_000);
    setInterval(() => m.revisarAlertasYRecordatorios(), 10 * 60 * 1000);
  });
}
