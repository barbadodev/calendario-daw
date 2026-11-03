// ================================================
// WIDGET: Próximo evento (pantalla de inicio)
// Nombre del script en Scriptable: proximo-evento
// ================================================

const API_URL = 'https://calendario-daw.onrender.com';
const SALA = 'daw2cordoba2026';

const MODULOS = {
  ipe:  { nombre: 'IPE',      color: Color.hex('#8b5cf6') },
  dwec: { nombre: 'DWEC',     color: Color.hex('#3b82f6') },
  dwes: { nombre: 'DWES',     color: Color.hex('#10b981') },
  daw:  { nombre: 'DAW',      color: Color.hex('#f97316') },
  diw:  { nombre: 'DIW',      color: Color.hex('#ec4899') },
  en:   { nombre: 'Inglés',   color: Color.hex('#06b6d4') },
  opt:  { nombre: 'Optativa', color: Color.hex('#eab308') },
  proy: { nombre: 'Proyecto', color: Color.hex('#ef4444') },
  otro: { nombre: 'Otro',     color: Color.hex('#6b7280') },
};

const TIPO_ICONO = { examen: '📝', entrega: '📦', apunte: '📌', clase: '📚', reunion: '👥', otro: '⭐' };

let eventos = [];
try {
  const data = await new Request(`${API_URL}/api/eventos?sala=${SALA}`).loadJSON();
  eventos = (data.eventos || [])
    .filter(e => !e.completado)
    .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));
} catch { eventos = []; }

const prox = eventos[0];
const ahora = new Date();

const w = new ListWidget();
w.backgroundColor = Color.hex('#0f172a');
w.setPadding(14, 14, 14, 14);

if (!prox) {
  const t = w.addText('🎉 Sin pendientes');
  t.font = Font.boldSystemFont(18);
  t.textColor = Color.white();
  w.addSpacer();
  const sub = w.addText('Todo entregado\npor ahora 💪');
  sub.font = Font.systemFont(12);
  sub.textColor = Color.gray();
} else {
  const mod = MODULOS[prox.modulo_id] || MODULOS.otro;
  const f = new Date(prox.fecha_inicio);
  const diff = f - ahora;
  const dias = Math.ceil(diff / 86400000);
  const horas = Math.floor(diff / 3600000);
  let etiqueta;
  if (dias <= 0) etiqueta = horas <= 0 ? 'AHORA MISMO' : `HOY · en ${horas}h`;
  else if (dias === 1) etiqueta = 'MAÑANA';
  else etiqueta = `en ${dias} días`;

  // Fila cabecera (badge + icono)
  const row = w.addStack();
  row.spacing = 6;
  const badge = row.addText(mod.nombre.toUpperCase());
  badge.font = Font.boldSystemFont(11);
  badge.textColor = Color.white();
  badge.backgroundColor = mod.color;
  badge.paddingLeft = 6; badge.paddingRight = 6;
  badge.paddingTop = 2; badge.paddingBottom = 2;
  badge.cornerRadius = 4;
  row.addSpacer();
  const icon = row.addText(TIPO_ICONO[prox.tipo_id] || '⭐');
  icon.font = Font.systemFont(14);

  w.addSpacer(8);

  const big = w.addText(etiqueta);
  big.font = Font.boldSystemFont(20);
  big.textColor = mod.color;
  w.addSpacer(4);

  const t = w.addText(prox.titulo);
  t.font = Font.systemFont(14);
  t.textColor = Color.white();
  t.lineLimit = 2;
  t.maximumFontSize = 14;

  w.addSpacer();

  const fechaTxt = f.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  const hora = prox.todo_el_dia ? '' : ` · ${String(f.getHours()).padStart(2,'0')}:${String(f.getMinutes()).padStart(2,'0')}`;
  const foot = w.addText(fechaTxt + hora);
  foot.font = Font.systemFont(11);
  foot.textColor = Color.gray();
}

w.refreshInterval = 15;
w.url = 'https://calendario-daw-1.onrender.com';

await w.presentSmall();
Script.setWidget(w);
Script.complete();
