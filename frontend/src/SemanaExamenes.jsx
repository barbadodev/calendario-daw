import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL;

export default function SemanaExamenes({ usuario }) {
  const [config, setConfig] = useState({ desde: '', hasta: '' });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/config/semana-examen?sala=${usuario.codigo_sala}`);
        if (!res.ok) return;
        const { config } = await res.json();
        if (config?.desde) setConfig({ desde: config.desde.slice(0, 10), hasta: config.hasta?.slice(0, 10) || '' });
      } catch { /* sin conexión: se queda vacío */ }
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
      if (!res.ok) throw new Error('guardar');
      setMsg({ texto: 'Semana de exámenes guardada. Los eventos de ese rango se pintarán en rojo.', tipo: 'exito' });
    } catch {
      setMsg({ texto: 'No se pudo guardar la semana de exámenes', tipo: 'error' });
    } finally {
      setGuardando(false);
      setTimeout(() => setMsg(null), 4000);
    }
  }

  const campoFecha = {
    padding: '0.4rem 0.55rem',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 7,
    color: 'var(--text)',
    fontSize: '0.8rem',
  };

  return (
    <div className="ajustes-card">
      <h3>Semana de exámenes</h3>
      <p style={{ marginBottom: '0.6rem' }}>
        Cuando el centro publique la semana de exámenes, mete las fechas aquí para resaltarla
        en todo el calendario.
      </p>
      <form onSubmit={guardar} style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <label htmlFor="ex-desde" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Del</label>
        <input id="ex-desde" type="date" value={config.desde} onChange={e => setConfig({ ...config, desde: e.target.value })} style={campoFecha} />
        <label htmlFor="ex-hasta" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>al</label>
        <input id="ex-hasta" type="date" value={config.hasta} onChange={e => setConfig({ ...config, hasta: e.target.value })} style={campoFecha} />
        <button type="submit" className="btn btn-filled" disabled={guardando}>{guardando ? '…' : 'Guardar'}</button>
      </form>
      {msg && <p className={`mensaje-ajustes ${msg.tipo}`}>{msg.texto}</p>}
    </div>
  );
}
