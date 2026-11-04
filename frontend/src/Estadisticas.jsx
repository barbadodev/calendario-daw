import { useState, useEffect } from 'react';
import { API } from './api.js';

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

  if (cargando) return <div className="eventos-lista">Cargando estadísticas...</div>;
  if (!stats) return <div className="eventos-lista">No disponible</div>;

  const porModulo = Object.entries(stats.porModulo).sort((a, b) => b[1] - a[1]);
  const porTipo = Object.entries(stats.porTipo).sort((a, b) => b[1] - a[1]);
  const maxMod = porModulo[0]?.[1] || 1;
  const maxTipo = porTipo[0]?.[1] || 1;

  return (
    <div className="eventos-lista">
      <div className="ajustes-card">
        <h3>Resumen general</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
          <StatBox label="Total" value={stats.total} color="#6366f1" />
          <StatBox label="Próximos 7d" value={stats.proximos7} color="#f97316" />
          <StatBox label="Pendientes mes" value={stats.pendientesMes} color="#ef4444" />
          <StatBox label="Completados" value={stats.entregados} color="#10b981" />
          <StatBox label="% hechas" value={`${stats.tasaCompletado}%`} color="#06b6d4" />
        </div>
      </div>

      <div className="ajustes-card">
        <h3>Por módulo</h3>
        {porModulo.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sin datos</p> : porModulo.map(([id, count]) => (
          <BarRow key={id} label={id.toUpperCase()} value={count} max={maxMod} color={getModColor(id)} />
        ))}
      </div>

      <div className="ajustes-card">
        <h3>Por tipo</h3>
        {porTipo.map(([id, count]) => (
          <BarRow key={id} label={id} value={count} max={maxTipo} color="#8b5cf6" />
        ))}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="stat-caja" style={{ '--tinte': color }}>
      <div className="stat-valor">{value}</div>
      <div className="stat-etiqueta">{label}</div>
    </div>
  );
}

function BarRow({ label, value, max, color }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 2 }}>
        <span>{label}</span><span style={{ color: 'var(--text-muted)' }}>{value}</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-refuerzo)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function getModColor(id) {
  const colors = { ipe: '#8b5cf6', dwec: '#3b82f6', dwes: '#10b981', daw: '#f97316', diw: '#ec4899', en: '#06b6d4', opt: '#eab308', proy: '#ef4444' };
  return colors[id] || '#6b7280';
}
