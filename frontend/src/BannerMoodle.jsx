import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL;

/** Aviso si Moodle lleva más de ~26h sin sincronizar o hay error activo. */
export default function BannerMoodle({ sala }) {
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    let vivo = true;
    async function check() {
      try {
        const res = await fetch(`${API}/api/moodle-status?sala=${sala}`);
        if (res.ok && vivo) setEstado(await res.json());
      } catch { /* silencioso */ }
    }
    check();
    const id = setInterval(check, 5 * 60 * 1000);
    return () => { vivo = false; clearInterval(id); };
  }, [sala]);

  if (!estado || estado.ok) return null;

  const msg = estado.error_actual
    ? `Moodle dejó de sincronizar: ${String(estado.error_actual).slice(0, 60)}`
    : estado.last_ok
      ? `Sin datos nuevos de Moodle desde hace ${estado.horas_desde_sync}h`
      : 'La sincronización con Moodle aún no se ha ejecutado';

  return (
    <div style={{
      background: 'rgba(239,68,68,.14)', borderLeft: '4px solid #ef4444',
      padding: '0.625rem 1rem', display: 'flex', gap: '0.6rem', alignItems: 'center',
      fontSize: '0.8125rem',
    }}>
      <span style={{ fontSize: '1.1rem' }}>⚠️</span>
      <div style={{ flex: 1 }}>
        <strong>Aviso: </strong>{msg}
      </div>
    </div>
  );
}
