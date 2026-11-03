// ================================================
// WIDGET: Pendientes (checkbox al tocar)
// Nombre del script en Scriptable: pendientes
// Al tocar el widget, marca como completado
// el PRIMERO de la lista (limitación Scriptable)
// ================================================

const API_URL = 'https://calendario-daw.onrender.com';
const SALA = 'daw2cordoba2026';

const MODULOS = {
  ipe:  { color: Color.hex('#8b5cf6'), nombre: 'IPE' },
  dwec: { color: Color.hex('#3b82f6'), nombre: 'DWEC' },
  dwes: { color: Color.hex('#10b981'), nombre: 'DWES' },
  daw:  { color: Color.hex('#f97316'), nombre: 'DAW' },
  diw:  { color: Color.hex('#ec4899'), nombre: 'DIW' },
  en:   { color: Color.hex('#06b6d4'), nombre: 'ING' },
  opt:  { color: Color.hex('#eab308'), nombre: 'OPT' },
  proy: { color: Color.hex('#ef4444'), nombre: 'PRY' },
  otro: { color: Color.hex('#6b7280'), nombre: '?' },
};

const TIPO_ICONO = { examen: '📝', entrega: '📦', apunte: '📌', clase: '📚', reunion: '👥', otro: '⭐' };

let eventos = [];
try {
  const data = await new Request(`${API_URL}/api/eventos?sala=${SALA}`).loadJSON();
  const hoy = new Date();
  eventos = (data.eventos || [])
    .filter(e => !e.completado && new Date(e.fecha_inicio) >= hoy)
    .filter(e => ['examen', 'entrega'].includes(e.tipo_id))
    .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));
} catch { eventos = []; }

const w = new ListWidget();
w.backgroundColor = Color.hex('#0f172a');
w.setPadding(12, 12, 12, 12);

const head = w.addStack();
const title = head.addText('✅ Tus pendientes');
title.font = Font.boldSystemFont(14);
title.textColor = Color.white();
head.addSpacer();
const count = head.addText(`${eventos.length}`);
count.font = Font.boldSystemFont(14);
count.textColor = eventos.length === 0 ? Color.hex('#10b981') : Color.hex('#f97316');

w.addSpacer(6);

if (eventos.length === 0) {
  const empty = w.addText('🎉');
  empty.font = Font.systemFont(28);
  empty.alignment = Center;
  const msg = w.addText('Nada pendiente');
  msg.font = Font.systemFont(12);
  msg.textColor = Color.gray();
  msg.alignment = Center;
} else {
  const shown = eventos.slice(0, 6);
  const primero = shown[0];

  for (const ev of shown) {
    const mod = MODULOS[ev.modulo_id] || MODULOS.otro;
    const f = new Date(ev.fecha_inicio);
    const diffDias = Math.ceil((f - new Date()) / 86400000);
    const esPrimero = ev.id === primero.id;

    // Fila con cuadrito
    const row = w.addStack();
    row.spacing = 8;
    row.centerAlignment = VerticalAlignment.CENTER;

    // Cuadrito (visual)
    const box = row.addText(esPrimero ? '⭕' : '☐');
    box.textColor = mod.color;
    box.font = Font.systemFont(14);

    // Columna de contenido
    const col = row.addStack();
    col.layoutDirection = Direction.VERTICAL;
    col.spacing = 1;

    const l1 = col.addText(`${TIPO_ICONO[ev.tipo_id] || '⭐'} ${mod.nombre}  ·  ${ev.titulo}`);
    l1.font = Font.systemFont(11);
    l1.textColor = Color.white();
    l1.lineLimit = 1;
    l1.minimumScaleFactor = 0.6;

    const urg = diffDias <= 1 ? Color.red() : diffDias <= 3 ? Color.orange() : Color.gray();
    const l2 = col.addText(`${f.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}  ·  ${diffDias <= 0 ? 'HOY' : diffDias === 1 ? 'mañana' : `en ${diffDias} días`}`);
    l2.font = Font.systemFont(9);
    l2.textColor = urg;

    w.addSpacer(6);
  }

  if (eventos.length > 6) {
    const more = w.addText(`+${eventos.length - 6} más en la web`);
    more.font = Font.italicSystemFont(10);
    more.textColor = Color.gray();
  }

  // Tocar el widget marca como completado el primero
  w.url = `scriptable:///run?scriptName=marcar-completado&input=${encodeURIComponent(primero.id)}`;
}

w.refreshInterval = 15;
await w.presentMedium();
Script.setWidget(w);
Script.complete();
