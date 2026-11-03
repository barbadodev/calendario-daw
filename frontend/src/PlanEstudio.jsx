import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL;
const NOMBRES = { ipe: 'IPE', dwec: 'DWEC', dwes: 'DWES', daw: 'DAW', diw: 'DIW', en: 'Inglés', opt: 'Optativa', proy: 'Proyecto', otro: 'Otro' };
const COLOR = { ipe: '#8b5cf6', dwec: '#3b82f6', dwes: '#10b981', daw: '#f97316', diw: '#ec4899', en: '#06b6d4', opt: '#eab308', proy: '#ef4444', otro: '#6b7280' };

/** Carga de trabajo por semana ISO, para decidir dónde hace falta estudiar. */
export default function PlanEstudio({ usuario }) {
  const [semanas, setSemanas] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/plan-estudio?sala=${usuario.codigo_sala}`)
      .then(r => r.json())
      .then(d => setSemanas(d.semanas || []))
      .catch(() => setSemanas([]));
  }, []);

  if (!semanas) return <div className="eventos-lista">Calculando carga de trabajo…</div>;
  if (semanas.length === 0) return <div className="eventos-lista"><p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No tienes nada pendiente 🎉</p></div>;

  const maxCarga = Math.max(...semanas.map(s => s.cargaHorasEstimadas), 1);

  return (
    <div className="eventos-lista">
      <div className="ajustes-card">
        <h3>📚 Plan de estudio</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Horas estimadas por semana (examen ≈ 6 h, entrega ≈ 4 h). Sirve para ver dónde apretar antes de llegar tarde.
        </p>
      </div>

      {semanas.map(s => {
        const nivel = s.cargaHorasEstimadas >= 12 ? '🔴' : s.cargaHorasEstimadas >= 6 ? '🟡' : '🟢';
        const pct = Math.round((s.cargaHorasEstimadas / maxCarga) * 100);
        return (
          <div key={s.semana} className="ajustes-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <strong style={{ fontSize: '0.9375rem' }}>{nivel} {s.semana}</strong>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {s.examenes} 📝 · {s.entregas} 📦 · {s.cargaHorasEstimadas} h
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: s.cargaHorasEstimadas >= 12 ? '#ef4444' : s.cargaHorasEstimadas >= 6 ? '#eab308' : '#10b981' }} />
            </div>
            {s.eventos.map(e => (
              <div key={e.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.8125rem', padding: '3px 0', opacity: e.completado ? 0.5 : 1 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR[e.modulo] || COLOR.otro, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', minWidth: 62 }}>
                  {new Date(e.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </span>
                <span style={{ color: COLOR[e.modulo], fontWeight: 600, fontSize: '0.7rem', minWidth: 42 }}>{NOMBRES[e.modulo] || e.modulo}</span>
                <span style={{ textDecoration: e.completado ? 'line-through' : 'none' }}>{e.titulo}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
