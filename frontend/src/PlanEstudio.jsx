import { useEffect, useState } from 'react';
import { ClipboardList, Package } from 'lucide-react';

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
  if (semanas.length === 0) {
    return <div className="eventos-lista"><p className="vacio">No tienes nada pendiente</p></div>;
  }

  const maxCarga = Math.max(...semanas.map(s => s.cargaHorasEstimadas), 1);

  return (
    <div className="eventos-lista">
      <div className="ajustes-card">
        <h3>Plan de estudio</h3>
        <p className="ayuda">
          Horas estimadas por semana (examen ≈ 6 h, entrega ≈ 4 h). Sirve para ver dónde apretar antes de llegar tarde.
        </p>
      </div>

      {semanas.map(s => {
        const nivel = s.cargaHorasEstimadas >= 12 ? 'alta' : s.cargaHorasEstimadas >= 6 ? 'media' : 'baja';
        const pct = Math.round((s.cargaHorasEstimadas / maxCarga) * 100);
        return (
          <div key={s.semana} className={`ajustes-card semana-bloque ${nivel}`}>
            <div className="semana-cabecera">
              <span className={`pulso ${nivel}`} aria-hidden="true" />
              <strong className="semana-titulo">{s.semana}</strong>
              <span className="semana-cifras">
                <span className="meta-item"><ClipboardList size={12} /> {s.examenes}</span>
                <span className="meta-item"><Package size={12} /> {s.entregas}</span>
                <span className="meta-num">{s.cargaHorasEstimadas} h</span>
              </span>
            </div>

            <div className="barra-carga"><div className={`barra-relleno ${nivel}`} style={{ width: `${pct}%` }} /></div>

            {s.eventos.map(e => (
              <div key={e.id} className={`linea-evento ${e.completado ? 'hecho' : ''}`}>
                <span className="punto" style={{ background: COLOR[e.modulo] || COLOR.otro }} />
                <span className="linea-fecha">{new Date(e.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                <span className="linea-modulo" style={{ color: COLOR[e.modulo] || COLOR.otro }}>{NOMBRES[e.modulo] || e.modulo}</span>
                <span className="linea-titulo">{e.titulo}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
