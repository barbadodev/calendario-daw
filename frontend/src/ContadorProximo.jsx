import { useState, useEffect } from 'react';
import { parseISO, differenceInDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getModulo, tinte } from './modulos.js';

export default function ContadorProximo({ eventos }) {
  const [prximo, setPrximo] = useState(null);

  useEffect(() => {
    if (!eventos?.length) { setPrximo(null); return; }
    const ahora = new Date();
    const pendientes = eventos
      .filter(e => !e.completado && new Date(e.fecha_inicio) >= ahora)
      .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));
    setPrximo(pendientes[0] || null);
  }, [eventos]);

  if (!prximo) return null;

  const dias = differenceInDays(parseISO(prximo.fecha_inicio), new Date());
  const mod = getModulo(prximo.modulo_id);
  const label = dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `En ${dias} días`;

  return (
    <div className="contador-proximo">
      <span className="contador-punto" style={{ background: mod.color }} aria-hidden="true" />
      <div className="contador-texto">
        <span className="contador-etiqueta">{label}</span>
        <span className="contador-titulo">{prximo.titulo}</span>
        <span className="etiqueta" style={{ background: tinte(mod.color, 0.12), color: mod.color }}>{mod.nombre}</span>
      </div>
      <div className="contador-fecha">
        {format(parseISO(prximo.fecha_inicio), 'd MMM · HH:mm', { locale: es })}
      </div>
    </div>
  );
}
