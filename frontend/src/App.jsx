import { useState, useEffect } from 'react';
import Login from './Login.jsx';
import Calendario from './Calendario.jsx';
import VistaSemanal from './VistaSemanal.jsx';
import ListaEventos from './ListaEventos.jsx';
import ModalEvento from './ModalEvento.jsx';
import Ajustes from './Ajustes.jsx';
import Estadisticas from './Estadisticas.jsx';
import NotasModulo from './NotasModulo.jsx';
import ContadorProximo from './ContadorProximo.jsx';
import { supabase } from './supabase.js';

const API_URL = import.meta.env.VITE_API_URL;

const MODULOS = [
  { id: 'ipe',  nombre: 'IPE',      color: '#8b5cf6' },
  { id: 'dwec', nombre: 'DWEC',     color: '#3b82f6' },
  { id: 'dwes', nombre: 'DWES',     color: '#10b981' },
  { id: 'daw',  nombre: 'DAW',      color: '#f97316' },
  { id: 'diw',  nombre: 'DIW',      color: '#ec4899' },
  { id: 'en',   nombre: 'Inglés',   color: '#06b6d4' },
  { id: 'opt',  nombre: 'Optativa', color: '#eab308' },
  { id: 'proy', nombre: 'Proyecto', color: '#ef4444' },
];

export function getModulo(id) {
  return MODULOS.find(m => m.id === id) || { id, nombre: id?.toUpperCase() || 'OTRO', color: '#6b7280' };
}

