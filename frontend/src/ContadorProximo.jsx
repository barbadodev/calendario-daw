import { useState, useEffect } from 'react';
import { parseISO, differenceInDays, isPast, format } from 'date-fns';
import { getModulo } from './App.jsx';

export default function ContadorProximo({ eventos }) {
  const [prximo, setPrximo] = useState(null);

  useEffect(() => {
    if (!eventos?.length) { setPrximo(null); return; }
    const ahora = new Date();
    const pendientes = eventos
      .filter(e => !e.completado && new Date(e.fecha_inicio) >= ahora)
      .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));
    setPrximo(pendientes[0] || null);
  }, [eventos]);

  if (!prximo) return null;

  const dias = differenceInDays(parseISO(prximo.fecha_inicio), new Date());
  const mod = getModulo(prximo.modulo_id);
  const label = dias === 0 ? 'HOY' : dias === 1 ? 'MAÑANA' : `en ${dias} días`;

  return (
    <div style={{
      background: `linear-gradient(135deg, ${mod.color}22, ${mod.color}11)`,
      borderLeft: `4px solid ${mod.color}`,
      padding: '0.625rem 1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      fontSize: '0.875rem',
    }}>
      <span style={{ fontSize: '1.25rem' }}>⏰</span>
      <div style={{ flex: 1 }}>
        <strong>{label}</strong> ·{' '}
        <span style={{ background: mod.color, color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>
          {mod.nombre}
        </span>{' '}
        {prximo.titulo}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {format(parseISO(prximo.fecha_inicio), 'd MMM HH:mm')}
      </div>
    </div>
  );
}
