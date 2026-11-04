import { useState } from 'react';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { getModulo, NOMBRE_TIPO, tinte } from './modulos.js';
import { IconoCheck, IconoEnlace } from './Icons.jsx';

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
      <div className="lista-toolbar">
        <label>
          <input type="checkbox" checked={ocultarCompletados} onChange={e => setOcultarCompletados(e.target.checked)} />
          Ocultar completados
        </label>
      </div>

      {fechas.length === 0 ? (
        <p className="hoja-vacio">No hay eventos con este filtro.</p>
      ) : fechas.map(fecha => {
        const fechaObj = parseISO(fecha);
        const esHoy = isToday(fechaObj);
        const esPasado = isPast(fechaObj) && !esHoy;
        return (
          <div key={fecha} className="evento-grupo" style={esPasado ? { opacity: 0.6 } : {}}>
            <div className={`evento-grupo-fecha ${esHoy ? 'hoy' : ''}`}>
              {esHoy ? 'Hoy' : format(fechaObj, "EEEE d 'de' MMMM", { locale: es })}
            </div>

            {grupos[fecha].map(ev => {
              const mod = getModulo(ev.modulo_id);
              const tipo = NOMBRE_TIPO[ev.tipo_id] || NOMBRE_TIPO.otro;
              return (
                <div key={ev.id} className="evento-card" onClick={() => onEventoClick(ev)}>
                  <div
                    className={`evento-check ${ev.completado ? 'hecho' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onToggleCompletar(ev.id, ev.completado); }}
                    title="Marcar como completado"
                    aria-label={ev.completado ? 'Marcar como pendiente' : 'Marcar como completado'}
                    role="checkbox"
                    aria-checked={!!ev.completado}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleCompletar(ev.id, ev.completado);
                      }
                    }}
                  >
                    {ev.completado && <IconoCheck size={13} />}
                  </div>
                  <div className="evento-card-color" style={{ background: mod.color }} />
                  <div className="evento-card-contenido">
                    <div className="evento-card-header">
                      <span className="evento-card-titulo" style={{ textDecoration: ev.completado ? 'line-through' : 'none' }}>{ev.titulo}</span>
                      {ev.revisar && <span className="etiqueta etiqueta-revisar">revisar</span>}
                      {ev.origen === 'moodle' && <span className="etiqueta etiqueta-moodle">Moodle</span>}
                    </div>
                    <div className="evento-card-meta">
                      <span>{tipo}</span>
                      <span className="punto-medio" />
                      <span className="etiqueta" style={{ background: tinte(mod.color, 0.12), color: mod.color }}>{mod.nombre}</span>
                      {!ev.todo_el_dia && <span>{format(parseISO(ev.fecha_inicio), 'HH:mm')}</span>}
                      {ev.enlace && <a href={ev.enlace} target="_blank" rel="noreferrer"
                        onClick={e => e.stopPropagation()} className="enlace-evento">
                        <IconoEnlace size={12} /> enlace
                      </a>}
                      {ev.moodle_url && <a href={ev.moodle_url} target="_blank" rel="noreferrer"
                        onClick={e => e.stopPropagation()} className="enlace-evento">
                        abrir curso
                      </a>}
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
