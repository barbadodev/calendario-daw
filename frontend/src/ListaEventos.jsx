import { format, isSameDay, isToday, isPast, parseISO } from 'date-fns';
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

function ListaEventos({ eventos, onEventoClick }) {
  // Agrupar eventos por fecha
  const grupos = {};
  const eventosOrdenados = [...eventos].sort((a, b) => 
    new Date(a.fecha_inicio) - new Date(b.fecha_inicio)
  );

  eventosOrdenados.forEach(ev => {
    const fecha = format(parseISO(ev.fecha_inicio), 'yyyy-MM-dd');
    if (!grupos[fecha]) grupos[fecha] = [];
    grupos[fecha].push(ev);
  });

  const fechasOrdenadas = Object.keys(grupos).sort();

  if (fechasOrdenadas.length === 0) {
    return (
      <div className="eventos-lista">
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
          No hay eventos en este filtro
        </p>
      </div>
    );
  }

  return (
    <div className="eventos-lista">
      {fechasOrdenadas.map(fecha => {
        const fechaObj = parseISO(fecha);
        const esHoy = isToday(fechaObj);
        const esPasado = isPast(fechaObj) && !esHoy;

        return (
          <div key={fecha} className="evento-grupo" style={esPasado ? { opacity: 0.5 } : {}}>
            <div className="evento-grupo-fecha">
              {esHoy ? '📌 Hoy' : format(fechaObj, "EEEE d 'de' MMMM", { locale: es })}
            </div>

            {grupos[fecha].map(ev => {
              const mod = getModulo(ev.modulo_id);
              const tipo = TIPOS[ev.tipo_id] || TIPOS.otro;

              return (
                <div key={ev.id} className="evento-card" onClick={() => onEventoClick(ev)}>
                  <div className="evento-card-color" style={{ background: mod.color }} />
                  <div className="evento-card-contenido">
                    <div className="evento-card-header">
                      <span className="evento-card-titulo">{ev.titulo}</span>
                      {ev.origen === 'moodle' && (
                        <span className="evento-card-origen-moodle">🎓 Moodle</span>
                      )}
                    </div>
                    <div className="evento-card-meta">
                      <span>{tipo.icono} {tipo.nombre}</span>
                      <span className="evento-card-badge" style={{ background: mod.color, color: 'white' }}>
                        {mod.nombre}
                      </span>
                      {ev.fecha_inicio && (
                        <span>{format(parseISO(ev.fecha_inicio), 'HH:mm', { locale: es })}</span>
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

export default ListaEventos;
