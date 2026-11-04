import { useState, useEffect } from 'react';
import { NOMBRE_TIPO, getModulo } from './modulos.js';

const API = import.meta.env.VITE_API_URL;

export default function Estadisticas({ usuario }) {
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch(`${API}/api/stats?sala=${usuario.codigo_sala}`);
        if (!res.ok) throw new Error('No se pudo cargar');
        const data = await res.json();
        if (vivo) setStats(data);
      } catch {
        if (vivo) setError(true);
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, [usuario]);

  if (cargando) return <div className="eventos-lista"><p style={{ color: 'var(--text-muted)' }}>Cargando estadísticas…</p></div>;
  if (error || !stats) return <div className="eventos-lista"><p style={{ color: 'var(--text-muted)' }}>No se pudieron cargar las estadísticas.</p></div>;

  const porModulo = Object.entries(stats.porModulo || {}).sort((a, b) => b[1] - a[1]);
  const porTipo = Object.entries(stats.porTipo || {}).sort((a, b) => b[1] - a[1]);
  const maxMod = porModulo[0]?.[1] || 1;
  const maxTipo = porTipo[0]?.[1] || 1;

  return (
    <div className="eventos-lista">
      <div className="ajustes-card">
        <h3>Resumen general</h3>
        <div className="stat-grid">
          <StatBox label="Total" value={stats.total || 0} color="#2f4a43" />
          <StatBox label="Próximos 7 d" value={stats.proximos7 || 0} color="#a85f33" />
          <StatBox label="Pendientes mes" value={stats.pendientesMes || 0} color="#a4443c" />
          <StatBox label="Completados" value={stats.entregados || 0} color="#3d7a5c" />
          <StatBox label="% hechas" value={`${stats.tasaCompletado || 0}%`} color="#3f6fa8" />
        </div>
      </div>

      <div className="ajustes-card">
        <h3>Por módulo</h3>
        {porModulo.length === 0 ? <p>Sin datos.</p> : porModulo.map(([id, count]) => {
          const mod = getModulo(id);
          return <BarRow key={id} label={mod.nombre} value={count} max={maxMod} color={mod.color} />;
        })}
      </div>

      <div className="ajustes-card">
        <h3>Por tipo</h3>
        {porTipo.length === 0 ? <p>Sin datos.</p> : porTipo.map(([id, count]) => (
          <BarRow key={id} label={NOMBRE_TIPO[id] || id} value={count} max={maxTipo} color="#6a5a9e" />
        ))}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="stat-box" style={{ '--tono': color }}>
      <div className="stat-valor">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function BarRow({ label, value, max, color }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ marginBottom: '0.55rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
        <span>{label}</span><span style={{ color: 'var(--text-muted)' }}>{value}</span>
      </div>
      <div className="barra-fondo">
        <div className="barra-relleno" style={{ width: `${pct}%`, background: color, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}
