import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { MODULOS, TIPOS } from './modulos.js';
import { useBloquearScroll } from './useEsMovil.js';
import { X, GraduationCap, MessageSquare, Plus, Copy, Trash2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

export default function ModalEvento({ evento, fechaInicial, usuario, onCrear, onActualizar, onEliminar, onDuplicar, onAviso, onCerrar }) {
  const esEdicion = !!evento;
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [moduloId, setModuloId] = useState('ipe');
  const [tipoId, setTipoId] = useState('otro');
  const [fechaInicio, setFechaInicio] = useState('');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [todoElDia, setTodoElDia] = useState(false);
  const [enlace, setEnlace] = useState('');
  const [notas, setNotas] = useState([]);
  const [nuevaNota, setNuevaNota] = useState('');

  useEffect(() => {
    if (evento) {
      setTitulo(evento.titulo || '');
      setDescripcion(evento.descripcion || '');
      setModuloId(evento.modulo_id || 'ipe');
      setTipoId(evento.tipo_id || 'otro');
      const f = new Date(evento.fecha_inicio);
      setFechaInicio(format(f, 'yyyy-MM-dd'));
      setHoraInicio(format(f, 'HH:mm'));
      setTodoElDia(!!evento.todo_el_dia);
      setEnlace(evento.enlace || '');
      cargarNotas(evento.id);
    } else if (fechaInicial) {
      setFechaInicio(fechaInicial);
    }
  }, [evento, fechaInicial]);

  async function cargarNotas(id) {
    try {
      const res = await fetch(`${API_URL}/api/eventos/${id}/notas?sala=${usuario.codigo_sala}`);
      const { notas } = await res.json();
      setNotas(notas || []);
    } catch { setNotas([]); }
  }

  async function guardarNota(e) {
    e.preventDefault();
    if (!nuevaNota.trim() || !evento) return;
    const res = await fetch(`${API_URL}/api/eventos/${evento.id}/notas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sala: usuario.codigo_sala, contenido: nuevaNota.trim(), autor_id: usuario.id }),
    });
    if (res.ok) {
      const d = await res.json();
      setNuevaNota('');
      cargarNotas(evento.id);
      if (onAviso) {
        onAviso(d.avisados > 0
          ? `Nota guardada · avisados ${d.avisados} compañero${d.avisados === 1 ? '' : 's'}`
          : 'Nota guardada · nadie tiene las notificaciones activas');
      }
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
      enlace: enlace.trim() || null,
    };
    esEdicion ? onActualizar(evento.id, payload) : onCrear(payload);
  }

  const esOrigenMoodle = evento?.origen === 'moodle';
  useBloquearScroll(true);

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-titulo">
            {esEdicion ? 'Editar evento' : 'Nuevo evento'}
            {esOrigenMoodle && <span className="modal-subtitulo">sincronizado con Moodle</span>}
          </h2>
          <button className="btn-icon" onClick={onCerrar} aria-label="Cerrar"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label>Título</label>
            <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
              placeholder="Ej: Examen final DWES" required disabled={esOrigenMoodle} />

            <label>Módulo</label>
            <select value={moduloId} onChange={e => setModuloId(e.target.value)} disabled={esOrigenMoodle}>
              {MODULOS.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>

            <label>Tipo</label>
            <select value={tipoId} onChange={e => setTipoId(e.target.value)} disabled={esOrigenMoodle}>
              {TIPOS.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>

            <div className="campo-fecha-hora">
              <div>
                <label>Fecha</label>
                <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} required disabled={esOrigenMoodle} />
              </div>
              {!todoElDia && (
                <div>
                  <label>Hora</label>
                  <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} disabled={esOrigenMoodle} />
                </div>
              )}
            </div>

            <label className="label-check">
              <input type="checkbox" checked={todoElDia} onChange={e => setTodoElDia(e.target.checked)} disabled={esOrigenMoodle} />
              Todo el día
            </label>

            <label>Enlace asociado (opcional)</label>
            <input type="url" value={enlace} onChange={e => setEnlace(e.target.value)}
              placeholder="https://moodle.../practica3" />

            {esOrigenMoodle && evento.moodle_url && (
              <a href={evento.moodle_url} target="_blank" rel="noreferrer" className="btn-moodle">
                <GraduationCap size={15} /> Abrir el curso en Moodle
              </a>
            )}

            <label>Descripción / apuntes</label>
            {esOrigenMoodle && descripcion ? (
              <div className="descripcion-moodle">{descripcion}</div>
            ) : (
              <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                placeholder="Lo que dijo el profesor, temas, enlaces, detalles..." />
            )}

            {esEdicion && (
              <div className="notas-section">
                <h3 className="notas-titulo">
                  <MessageSquare size={13} /> Notas del grupo
                  <span className="contador">{notas.length}</span>
                </h3>
                {notas.map(n => (
                  <div key={n.id} className="nota-item">
                    <div className="nota-autor">{n.usuarios?.nombre || 'Anónimo'}</div>
                    <div className="nota-contenido">{n.contenido}</div>
                    <div className="nota-fecha">{format(parseISO(n.created_at), 'd MMM HH:mm', { locale: es })}</div>
                  </div>
                ))}
                <form onSubmit={guardarNota} className="nota-form">
                  <input type="text" value={nuevaNota} onChange={e => setNuevaNota(e.target.value)}
                    placeholder="Nota rápida para el grupo..." />
                  <button type="submit" className="btn btn-filled nota-enviar" aria-label="Añadir nota">
                    <Plus size={15} />
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="modal-footer">
            {esEdicion && !esOrigenMoodle && (
              <button type="button" className="btn btn-danger" onClick={() => onEliminar(evento.id)}>
                <Trash2 size={14} /> Eliminar
              </button>
            )}
            {esEdicion && (
              <button type="button" className="btn" onClick={() => onDuplicar(evento.id)}>
                <Copy size={14} /> Duplicar +1 día
              </button>
            )}
            <button type="button" className="btn" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="btn btn-filled" disabled={esOrigenMoodle}>
              {esEdicion ? 'Guardar cambios' : 'Crear evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
