import { useState } from 'react';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { getModulo } from './App.jsx';

const TIPOS = {
  examen:  { icono: '📝', nombre: 'Examen' },
  entrega: { icono: '📦', nombre: 'Entrega' },
  apunte:  { icono: '📝', nombre: 'Apunte' },
  clase:   { icono: '📚', nombre: 'Clase' },
  reunion: { icono: '👥', nombre: 'Reunión' },
  otro:    { icono: '⭐', nombre: 'Otro' },
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
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={ocultarCompletados} onChange={e => setOcultarCompletados(e.target.checked)} style={{ width: 'auto', marginRight: 4 }} />
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
              {esHoy ? '📌 Hoy' : format(fechaObj, "EEEE d 'de' MMMM", { locale: es })}
            </div>

            {grupos[fecha].map(ev => {
              const mod = getModulo(ev.modulo_id);
              const tipo = TIPOS[ev.tipo_id] || TIPOS.otro;
              return (
                <div key={ev.id} className="evento-card" onClick={() => onEventoClick(ev)}>
                  <div
                    className="evento-check"
                    onClick={(e) => { e.stopPropagation(); onToggleCompletar(ev.id, ev.completado); }}
                    style={{
                      background: ev.completado ? 'var(--success)' : 'transparent',
                      border: `2px solid ${ev.completado ? 'var(--success)' : 'var(--border)'}`,
                    }}
                    title="Marcar como completado">
                    {ev.completado ? '✓' : ''}
                  </div>
                  <div className="evento-card-color" style={{ background: mod.color }} />
                  <div className="evento-card-contenido">
                    <div className="evento-card-header">
                      <span className="evento-card-titulo" style={{ textDecoration: ev.completado ? 'line-through' : 'none' }}>{ev.titulo}</span>
                      {ev.revisar && <span style={{ background: '#fef3c7', color: '#78350f', padding: '2px 6px', borderRadius: 4, fontSize: '0.625rem', fontWeight: 600 }}>⚠ revisar</span>}
                      {ev.origen === 'moodle' && <span className="evento-card-origen-moodle">🎓 Moodle</span>}
                    </div>
                    <div className="evento-card-meta">
                      <span>{tipo.icono} {tipo.nombre}</span>
                      <span className="evento-card-badge" style={{ background: mod.color, color: 'white' }}>{mod.nombre}</span>
                      {!ev.todo_el_dia && <span>{format(parseISO(ev.fecha_inicio), 'HH:mm')}</span>}
                      {ev.enlace && <span>🔗 enlace</span>}
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
