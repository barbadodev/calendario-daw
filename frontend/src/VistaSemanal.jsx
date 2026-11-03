import { useState } from 'react';
import { startOfWeek, addDays, format, isToday, parseISO, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { getModulo } from './App.jsx';

export default function VistaSemanal({ eventos, onEventoClick, onDiaClick }) {
  const [inicio, setInicio] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const dias = Array.from({ length: 7 }, (_, i) => addDays(inicio, i));

  return (
    <>
      <div className="mes-nav">
        <button onClick={() => setInicio(subWeeks(inicio, 1))}>‹</button>
        <h2>Semana del {format(inicio, 'd MMM', { locale: es })}</h2>
        <button onClick={() => setInicio(addWeeks(inicio, 1))}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', overflowX: 'auto' }}>
        {dias.map(dia => {
          const eventosDia = eventos.filter(e => {
            const f = new Date(e.fecha_inicio);
            return f.getFullYear() === dia.getFullYear() &&
                   f.getMonth() === dia.getMonth() &&
                   f.getDate() === dia.getDate();
          }).sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));

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
