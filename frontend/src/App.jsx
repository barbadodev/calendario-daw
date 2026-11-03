import { useState, useEffect } from 'react';
import Login from './Login.jsx';
import Calendario from './Calendario.jsx';
import ListaEventos from './ListaEventos.jsx';
import ModalEvento from './ModalEvento.jsx';
import Ajustes from './Ajustes.jsx';
import { supabase } from './supabase.js';

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [usuario, setUsuario] = useState(null);
  const [vista, setVista] = useState('calendario'); // calendario | lista | ajustes
  const [eventos, setEventos] = useState([]);
  const [filtroModulo, setFiltroModulo] = useState('todos');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const [fechaNueva, setFechaNueva] = useState(null);

  // Cargar usuario desde localStorage
  useEffect(() => {
    const guardado = localStorage.getItem('usuario');
    if (guardado) {
      setUsuario(JSON.parse(guardado));
    }
  }, []);

  // Cargar eventos desde Supabase en tiempo real
  useEffect(() => {
    if (!usuario) return;
    cargarEventos();

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('eventos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos' }, cargarEventos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notas_evento' }, () => {
        if (eventoSeleccionado) cargarEventoDetalle(eventoSeleccionado.id);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [usuario]);

  async function cargarEventos() {
    try {
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .order('fecha_inicio', { ascending: true });

      if (!error && data) setEventos(data);
    } catch (err) {
      console.error('Error cargando eventos:', err);
    }
  }

  async function cargarEventoDetalle(id) {
    // Recargar eventos para traer notas actualizadas
    await cargarEventos();
  }

  async function crearEvento(eventoData) {
    try {
      const res = await fetch(`${API_URL}/api/eventos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sala: usuario.codigo_sala, evento: { ...eventoData, creado_por: usuario.id } }),
      });
      const data = await res.json();
      if (res.ok) {
        setModalAbierto(false);
        cargarEventos();
      }
    } catch (err) {
      console.error('Error creando evento:', err);
    }
  }

  async function actualizarEvento(id, eventoData) {
    try {
      const res = await fetch(`${API_URL}/api/eventos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sala: usuario.codigo_sala, evento: eventoData }),
      });
      if (res.ok) {
        setModalAbierto(false);
        setEventoSeleccionado(null);
        cargarEventos();
      }
    } catch (err) {
      console.error('Error actualizando evento:', err);
    }
  }

  async function eliminarEvento(id) {
    if (!confirm('¿Eliminar este evento?')) return;
    try {
      const res = await fetch(`${API_URL}/api/eventos/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sala: usuario.codigo_sala }),
      });
      if (res.ok) {
        setModalAbierto(false);
        setEventoSeleccionado(null);
        cargarEventos();
      }
    } catch (err) {
      console.error('Error eliminando evento:', err);
    }
  }

  function abrirModalCrear(fecha = null) {
    setFechaNueva(fecha);
    setEventoSeleccionado(null);
    setModalAbierto(true);
  }

  function abrirModalEditar(evento) {
    setEventoSeleccionado(evento);
    setFechaNueva(null);
    setModalAbierto(true);
  }

  function cerrarSesion() {
    localStorage.removeItem('usuario');
    setUsuario(null);
  }

  if (!usuario) {
    return <Login onLogin={setUsuario} />;
  }

  const eventosFiltrados = filtroModulo === 'todos'
    ? eventos
    : eventos.filter(e => e.modulo_id === filtroModulo);

  return (
    <>
      {/* HEADER */}
      <header className="app-header">
        <h1>
          📅 CalDAW
          <span className="user-badge">{usuario.nombre}</span>
        </h1>
        <div className="header-actions">
          <button className="btn-icon" onClick={cerrarSesion} title="Cerrar sesión">
            🚪
          </button>
          <button className="btn-icon" onClick={() => setVista('ajustes')} title="Ajustes">
            ⚙️
          </button>
        </div>
      </header>

      {/* TABS */}
      <nav className="view-tabs">
        <button
          className={`view-tab ${vista === 'calendario' ? 'active' : ''}`}
          onClick={() => setVista('calendario')}
        >
          Calendario
        </button>
        <button
          className={`view-tab ${vista === 'lista' ? 'active' : ''}`}
          onClick={() => setVista('lista')}
        >
          Lista
        </button>
        <button
          className={`view-tab ${vista === 'ajustes' ? 'active' : ''}`}
          onClick={() => setVista('ajustes')}
        >
          Ajustes
        </button>
      </nav>

      {/* FILTROS */}
      <div className="filtros-bar">
        <button
          className={`filtro-chip ${filtroModulo === 'todos' ? 'active' : ''}`}
          style={filtroModulo === 'todos' ? { background: '#6366f1', borderColor: '#6366f1' } : {}}
          onClick={() => setFiltroModulo('todos')}
        >
          Todos
        </button>
        {['ipe', 'dwec', 'dwes', 'daw', 'diw', 'en', 'opt', 'proy'].map(id => {
          const mod = getModulo(id);
          return (
            <button
              key={id}
              className={`filtro-chip ${filtroModulo === id ? 'active' : ''}`}
              style={filtroModulo === id ? { background: mod.color, borderColor: mod.color } : {}}
              onClick={() => setFiltroModulo(id)}
            >
              {mod.nombre}
            </button>
          );
        })}
      </div>

      {/* VISTA PRINCIPAL */}
      {vista === 'calendario' && (
        <Calendario
          eventos={eventosFiltrados}
          onDiaClick={abrirModalCrear}
          onEventoClick={abrirModalEditar}
        />
      )}

      {vista === 'lista' && (
        <ListaEventos
          eventos={eventosFiltrados}
          onEventoClick={abrirModalEditar}
        />
      )}

      {vista === 'ajustes' && <Ajustes usuario={usuario} />}

      {/* FAB */}
      {vista !== 'ajustes' && (
        <button className="fab" onClick={() => abrirModalCrear()}>
          +
        </button>
      )}

      {/* MODAL EVENTO */}
      {modalAbierto && (
        <ModalEvento
          evento={eventoSeleccionado}
          fechaInicial={fechaNueva}
          onCrear={crearEvento}
          onActualizar={actualizarEvento}
          onEliminar={eliminarEvento}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </>
  );
}

// Helpers
const MODULOS = [
  { id: 'ipe',    nombre: 'IPE',        color: '#8b5cf6' },
  { id: 'dwec',   nombre: 'DWEC',       color: '#3b82f6' },
  { id: 'dwes',   nombre: 'DWES',       color: '#10b981' },
  { id: 'daw',    nombre: 'DAW',        color: '#f97316' },
  { id: 'diw',    nombre: 'DIW',        color: '#ec4899' },
  { id: 'en',     nombre: 'Inglés',     color: '#06b6d4' },
  { id: 'opt',    nombre: 'Optativa',   color: '#eab308' },
  { id: 'proy',   nombre: 'Proyecto',   color: '#ef4444' },
];

export function getModulo(id) {
  return MODULOS.find(m => m.id === id) || { id, nombre: id, color: '#6b7280' };
}

export default App;
