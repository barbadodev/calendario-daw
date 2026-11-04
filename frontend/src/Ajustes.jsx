import { useState, useEffect } from 'react';
import SemanaExamenes from './SemanaExamenes.jsx';
import { setModo, modoActual } from './tema.js';
import {
  Users, Bell, Monitor, Sun, Moon, GraduationCap, RefreshCw, CalendarRange,
  Link, Copy, Share2, Download, Info, Check,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const OPCIONES_TEMA = [
  { id: 'sistema', nombre: 'Sistema', Icono: Monitor },
  { id: 'claro', nombre: 'Claro', Icono: Sun },
  { id: 'oscuro', nombre: 'Oscuro', Icono: Moon },
];

export default function Ajustes({ usuario, eventos }) {
  const [usuarios, setUsuarios] = useState([]);
  const [notifActiva, setNotifActiva] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [sincronizando, setSincronizando] = useState(false);
  const [mostrarIcsUrl, setMostrarIcsUrl] = useState(false);
  const [resumen, setResumen] = useState('');
  const [modo, setModoEstado] = useState(() => modoActual());

  useEffect(() => {
    cargarUsuarios();
    if ('Notification' in window) setNotifActiva(Notification.permission === 'granted');
  }, []);

  async function cargarUsuarios() {
    try {
      const res = await fetch(`${API_URL}/api/auth/usuarios?sala=${usuario.codigo_sala}`);
      const data = await res.json();
      if (data.usuarios) setUsuarios(data.usuarios);
    } catch { setUsuarios([]); }
  }

  function elegirTema(id) {
    setModo(id);
    setModoEstado(id);
  }

  async function activarNotificaciones() {
    if (!('Notification' in window)) return setMensaje('Tu navegador no soporta notificaciones');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return setMensaje('Permiso denegado');

      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await (await fetch(`${API_URL}/api/push/vapid-public-key`)).json();

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
        } else throw err;
      }

      const res = await fetch(`${API_URL}/api/push/suscribir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sala: usuario.codigo_sala, usuarioId: usuario.id, suscripcion: sub.toJSON() }),
      });
      if (res.ok) {
        setNotifActiva(true);
        setMensaje('Notificaciones activadas');
      } else {
        const err = await res.json();
        setMensaje(err.error || 'Error al registrar la suscripción');
      }
    } catch (err) {
      console.error('Error activando notificaciones:', err);
      setMensaje(err.message || 'No se pudo activar');
    }
  }

  async function sincronizarAhora() {
    setSincronizando(true);
    setMensaje('Forzando sincronización con Moodle…');
    try {
      const res = await fetch(`${API_URL}/api/sync/now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sala: usuario.codigo_sala }),
      });
      setMensaje(res.ok ? 'Sincronización completada' : 'Error sincronizando');
    } catch {
      setMensaje('Error sincronizando');
    }
    setSincronizando(false);
    setTimeout(() => window.location.reload(), 1500);
  }

  async function generarResumen(dias) {
    try {
      const res = await fetch(`${API_URL}/api/resumen-semana?sala=${usuario.codigo_sala}&dias=${dias}`);
      const data = await res.json();
      setResumen(data.texto || 'Sin eventos');
    } catch {
      setMensaje('No se pudo generar el resumen');
    }
  }

  function copiar(texto, aviso) {
    navigator.clipboard.writeText(texto).then(() => setMensaje(aviso));
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
        <h3 className="card-titulo"><Users size={15} /> Miembros del grupo</h3>
        {usuarios.length === 0
          ? <p className="ayuda">Solo estás tú por ahora.</p>
          : usuarios.map(u => (
            <div key={u.id} className="ajustes-item">
              <span className="ajustes-item-label">
                <span className={`punto-estado ${u.id === usuario.id ? 'activo' : 'inactivo'}`} />
                {u.nombre}{u.id === usuario.id ? ' (tú)' : ''}
              </span>
              <span className="ajustes-item-valor">
                {u.last_seen ? new Date(u.last_seen).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          ))
        }
      </div>

      <div className="ajustes-card">
        <h3 className="card-titulo"><Monitor size={15} /> Apariencia</h3>
        <div className="selector-tema">
          {OPCIONES_TEMA.map(({ id, nombre, Icono }) => (
            <button key={id}
              className={`opcion-tema ${modo === id ? 'activo' : ''}`}
              onClick={() => elegirTema(id)}>
              <Icono size={15} /> {nombre}
            </button>
          ))}
        </div>
        <p className="ayuda">
          {modo === 'sistema'
            ? 'La app sigue el modo claro/oscuro que tenga tu móvil o navegador.'
            : `Fijado en modo ${modo}.`}
        </p>
      </div>

      <div className="ajustes-card">
        <h3 className="card-titulo"><Bell size={15} /> Notificaciones</h3>
        <div className="ajustes-item">
          <span className="ajustes-item-label">Avisos en este dispositivo</span>
          {notifActiva
            ? <span className="estado-ok"><Check size={13} strokeWidth={3} /> Activadas</span>
            : <button className="btn btn-filled" onClick={activarNotificaciones}>Activar</button>
          }
        </div>
        <p className="ayuda">
          En iPhone hay que abrirla desde el icono de pantalla de inicio (Safari → Compartir → Añadir a pantalla de inicio), no desde Safari.
        </p>
      </div>

      <div className="ajustes-card">
        <h3 className="card-titulo"><GraduationCap size={15} /> Sincronización Moodle</h3>
        <p className="ayuda">Moodle se sincroniza solo cada 15 minutos. Puedes forzar una actualización al instante.</p>
        <button className="btn btn-filled" onClick={sincronizarAhora} disabled={sincronizando} style={{ marginTop: '0.75rem' }}>
          <RefreshCw size={14} className={sincronizando ? 'girando' : ''} />
          {sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}
        </button>
      </div>

      <SemanaExamenes usuario={usuario} />

      <div className="ajustes-card">
        <h3 className="card-titulo"><CalendarRange size={15} /> Exportar a Google/Apple Calendar</h3>
        <p className="ayuda">
          Google Calendar → “Otros calendarios” → “Desde URL”.
          iPhone: Ajustes → Calendarios → Cuentas → Calendario de suscripción.
        </p>
        {!mostrarIcsUrl ? (
          <button className="btn" onClick={() => setMostrarIcsUrl(true)}><Link size={14} /> Mostrar URL</button>
        ) : (
          <div className="bloque-url">
            <code>{icsUrl}</code>
            <button className="btn" onClick={() => copiar(icsUrl, 'URL copiada')}>
              <Copy size={14} /> Copiar
            </button>
          </div>
        )}
      </div>

      <div className="ajustes-card">
        <h3 className="card-titulo"><Share2 size={15} /> Compartir con el grupo</h3>
        <p className="ayuda">Resumen en texto de los próximos días, listo para pegar en el WhatsApp de clase.</p>
        <div className="grupo-botones">
          <button className="btn" onClick={() => generarResumen(3)}>3 días</button>
          <button className="btn" onClick={() => generarResumen(7)}>Semana</button>
          <button className="btn" onClick={() => generarResumen(14)}>2 semanas</button>
        </div>
        {resumen && (
          <div className="resumen-bloque">
            <textarea readOnly value={resumen} onFocus={e => e.target.select()} className="resumen-texto" />
            <div className="grupo-botones">
              <button className="btn btn-filled" onClick={() => copiar(resumen, 'Resumen copiado')}>Copiar</button>
              <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(resumen)}`} target="_blank" rel="noreferrer">
                Abrir en WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="ajustes-card">
        <h3 className="card-titulo"><Download size={15} /> Copia de seguridad</h3>
        <p className="ayuda">
          JSON con todos los eventos, notas y configuración. Útil por si se rompe algo o queréis guardar el curso.
        </p>
        <a className="btn" href={`${API_URL}/api/backup?sala=${usuario.codigo_sala}`} download>
          <Download size={14} /> Descargar backup
        </a>
      </div>

      <div className="ajustes-card">
        <h3 className="card-titulo"><Info size={15} /> Información</h3>
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
          <span className="ajustes-item-valor">2.0.0</span>
        </div>
      </div>

      {mensaje && <p className="mensaje-estado" onClick={() => setMensaje('')}>{mensaje}</p>}
    </div>
  );
}
