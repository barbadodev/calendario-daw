// ================================================
// SCRIPT AUXILIAR: marcar evento como completado
// Nombre del script en Scriptable: marcar-completado
// Se invoca solo desde el widget "pendientes"
// Recibe el ID del evento en args.input
// ================================================

const API_URL = 'https://calendario-daw.onrender.com';
const SALA = 'daw2cordoba2026';

// Cuando se ejecuta desde un widget, args.input tiene el ID del evento
// Cuando se ejecuta desde Scriptable directamente, args.input es undefined
const eventId = args.input;

if (!eventId) {
  new Alert('Script auxiliar', 'Este script se ejecuta al tocar el widget "pendientes". No lo ejecutes manualmente.').show();
  Script.complete();
  return;
}

try {
  const req = new Request(`${API_URL}/api/eventos/${eventId}/completar`);
  req.method = 'POST';
  req.headers = { 'Content-Type': 'application/json' };
  req.body = JSON.stringify({ sala: SALA, valor: true });

  const res = await req.loadJSON();

  // Refresca todos los widgets automáticamente
  WidgetCenter.reloadAllTimelines();

  // Notificación visual (solo si se ejecuta en primer plano)
  if (config.runsInApp) {
    new Alert('✅ Hecho', res?.evento?.titulo
      ? `Marcado como completado: "${res.evento.titulo}"`
      : 'Evento marcado como completado').show();
  }
} catch (err) {
  if (config.runsInApp) {
    new Alert('❌ Error', 'No se pudo marcar: ' + err.message).show();
  }
}

Script.complete();
