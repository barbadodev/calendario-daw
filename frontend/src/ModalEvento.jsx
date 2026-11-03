import { useState, useEffect } from 'react';
import { format, parseISO, parse } from 'date-fns';
import { getModulo } from './App.jsx';
import { supabase } from './supabase.js';

const MODULOS = [
  { id: 'ipe',  nombre: 'IPE' },
  { id: 'dwec', nombre: 'DWEC' },
  { id: 'dwes', nombre: 'DWES' },
  { id: 'daw',  nombre: 'DAW' },
  { id: 'diw',  nombre: 'DIW' },
  { id: 'en',   nombre: 'Inglés' },
  { id: 'opt',  nombre: 'Optativa' },
  { id: 'proy', nombre: 'Proyecto' },
];

const TIPOS = [
  { id: 'examen',  nombre: '📝 Examen' },
  { id: 'entrega', nombre: '📦 Entrega' },
  { id: 'apunte',  nombre: '📝 Apunte / Nota del profesor' },
  { id: 'clase',   nombre: '📚 Clase' },
  { id: 'reunion', nombre: '👥 Reunión de grupo' },
  { id: 'otro',    nombre: '⭐ Otro' },
];

const API_URL = import.meta.env.VITE_API_URL;

function ModalEvento({ evento, fechaInicial, onCrear, onActualizar, onEliminar, onCerrar }) {
  const esEdicion = !!evento;

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [moduloId, setModuloId] = useState('ipe');
  const [tipoId, setTipoId] = useState('otro');
  const [fechaInicio, setFechaInicio] = useState('');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [todoElDia, setTodoElDia] = useState(false);
  const [notas, setNotas] = useState([]);
  const [nuevaNota, setNuevaNota] = useState('');
  const [cargandoNotas, setCargandoNotas] = useState(false);

  useEffect(() => {
    if (evento) {
      setTitulo(evento.titulo || '');
      setDescripcion(evento.descripcion || '');
      setModuloId(evento.modulo_id || 'ipe');
      setTipoId(evento.tipo_id || 'otro');
      const fecha = new Date(evento.fecha_inicio);
      setFechaInicio(format(fecha, 'yyyy-MM-dd'));
      setHoraInicio(format(fecha, 'HH:mm'));
      setTodoElDia(evento.todo_el_dia || false);
      cargarNotas(evento.id);
    } else if (fechaInicial) {
      setFechaInicio(fechaInicial);
    }
  }, [evento, fechaInicial]);

  async function cargarNotas(eventoId) {
    if (!eventoId) return;
    setCargandoNotas(true);
    try {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      const res = await fetch(`${API_URL}/api/eventos/${eventoId}/notas?sala=${usuario.codigo_sala}`);
      const data = await res.json();
      if (data.notas) setNotas(data.notas);
    } catch (err) {
      console.error('Error cargando notas:', err);
    }
    setCargandoNotas(false);
  }

  async function guardarNota(e) {
    e.preventDefault();
    if (!nuevaNota.trim() || !evento) return;

    try {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      const res = await fetch(`${API_URL}/api/eventos/${evento.id}/notas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sala: usuario.codigo_sala,
          contenido: nuevaNota.trim(),
          autor_id: usuario.id,
        }),
      });
      if (res.ok) {
        setNuevaNota('');
        cargarNotas(evento.id);
      }
    } catch (err) {
      console.error('Error guardando nota:', err);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const fechaCompleta = todoElDia
      ? new Date(fechaInicio + 'T00:00:00').toISOString()
      : new Date(`${fechaInicio}T${horaInicio}:00`).toISOString();

    const payload = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      modulo_id: moduloId,
      tipo_id: tipoId,
      fecha_inicio: fechaCompleta,
      todo_el_dia: todoElDia,
    };

    if (esEdicion) {
      onActualizar(evento.id, payload);
    } else {
      onCrear(payload);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{esEdicion ? 'Editar evento' : 'Nuevo evento'}</h2>
          <button className="btn-icon" onClick={onCerrar}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label>Título</label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ej: Examen final DWES"
              required
            />

            <label>Módulo</label>
            <select value={moduloId} onChange={e => setModuloId(e.target.value)}>
              {MODULOS.map(m => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>

            <label>Tipo</label>
            <select value={tipoId} onChange={e => setTipoId(e.target.value)}>
              {TIPOS.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>

            <label>Fecha</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              required
            />

            <label>
              <input
                type="checkbox"
                checked={todoElDia}
                onChange={e => setTodoElDia(e.target.checked)}
                style={{ width: 'auto', marginRight: '0.5rem' }}
              />
              Todo el día
            </label>

            {!todoElDia && (
              <>
                <label>Hora</label>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={e => setHoraInicio(e.target.value)}
                />
              </>
            )}

            <label>Descripción / apuntes</label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Lo que dijo el profesor, enlaces, detalles..."
            />

            {/* NOTAS COMPARTIDAS */}
            {esEdicion && (
              <div className="notas-section">
                <h3 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  💬 Notas del grupo ({notas.length})
                </h3>

                {cargandoNotas ? (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cargando...</p>
                ) : (
                  notas.map(n => (
                    <div key={n.id} className="nota-item">
                      <div className="nota-autor">{n.usuarios?.nombre || 'Anónimo'}</div>
                      <div className="nota-contenido">{n.contenido}</div>
                      <div className="nota-fecha">{format(parseISO(n.created_at), 'd MMM HH:mm', { locale: 'es' })}</div>
                    </div>
                  ))
                )}

                <form onSubmit={guardarNota} style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={nuevaNota}
                    onChange={e => setNuevaNota(e.target.value)}
                    placeholder="Escribe una nota para el grupo..."
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-filled" style={{ padding: '0.5rem 0.75rem' }}>
                    +
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="modal-footer">
            {esEdicion && (
              <button type="button" className="btn btn-danger" onClick={() => onEliminar(evento.id)}>
                Eliminar
              </button>
            )}
            <button type="button" className="btn" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="btn btn-filled">
              {esEdicion ? 'Guardar cambios' : 'Crear evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalEvento;
