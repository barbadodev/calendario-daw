// ================================================
// WIDGET BLOQUEO: Próximo evento compacto (iOS 16+)
// Nombre del script en Scriptable: proximo-bloqueo
// Se añade desde: Ajustes → Pantalla de bloqueo →
//                  Personalizar → Widgets → Scriptable
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

const NOMBRES = {
  ipe: 'IPE', dwec: 'DWEC', dwes: 'DWES', daw: 'DAW', diw: 'DIW',
  en: 'ING', opt: 'OPT', proy: 'PRY', otro: '?'
};

let eventos = [];
try {
  const data = await new Request(`${API_URL}/api/eventos?sala=${SALA}`).loadJSON();
  eventos = (data.eventos || [])
    .filter(e => !e.completado)
    .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));
} catch { eventos = []; }

const prox = eventos[0];
const ahora = new Date();

const w = new BlockWidget();
w.contentAlignment = VerticalAlignment.CENTER;

if (!prox) {
  const t = w.addText('🎉');
  t.font = Font.systemFont(20);
} else {
  const mod = MODULOS[prox.modulo_id] || MODULOS.otro;
  const f = new Date(prox.fecha_inicio);
  const dias = Math.ceil((f - ahora) / 86400000);
  const label = dias <= 0 ? 'HOY' : `${dias}d`;

  // Stack vertical: contador + nombre módulo + título recortado
  const s = w.addStack();
  s.spacing = 4;

  const c = s.addText(label);
  c.font = Font.boldMonospacedSystemFont(18);
  c.textColor = mod.color;

  const n = s.addText(NOMBRES[prox.modulo_id] || '?');
  n.font = Font.boldMonospacedSystemFont(9);
  n.textColor = Color.secondaryLabel();

  s.addSpacer();

  const titulo = s.addText((prox.titulo || '').slice(0, 20));
  titulo.font = Font.systemFont(10);
  titulo.textColor = Color.label();
  titulo.lineLimit = 1;
}

w.refreshInterval = 15;
w.url = 'https://calendario-daw-1.onrender.com';

await w.presentInLockScreen();
Script.setWidget(w);
Script.complete();
