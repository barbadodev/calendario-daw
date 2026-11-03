import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const API = import.meta.env.VITE_API_URL;

export default function SemanaExamenes({ usuario }) {
  const [config, setConfig] = useState({ desde: '', hasta: '' });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/api/config/semana-examen?sala=${usuario.codigo_sala}`);
      const { config } = await res.json();
      if (config?.desde) setConfig({ desde: config.desde.slice(0, 10), hasta: config.hasta?.slice(0, 10) || '' });
    })();
  }, []);

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    const res = await fetch(`${API}/api/config/semana-examen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sala: usuario.codigo_sala, desde: config.desde || null, hasta: config.hasta || null }),
    });
    if (res.ok) {
      setMsg('✅ Semana de exámenes guardada. Los eventos con fecha dentro de ese rango se pintarán en rojo.');
    } else {
      setMsg('❌ Error al guardar');
    }
    setGuardando(false);
    setTimeout(() => setMsg(''), 4000);
  }

  return (
    <div className="ajustes-card">
      <h3>📚 Semana de exámenes</h3>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
        Cuando el centro publique la semana de exámenes, mete las fechas aquí para resaltarla en todo el calendario.
      </p>
      <form onSubmit={guardar} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.75rem' }}>Del </label>
        <input type="date" value={config.desde} onChange={e => setConfig({ ...config, desde: e.target.value })}
          style={{ padding: '0.4rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)' }} />
        <label style={{ fontSize: '0.75rem' }}> al </label>
        <input type="date" value={config.hasta} onChange={e => setConfig({ ...config, hasta: e.target.value })}
          style={{ padding: '0.4rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)' }} />
        <button type="submit" className="btn btn-filled" disabled={guardando}>{guardando ? '...' : 'Guardar'}</button>
      </form>
      {msg && <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.5rem' }}>{msg}</p>}
    </div>
  );
}
