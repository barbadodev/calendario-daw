import { useState } from 'react';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { getModulo } from './App.jsx';
import { IconoTipo } from './Iconos.jsx';
import { Check, GraduationCap, Link2, TriangleAlert, Pin } from 'lucide-react';

const NOMBRES_TIPO = {
  examen: 'Examen', entrega: 'Entrega', apunte: 'Apunte',
  clase: 'Clase', reunion: 'Reunión', otro: 'Otro',
};

export default function ListaEventos({ eventos, onEventoClick, onToggleCompletar }) {
  const [ocultarCompletados, setOcultarCompletados] = useState(false);

  const evsFiltrados = ocultarCompletados ? eventos.filter(e => !e.completado) : eventos;
  const eventosOrdenados = [...evsFiltrados].sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));

  const grupos = {};
  eventosOrdenados.forEach(ev => {
    const fecha = format(parseISO(ev.fecha_inicio), 'yyyy-MM-dd');
    if (!grupos[fecha]) grupos[fecha] = [];
    grupos[fecha].push(ev);
  });
  const fechas = Object.keys(grupos).sort();

  return (
    <div className="eventos-lista">
      <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
        <label className="etiqueta-check">
          <input type="checkbox" checked={ocultarCompletados} onChange={e => setOcultarCompletados(e.target.checked)} />
          Ocultar completados
        </label>
      </div>

      {fechas.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No hay eventos en este filtro</p>
      ) : fechas.map(fecha => {
        const fechaObj = parseISO(fecha);
        const esHoy = isToday(fechaObj);
        const esPasado = isPast(fechaObj) && !esHoy;
        return (
          <div key={fecha} className="evento-grupo" style={esPasado ? { opacity: 0.55 } : {}}>
            <div className="evento-grupo-fecha">
              {esHoy
                ? <span className="grupo-hoy"><Pin size={11} /> Hoy</span>
                : format(fechaObj, "EEEE d 'de' MMMM", { locale: es })}
            </div>

            {grupos[fecha].map(ev => {
              const mod = getModulo(ev.modulo_id);
              return (
                <div key={ev.id} className="evento-card" onClick={() => onEventoClick(ev)}>
                  <div
                    className="evento-check"
                    onClick={(e) => { e.stopPropagation(); onToggleCompletar(ev.id, ev.completado); }}
                    style={{
                      background: ev.completado ? 'var(--success)' : 'transparent',
                      border: `2px solid ${ev.completado ? 'var(--success)' : 'var(--border)'}`,
                      color: 'var(--bg)',
                    }}
                    title="Marcar como completado">
                    {ev.completado && <Check size={13} strokeWidth={3} />}
                  </div>
                  <div className="evento-card-color" style={{ background: mod.color }} />
                  <div className="evento-card-contenido">
                    <div className="evento-card-header">
                      <span className="evento-card-titulo" style={{ textDecoration: ev.completado ? 'line-through' : 'none' }}>{ev.titulo}</span>
                      {ev.revisar && (
                        <span className="chip-revisar">
                          <TriangleAlert size={10} /> revisar
                        </span>
                      )}
                      {ev.origen === 'moodle' && (
                        <span className="evento-card-origen-moodle">
                          <GraduationCap size={11} /> Moodle
                        </span>
                      )}
                    </div>
                    <div className="evento-card-meta">
                      <span className="meta-item">
                        <IconoTipo tipoId={ev.tipo_id} size={13} /> {NOMBRES_TIPO[ev.tipo_id] || 'Otro'}
                      </span>
                      <span className="chip-modulo" style={{ '--tinte': mod.color }}>{mod.nombre}</span>
                      {!ev.todo_el_dia && <span className="meta-num">{format(parseISO(ev.fecha_inicio), 'HH:mm')}</span>}
                      {ev.enlace && (
                        <a href={ev.enlace} target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()} className="meta-enlace">
                          <Link2 size={12} /> enlace
                        </a>
                      )}
                      {ev.moodle_url && (
                        <a href={ev.moodle_url} target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()} className="meta-enlace meta-enlace-curso">
                          <GraduationCap size={12} /> abrir curso
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
