import { useEffect, useState } from 'react';
import { MODULOS, tinte } from './modulos.js';
import { IconoCheck } from './Icons.jsx';

const API = import.meta.env.VITE_API_URL;

/** Aviso de entregas cuyo plazo de cierre se acerca. */
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
      } catch { /* backend dormido, no molestar */ }
    }
    cargar();
    const id = setInterval(cargar, 5 * 60 * 1000);
    return () => { vivo = false; clearInterval(id); };
  }, [sala]);

  if (cierres.length === 0) return null;

  const critico = cierres.some(c => c.nivel === 'critico');
  const urgente = cierres.some(c => c.nivel === 'urgente');
  const tono = critico ? '#a4443c' : urgente ? '#a85f33' : '#8a6a26';

  function toggleMinimizar() {
    const v = !minimizada;
    setMinimizada(v);
    sessionStorage.setItem('caldaw_cierres_min', v ? '1' : '0');
  }

  return (
    <div className="aviso-banda" style={{ '--tono': tono }}>
      <div className="aviso-cabecera">
        <span className="punto-estado" style={{ background: tono }} aria-hidden="true" />
        <strong>
          {cierres.length} {cierres.length === 1 ? 'entrega cierra pronto' : 'entregas cierran pronto'}
        </strong>
        <button onClick={toggleMinimizar} className="btn-texto">
          {minimizada ? 'ver' : 'ocultar'}
        </button>
      </div>

      {!minimizada && (
        <div className="aviso-lista">
          {cierres.map(c => {
            const mod = MODULOS.find(m => m.id === c.modulo_id) || { nombre: c.modulo_id?.toUpperCase(), color: '#74716a' };
            return (
              <div key={c.id} className="aviso-fila">
                <span className="etiqueta" style={{ background: tinte(mod.color, 0.12), color: mod.color }}>{mod.nombre}</span>
                <span className="aviso-fila-titulo">{c.titulo}</span>
                <span className="aviso-horas" style={{ color: c.nivel === 'critico' ? '#a4443c' : c.nivel === 'urgente' ? '#a85f33' : 'var(--text-muted)' }}>
                  {c.horas < 1 ? `${Math.round(c.horas * 60)} min` : `${c.horas} h`}
                </span>
                {c.enlace && (
                  <a href={c.enlace} target="_blank" rel="noreferrer" className="enlace-evento" style={{ fontSize: '0.72rem' }}>
                    abrir
                  </a>
                )}
                <button
                  onClick={() => onMarcarEntregado(c.id)}
                  title="Marcar como entregada"
                  aria-label="Marcar como entregada"
                  className="btn-mini">
                  <IconoCheck size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