function App() {
  const [usuario, setUsuario] = useState(null);
  const [vista, setVista] = useState('mes');
  const [eventos, setEventos] = useState([]);
  const [filtroModulo, setFiltroModulo] = useState('todos');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const [fechaNueva, setFechaNueva] = useState(null);

  useEffect(() => {
    const guardado = localStorage.getItem('usuario');
    if (guardado) setUsuario(JSON.parse(guardado));
  }, []);

  useEffect(() => {
    if (!usuario) return;
    cargarEventos();

    const channel = supabase
      .channel('eventos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos' }, cargarEventos)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [usuario]);

  async function cargarEventos() {
    try {
      const { data, error } = await supabase
        .from('eventos').select('*')
        .order('fecha_inicio', { ascending: true });
      if (!error && data) setEventos(data);
    } catch (err) { console.error(err); }
  }

  async function crearEvento(eventoData) {
    const res = await fetch(`${API_URL}/api/eventos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sala: usuario.codigo_sala, evento: { ...eventoData, creado_por: usuario.id } }),
    });
    if (res.ok) { setModalAbierto(false); cargarEventos(); }
  }

  async function actualizarEvento(id, eventoData) {
    const res = await fetch(`${API_URL}/api/eventos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sala: usuario.codigo_sala, evento: eventoData }),
    });
    if (res.ok) { setModalAbierto(false); setEventoSeleccionado(null); cargarEventos(); }
  }

  async function eliminarEvento(id) {
    if (!confirm('¿Eliminar este evento?')) return;
    const res = await fetch(`${API_URL}/api/eventos/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sala: usuario.codigo_sala }),
    });
    if (res.ok) { setModalAbierto(false); setEventoSeleccionado(null); cargarEventos(); }
  }

  async function toggleCompletar(id, valorActual) {
    // Actualización optimista
    setEventos(prev => prev.map(e => e.id === id ? { ...e, completado: !valorActual } : e));
    await fetch(`${API_URL}/api/eventos/${id}/completar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sala: usuario.codigo_sala, valor: !valorActual }),
    });
  }

  async function duplicarEvento(id) {
    const res = await fetch(`${API_URL}/api/eventos/${id}/duplicar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sala: usuario.codigo_sala }),
    });
    if (res.ok) {
      const { evento } = await res.json();
      setModalAbierto(false);
      cargarEventos();
      setEventoSeleccionado(evento);
      setModalAbierto(true);
    }
  }

  function abrirModalCrear(fecha = null) {
    setFechaNueva(fecha); setEventoSeleccionado(null); setModalAbierto(true);
  }
  function abrirModalEditar(ev) {
    setEventoSeleccionado(ev); setFechaNueva(null); setModalAbierto(true);
  }

  function cerrarSesion() {
    localStorage.removeItem('usuario');
    setUsuario(null);
  }

  if (!usuario) return <Login onLogin={setUsuario} />;

  const eventosFiltrados = filtroModulo === 'todos'
    ? eventos
    : eventos.filter(e => e.modulo_id === filtroModulo);

  return (
    <>
      <header className="app-header">
        <h1>📅 CalDAW <span className="user-badge">{usuario.nombre}</span></h1>
        <div className="header-actions">
          <button className="btn-icon" onClick={cerrarSesion} title="Cerrar sesión">🚪</button>
          <button className="btn-icon" onClick={() => setVista('ajustes')} title="Ajustes">⚙️</button>
        </div>
      </header>

      <ContadorProximo eventos={eventos} />

      <nav className="view-tabs">
        <button className={`view-tab ${vista === 'mes' ? 'active' : ''}`} onClick={() => setVista('mes')}>Mes</button>
        <button className={`view-tab ${vista === 'semana' ? 'active' : ''}`} onClick={() => setVista('semana')}>Semana</button>
        <button className={`view-tab ${vista === 'lista' ? 'active' : ''}`} onClick={() => setVista('lista')}>Lista</button>
        <button className={`view-tab ${vista === 'stats' ? 'active' : ''}`} onClick={() => setVista('stats')}>Stats</button>
        <button className={`view-tab ${vista === 'notas' ? 'active' : ''}`} onClick={() => setVista('notas')}>Notas</button>
        <button className={`view-tab ${vista === 'ajustes' ? 'active' : ''}`} onClick={() => setVista('ajustes')}>Ajustes</button>
      </nav>

      <div className="filtros-bar">
        <button className={`filtro-chip ${filtroModulo === 'todos' ? 'active' : ''}`}
          style={filtroModulo === 'todos' ? { background: '#6366f1', borderColor: '#6366f1' } : {}}
          onClick={() => setFiltroModulo('todos')}>Todos</button>
        {MODULOS.map(m => (
          <button key={m.id} className={`filtro-chip ${filtroModulo === m.id ? 'active' : ''}`}
            style={filtroModulo === m.id ? { background: m.color, borderColor: m.color } : {}}
            onClick={() => setFiltroModulo(m.id)}>{m.nombre}</button>
        ))}
      </div>

      {vista === 'mes' && <Calendario eventos={eventosFiltrados} onDiaClick={abrirModalCrear} onEventoClick={abrirModalEditar} />}
      {vista === 'semana' && <VistaSemanal eventos={eventosFiltrados} onEventoClick={abrirModalEditar} onDiaClick={abrirModalCrear} />}
      {vista === 'lista' && <ListaEventos eventos={eventosFiltrados} onEventoClick={abrirModalEditar} onToggleCompletar={toggleCompletar} />}
      {vista === 'stats' && <Estadisticas usuario={usuario} eventos={eventos} />}
      {vista === 'notas' && <NotasModulo usuario={usuario} />}
      {vista === 'ajustes' && <Ajustes usuario={usuario} eventos={eventos} />}

      {(vista === 'mes' || vista === 'lista' || vista === 'semana') && (
        <button className="fab" onClick={() => abrirModalCrear()}>+</button>
      )}

      {modalAbierto && (
        <ModalEvento
          evento={eventoSeleccionado}
          fechaInicial={fechaNueva}
          usuario={usuario}
          onCrear={crearEvento}
          onActualizar={actualizarEvento}
          onEliminar={eliminarEvento}
          onDuplicar={duplicarEvento}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </>
  );
}

export default App;
