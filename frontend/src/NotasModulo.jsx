import { useEffect, useState } from 'react';
import { MODULOS } from './modulos.js';

const API = import.meta.env.VITE_API_URL;

export default function NotasModulo({ usuario }) {
  const [sel, setSel] = useState('ipe');
  const [notas, setNotas] = useState([]);
  const [nuevo, setNuevo] = useState('');
  const [cargando, setCargando] = useState(false);

  async function cargarNotas() {
    setCargando(true);
    try {
      const res = await fetch(`${API}/api/notas-modulo/${sel}?sala=${usuario.codigo_sala}`);
      const data = await res.json();
      setNotas(data.notas || []);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargarNotas(); }, [sel]);

  async function crearNota(e) {
    e.preventDefault();
    if (!nuevo.trim()) return;
    const res = await fetch(`${API}/api/notas-modulo/${sel}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sala: usuario.codigo_sala, contenido: nuevo, autor_id: usuario.id }),
    });
    if (res.ok) { setNuevo(''); cargarNotas(); }
  }

  const mod = MODULOS.find(m => m.id === sel);

  return (
    <div className="eventos-lista">
      <div className="filtros-bar" style={{ margin: '-1rem -1rem 1rem -1rem', border: 'none', borderBottom: '1px solid var(--border)' }}>
        {MODULOS.map(m => (
          <button key={m.id}
            className={`filtro-chip ${sel === m.id ? 'active' : ''}`}
            style={sel === m.id ? { background: m.color, borderColor: m.color } : {}}
            onClick={() => setSel(m.id)}>{m.nombre}</button>
        ))}
      </div>

      <div className="ajustes-card" style={{ borderLeft: `4px solid ${mod.color}` }}>
        <h3>💬 Notas de {mod.nombre}</h3>
        <form onSubmit={crearNota} style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
          <input type="text" value={nuevo} onChange={e => setNuevo(e.target.value)}
            placeholder="Nuevo apunte, recordatorio, duda..."
            style={{ flex: 1, padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }} />
          <button type="submit" className="btn btn-filled">Añadir</button>
        </form>

        {cargando ? <p style={{ color: 'var(--text-muted)' }}>Cargando...</p> : (
          <div style={{ marginTop: '1rem' }}>
            {notas.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aún no hay notas en este módulo.</p> :
              notas.map(n => (
                <div key={n.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '0.5rem 0.75rem', borderRadius: 6, marginBottom: 6 }}>
                  <div style={{ fontSize: '0.6875rem', color: mod.color, fontWeight: 600 }}>{n.usuarios?.nombre || 'Anónimo'} · {new Date(n.created_at).toLocaleString('es-ES')}</div>
                  <div style={{ fontSize: '0.875rem', marginTop: 2, whiteSpace: 'pre-wrap' }}>{n.contenido}</div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
