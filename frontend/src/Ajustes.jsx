import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

function Ajustes({ usuario }) {
  const [usuarios, setUsuarios] = useState([]);
  const [notifActiva, setNotifActiva] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    cargarUsuarios();
    if ('Notification' in window) {
      setNotifActiva(Notification.permission === 'granted');
    }
  }, []);

  async function cargarUsuarios() {
    try {
      const res = await fetch(`${API_URL}/api/auth/usuarios?sala=${usuario.codigo_sala}`);
      const data = await res.json();
      if (data.usuarios) setUsuarios(data.usuarios);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    }
  }

  async function activarNotificaciones() {
    if (!('Notification' in window)) {
      setMensaje('Tu navegador no soporta notificaciones');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setMensaje('Permiso de notificaciones denegado');
        return;
      }

      // Registrar service worker para push
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: await getVapidPublicKey(),
        });

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
        }
      }
    } catch (err) {
      console.error('Error activando notificaciones:', err);
      setMensaje('Error al activar notificaciones');
    }
  }

  async function getVapidPublicKey() {
    const res = await fetch(`${API_URL}/api/push/vapid-public-key`);
    const data = await res.json();
    return data.publicKey;
  }

  return (
    <div className="ajustes-container">
      <div className="ajustes-card">
        <h3>👥 Miembros del grupo</h3>
        {usuarios.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Eres el único miembro. Comparte el código de sala con tus compañeros.
          </p>
        ) : (
          usuarios.map(u => (
            <div key={u.id} className="ajustes-item">
              <span className="ajustes-item-label">
                {u.id === usuario.id ? `🟢 ${u.nombre} (tú)` : `⚪ ${u.nombre}`}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="ajustes-card">
        <h3>🔔 Notificaciones</h3>
        <div className="ajustes-item">
          <span className="ajustes-item-label">Push al móvil</span>
          {notifActiva ? (
            <span style={{ color: 'var(--success)', fontSize: '0.875rem' }}>✅ Activas</span>
          ) : (
            <button className="btn btn-filled" onClick={activarNotificaciones}>
              Activar
            </button>
          )}
        </div>
        {mensaje && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {mensaje}
          </p>
        )}
      </div>

      <div className="ajustes-card">
        <h3>ℹ️ Información</h3>
        <div className="ajustes-item">
          <span className="ajustes-item-label">Código de sala</span>
          <span className="ajustes-item-valor">{usuario.codigo_sala}</span>
        </div>
        <div className="ajustes-item">
          <span className="ajustes-item-label">Versión</span>
          <span className="ajustes-item-valor">1.0.0</span>
        </div>
      </div>

      <div className="ajustes-card">
        <h3>🎓 Sincronización Moodle</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Las tareas y exámenes de Moodle se sincronizan automáticamente cada 15 minutos.
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Los eventos de Moodle aparecen marcados con 🎓 y no se pueden editar desde aquí.
        </p>
      </div>
    </div>
  );
}

export default Ajustes;
