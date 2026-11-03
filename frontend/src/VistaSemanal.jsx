import { useState } from 'react';
import { startOfWeek, addDays, format, isToday, parseISO, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { getModulo } from './App.jsx';
import useEsMovil from './useEsMovil.js';

export default function VistaSemanal({ eventos, onEventoClick, onDiaClick }) {
  const [inicio, setInicio] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const dias = Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
  const esMovil = useEsMovil();

  function eventosDe(dia) {
    return eventos.filter(e => {
      const f = new Date(e.fecha_inicio);
      return f.getFullYear() === dia.getFullYear() &&
             f.getMonth() === dia.getMonth() &&
             f.getDate() === dia.getDate();
    }).sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));
  }

  const nav = (
    <div className="mes-nav">
      <button onClick={() => setInicio(subWeeks(inicio, 1))}>‹</button>
      <h2>Semana del {format(inicio, 'd MMM', { locale: es })}</h2>
      <button onClick={() => setInicio(addWeeks(inicio, 1))}>›</button>
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
                <button className="agenda-add" onClick={() => onDiaClick(format(dia, 'yyyy-MM-dd'))}>+ Añadir</button>
              </div>

              {evsDia.length === 0 ? (
                <p className="agenda-vacio">Sin eventos</p>
              ) : evsDia.map(ev => {
                const mod = getModulo(ev.modulo_id);
                return (
                  <button key={ev.id} className={`agenda-evento ${ev.completado ? 'hecho' : ''}`} onClick={() => onEventoClick(ev)}>
                    <span className="agenda-evento-color" style={{ background: mod.color }} />
                    <span className="agenda-evento-hora">
                      {ev.todo_el_dia ? '🗓' : format(parseISO(ev.fecha_inicio), 'HH:mm')}
                    </span>
                    <span className="agenda-evento-titulo">{ev.titulo}</span>
                    <span className="evento-card-badge" style={{ background: mod.color, color: 'white' }}>{mod.nombre}</span>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', overflowX: 'auto' }}>
        {dias.map(dia => {
          const eventosDia = eventosDe(dia);

          return (
            <div key={dia.toISOString()}
              style={{
                borderRight: '1px solid var(--border)',
                borderBottom: '1px solid var(--border)',
                minHeight: '14rem',
                padding: '0.5rem',
                background: isToday(dia) ? 'var(--bg-surface)' : 'transparent',
              }}
              onClick={() => onDiaClick(format(dia, 'yyyy-MM-dd'))}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                {format(dia, 'EEE', { locale: es })}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: isToday(dia) ? 'var(--primary)' : 'inherit' }}>
                {format(dia, 'd')}
              </div>
              {eventosDia.map(ev => {
                const mod = getModulo(ev.modulo_id);
                return (
                  <div key={ev.id} onClick={(e) => { e.stopPropagation(); onEventoClick(ev); }}
                    style={{
                      background: mod.color, color: 'white',
                      padding: '3px 6px', borderRadius: 4, fontSize: '0.7rem',
                      marginBottom: 3, cursor: 'pointer',
                      textDecoration: ev.completado ? 'line-through' : 'none',
                      opacity: ev.completado ? 0.5 : 1,
                    }}>
                    {format(parseISO(ev.fecha_inicio), 'HH:mm')} {ev.titulo}
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
