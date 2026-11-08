import { useEffect, useState } from 'react';
import { MODULOS } from './modulos.js';

const API = import.meta.env.VITE_API_URL;

export default function NotasModulo({ usuario }) {
  const [sel, setSel] = useState('ipe');
  const [notas, setNotas] = useState([]);
  const [nuevo, setNuevo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function cargarNotas() {
    setCargando(true);
    try {
      const res = await fetch(`${API}/api/notas-modulo/${sel}?sala=${usuario.codigo_sala}`);
      if (!res.ok) throw new Error('notas');
      const data = await res.json();
      setNotas(data.notas || []);
    } catch {
      setNotas([]);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargarNotas(); }, [sel]);

  async function crearNota(e) {
    e.preventDefault();
    if (!nuevo.trim() || enviando) return;
    setEnviando(true);
    try {
      const res = await fetch(`${API}/api/notas-modulo/${sel}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sala: usuario.codigo_sala, contenido: nuevo.trim(), autor_id: usuario.id }),
      });
      if (res.ok) { setNuevo(''); cargarNotas(); }
    } catch {
      /* Silencioso */
    } finally {
      setEnviando(false);
    }
  }

  const mod = MODULOS.find(m => m.id === sel);

  return (
    <div className="eventos-lista">
      <div className="filtros-bar" style={{ marginBottom: '0.85rem' }}>
        {MODULOS.map(m => (
          <button key={m.id}
            className={`filtro-chip ${sel === m.id ? 'active' : ''}`}
            style={sel === m.id ? { background: m.color, borderColor: m.color } : {}}
            onClick={() => setSel(m.id)}>{m.nombre}</button>
        ))}
      </div>

      <div className="notas-cabecera" style={{ borderLeft: `3px solid ${mod.color}` }}>
        <h3>Notas de {mod.nombre}</h3>
        <form onSubmit={crearNota} className="nota-form" style={{ marginTop: '0.75rem' }}>
          <input type="text" value={nuevo} onChange={e => setNuevo(e.target.value)}
            placeholder="Nuevo apunte, recordatorio, duda…"
            aria-label="Nueva nota"
            disabled={enviando}
            style={{ padding: '0.55rem 0.7rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
          <button type="submit" className="btn btn-filled" disabled={enviando || !nuevo.trim()}>
            {enviando ? 'Añadiendo…' : 'Añadir'}
          </button>
        </form>

        {cargando ? <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem' }}>Cargando…</p> : (
          <div style={{ marginTop: '0.9rem' }}>
            {notas.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Aún no hay notas en este módulo.</p>
              : notas.map(n => (
                <div key={n.id} className="nota-modulo" style={{ '--mod': mod.color }}>
                  <div className="nota-modulo-meta">
                    {n.usuarios?.nombre || 'Anónimo'} · {new Date(n.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="nota-modulo-texto">{n.contenido}</div>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
