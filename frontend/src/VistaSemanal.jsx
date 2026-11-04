import { useMemo, useState } from 'react';
import { startOfWeek, addDays, format, isToday, parseISO, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { getModulo, tinte } from './modulos.js';
import useEsMovil from './useEsMovil.js';
import { IconoIzquierda, IconoDerecha } from './Icons.jsx';

export default function VistaSemanal({ eventos, onEventoClick, onDiaClick }) {
  const [inicio, setInicio] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const dias = Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
  const esMovil = useEsMovil();

  const eventosPorDia = useMemo(() => {
    const mapa = new Map();
    for (const e of eventos) {
      const clave = format(new Date(e.fecha_inicio), 'yyyy-MM-dd');
      const lista = mapa.get(clave);
      if (lista) lista.push(e);
      else mapa.set(clave, [e]);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));
    }
    return mapa;
  }, [eventos]);

  function eventosDe(dia) {
    return eventosPorDia.get(format(dia, 'yyyy-MM-dd')) || [];
  }

  const nav = (
    <div className="mes-nav">
      <h2>Semana del {format(inicio, 'd MMM', { locale: es })}</h2>
      <div className="mes-nav-acciones">
        <button className="btn-hoy" onClick={() => setInicio(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Hoy</button>
        <button onClick={() => setInicio(subWeeks(inicio, 1))} aria-label="Semana anterior">
          <IconoIzquierda size={16} />
        </button>
        <button onClick={() => setInicio(addWeeks(inicio, 1))} aria-label="Semana siguiente">
          <IconoDerecha size={16} />
        </button>
      </div>
    </div>
  );

  // EN MÓVIL: agenda vertical, un bloque por día (7 columnas no caben en el teléfono)
  if (esMovil) {
    return (
      <div className="semana-agenda">
        {nav}
        {dias.map(dia => {
          const evsDia = eventosDe(dia);
          const hoy = isToday(dia);
          return (
            <section key={dia.toISOString()} className={`agenda-dia ${hoy ? 'hoy' : ''}`}>
              <div className="agenda-cab">
                <span className="agenda-fecha">
                  <span className="agenda-dow">{format(dia, 'EEE', { locale: es })}</span>
                  <span className="agenda-num">{format(dia, 'd')}</span>
                  <span className="agenda-mes">{format(dia, 'MMM', { locale: es })}</span>
                  {hoy && <span className="agenda-hoy">hoy</span>}
                </span>
                <button className="agenda-add" onClick={() => onDiaClick(format(dia, 'yyyy-MM-dd'))}>Añadir</button>
              </div>

              {evsDia.length === 0 ? (
                <p className="agenda-vacio">Sin eventos</p>
              ) : evsDia.map(ev => {
                const mod = getModulo(ev.modulo_id);
                return (
                  <button key={ev.id} className={`agenda-evento ${ev.completado ? 'hecho' : ''}`} onClick={() => onEventoClick(ev)}>
                    <span className="agenda-evento-color" style={{ background: mod.color }} />
                    <span className="agenda-evento-hora">
                      {ev.todo_el_dia ? 'Todo el día' : format(parseISO(ev.fecha_inicio), 'HH:mm')}
                    </span>
                    <span className="agenda-evento-titulo">{ev.titulo}</span>
                    <span className="etiqueta" style={{ background: tinte(mod.color, 0.12), color: mod.color }}>{mod.nombre}</span>
                  </button>
                );
              })}
            </section>
          );
        })}
      </div>
    );
  }

  // EN ESCRITORIO: rejilla de 7 columnas de siempre
  return (
    <>
      {nav}
      <div className="semana-grid">
        {dias.map(dia => {
          const eventosDia = eventosDe(dia);

          return (
            <div key={dia.toISOString()}
              className={`semana-dia ${isToday(dia) ? 'hoy' : ''}`}
              onClick={() => onDiaClick(format(dia, 'yyyy-MM-dd'))}>
              <div className="semana-dow">{format(dia, 'EEE', { locale: es })}</div>
              <div className="semana-num">{format(dia, 'd')}</div>
              {eventosDia.map(ev => {
                const mod = getModulo(ev.modulo_id);
                return (
                  <div key={ev.id}
                    className={`semana-evento ${ev.completado ? 'completado' : ''}`}
                    style={{ '--mod': mod.color, background: tinte(mod.color, 0.1) }}
                    onClick={(e) => { e.stopPropagation(); onEventoClick(ev); }}>
                    <span className="semana-evento-hora">
                      {ev.todo_el_dia ? '' : format(parseISO(ev.fecha_inicio), 'HH:mm') + ' '}
                    </span>
                    {ev.titulo}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}
