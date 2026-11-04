import { useEffect, useState } from 'react';
import { MODULOS } from './modulos.js';
import { Siren, TriangleAlert, Clock, Check, ExternalLink } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

/** Entrega cuyo plazo de cierre cae pronto. Rojo si quedan menos de 12 h. */
export default function AlertaCierres({ sala, onMarcarEntregado }) {
  const [cierres, setCierres] = useState([]);
  const [minimizada, setMinimizada] = useState(
    () => sessionStorage.getItem('caldaw_cierres_min') === '1'
  );

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      try {
        const res = await fetch(`${API}/api/cierres-proximos?sala=${sala}`);
        if (res.ok && vivo) {
          const d = await res.json();
          setCierres(d.cierres || []);
        }
      } catch { /* backend dormido */ }
    }
    cargar();
    const id = setInterval(cargar, 5 * 60 * 1000);
    return () => { vivo = false; clearInterval(id); };
  }, [sala]);

  if (cierres.length === 0) return null;

  const critico = cierres.some(c => c.nivel === 'critico');
  const urgente = cierres.some(c => c.nivel === 'urgente');
  const nivel = critico ? 'critico' : urgente ? 'urgente' : 'proximo';
  const IconoBanner = critico ? Siren : urgente ? TriangleAlert : Clock;

  function toggleMinimizar() {
    const v = !minimizada;
    setMinimizada(v);
    sessionStorage.setItem('caldaw_cierres_min', v ? '1' : '0');
  }

  function textoHoras(c) {
    return c.horas < 1 ? `${Math.round(c.horas * 60)} min` : `${c.horas} h`;
  }

  return (
    <div className={`banner banner-cierre ${nivel}`}>
      <div className="banner-cabecera">
        <IconoBanner size={16} className="banner-icono" />
        <strong className="banner-titulo">
          {cierres.length} {cierres.length === 1 ? 'entrega cierra pronto' : 'entregas cierran pronto'}
        </strong>
        <button className="banner-accion" onClick={toggleMinimizar}>
          {minimizada ? 'ver' : 'ocultar'}
        </button>
      </div>

      {!minimizada && (
        <div className="cierre-lista">
          {cierres.map(c => {
            const mod = MODULOS.find(m => m.id === c.modulo_id) || { nombre: String(c.modulo_id || '?').toUpperCase(), color: '#6b7280' };
            return (
              <div key={c.id} className={`cierre-fila ${c.nivel}`}>
                <span className="cierre-chip" style={{ background: mod.color }}>{mod.nombre}</span>
                <span className="cierre-titulo">{c.titulo}</span>
                <span className="cierre-horas">{textoHoras(c)}</span>
                {c.enlace && (
                  <a href={c.enlace} target="_blank" rel="noreferrer" className="cierre-enlace" title="Abrir en Moodle">
                    <ExternalLink size={13} />
                  </a>
                )}
                <button className="cierre-check" title="Marcar como entregada"
                  onClick={() => onMarcarEntregado(c.id)}>
                  <Check size={13} strokeWidth={3} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
