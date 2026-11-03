import { useState, useEffect } from 'react';
import SemanaExamenes from './SemanaExamenes.jsx';

const API_URL = import.meta.env.VITE_API_URL;

export default function Ajustes({ usuario, eventos }) {
  const [usuarios, setUsuarios] = useState([]);
  const [notifActiva, setNotifActiva] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [sincronizando, setSincronizando] = useState(false);
  const [mostrarIcsUrl, setMostrarIcsUrl] = useState(false);

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
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      await fetch(`${API_URL}/api/push/suscribir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sala: usuario.codigo_sala, usuarioId: usuario.id, suscripcion: sub.toJSON() }),
      });
      setNotifActiva(true);
      setMensaje('✅ Notificaciones activadas');
    } catch (err) {
      console.error(err);
      setMensaje('❌ Error al activar: ' + err.message);
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
    // Recarga tras 2 segundos para que se apliquen cambios
    setTimeout(() => window.location.reload(), 2000);
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
                {u.last_seen ? 'visto ' + new Date(u.last_seen).toLocaleDateString('es-ES') : ''}
              </span>
            </div>
          ))
        }
      </div>

      <div className="ajustes-card">
        <h3>🔔 Notificaciones push</h3>
        <div className="ajustes-item">
          <span className="ajustes-item-label">Recibir avisos en el móvil</span>
          {notifActiva
            ? <span style={{ color: 'var(--success)', fontSize: '0.875rem' }}>✅ Activas</span>
            : <button className="btn btn-filled" onClick={activarNotificaciones}>Activar</button>
          }
        </div>
        {mensaje && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>{mensaje}</p>}
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
          Pega esta URL en Google Calendar → "Otros calendarios" → "Desde URL" y tendrás tus eventos junto al resto de tu calendario del móvil.
        </p>
        {!mostrarIcsUrl ? (
          <button className="btn" onClick={() => setMostrarIcsUrl(true)}>🔗 Mostrar URL</button>
        ) : (
          <div className="code" style={{ background: 'var(--bg)', padding: '0.75rem', borderRadius: 6, fontSize: '0.7rem', wordBreak: 'break-all' }}>
            {icsUrl}
            <button className="btn" onClick={() => navigator.clipboard.writeText(icsUrl).then(() => alert('Copiado ✅'))}
              style={{ display: 'block', marginTop: '0.5rem', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
              Copiar
            </button>
          </div>
        )}
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
          <span className="ajustes-item-valor">1.1.0</span>
        </div>
      </div>
    </div>
  );
}
