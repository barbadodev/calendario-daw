import { useEffect, useState } from 'react';
import { MODULOS } from './modulos.js';

const API = import.meta.env.VITE_API_URL;

/** Aviso de entregas cuyo plazo de cierre se acerca. Rojo si quedan menos de 12 h. */
export default function AlertaCierres({ sala, onMarcarEntregado }) {
  const [cierres, setCierres] = useState([]);
  const [minimizada, setMinimizada] = useState(
    () => sessionStorage.getItem('caldaw_cierres_min') === '1'
  );

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      try {
        const res = await fetch(`${API}/api/cierres-proximos?sala=${sala}`);
        if (res.ok && vivo) {
          const d = await res.json();
          setCierres(d.cierres || []);
        }
      } catch { /* backend dormido, no molestar */ }
    }
    cargar();
    const id = setInterval(cargar, 5 * 60 * 1000);
    return () => { vivo = false; clearInterval(id); };
  }, [sala]);

  if (cierres.length === 0) return null;

  const critico = cierres.some(c => c.nivel === 'critico');
  const urgente = cierres.some(c => c.nivel === 'urgente');
  const colorFondo = critico ? 'rgba(239,68,68,.16)' : urgente ? 'rgba(249,115,22,.14)' : 'rgba(234,179,8,.12)';
  const colorBorde = critico ? '#ef4444' : urgente ? '#f97316' : '#eab308';

  function toggleMinimizar() {
    const v = !minimizada;
    setMinimizada(v);
    sessionStorage.setItem('caldaw_cierres_min', v ? '1' : '0');
  }

  return (
    <div style={{
      background: colorFondo,
      borderLeft: `4px solid ${colorBorde}`,
      padding: minimizada ? '0.5rem 1rem' : '0.6rem 1rem 0.75rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '1.05rem' }}>{critico ? '🚨' : urgente ? '⚠️' : '⏰'}</span>
        <strong style={{ flex: 1, fontSize: '0.8125rem' }}>
          {cierres.length} {cierres.length === 1 ? 'entrega cierra pronto' : 'entregas cierran pronto'}
        </strong>
        <button onClick={toggleMinimizar}
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-muted)',
            fontSize: '0.75rem', cursor: 'pointer', padding: '2px 4px',
          }}>
          {minimizada ? 'ver' : 'ocultar'}
        </button>
      </div>

      {!minimizada && (
        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {cierres.map(c => {
            const mod = MODULOS.find(m => m.id === c.modulo_id) || { nombre: c.modulo_id?.toUpperCase(), color: '#6b7280' };
            return (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                fontSize: '0.78rem', paddingLeft: '0.25rem',
              }}>
                <span style={{
                  background: mod.color, color: 'white', padding: '1px 6px',
                  borderRadius: 4, fontSize: '0.65rem', fontWeight: 600, flexShrink: 0,
                }}>{mod.nombre}</span>

                <span style={{
                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{c.titulo}</span>

                <span style={{
                  color: c.nivel === 'critico' ? '#ef4444' : c.nivel === 'urgente' ? '#f97316' : 'var(--text-muted)',
                  fontWeight: 700, fontSize: '0.72rem', flexShrink: 0,
                }}>
                  {c.horas < 1 ? `${Math.round(c.horas * 60)} min` : `${c.horas} h`}
                </span>

                {c.enlace && (
                  <a href={c.enlace} target="_blank" rel="noreferrer"
                    style={{ color: 'var(--primary)', fontSize: '0.7rem', flexShrink: 0, textDecoration: 'none' }}>
                    abrir
                  </a>
                )}

                <button
                  onClick={() => onMarcarEntregado(c.id)}
                  title="Marcar como entregada"
                  style={{
                    background: 'transparent', border: '1px solid var(--border)',
                    color: 'var(--success)', borderRadius: 4, width: 22, height: 22,
                    fontSize: '0.7rem', cursor: 'pointer', flexShrink: 0, lineHeight: 1,
                  }}>
                  ✓
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
