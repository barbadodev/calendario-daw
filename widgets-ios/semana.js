// ================================================
// WIDGET: Semana con puntos (horizontal 7 días)
// Nombre del script en Scriptable: semana
// ================================================

const API_URL = 'https://calendario-daw.onrender.com';
const SALA = 'daw2cordoba2026';

const MODULOS = {
  ipe:  { color: Color.hex('#8b5cf6') },
  dwec: { color: Color.hex('#3b82f6') },
  dwes: { color: Color.hex('#10b981') },
  daw:  { color: Color.hex('#f97316') },
  diw:  { color: Color.hex('#ec4899') },
  en:   { color: Color.hex('#06b6d4') },
  opt:  { color: Color.hex('#eab308') },
  proy: { color: Color.hex('#ef4444') },
  otro: { color: Color.hex('#6b7280') },
};

let eventos = [];
try {
  const data = await new Request(`${API_URL}/api/eventos?sala=${SALA}`).loadJSON();
  eventos = data.eventos || [];
} catch { eventos = []; }

const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

const w = new ListWidget();
w.backgroundColor = Color.hex('#0f172a');
w.setPadding(10, 10, 10, 10);

// Cabecera
const head = w.addStack();
const title = head.addText('📅 Tu semana');
title.font = Font.boldSystemFont(14);
title.textColor = Color.white();
head.addSpacer();
const rangeTxt = head.addText(`${hoy.getDate()} ${hoy.toLocaleDateString('es-ES', { month: 'short' })} · +7`);
rangeTxt.font = Font.systemFont(10);
rangeTxt.textColor = Color.gray();

w.addSpacer(8);

// 7 celdas horizontales
const row = w.addStack();
row.spacing = 4;
row.centerAlignment = VerticalAlignment.CENTER;

for (let i = 0; i < 7; i++) {
  const d = new Date(hoy);
  d.setDate(hoy.getDate() + i);
  const evsDia = eventos.filter(e => {
    const f = new Date(e.fecha_inicio);
    f.setHours(0, 0, 0, 0);
    return f.getTime() === d.getTime() && !e.completado;
  });

  const cell = row.addStack();
  cell.layoutDirection = Direction.VERTICAL;
  cell.size = new Size(40, 60);
  cell.centerAlignment = HorizontalAlignment.CENTER;
  if (i === 0) {
    cell.backgroundColor = Color.hex('#1e293b');
    cell.cornerRadius = 6;
  }

  const dayName = cell.addText(d.toLocaleDateString('es-ES', { weekday: 'narrow' }).toUpperCase());
  dayName.font = Font.boldSystemFont(9);
  dayName.textColor = i === 0 ? Color.white() : Color.gray();
  dayName.alignment = Center;

  const num = cell.addText(String(d.getDate()));
  num.font = Font.boldSystemFont(14);
  num.textColor = i === 0 ? Color.white() : Color.hex('#94a3b8');
  num.alignment = Center;

  const dots = cell.addStack();
  dots.spacing = 1;
  for (const ev of evsDia.slice(0, 3)) {
    const dot = dots.addText('●');
    dot.textColor = MODULOS[ev.modulo_id] || MODULOS.otro.color;
    dot.font = Font.systemFont(7);
  }
  if (evsDia.length > 3) {
    const more = dots.addText('+');
    more.textColor = Color.gray();
    more.font = Font.boldSystemFont(7);
  }
}

w.addSpacer(8);

// Lista compacta de próximos 3 pendientes
const pendientes = eventos
  .filter(e => !e.completado && new Date(e.fecha_inicio) >= hoy)
  .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))
  .slice(0, 3);

if (pendientes.length === 0) {
  const noEvents = w.addText('Semana libre 🎉');
  noEvents.font = Font.italicSystemFont(11);
  noEvents.textColor = Color.gray();
} else {
  for (const ev of pendientes) {
    const mod = MODULOS[ev.modulo_id] || MODULOS.otro;
    const linea = w.addStack();
    linea.spacing = 6;

    const dot = linea.addText('●');
    dot.textColor = mod.color;
    dot.font = Font.systemFont(10);

    const txt = linea.addText(ev.titulo);
    txt.font = Font.systemFont(11);
    txt.textColor = Color.white();
    txt.lineLimit = 1;
    txt.minimumScaleFactor = 0.6;

    w.addSpacer(2);
  }
}

w.refreshInterval = 15;
w.url = 'https://calendario-daw-1.onrender.com';

await w.presentMedium();
Script.setWidget(w);
Script.complete();
