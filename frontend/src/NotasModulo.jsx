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
    } catch {
      setNotas([]);
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
      <div className="filtros-bar filtros-bar-interna">
        {MODULOS.map(m => (
          <button key={m.id}
            className={`filtro-chip ${sel === m.id ? 'active' : ''}`}
            style={{ '--tinte': m.color }}
            onClick={() => setSel(m.id)}>{m.nombre}</button>
        ))}
      </div>

      <div className="ajustes-card notas-card" style={{ '--tinte': mod.color }}>
        <h3>Notas de {mod.nombre}</h3>
        <form onSubmit={crearNota} className="nota-form">
          <input type="text" value={nuevo} onChange={e => setNuevo(e.target.value)}
            placeholder="Nuevo apunte, recordatorio, duda…" className="nota-input" />
          <button type="submit" className="btn btn-filled">Añadir</button>
        </form>

        {cargando
          ? <p className="ayuda">Cargando…</p>
          : notas.length === 0
            ? <p className="ayuda">Aún no hay notas en este módulo.</p>
            : (
              <div className="notas-lista">
                {notas.map(n => (
                  <div key={n.id} className="nota-item">
                    <div className="nota-meta">
                      <span className="nota-nombre">{n.usuarios?.nombre || 'Anónimo'}</span>
                      {' · '}{new Date(n.created_at).toLocaleString('es-ES')}
                    </div>
                    <div className="nota-contenido">{n.contenido}</div>
                  </div>
                ))}
              </div>
            )}
      </div>
    </div>
  );
}
