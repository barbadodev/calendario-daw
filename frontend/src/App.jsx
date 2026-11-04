import { useState, useEffect } from 'react';
import Login from './Login.jsx';
import Calendario from './Calendario.jsx';
import VistaSemanal from './VistaSemanal.jsx';
import ListaEventos from './ListaEventos.jsx';
import ModalEvento from './ModalEvento.jsx';
import Ajustes from './Ajustes.jsx';
import Estadisticas from './Estadisticas.jsx';
import NotasModulo from './NotasModulo.jsx';
import PlanEstudio from './PlanEstudio.jsx';
import ContadorProximo from './ContadorProximo.jsx';
import BannerMoodle from './BannerMoodle.jsx';
import AlertaCierres from './AlertaCierres.jsx';
import { supabase } from './supabase.js';
import { setTema, temaActual, temaPreferido } from './tema.js';
import { CalendarDays, LogOut, Settings, Sun, Moon, Plus, Check, TriangleAlert } from 'lucide-react';

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

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [vista, setVista] = useState(() => localStorage.getItem('caldaw_vista') || 'semana');
  const [eventos, setEventos] = useState([]);
  const [filtroModulo, setFiltroModulo] = useState('todos');
  const [soloPendientes, setSoloPendientes] = useState(() => localStorage.getItem('caldaw_pend') === '1');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const [fechaNueva, setFechaNueva] = useState(null);
  const [eventoDestacado, setEventoDestacado] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [tema, setTemaEstado] = useState(() => temaActual());

  function alternarTema() {
    const siguiente = tema === 'oscuro' ? 'claro' : 'oscuro';
    setTema(siguiente);
    setTemaEstado(siguiente);
  }

  function mostrarAviso(texto, tipo = 'ok') {
    setAviso({ texto, tipo });
    setTimeout(() => setAviso(null), 4500);
  }

  // Recuperar sesión y abrir deep-link ?evento=xxx (desde notificación)
  useEffect(() => {
    const guardado = localStorage.getItem('usuario');
    if (guardado) setUsuario(JSON.parse(guardado));
    const params = new URLSearchParams(window.location.search);
    if (params.get('evento')) setEventoDestacado(params.get('evento'));
  }, []);

  useEffect(() => { localStorage.setItem('caldaw_vista', vista); }, [vista]);
  useEffect(() => { localStorage.setItem('caldaw_pend', soloPendientes ? '1' : '0'); }, [soloPendientes]);

  useEffect(() => {
    if (!usuario) return;
    cargarEventos();
    const channel = supabase
      .channel('eventos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos' }, cargarEventos)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [usuario]);

  // Abrir el evento que venía en el enlace de la notificación
  useEffect(() => {
    if (!eventoDestacado || eventos.length === 0) return;
    const ev = eventos.find(e => e.id === eventoDestacado);
    if (ev) { setEventoSeleccionado(ev); setModalAbierto(true); }
    setEventoDestacado(null);
    window.history.replaceState({}, '', window.location.pathname);
  }, [eventoDestacado, eventos]);

  async function cargarEventos() {
    try {
      const { data, error } = await supabase.from('eventos').select('*').order('fecha_inicio', { ascending: true });
      if (!error && data) setEventos(data);
    } catch (err) { console.error(err); }
  }

  function textoAvisos(d) {
    if (d.avisados === undefined) return '';
    return d.avisados > 0
      ? ` · avisados ${d.avisados} compañero${d.avisados === 1 ? '' : 's'}`
      : ' · nadie tiene las notificaciones activas';
  }

  async function crearEvento(eventoData) {
    const res = await fetch(`${API_URL}/api/eventos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sala: usuario.codigo_sala, evento: { ...eventoData, creado_por: usuario.id } }),
    });
    if (res.ok) {
      const d = await res.json();
      setModalAbierto(false);
      cargarEventos();
      mostrarAviso('Evento guardado' + textoAvisos(d));
    } else mostrarAviso('No se pudo guardar', 'error');
  }

  async function actualizarEvento(id, eventoData) {
    const res = await fetch(`${API_URL}/api/eventos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sala: usuario.codigo_sala, evento: eventoData, usuarioId: usuario.id }),
    });
    if (res.ok) {
      const d = await res.json();
      setModalAbierto(false); setEventoSeleccionado(null); cargarEventos();
      mostrarAviso('Cambios guardados' + textoAvisos(d));
    } else mostrarAviso('No se pudieron guardar los cambios', 'error');
  }

  async function eliminarEvento(id) {
    if (!confirm('¿Eliminar este evento?')) return;
    const res = await fetch(`${API_URL}/api/eventos/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sala: usuario.codigo_sala, usuarioId: usuario.id }),
    });
    if (res.ok) {
      const d = await res.json();
      setModalAbierto(false); setEventoSeleccionado(null); cargarEventos();
      mostrarAviso('Evento eliminado' + textoAvisos(d));
    }
  }

  async function toggleCompletar(id, valorActual) {
    setEventos(prev => prev.map(e => e.id === id ? { ...e, completado: !valorActual } : e));
    await fetch(`${API_URL}/api/eventos/${id}/completar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sala: usuario.codigo_sala, valor: !valorActual }),
    });
  }

  async function marcarEntregado(id) {
    const ev = eventos.find(e => e.id === id);
    if (!ev || ev.completado) return;
    await toggleCompletar(id, ev.completado);
    mostrarAviso(`${ev.titulo.slice(0, 40)} · marcada como entregada`);
    // Avisa al grupo de que ya la has subido
    fetch(`${API_URL}/api/eventos/${id}/notas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sala: usuario.codigo_sala,
        contenido: 'Entregada',
        autor_id: usuario.id,
      }),
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
      setEventoSeleccionado(evento);
      cargarEventos();
    }
  }

  function abrirModalCrear(fecha = null) { setFechaNueva(fecha); setEventoSeleccionado(null); setModalAbierto(true); }
  function abrirModalEditar(ev) { setEventoSeleccionado(ev); setFechaNueva(null); setModalAbierto(true); }
  function cerrarSesion() { localStorage.removeItem('usuario'); setUsuario(null); }

  if (!usuario) return <Login onLogin={setUsuario} />;

  let eventosVista = filtroModulo === 'todos' ? eventos : eventos.filter(e => e.modulo_id === filtroModulo);
  if (soloPendientes) eventosVista = eventosVista.filter(e => !e.completado);

  return (
    <>
      <header className="app-header">
        <h1><CalendarDays size={18} /> CalDAW <span className="user-badge">{usuario.nombre}</span></h1>
        <div className="header-actions">
          <button className="btn-icon" onClick={alternarTema}
            title={tema === 'oscuro' ? 'Poner modo claro' : 'Poner modo oscuro'}>
            {tema === 'oscuro' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="btn-icon" onClick={() => setVista('ajustes')} title="Ajustes">
            <Settings size={16} />
          </button>
          <button className="btn-icon" onClick={cerrarSesion} title="Cerrar sesión">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <ContadorProximo eventos={eventos} />
      <AlertaCierres sala={usuario.codigo_sala} onMarcarEntregado={marcarEntregado} />
      <BannerMoodle sala={usuario.codigo_sala} />

      <nav className="view-tabs">
        {[['mes','Mes'],['semana','Semana'],['lista','Lista'],['plan','Plan'],['stats','Stats'],['notas','Notas']].map(([id, label]) => (
          <button key={id} className={`view-tab ${vista === id ? 'active' : ''}`} onClick={() => setVista(id)}>{label}</button>
        ))}
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
        <button className={`filtro-chip ${soloPendientes ? 'active' : ''}`}
          style={soloPendientes ? { background: 'var(--success)', borderColor: 'var(--success)' } : {}}
          onClick={() => setSoloPendientes(v => !v)}><Check size={11} strokeWidth={3} /> Pendientes</button>
      </div>

      {vista === 'mes' && <Calendario eventos={eventosVista} onDiaClick={abrirModalCrear} onEventoClick={abrirModalEditar} />}
      {vista === 'semana' && <VistaSemanal eventos={eventosVista} onEventoClick={abrirModalEditar} onDiaClick={abrirModalCrear} />}
      {vista === 'lista' && <ListaEventos eventos={eventosVista} onEventoClick={abrirModalEditar} onToggleCompletar={toggleCompletar} />}
      {vista === 'plan' && <PlanEstudio usuario={usuario} />}
      {vista === 'stats' && <Estadisticas usuario={usuario} eventos={eventos} />}
      {vista === 'notas' && <NotasModulo usuario={usuario} />}
      {vista === 'ajustes' && <Ajustes usuario={usuario} eventos={eventos} />}

      {['mes','semana','lista'].includes(vista) && (
        <button className="fab" onClick={() => abrirModalCrear()} title="Nuevo evento">
          <Plus size={22} strokeWidth={2.4} />
        </button>
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
          onAviso={mostrarAviso}
          onCerrar={() => setModalAbierto(false)}
        />
      )}

      {aviso && (
        <div className={`toast toast-${aviso.tipo}`} onClick={() => setAviso(null)} role="status">
          {aviso.tipo === 'error' ? <TriangleAlert size={15} /> : <Check size={15} strokeWidth={2.6} />}
          <span>{aviso.texto}</span>
        </div>
      )}
    </>
  );
}
