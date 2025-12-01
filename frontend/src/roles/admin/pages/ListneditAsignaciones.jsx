import React, { useEffect, useState } from "react";
import "../styles/listar-editar-asignaciones.css";

export default function ListneditAsignaciones() {
  const API_BASE = "http://localhost:5000/admin";

  const [asignaciones, setAsignaciones] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [aulas, setAulas] = useState([]);
  const [secciones, setSecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [asignacionEditando, setAsignacionEditando] = useState(null);
  const [mostrarModalVerificacion, setMostrarModalVerificacion] =
    useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mensajeTipo, setMensajeTipo] = useState("");

  const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const HORAS = [
    "07:00",
    "07:50",
    "08:40",
    "09:30",
    "10:20",
    "11:10",
    "12:00",
    "12:50",
    "13:40",
    "14:30",
    "15:20",
    "16:10",
    "17:00",
    "17:50",
    "18:40",
    "19:30",
    "20:20",
  ];

  const [formEdit, setFormEdit] = useState({
    curso_id: "",
    seccion_id: "",
    estudiantes: "",
    docente_id: "",
    observaciones: "",
    dia_1: "",
    hora_inicio_1: "",
    aula_id: "",
    dia_2: "",
    hora_inicio_2: "",
    aula_id_2: "",
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
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

  const agruparPorCursoSeccion = (asignaciones) => {
    const grupos = {};

    asignaciones.forEach((asig) => {
      const key = `${asig.curso_id}-${asig.seccion_id}-${asig.docente_id}`;
      if (!grupos[key]) {
        grupos[key] = {
          ...asig,
          bloques: [],
        };
      }
      grupos[key].bloques.push({
        tipo: asig.tipo,
        dia: asig.dia,
        hora_inicio: asig.hora_inicio,
        hora_fin: asig.hora_fin,
        aula_id: asig.aula_id,
      });
    });

    return Object.values(grupos);
  };

  const abrirModalEditar = (asignacion) => {
    const teorico = asignacion.bloques.find((b) => b.tipo === "TEORICO");
    const practico = asignacion.bloques.find((b) => b.tipo === "PRACTICO");

    setAsignacionEditando(asignacion.asignacion_id);
    setFormEdit({
      curso_id: asignacion.curso_id,
      seccion_id: asignacion.seccion_id,
      estudiantes: asignacion.cantidad_estudiantes,
      docente_id: asignacion.docente_id,
      observaciones: asignacion.observaciones
        ? asignacion.observaciones.replace(/ \(TEORICO\)| \(PRACTICO\)/g, "")
        : "",
      dia_1: teorico?.dia || "",
      hora_inicio_1: teorico?.hora_inicio || "",
      aula_id: teorico?.aula_id || "",
      dia_2: practico?.dia || "",
      hora_inicio_2: practico?.hora_inicio || "",
      aula_id_2: practico?.aula_id || "",
    });
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setAsignacionEditando(null);
    setFormEdit({
      curso_id: "",
      seccion_id: "",
      estudiantes: "",
      docente_id: "",
      observaciones: "",
      dia_1: "",
      hora_inicio_1: "",
      aula_id: "",
      dia_2: "",
      hora_inicio_2: "",
      aula_id_2: "",
    });
  };

  const handleChangeEdit = (e) => {
    const { name, value } = e.target;
    setFormEdit((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitEdit = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/editar-asignacion/${asignacionEditando}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formEdit),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al actualizar la asignación");
        setMensajeTipo("error");
        setMostrarModalVerificacion(true);
        return;
      }

      setMensaje("✅ Asignación actualizada correctamente");
      setMensajeTipo("success");
      setMostrarModalVerificacion(true);
      cerrarModal();
      cargarDatos();
    } catch (err) {
      console.error(err);
      setMensaje("Error de conexión con el servidor");
      setMensajeTipo("error");
      setMostrarModalVerificacion(true);
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

  const getAula = (aulaId) => {
    if (!aulaId) return "N/A";
    const aula = aulas.find((a) => a.aula_id === aulaId);
    return aula ? `${aula.nombre} - ${aula.pabellon}` : "N/A";
  };

  const getCursoSeleccionado = () => {
    return cursos.find((c) => c.curso_id === parseInt(formEdit.curso_id));
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Cargando asignaciones...</div>
      </div>
    );
  }

  const asignacionesAgrupadas = agruparPorCursoSeccion(asignaciones);

  return (
    <div className="asignaciones-wrapper">
      <div className="asignaciones-header">
        <h2 className="page-title-edit">📋 Listar y Editar Asignaciones</h2>
        <p className="page-subtitle">
          Administra las asignaciones del centro educativo
        </p>
      </div>

      {asignacionesAgrupadas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <p>No hay asignaciones registradas</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>CÓDIGO</th>
                <th>CURSO</th>
                <th>SECCIÓN</th>
                <th>DOCENTE</th>
                <th>ESTUDIANTES</th>
                <th>HORARIO TEÓRICO</th>
                <th>AULA TEÓRICA</th>
                <th>HORARIO PRÁCTICO</th>
                <th>AULA PRÁCTICA</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>

            <tbody>
              {asignacionesAgrupadas.map((asig) => {
                const teorico = asig.bloques.find((b) => b.tipo === "TEORICO");
                const practico = asig.bloques.find(
                  (b) => b.tipo === "PRACTICO"
                );

                return (
                  <tr key={asig.asignacion_id}>
                    <td>{asig.asignacion_id}</td>
                    <td>{getNombreCurso(asig.curso_id)}</td>
                    <td>{getSeccion(asig.seccion_id)}</td>
                    <td>{getNombreDocente(asig.docente_id)}</td>
                    <td className="text-center">{asig.cantidad_estudiantes}</td>
                    <td>
                      {teorico
                        ? `${teorico.dia} ${teorico.hora_inicio}-${teorico.hora_fin}`
                        : "N/A"}
                    </td>
                    <td>{teorico ? getAula(teorico.aula_id) : "N/A"}</td>
                    <td>
                      {practico
                        ? `${practico.dia} ${practico.hora_inicio}-${practico.hora_fin}`
                        : "N/A"}
                    </td>
                    <td>{practico ? getAula(practico.aula_id) : "N/A"}</td>
                    <td>
                      <span className="badge badge-success">ACTIVO</span>
                    </td>
                    <td className="actions-cell">
                      <button
                        onClick={() => abrirModalEditar(asig)}
                        className="btn-action btn-edit"
                        title="Editar"
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
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE EDICIÓN */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div
            className="modal-content modal-edit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-edit">
              <h3 className="modal-title-edit">✏️ Editar Asignación</h3>
              <button className="modal-close" onClick={cerrarModal}>
                ×
              </button>
            </div>

            <div className="modal-form">
              <div className="form-section-title">📝 Información General</div>

              <div className="form-row">
                <div className="form-field">
                  <label>Curso *</label>
                  <select
                    name="curso_id"
                    value={formEdit.curso_id}
                    onChange={handleChangeEdit}
                    required
                  >
                    <option value="">Seleccionar curso</option>
                    {cursos.map((c) => (
                      <option key={c.curso_id} value={c.curso_id}>
                        {c.nombre} ({c.codigo}) - T:{c.horas_teoricas} P:
                        {c.horas_practicas}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Sección *</label>
                  <select
                    name="seccion_id"
                    value={formEdit.seccion_id}
                    onChange={handleChangeEdit}
                    required
                  >
                    <option value="">Seleccionar sección</option>
                    {secciones.map((s) => (
                      <option key={s.seccion_id} value={s.seccion_id}>
                        {s.codigo} - {s.periodo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Número de Estudiantes *</label>
                  <input
                    type="number"
                    name="estudiantes"
                    value={formEdit.estudiantes}
                    onChange={handleChangeEdit}
                    required
                    min="1"
                    placeholder="Cantidad de estudiantes"
                  />
                </div>

                <div className="form-field">
                  <label>Docente *</label>
                  <select
                    name="docente_id"
                    value={formEdit.docente_id}
                    onChange={handleChangeEdit}
                    required
                  >
                    <option value="">Seleccionar docente</option>
                    {docentes.map((d) => (
                      <option key={d.docente_id} value={d.docente_id}>
                        {d.nombre_completo || `${d.nombres} ${d.apellidos}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label>Observaciones</label>
                <textarea
                  name="observaciones"
                  value={formEdit.observaciones}
                  onChange={handleChangeEdit}
                  rows="3"
                  placeholder="Notas adicionales (opcional)"
                />
              </div>

              {/* BLOQUE TEÓRICO */}
              {getCursoSeleccionado()?.horas_teoricas > 0 && (
                <>
                  <div className="form-section-title">
                    🕐 Horario Teórico (Requerido -{" "}
                    {getCursoSeleccionado()?.horas_teoricas}h)
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label>Día *</label>
                      <select
                        name="dia_1"
                        value={formEdit.dia_1}
                        onChange={handleChangeEdit}
                        required
                      >
                        <option value="">Seleccionar día</option>
                        {DIAS.map((dia) => (
                          <option key={dia} value={dia}>
                            {dia}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label>Hora Inicio *</label>
                      <select
                        name="hora_inicio_1"
                        value={formEdit.hora_inicio_1}
                        onChange={handleChangeEdit}
                        required
                      >
                        <option value="">Seleccionar hora</option>
                        {HORAS.map((hora) => (
                          <option key={hora} value={hora}>
                            {hora}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-field">
                    <label>Aula Teórica *</label>
                    <select
                      name="aula_id"
                      value={formEdit.aula_id}
                      onChange={handleChangeEdit}
                      required
                    >
                      <option value="">Seleccionar aula</option>
                      {aulas.map((a) => (
                        <option key={a.aula_id} value={a.aula_id}>
                          {a.nombre} - {a.pabellon} (Cap: {a.capacidad})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* BLOQUE PRÁCTICO */}
              {getCursoSeleccionado()?.horas_practicas > 0 && (
                <>
                  <div className="form-section-title">
                    🕑 Horario Práctico (Requerido -{" "}
                    {getCursoSeleccionado()?.horas_practicas}h)
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label>Día *</label>
                      <select
                        name="dia_2"
                        value={formEdit.dia_2}
                        onChange={handleChangeEdit}
                        required
                      >
                        <option value="">Seleccionar día</option>
                        {DIAS.map((dia) => (
                          <option key={dia} value={dia}>
                            {dia}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label>Hora Inicio *</label>
                      <select
                        name="hora_inicio_2"
                        value={formEdit.hora_inicio_2}
                        onChange={handleChangeEdit}
                        required
                      >
                        <option value="">Seleccionar hora</option>
                        {HORAS.map((hora) => (
                          <option key={hora} value={hora}>
                            {hora}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-field">
                    <label>Aula Práctica *</label>
                    <select
                      name="aula_id_2"
                      value={formEdit.aula_id_2}
                      onChange={handleChangeEdit}
                      required
                    >
                      <option value="">Seleccionar aula</option>
                      {aulas.map((a) => (
                        <option key={a.aula_id} value={a.aula_id}>
                          {a.nombre} - {a.pabellon} (Cap: {a.capacidad})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button onClick={handleSubmitEdit} className="btn-primary">
                  💾 Guardar Cambios
                </button>
              </div>
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
