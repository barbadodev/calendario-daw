import { useState } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { getModulo, tinte } from './modulos.js';
import useEsMovil, { useBloquearScroll } from './useEsMovil.js';
import { IconoCerrar, IconoIzquierda, IconoDerecha } from './Icons.jsx';

function Calendario({ eventos, onDiaClick, onEventoClick }) {
  const [mesActual, setMesActual] = useState(new Date());
  const [hojaDia, setHojaDia] = useState(null); // fecha (Date) de la hoja de día abierta en móvil
  const esMovil = useEsMovil();
  useBloquearScroll(!!hojaDia);

  const dias = eachDayOfInterval({
    start: startOfMonth(mesActual),
    end: endOfMonth(mesActual),
  });

  // Añadir días del mes anterior/siguiente para completar la cuadrícula (6 filas)
  const primerDia = dias[0].getDay();
  const diasAntes = primerDia === 0 ? 6 : primerDia - 1; // Lunes = 0
  const diasCompletos = [];

  for (let i = diasAntes; i > 0; i--) {
    diasCompletos.push(subDays(dias[0], i));
  }
  diasCompletos.push(...dias);
  const restante = 42 - diasCompletos.length;
  for (let i = 1; i <= restante; i++) {
    diasCompletos.push(addDays(dias[dias.length - 1], i));
  }

  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const tituloMes = format(mesActual, 'MMMM yyyy', { locale: es });
  const tituloMesCap = tituloMes.charAt(0).toUpperCase() + tituloMes.slice(1);

  function eventosDe(dia) {
    return eventos
      .filter(e => isSameDay(new Date(e.fecha_inicio), dia))
      .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));
  }

  function clicEnDia(dia) {
    if (esMovil) setHojaDia(dia); // en móvil primero se ve lo que hay ese día
    else onDiaClick(format(dia, 'yyyy-MM-dd'));
  }

  const hojaEventos = hojaDia ? eventosDe(hojaDia) : [];

  return (
    <>
      {/* NAVEGACIÓN MES */}
      <div className="mes-nav">
        <h2>{tituloMesCap}</h2>
        <div className="mes-nav-acciones">
          <button className="btn-hoy" onClick={() => setMesActual(new Date())}>Hoy</button>
          <button onClick={() => setMesActual(subMonths(mesActual, 1))} aria-label="Mes anterior">
            <IconoIzquierda size={16} />
          </button>
          <button onClick={() => setMesActual(addMonths(mesActual, 1))} aria-label="Mes siguiente">
            <IconoDerecha size={16} />
          </button>
        </div>
      </div>

      {/* GRID CALENDARIO */}
      <div className="calendario-marco">
        <div className="calendario-grid">
          {diasSemana.map(d => (
            <div key={d} className="dia-cabecera">{d}</div>
          ))}

          {diasCompletos.map((dia, i) => {
            const eventosDia = eventosDe(dia);
            const esMesActual = isSameMonth(dia, mesActual);
            const esHoy = isToday(dia);

            return (
              <div
                key={i}
                className={`dia-celda ${!esMesActual ? 'fuera-mes' : ''} ${esHoy ? 'hoy' : ''}`}
                onClick={() => clicEnDia(dia)}
              >
                <div className="dia-numero">{format(dia, 'd')}</div>
                <div className="dia-eventos">
                  {esMovil
                    ? <>
                        {eventosDia.slice(0, 4).map(ev => (
                          <span
                            key={ev.id}
                            className={`dia-punto ${ev.completado ? 'hecho' : ''}`}
                            style={{ background: getModulo(ev.modulo_id).color }}
                          />
                        ))}
                        {eventosDia.length > 4 && (
                          <span className="dia-mas">+{eventosDia.length - 4}</span>
                        )}
                      </>
                    : <>
                        {eventosDia.slice(0, 3).map(ev => {
                          const mod = getModulo(ev.modulo_id);
                          return (
                            <div
                              key={ev.id}
                              className="dia-evento-mini"
                              style={{
                                background: tinte(mod.color, 0.14),
                                boxShadow: `inset 2.5px 0 0 ${mod.color}`,
                              }}
                              onClick={(e) => { e.stopPropagation(); onEventoClick(ev); }}
                              title={`${mod.nombre} · ${ev.titulo}`}
                            >
                              {ev.titulo}
                            </div>
                          );
                        })}
                        {eventosDia.length > 3 && (
                          <div className="dia-mas">+{eventosDia.length - 3} más</div>
                        )}
                      </>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* HOJA DE DÍA (solo móvil): qué hay + botón de añadir */}
      {esMovil && hojaDia && (
        <div className="modal-overlay hoja" onClick={() => setHojaDia(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{format(hojaDia, "EEEE, d 'de' MMMM", { locale: es })}</h2>
              <button className="btn-icon" onClick={() => setHojaDia(null)} aria-label="Cerrar">
                <IconoCerrar size={18} />
              </button>
            </div>

            <div className="hoja-cuerpo">
              {hojaEventos.length === 0 ? (
                <p className="hoja-vacio">Nada apuntado para este día</p>
              ) : hojaEventos.map(ev => {
                const mod = getModulo(ev.modulo_id);
                return (
                  <button
                    key={ev.id}
                    className={`hoja-evento ${ev.completado ? 'hecho' : ''}`}
                    onClick={() => { setHojaDia(null); onEventoClick(ev); }}
                  >
                    <span className="hoja-evento-color" style={{ background: mod.color }} />
                    <span className="hoja-evento-hora">
                      {ev.todo_el_dia ? 'Todo el día' : format(parseISO(ev.fecha_inicio), 'HH:mm')}
                    </span>
                    <span className="hoja-evento-titulo">{ev.titulo}</span>
                    <span className="etiqueta" style={{ background: tinte(mod.color, 0.12), color: mod.color }}>{mod.nombre}</span>
                  </button>
                );
              })}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-filled hoja-add"
                onClick={() => { const f = format(hojaDia, 'yyyy-MM-dd'); setHojaDia(null); onDiaClick(f); }}
              >
                Añadir evento este día
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Calendario;
