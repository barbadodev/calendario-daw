import { useState, useEffect, useRef } from 'react';
import Login from './Login.jsx';
import Calendario from './Calendario.jsx';
import VistaSemanal from './VistaSemanal.jsx';
import ListaEventos from './ListaEventos.jsx';
import ModalEvento from './ModalEvento.jsx';
import Ajustes from './Ajustes.jsx';
import Estadisticas from './Estadisticas.jsx';
import NotasModulo from './NotasModulo.jsx';
import PlanEstudio from './PlanEstudio.jsx';
import BannerMoodle from './BannerMoodle.jsx';
import AlertaCierres from './AlertaCierres.jsx';
import { MODULOS } from './modulos.js';
import { IconoAjustes, IconoSalir, IconoMas, IconoCheck, IconoSol, IconoLuna } from './Icons.jsx';
import { setTema, temaActual } from './tema.js';
import { ESTILOS, setEstilo, estiloActual } from './estilos.js';
import { supabase } from './supabase.js';

const API_URL = import.meta.env.VITE_API_URL;

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
  const avisoTimer = useRef(null);

  function alternarTema() {
    const siguiente = tema === 'oscuro' ? 'claro' : 'oscuro';
    setTema(siguiente);
    setTemaEstado(siguiente);
  }

  function mostrarAviso(texto, tipo = 'ok') {
    // Si llega otro aviso, el temporizador anterior no debe cerrarlo.
    clearTimeout(avisoTimer.current);
    setAviso({ texto, tipo });
    avisoTimer.current = setTimeout(() => setAviso(null), 4500);
  }

  useEffect(() => () => clearTimeout(avisoTimer.current), []);

  // Recuperar sesión y abrir deep-link ?evento=xxx (desde notificación)
  useEffect(() => {
    const guardado = localStorage.getItem('usuario');
    if (guardado) {
      try { setUsuario(JSON.parse(guardado)); }
      catch { localStorage.removeItem('usuario'); }
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('evento')) setEventoDestacado(params.get('evento'));
  }, []);

  useEffect(() => { localStorage.setItem('caldaw_vista', vista); }, [vista]);
  // Al volver de Ajustes, el icono del tema refleja lo que se haya elegido allí
  useEffect(() => { setTemaEstado(temaActual()); }, [vista]);
  useEffect(() => { localStorage.setItem('caldaw_pend', soloPendientes ? '1' : '0'); }, [soloPendientes]);

  // Ctrl+Shift+S cicla los estilos visuales para compararlos al vuelo
  useEffect(() => {
    function alPulsar(e) {
      if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        const i = ESTILOS.findIndex(x => x.id === estiloActual());
        const siguiente = ESTILOS[(i + 1) % ESTILOS.length];
        setEstilo(siguiente.id);
        mostrarAviso(`Estilo: ${siguiente.nombre} (${i + 2}/${ESTILOS.length})`);
      }
    }
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
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
    try {
      const res = await fetch(`${API_URL}/api/eventos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sala: usuario.codigo_sala, evento: { ...eventoData, creado_por: usuario.id } }),
      });
      if (!res.ok) throw new Error('crear');
      const d = await res.json();
      setModalAbierto(false);
      cargarEventos();
      mostrarAviso('Evento guardado' + textoAvisos(d));
    } catch {
      mostrarAviso('No se pudo guardar el evento', 'error');
    }
  }

  async function actualizarEvento(id, eventoData) {
    try {
      const res = await fetch(`${API_URL}/api/eventos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sala: usuario.codigo_sala, evento: eventoData, usuarioId: usuario.id }),
      });
      if (!res.ok) throw new Error('actualizar');
      const d = await res.json();
      setModalAbierto(false); setEventoSeleccionado(null); cargarEventos();
      mostrarAviso('Cambios guardados' + textoAvisos(d));
    } catch {
      mostrarAviso('No se pudieron guardar los cambios', 'error');
    }
  }

  async function eliminarEvento(id) {
    if (!confirm('¿Eliminar este evento?')) return;
    try {
      const res = await fetch(`${API_URL}/api/eventos/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sala: usuario.codigo_sala, usuarioId: usuario.id }),
      });
      if (!res.ok) throw new Error('eliminar');
      const d = await res.json();
      setModalAbierto(false); setEventoSeleccionado(null); cargarEventos();
      mostrarAviso('Evento eliminado' + textoAvisos(d));
    } catch {
      mostrarAviso('No se pudo eliminar el evento', 'error');
    }
  }

  async function toggleCompletar(id, valorActual) {
    const nuevo = !valorActual;
    setEventos(prev => prev.map(e => e.id === id ? { ...e, completado: nuevo } : e));
    try {
      const res = await fetch(`${API_URL}/api/eventos/${id}/completar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sala: usuario.codigo_sala, valor: nuevo }),
      });
      if (!res.ok) throw new Error('completar');
      return true;
    } catch {
      // Deshacer el cambio optimista: si no, la interfaz miente.
      setEventos(prev => prev.map(e => e.id === id ? { ...e, completado: valorActual } : e));
      mostrarAviso('No se pudo actualizar el evento', 'error');
      return false;
    }
  }

  async function marcarEntregado(id) {
    const ev = eventos.find(e => e.id === id);
    if (!ev || ev.completado) return;
    const ok = await toggleCompletar(id, ev.completado);
    if (!ok) return;
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
    }).catch(() => {});
  }

  async function duplicarEvento(id) {
    try {
      const res = await fetch(`${API_URL}/api/eventos/${id}/duplicar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sala: usuario.codigo_sala }),
      });
      if (!res.ok) throw new Error('duplicar');
      const { evento } = await res.json();
      setEventoSeleccionado(evento);
      cargarEventos();
    } catch {
      mostrarAviso('No se pudo duplicar el evento', 'error');
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
        <div className="header-inner">
          <div className="marca">
            <span className="marca-icono" aria-hidden="true" />
            <h1>DAW</h1>
            <span className="user-badge">{usuario.nombre}</span>
          </div>
          <div className="header-actions">
            <button className="btn-icon" onClick={alternarTema}
              title={tema === 'oscuro' ? 'Poner modo claro' : 'Poner modo oscuro'}
              aria-label="Cambiar entre modo claro y oscuro">
              {tema === 'oscuro' ? <IconoSol /> : <IconoLuna />}
            </button>
            <button className="btn-icon" onClick={() => setVista('ajustes')} title="Ajustes" aria-label="Ajustes">
              <IconoAjustes />
            </button>
            <button className="btn-icon" onClick={cerrarSesion} title="Cerrar sesión" aria-label="Cerrar sesión">
              <IconoSalir />
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <AlertaCierres sala={usuario.codigo_sala} onMarcarEntregado={marcarEntregado} />
        <BannerMoodle sala={usuario.codigo_sala} />

        <nav className="view-tabs">
          {[['mes','Mes'],['semana','Semana'],['lista','Lista'],['plan','Plan'],['stats','Estadísticas'],['notas','Notas']].map(([id, label]) => (
            <button key={id} className={`view-tab ${vista === id ? 'active' : ''}`} onClick={() => setVista(id)}>{label}</button>
          ))}
        </nav>

        {['mes', 'semana', 'lista'].includes(vista) && (
          <div className="filtros-bar">
            <button className={`filtro-chip ${filtroModulo === 'todos' ? 'active' : ''}`}
              style={filtroModulo === 'todos' ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}
              onClick={() => setFiltroModulo('todos')}>Todos</button>
            {MODULOS.map(m => (
              <button key={m.id} className={`filtro-chip ${filtroModulo === m.id ? 'active' : ''}`}
                style={filtroModulo === m.id ? { background: m.color, borderColor: m.color } : {}}
                onClick={() => setFiltroModulo(m.id)}>{m.nombre}</button>
            ))}
            <button className={`filtro-chip ${soloPendientes ? 'active' : ''}`}
              style={soloPendientes ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}
              onClick={() => setSoloPendientes(v => !v)}>
              {soloPendientes && <IconoCheck size={12} />} Pendientes
            </button>
          </div>
        )}

        {vista === 'mes' && <Calendario eventos={eventosVista} onDiaClick={abrirModalCrear} onEventoClick={abrirModalEditar} />}
        {vista === 'semana' && <VistaSemanal eventos={eventosVista} onEventoClick={abrirModalEditar} onDiaClick={abrirModalCrear} />}
        {vista === 'lista' && <ListaEventos eventos={eventosVista} onEventoClick={abrirModalEditar} onToggleCompletar={toggleCompletar} />}
        {vista === 'plan' && <PlanEstudio usuario={usuario} />}
        {vista === 'stats' && <Estadisticas usuario={usuario} />}
        {vista === 'notas' && <NotasModulo usuario={usuario} />}
        {vista === 'ajustes' && <Ajustes usuario={usuario} eventos={eventos} />}

        {['mes','semana','lista'].includes(vista) && (
          <button className="fab" onClick={() => abrirModalCrear()} title="Nuevo evento" aria-label="Nuevo evento">
            <IconoMas size={22} />
          </button>
        )}
      </main>

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
        <div className={`toast toast-${aviso.tipo}`} onClick={() => setAviso(null)}>
          {aviso.texto}
        </div>
      )}
    </>
  );
}
