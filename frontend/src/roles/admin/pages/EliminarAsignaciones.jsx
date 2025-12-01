import React, { useEffect, useState } from "react";
import "../styles/eliminar-asignaciones.css";

export default function EliminarAsignaciones() {
  const API_BASE = "http://localhost:5000/admin";

  const [asignaciones, setAsignaciones] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [docentes, setDocentes] = useState([]);
  // ELIMINADO: const [horarios, setHorarios] = useState([]); (Ya no se usa)
  const [aulas, setAulas] = useState([]);
  const [secciones, setSecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModalVerificacion, setMostrarModalVerificacion] = useState(false);
  const [asignacionEliminar, setAsignacionEliminar] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [mensajeTipo, setMensajeTipo] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      // ELIMINADO: fetch horarios
      const [asigRes, docRes, cursoRes, aulaRes, seccionRes] =
        await Promise.all([
          fetch(`${API_BASE}/listar-asignaciones`),
          fetch(`${API_BASE}/docentes`),
          fetch(`${API_BASE}/cursos`),
          fetch(`${API_BASE}/aulas`),
          fetch(`${API_BASE}/secciones`),
        ]);

      if (
        !asigRes.ok ||
        !docRes.ok ||
        !cursoRes.ok ||
        !aulaRes.ok ||
        !seccionRes.ok
      ) {
        throw new Error("Error al cargar datos del servidor");
      }

      const [
        asignacionesData,
        docentesData,
        cursosData,
        aulasData,
        seccionesData,
      ] = await Promise.all([
        asigRes.json(),
        docRes.json(),
        cursoRes.json(),
        aulaRes.json(),
        seccionRes.json(),
      ]);

      setAsignaciones(asignacionesData || []);
      setDocentes(docentesData || []);
      setCursos(cursosData || []);
      setAulas(aulasData || []);
      setSecciones(seccionesData || []);
      setLoading(false);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      setMensaje("Error al conectar con el backend");
      setMensajeTipo("error");
      setMostrarModalVerificacion(true);
      setLoading(false);
    }
  };

  const abrirModalEliminar = (asig) => {
    setAsignacionEliminar(asig);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setAsignacionEliminar(null);
  };

  const confirmarEliminacion = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/eliminar-asignacion/${asignacionEliminar.asignacion_id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al eliminar la asignación");
        setMensajeTipo("error");
        setMostrarModalVerificacion(true);
        cerrarModal();
        return;
      }

      setMensaje("Asignación eliminada correctamente");
      setMensajeTipo("success");
      setMostrarModalVerificacion(true);
      cerrarModal();
      cargarDatos();
    } catch (err) {
      console.error(err);
      setMensaje("Error de conexión con el servidor");
      setMensajeTipo("error");
      setMostrarModalVerificacion(true);
      cerrarModal();
    }
  };

  const cerrarModalVerificacion = () => {
    setMostrarModalVerificacion(false);
    setMensaje("");
    setMensajeTipo("");
  };

  const getNombreCurso = (cursoId) => {
    const curso = cursos.find((c) => c.curso_id === cursoId);
    return curso ? `${curso.nombre} (${curso.codigo})` : "N/A";
  };

  const getNombreDocente = (docenteId) => {
    const docente = docentes.find((d) => d.docente_id === docenteId);
    if (!docente) return "N/A";
    return (
      docente.nombre_completo ||
      (docente.nombres && docente.apellidos
        ? `${docente.nombres} ${docente.apellidos}`
        : "N/A")
    );
  };

  const getSeccion = (seccionId) => {
    const seccion = secciones.find((s) => s.seccion_id === seccionId);
    return seccion ? `${seccion.codigo} - ${seccion.periodo}` : "N/A";
  };

  // ELIMINADO: getHorario (ya no se usa, leemos directo de asig)

  const getAula = (aulaId) => {
    if (!aulaId) return "N/A";
    const aula = aulas.find((a) => a.aula_id === aulaId);
    return aula ? `${aula.nombre} - ${aula.pabellon}` : "N/A";
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Cargando asignaciones...</div>
      </div>
    );
  }

  return (
    <div className="asignaciones-wrapper">
      <div className="asignaciones-header">
        <h2 className="page-title-delete">🗑️ Eliminar Asignaciones</h2>
        <p className="page-subtitle">
          Gestiona y elimina asignaciones del sistema
        </p>
      </div>

      {asignaciones.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <p>No hay asignaciones registradas</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>TIPO</th>
                <th>CURSO</th>
                <th>SECCIÓN</th>
                <th>DOCENTE</th>
                <th>ESTUDIANTES</th>
                <th>HORARIO</th>
                <th>AULA</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {asignaciones.map((asig) => (
                <tr key={asig.asignacion_id}>
                  <td>{asig.asignacion_id}</td>
                  <td>
                    <span
                      className={`badge ${
                        asig.tipo === "TEORICO"
                          ? "badge-primary" // Asume que tienes este estilo o usa uno azul
                          : "badge-warning" // O un estilo para práctico
                      }`}
                      style={{
                        backgroundColor:
                          asig.tipo === "TEORICO" ? "#dbeafe" : "#ffedd5",
                        color: asig.tipo === "TEORICO" ? "#1e40af" : "#9a3412",
                      }}
                    >
                      {asig.tipo}
                    </span>
                  </td>
                  <td>{getNombreCurso(asig.curso_id)}</td>
                  <td>{getSeccion(asig.seccion_id)}</td>
                  <td>{getNombreDocente(asig.docente_id)}</td>
                  <td className="text-center">{asig.cantidad_estudiantes}</td>
                  
                  {/* AQUÍ ESTABA EL ERROR: Usamos los campos directos */}
                  <td>
                    {asig.dia} {asig.hora_inicio} - {asig.hora_fin}
                  </td>
                  
                  <td>{getAula(asig.aula_id)}</td>
                  
                  <td>
                    <span
                      className={`badge ${
                        asig.observaciones ? "badge-warning" : "badge-success"
                      }`}
                    >
                      {asig.observaciones ? "OBS" : "ACTIVO"}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button
                      onClick={() => abrirModalEliminar(asig)}
                      className="btn-action btn-delete"
                      title="Eliminar"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {mostrarModal && asignacionEliminar && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div
            className="modal-content modal-delete"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-icon-delete">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>

            <h3 className="modal-title-delete">⚠️ ¿Estás seguro?</h3>
            <p className="modal-description">
              Esta acción eliminará permanentemente la asignación:
            </p>

            <div className="delete-info">
              <div className="info-row">
                <span className="info-label">Tipo:</span>
                <span className="info-value font-bold">{asignacionEliminar.tipo}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Curso:</span>
                <span className="info-value">
                  {getNombreCurso(asignacionEliminar.curso_id)}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Docente:</span>
                <span className="info-value">
                  {getNombreDocente(asignacionEliminar.docente_id)}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Sección:</span>
                <span className="info-value">
                  {getSeccion(asignacionEliminar.seccion_id)}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Horario:</span>
                <span className="info-value">
                  {asignacionEliminar.dia} {asignacionEliminar.hora_inicio} - {asignacionEliminar.hora_fin}
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={cerrarModal} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={confirmarEliminacion} className="btn-danger">
                🗑️ Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VERIFICACIÓN */}
      {mostrarModalVerificacion && (
        <div
          className="modal-overlay-verificacion"
          onClick={cerrarModalVerificacion}
        >
          <div
            className={`modal-verificacion ${
              mensajeTipo === "success" ? "modal-success" : "modal-error"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`icon-verificacion ${
                mensajeTipo === "success" ? "icon-success" : "icon-error"
              }`}
            >
              {mensajeTipo === "success" ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              )}
            </div>
            <h3 className="titulo-verificacion">
              {mensajeTipo === "success" ? "SUCCESS" : "ERROR"}
            </h3>
            <p className="mensaje-verificacion">{mensaje}</p>
            <button
              onClick={cerrarModalVerificacion}
              className={`btn-verificacion ${
                mensajeTipo === "success" ? "btn-success" : "btn-error"
              }`}
            >
              {mensajeTipo === "success" ? "CONTINUE" : "AGAIN"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}