import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { getModulo } from './App.jsx';

function Calendario({ eventos, onDiaClick, onEventoClick }) {
  const [mesActual, setMesActual] = useState(new Date());

  const dias = eachDayOfInterval({
    start: startOfMonth(mesActual),
    end: endOfMonth(mesActual),
  });

  // Añadir días del mes anterior/siguiente para completar la cuadrícula
  const primerDia = dias[0].getDay();
  const diasAntes = primerDia === 0 ? 6 : primerDia - 1; // Lunes = 0
  const diasCompletos = [];
  
  for (let i = diasAntes; i > 0; i--) {
    diasCompletos.push(addMonths(startOfMonth(mesActual), -1));
  }
  diasCompletos.push(...dias);
  const restante = 42 - diasCompletos.length;
  for (let i = 0; i < restante; i++) {
    diasCompletos.push(addMonths(endOfMonth(mesActual), 1));
  }

  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <>
      {/* NAVEGACIÓN MES */}
      <div className="mes-nav">
        <button onClick={() => setMesActual(subMonths(mesActual, 1))}>‹</button>
        <h2>{format(mesActual, 'MMMM yyyy', { locale: es })}</h2>
        <button onClick={() => setMesActual(addMonths(mesActual, 1))}>›</button>
      </div>

      {/* GRID CALENDARIO */}
      <div className="calendario-grid">
        {diasSemana.map(d => (
          <div key={d} className="dia-cabecera">{d}</div>
        ))}

        {diasCompletos.map((dia, i) => {
          const eventosDia = eventos.filter(e => isSameDay(new Date(e.fecha_inicio), dia));
          const esMesActual = isSameMonth(dia, mesActual);
          const esHoy = isToday(dia);

          return (
            <div
              key={i}
              className={`dia-celda ${!esMesActual ? 'fuera-mes' : ''} ${esHoy ? 'hoy' : ''}`}
              onClick={() => onDiaClick(format(dia, 'yyyy-MM-dd'))}
            >
              <div className="dia-numero">{format(dia, 'd')}</div>
              <div className="dia-eventos">
                {eventosDia.slice(0, 3).map(ev => {
                  const mod = getModulo(ev.modulo_id);
                  return (
                    <div
                      key={ev.id}
                      className="dia-evento-mini"
                      style={{ background: mod.color }}
                      onClick={(e) => { e.stopPropagation(); onEventoClick(ev); }}
                    >
                      {ev.titulo}
                    </div>
                  );
                })}
                {eventosDia.length > 3 && (
                  <div className="dia-mas">+{eventosDia.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default Calendario;
