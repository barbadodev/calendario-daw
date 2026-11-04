import { useState, useEffect } from 'react';
import SemanaExamenes from './SemanaExamenes.jsx';

const API_URL = import.meta.env.VITE_API_URL;

export default function Ajustes({ usuario, eventos }) {
  const [usuarios, setUsuarios] = useState([]);
  const [notifActiva, setNotifActiva] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [sincronizando, setSincronizando] = useState(false);
  const [mostrarIcsUrl, setMostrarIcsUrl] = useState(false);
  const [resumen, setResumen] = useState('');

  useEffect(() => {
    cargarUsuarios();
    if ('Notification' in window) {
      setNotifActiva(Notification.permission === 'granted');
    }
  }, []);

  async function cargarUsuarios() {
    const res = await fetch(`${API_URL}/api/auth/usuarios?sala=${usuario.codigo_sala}`);
    const data = await res.json();
    if (data.usuarios) setUsuarios(data.usuarios);
  }

  async function activarNotificaciones() {
    if (!('Notification' in window)) return setMensaje('Tu navegador no soporta notificaciones');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return setMensaje('Permiso denegado');

      const reg = await navigator.serviceWorker.ready;
      const pubKeyRes = await fetch(`${API_URL}/api/push/vapid-public-key`);
      const { publicKey } = await pubKeyRes.json();

      // Si había una suscripción previa (p. ej. con otra clave VAPID), se limpia primero
      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        try { await sub.unsubscribe(); } catch { /* da igual */ }
        sub = null;
      }

      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      } catch (err) {
        // Reintento una vez si el navegador se quejó de la clave
        const msg = String(err.message || '').toLowerCase();
        if (msg.includes('match') || msg.includes('invalid')) {
          try {
            const old = await reg.pushManager.getSubscription();
            if (old) await old.unsubscribe();
          } catch { /* nada */ }
          await new Promise(r => setTimeout(r, 500));
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        } else {
          throw err;
        }
      }

      const res = await fetch(`${API_URL}/api/push/suscribir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sala: usuario.codigo_sala,
          usuarioId: usuario.id,
          suscripcion: sub.toJSON(),
        }),
      });
      if (res.ok) {
        setNotifActiva(true);
        setMensaje('✅ Notificaciones activadas');
      } else {
        const err = await res.json();
        setMensaje('❌ ' + (err.error || 'Error al registrar la suscripción'));
      }
    } catch (err) {
      console.error('Error activando notificaciones:', err);
      setMensaje('❌ ' + (err.message || 'No se pudo activar'));
    }
  }

  async function sincronizarAhora() {
    setSincronizando(true);
    setMensaje('🔄 Forzando sincronización con Moodle...');
    const res = await fetch(`${API_URL}/api/sync/now`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sala: usuario.codigo_sala }),
    });
    if (res.ok) setMensaje('✅ Sincronización completada. Recarga si no ves los cambios.');
    else setMensaje('❌ Error sincronizando');
    setSincronizando(false);
    setTimeout(() => window.location.reload(), 2000);
  }

  async function generarResumen(dias) {
    try {
      const res = await fetch(`${API_URL}/api/resumen-semana?sala=${usuario.codigo_sala}&dias=${dias}`);
      const data = await res.json();
      setResumen(data.texto || 'Sin eventos');
    } catch {
      setMensaje('❌ No se pudo generar el resumen');
    }
  }

  function urlBase64ToUint8Array(base64) {
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(b64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  const icsUrl = `${API_URL}/api/export/ics?sala=${usuario.codigo_sala}`;

  return (
    <div className="ajustes-container">
      <div className="ajustes-card">
        <h3>👥 Miembros del grupo</h3>
        {usuarios.length === 0
          ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Solo estás tú por ahora.</p>
          : usuarios.map(u => (
            <div key={u.id} className="ajustes-item">
              <span className="ajustes-item-label">{u.id === usuario.id ? `🟢 ${u.nombre} (tú)` : `⚪ ${u.nombre}`}</span>
              <span className="ajustes-item-valor">
                {u.last_seen ? new Date(u.last_seen).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          ))
        }
      </div>

      <div className="ajustes-card">
        <h3>🔔 Notificaciones</h3>
        <div className="ajustes-item">
          <span className="ajustes-item-label">Avisos en este dispositivo</span>
          {notifActiva
            ? <span style={{ color: 'var(--success)', fontSize: '0.875rem' }}>✅ Activadas</span>
            : <button className="btn btn-filled" onClick={activarNotificaciones}>Activar</button>
          }
        </div>
        {mensaje && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>{mensaje}</p>}
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
          💡 En iPhone hay que abrirla desde el icono de pantalla de inicio (Safari → Compartir → Añadir a pantalla de inicio), no desde Safari.
        </p>
      </div>

      <div className="ajustes-card">
        <h3>🎓 Sincronización Moodle</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Moodle se sincroniza solo cada 15 minutos. Aquí puedes forzar una actualización al instante.
        </p>
        <button className="btn btn-filled" onClick={sincronizarAhora} disabled={sincronizando} style={{ marginTop: '0.75rem' }}>
          {sincronizando ? '⏳ Sincronizando...' : '🔄 Sincronizar ahora'}
        </button>
      </div>

      <SemanaExamenes usuario={usuario} />

      <div className="ajustes-card">
        <h3>📆 Exportar a Google/Apple Calendar</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          Pega esta URL en Google Calendar → "Otros calendarios" → "Desde URL" (en iPhone: Ajustes → Calendarios → Cuentas → Calendario de suscripción).
        </p>
        {!mostrarIcsUrl ? (
          <button className="btn" onClick={() => setMostrarIcsUrl(true)}>🔗 Mostrar URL</button>
        ) : (
          <div style={{ background: 'var(--bg)', padding: '0.75rem', borderRadius: 6, fontSize: '0.7rem', wordBreak: 'break-all' }}>
            {icsUrl}
            <button className="btn" onClick={() => navigator.clipboard.writeText(icsUrl).then(() => alert('Copiado ✅'))}
              style={{ display: 'block', marginTop: '0.5rem', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
              Copiar
            </button>
          </div>
        )}
      </div>

      <div className="ajustes-card">
        <h3>📤 Compartir con el grupo</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
          Genera un resumen en texto de vuestros próximos días, listo para pegar en el WhatsApp de clase.
        </p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => generarResumen(3)}>Próximos 3 días</button>
          <button className="btn" onClick={() => generarResumen(7)}>Semana</button>
          <button className="btn" onClick={() => generarResumen(14)}>2 semanas</button>
        </div>
        {resumen && (
          <div style={{ marginTop: '0.75rem' }}>
            <textarea
              readOnly value={resumen}
              onFocus={e => e.target.select()}
              style={{
                width: '100%', minHeight: '11rem', background: 'var(--bg)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: 6, padding: '0.7rem',
                fontSize: '0.75rem', fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap',
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button className="btn btn-filled" onClick={() => navigator.clipboard.writeText(resumen).then(() => setMensaje('✅ Resumen copiado'))}>Copiar</button>
              <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(resumen)}`} target="_blank" rel="noreferrer"
                style={{ textDecoration: 'none', textAlign: 'center' }}>Abrir en WhatsApp</a>
            </div>
          </div>
        )}
      </div>

      <div className="ajustes-card">
        <h3>💾 Copia de seguridad</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
          Descarga un JSON con todos los eventos, notas y configuración. Útil por si se rompe algo o queréis guardar el curso.
        </p>
        <a className="btn" href={`${API_URL}/api/backup?sala=${usuario.codigo_sala}`} download
          style={{ textDecoration: 'none', display: 'inline-block' }}>⬇️ Descargar backup</a>
      </div>

      <div className="ajustes-card">
        <h3>ℹ️ Info</h3>
        <div className="ajustes-item">
          <span className="ajustes-item-label">Código de sala</span>
          <span className="ajustes-item-valor">{usuario.codigo_sala}</span>
        </div>
        <div className="ajustes-item">
          <span className="ajustes-item-label">Eventos totales</span>
          <span className="ajustes-item-valor">{eventos.length}</span>
        </div>
        <div className="ajustes-item">
          <span className="ajustes-item-label">Versión</span>
          <span className="ajustes-item-valor">1.3.1</span>
        </div>
      </div>
    </div>
  );
}
