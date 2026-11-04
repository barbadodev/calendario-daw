import { useState, useEffect } from 'react';
import SemanaExamenes from './SemanaExamenes.jsx';
import { IconoEnlace, IconoMonitor, IconoSol, IconoLuna } from './Icons.jsx';
import { setModo, modoActual } from './tema.js';

const API_URL = import.meta.env.VITE_API_URL;

const OPCIONES_TEMA = [
  { id: 'sistema', nombre: 'Sistema', Icono: IconoMonitor },
  { id: 'claro', nombre: 'Claro', Icono: IconoSol },
  { id: 'oscuro', nombre: 'Oscuro', Icono: IconoLuna },
];

export default function Ajustes({ usuario, eventos }) {
  const [usuarios, setUsuarios] = useState([]);
  const [notifActiva, setNotifActiva] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { texto, tipo: 'exito' | 'error' | 'neutro' }
  const [sincronizando, setSincronizando] = useState(false);
  const [mostrarIcsUrl, setMostrarIcsUrl] = useState(false);
  const [resumen, setResumen] = useState('');
  const [modo, setModoEstado] = useState(() => modoActual());

  function avisar(texto, tipo = 'neutro') { setMensaje({ texto, tipo }); }

  function elegirTema(id) {
    setModo(id);
    setModoEstado(id);
  }

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
    if (!('Notification' in window)) return avisar('Tu navegador no soporta notificaciones', 'error');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return avisar('Permiso denegado', 'error');

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
        avisar('Notificaciones activadas', 'exito');
      } else {
        const err = await res.json();
        avisar(err.error || 'Error al registrar la suscripción', 'error');
      }
    } catch (err) {
      console.error('Error activando notificaciones:', err);
      avisar(err.message || 'No se pudo activar', 'error');
    }
  }

  async function sincronizarAhora() {
    setSincronizando(true);
    avisar('Forzando sincronización con Moodle…');
    const res = await fetch(`${API_URL}/api/sync/now`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sala: usuario.codigo_sala }),
    });
    if (res.ok) avisar('Sincronización completada. Recarga si no ves los cambios.', 'exito');
    else avisar('Error sincronizando con Moodle', 'error');
    setSincronizando(false);
    setTimeout(() => window.location.reload(), 2000);
  }

  async function generarResumen(dias) {
    try {
      const res = await fetch(`${API_URL}/api/resumen-semana?sala=${usuario.codigo_sala}&dias=${dias}`);
      const data = await res.json();
      setResumen(data.texto || 'Sin eventos');
    } catch {
      avisar('No se pudo generar el resumen', 'error');
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
        <h3>Miembros del grupo</h3>
        {usuarios.length === 0
          ? <p>Solo estás tú por ahora.</p>
          : usuarios.map(u => (
            <div key={u.id} className="ajustes-item">
              <span className="ajustes-item-label">
                <span className={`punto-estado ${u.id === usuario.id ? 'activo' : ''}`} aria-hidden="true" />
                {u.id === usuario.id ? `${u.nombre} (tú)` : u.nombre}
              </span>
              <span className="ajustes-item-valor">
                {u.last_seen ? new Date(u.last_seen).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          ))
        }
      </div>

      <div className="ajustes-card">
        <h3>Apariencia</h3>
        <div className="selector-tema" role="group" aria-label="Tema de la aplicación">
          {OPCIONES_TEMA.map(({ id, nombre, Icono }) => (
            <button key={id}
              className={`opcion-tema ${modo === id ? 'activo' : ''}`}
              aria-pressed={modo === id}
              onClick={() => elegirTema(id)}>
              <Icono size={15} /> {nombre}
            </button>
          ))}
        </div>
        <p className="ajustes-nota">
          {modo === 'sistema'
            ? 'La app sigue el modo claro u oscuro que tenga tu móvil o navegador.'
            : `Fijado en modo ${modo}.`}
        </p>
      </div>

      <div className="ajustes-card">
        <h3>Notificaciones</h3>
        <div className="ajustes-item">
          <span className="ajustes-item-label">Avisos en este dispositivo</span>
          {notifActiva
            ? <span style={{ color: 'var(--success-text)', fontSize: '0.8rem' }}>Activadas</span>
            : <button className="btn btn-filled" onClick={activarNotificaciones}>Activar</button>
          }
        </div>
        {mensaje && <p className={`mensaje-ajustes ${mensaje.tipo}`}>{mensaje.texto}</p>}
        <p className="ajustes-nota">
          En iPhone hay que abrir la app desde el icono de la pantalla de inicio
          (Safari → Compartir → Añadir a pantalla de inicio), no desde Safari.
        </p>
      </div>

      <div className="ajustes-card">
        <h3>Moodle</h3>
        <p>
          Moodle se sincroniza solo cada 15 minutos. Aquí puedes forzar una actualización al instante.
        </p>
        <button className="btn btn-filled" onClick={sincronizarAhora} disabled={sincronizando} style={{ marginTop: '0.75rem' }}>
          {sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}
        </button>
      </div>

      <SemanaExamenes usuario={usuario} />

      <div className="ajustes-card">
        <h3>Exportar a Google / Apple Calendar</h3>
        <p>
          Pega esta URL en Google Calendar → «Otros calendarios» → «Desde URL». En iPhone:
          Ajustes → Calendarios → Cuentas → Calendario de suscripción.
        </p>
        {!mostrarIcsUrl ? (
          <button className="btn" onClick={() => setMostrarIcsUrl(true)} style={{ marginTop: '0.6rem' }}>
            <IconoEnlace size={13} /> Mostrar URL
          </button>
        ) : (
          <div className="caja-url" style={{ marginTop: '0.6rem' }}>
            {icsUrl}
            <button className="btn" onClick={() => navigator.clipboard.writeText(icsUrl).then(() => alert('Copiado'))}
              style={{ display: 'block', marginTop: '0.5rem', padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}>
              Copiar
            </button>
          </div>
        )}
      </div>

      <div className="ajustes-card">
        <h3>Compartir con el grupo</h3>
        <p>
          Genera un resumen en texto de los próximos días, listo para pegar en el WhatsApp de clase.
        </p>
        <div className="fila-botones" style={{ marginTop: '0.65rem' }}>
          <button className="btn" onClick={() => generarResumen(3)}>Próximos 3 días</button>
          <button className="btn" onClick={() => generarResumen(7)}>Semana</button>
          <button className="btn" onClick={() => generarResumen(14)}>2 semanas</button>
        </div>
        {resumen && (
          <div style={{ marginTop: '0.75rem' }}>
            <textarea
              readOnly value={resumen}
              onFocus={e => e.target.select()}
              className="caja-resumen"
            />
            <div className="fila-botones" style={{ marginTop: '0.4rem' }}>
              <button className="btn btn-filled" onClick={() => navigator.clipboard.writeText(resumen).then(() => avisar('Resumen copiado', 'exito'))}>Copiar</button>
              <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(resumen)}`} target="_blank" rel="noreferrer">
                Abrir en WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="ajustes-card">
        <h3>Copia de seguridad</h3>
        <p>
          Descarga un JSON con todos los eventos, notas y configuración. Útil si algo se rompe
          o si queréis guardar el curso.
        </p>
        <a className="btn" href={`${API_URL}/api/backup?sala=${usuario.codigo_sala}`} download style={{ marginTop: '0.6rem' }}>
          Descargar backup
        </a>
      </div>

      <div className="ajustes-card">
        <h3>Información</h3>
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
