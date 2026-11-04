import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL;

export default function SemanaExamenes({ usuario }) {
  const [config, setConfig] = useState({ desde: '', hasta: '' });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/config/semana-examen?sala=${usuario.codigo_sala}`);
        const { config } = await res.json();
        if (config?.desde) setConfig({ desde: config.desde.slice(0, 10), hasta: config.hasta?.slice(0, 10) || '' });
      } catch { /* sin config todavía */ }
    })();
  }, []);

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await fetch(`${API}/api/config/semana-examen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sala: usuario.codigo_sala, desde: config.desde || null, hasta: config.hasta || null }),
      });
      setMsg(res.ok ? 'Semana guardada' : 'No se pudo guardar');
    } catch {
      setMsg('No se pudo guardar');
    }
    setGuardando(false);
    setTimeout(() => setMsg(''), 4000);
  }

  return (
    <div className="ajustes-card">
      <h3>Semana de exámenes</h3>
      <p className="ayuda">
        Cuando el centro publique la semana de exámenes, mete las fechas aquí para tenerla registrada.
      </p>
      <form onSubmit={guardar} className="fila-fecha-examen">
        <label htmlFor="desde">Del</label>
        <input id="desde" type="date" value={config.desde} onChange={e => setConfig({ ...config, desde: e.target.value })} />
        <label htmlFor="hasta">al</label>
        <input id="hasta" type="date" value={config.hasta} onChange={e => setConfig({ ...config, hasta: e.target.value })} />
        <button type="submit" className="btn btn-filled" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
      {msg && <p className="mensaje-estado">{msg}</p>}
    </div>
  );
}
