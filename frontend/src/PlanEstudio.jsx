import { useEffect, useState } from 'react';
import { getModulo } from './modulos.js';

const API = import.meta.env.VITE_API_URL;

/** Carga de trabajo por semana ISO, para decidir dónde hace falta estudiar. */
export default function PlanEstudio({ usuario }) {
  const [semanas, setSemanas] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch(`${API}/api/plan-estudio?sala=${usuario.codigo_sala}`)
      .then(r => {
        if (!r.ok) throw new Error('plan');
        return r.json();
      })
      .then(d => { if (vivo) setSemanas(d.semanas || []); })
      .catch(() => {
        if (!vivo) return;
        setError(true);
        setSemanas([]);
      });
    return () => { vivo = false; };
  }, []);

  if (!semanas) return <div className="eventos-lista"><p style={{ color: 'var(--text-muted)' }}>Calculando carga de trabajo…</p></div>;
  if (error) return <div className="eventos-lista"><p style={{ color: 'var(--text-muted)' }}>No se pudo cargar el plan de estudio.</p></div>;
  if (semanas.length === 0) return <div className="eventos-lista"><p className="hoja-vacio">No tienes nada pendiente.</p></div>;

  const maxCarga = Math.max(...semanas.map(s => s.cargaHorasEstimadas), 1);

  return (
    <div className="eventos-lista">
      <div className="ajustes-card">
        <h3>Plan de estudio</h3>
        <p>
          Horas estimadas por semana (examen ≈ 6 h, entrega ≈ 4 h). Sirve para ver dónde apretar
          antes de llegar tarde.
        </p>
      </div>

      {semanas.map(s => {
        const color = s.cargaHorasEstimadas >= 12 ? '#a4443c' : s.cargaHorasEstimadas >= 6 ? '#8a6a26' : '#3d7a5c';
        const pct = Math.round((s.cargaHorasEstimadas / maxCarga) * 100);
        return (
          <div key={s.semana} className="ajustes-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.45rem' }}>
              <strong style={{ fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                <span className="punto-estado" style={{ background: color }} aria-hidden="true" />
                {s.semana}
              </strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {s.examenes} exám. · {s.entregas} {s.entregas === 1 ? 'entrega' : 'entregas'} · {s.cargaHorasEstimadas} h
              </span>
            </div>
            <div className="barra-fondo" style={{ marginBottom: '0.65rem' }}>
              <div className="barra-relleno" style={{ width: `${pct}%`, background: color }} />
            </div>
            {(s.eventos || []).map(e => {
              const mod = getModulo(e.modulo);
              return (
                <div key={e.id} className="fila-plan" style={{ opacity: e.completado ? 0.5 : 1 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: mod.color, flexShrink: 0 }} />
                  <span className="plan-fecha">
                    {new Date(e.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="plan-modulo" style={{ '--mod': mod.color }}>
                    {mod.nombre}
                  </span>
                  <span style={{ textDecoration: e.completado ? 'line-through' : 'none', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{e.titulo}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
