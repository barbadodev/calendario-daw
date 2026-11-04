import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL;
const NOMBRES = { ipe: 'IPE', dwec: 'DWEC', dwes: 'DWES', daw: 'DAW', diw: 'DIW', en: 'Inglés', opt: 'Optativa', proy: 'Proyecto', otro: 'Otro' };
const COLOR = { ipe: '#6a5a9e', dwec: '#3f6fa8', dwes: '#3d7a5c', daw: '#a85f33', diw: '#a1517a', en: '#3d7f8c', opt: '#8a6a26', proy: '#a04a44', otro: '#74716a' };

/** Carga de trabajo por semana ISO, para decidir dónde hace falta estudiar. */
export default function PlanEstudio({ usuario }) {
  const [semanas, setSemanas] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/plan-estudio?sala=${usuario.codigo_sala}`)
      .then(r => r.json())
      .then(d => setSemanas(d.semanas || []))
      .catch(() => setSemanas([]));
  }, []);

  if (!semanas) return <div className="eventos-lista"><p style={{ color: 'var(--text-muted)' }}>Calculando carga de trabajo…</p></div>;
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
            {(s.eventos || []).map(e => (
              <div key={e.id} className="fila-plan" style={{ opacity: e.completado ? 0.5 : 1 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: COLOR[e.modulo] || COLOR.otro, flexShrink: 0 }} />
                <span className="plan-fecha">
                  {new Date(e.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </span>
                <span className="plan-modulo" style={{ '--mod': COLOR[e.modulo] || COLOR.otro }}>
                  {NOMBRES[e.modulo] || e.modulo}
                </span>
                <span style={{ textDecoration: e.completado ? 'line-through' : 'none', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{e.titulo}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
