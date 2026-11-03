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
    <div
      className="contador-proximo"
      style={{
        background: `linear-gradient(135deg, ${mod.color}22, ${mod.color}11)`,
        borderLeft: `4px solid ${mod.color}`,
      }}
    >
      <span className="contador-icono">⏰</span>
      <div className="contador-texto">
        <strong>{label}</strong> ·{' '}
        <span style={{ background: mod.color, color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>
          {mod.nombre}
        </span>{' '}
        {prximo.titulo}
      </div>
      <div className="contador-fecha">
        {format(parseISO(prximo.fecha_inicio), 'd MMM HH:mm')}
      </div>
    </div>
  );
}
