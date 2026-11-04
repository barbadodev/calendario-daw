import { useState, useEffect } from 'react';
import { API } from './api.js';
import { NOMBRE_TIPO } from './modulos.js';

const COLORES = { ipe: '#6a5a9e', dwec: '#3f6fa8', dwes: '#3d7a5c', daw: '#a85f33', diw: '#a1517a', en: '#3d7f8c', opt: '#8a6a26', proy: '#a04a44' };

export default function Estadisticas({ usuario, eventos }) {
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/stats?sala=${usuario.codigo_sala}`);
        const data = await res.json();
        setStats(data);
      } finally { setCargando(false); }
    })();
  }, [usuario]);

  if (cargando) return <div className="eventos-lista"><p style={{ color: 'var(--text-muted)' }}>Cargando estadísticas…</p></div>;
  if (!stats) return <div className="eventos-lista"><p style={{ color: 'var(--text-muted)' }}>No disponible</p></div>;

  const porModulo = Object.entries(stats.porModulo).sort((a, b) => b[1] - a[1]);
  const porTipo = Object.entries(stats.porTipo).sort((a, b) => b[1] - a[1]);
  const maxMod = porModulo[0]?.[1] || 1;
  const maxTipo = porTipo[0]?.[1] || 1;

  return (
    <div className="eventos-lista">
      <div className="ajustes-card">
        <h3>Resumen general</h3>
        <div className="stat-grid">
          <StatBox label="Total" value={stats.total} color="#2f4a43" />
          <StatBox label="Próximos 7 d" value={stats.proximos7} color="#a85f33" />
          <StatBox label="Pendientes mes" value={stats.pendientesMes} color="#a4443c" />
          <StatBox label="Completados" value={stats.entregados} color="#3d7a5c" />
          <StatBox label="% hechas" value={`${stats.tasaCompletado}%`} color="#3f6fa8" />
        </div>
      </div>

      <div className="ajustes-card">
        <h3>Por módulo</h3>
        {porModulo.length === 0 ? <p>Sin datos.</p> : porModulo.map(([id, count]) => (
          <BarRow key={id} label={id.toUpperCase()} value={count} max={maxMod} color={getModColor(id)} />
        ))}
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

function getModColor(id) {
  return COLORES[id] || '#74716a';
}
