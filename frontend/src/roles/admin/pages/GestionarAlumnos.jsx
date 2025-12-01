import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/gestionar-alumno.css";

function GestionarAlumno() {
  const navigate = useNavigate();
  const [estudiantes, setEstudiantes] = useState([]);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("todos"); // 'todos', 'activos', 'inactivos'
  const [mostrarModalReactivar, setMostrarModalReactivar] = useState(false);
  const [formData, setFormData] = useState({
    nombres: "",
    apellido_paterno: "",
    apellido_materno: "",
    dni: "",
    telefono: "",
    codigo_universitario: "",
    correo_institucional: "",
    correo_personal: "",
    ciclo_actual: "",
  });

  useEffect(() => {
    cargarEstudiantes();
  }, []);

  const cargarEstudiantes = async () => {
    try {
      const response = await fetch("http://localhost:5000/admin/alumnos/alumnos");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log("Datos recibidos:", data);
      setEstudiantes(data.alumnos);
      setCargando(false);
    } catch (error) {
      console.error("Error:", error);
      setCargando(false);
    }
  };

  const handleSeleccionarEstudiante = async (estudiante) => {
    try {
      const response = await fetch(
        `http://localhost:5000/admin/alumnos/alumnos/${estudiante.estudiante_id}`
      );
      const data = await response.json();

      if (response.ok) {
        const apellido_paterno = data.apellidos.split(" ")[0] || "";
        const apellido_materno = data.apellidos.split(" ").slice(1).join(" ") || "";

        setEstudianteSeleccionado({...data, estado: estudiante.estado});
        setFormData({
          nombres: data.nombres || "",
          apellido_paterno: apellido_paterno,
          apellido_materno: apellido_materno,
          dni: data.dni || "",
          telefono: data.telefono || "",
          codigo_universitario: data.codigo_universitario || "",
          correo_institucional: data.correo_institucional || "",
          correo_personal: "",
          ciclo_actual: data.ciclo_actual || "",
          escuela_id: data.escuela_id || 1,
        });
        setModoEdicion(false);
        setMensaje("");
        setError("");
      } else {
        setError(data.error || "Error al cargar detalles del estudiante");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Error de conexión con el servidor");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const validarCorreoInstitucional = (correo) => {
    return correo.endsWith("@alumnounfv.edu.pe");
  };

  const handleEditar = () => {
    // No permitir editar estudiantes inactivos
    if (estudianteSeleccionado.estado === 'INACTIVO') {
      setError("No puedes editar un estudiante inactivo. Primero debes reactivarlo.");
      return;
    }
    setModoEdicion(true);
    setMensaje("");
    setError("");
  };

  const handleCancelar = () => {
    setModoEdicion(false);
    if (estudianteSeleccionado) {
      const apellidos = estudianteSeleccionado.apellidos.split(" ");
      setFormData({
        nombres: estudianteSeleccionado.nombres,
        apellido_paterno: apellidos[0] || "",
        apellido_materno: apellidos.slice(1).join(" ") || "",
        dni: estudianteSeleccionado.dni,
        telefono: estudianteSeleccionado.telefono,
        codigo_universitario: estudianteSeleccionado.codigo_universitario,
        correo_institucional: estudianteSeleccionado.correo_institucional,
        correo_personal: "",
        ciclo_actual: estudianteSeleccionado.ciclo_actual || "",
      });
    }
    setMensaje("");
    setError("");
  };

  const handleEliminar = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/admin/alumnos/alumnos/${estudianteSeleccionado.estudiante_id}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (response.ok) {
        setMensaje("✅ Estudiante desactivado correctamente. Ya no podrá acceder al sistema.");
        setMostrarModalEliminar(false);
        setEstudianteSeleccionado(null);
        setFormData({
          nombres: "",
          apellido_paterno: "",
          apellido_materno: "",
          dni: "",
          telefono: "",
          codigo_universitario: "",
          correo_institucional: "",
          correo_personal: "",
        });
        await cargarEstudiantes();
      } else {
        setError(data.error || "Error al eliminar estudiante");
        setMostrarModalEliminar(false);
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Error de conexión con el servidor");
      setMostrarModalEliminar(false);
    }
  };

  const handleReactivar = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/admin/alumnos/alumnos/${estudianteSeleccionado.estudiante_id}/reactivar`,
        { method: "PATCH" }
      );

      const data = await response.json();

      if (response.ok) {
        setMensaje("✅ Estudiante reactivado correctamente. Ahora puede acceder al sistema.");
        setMostrarModalReactivar(false);
        await cargarEstudiantes();
        // Actualizar el estado local del estudiante seleccionado
        setEstudianteSeleccionado({...estudianteSeleccionado, estado: 'ACTIVO'});
      } else {
        setError(data.error || "Error al reactivar estudiante");
        setMostrarModalReactivar(false);
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Error de conexión con el servidor");
      setMostrarModalReactivar(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setError("");

    if (!validarCorreoInstitucional(formData.correo_institucional)) {
      setError("El correo institucional debe pertenecer al dominio @alumnounfv.edu.pe");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `http://localhost:5000/admin/alumnos/alumnos/${estudianteSeleccionado.estudiante_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            ciclo_actual: formData.ciclo_actual || "",
            escuela_id: formData.escuela_id || 1,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMensaje("Estudiante actualizado correctamente ✅");
        setModoEdicion(false);
        await cargarEstudiantes();
        setTimeout(() => {
          handleSeleccionarEstudiante({
            estudiante_id: estudianteSeleccionado.estudiante_id,
          });
        }, 500);
      } else {
        setError(data.error || "Error al actualizar estudiante");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Error de conexión con el servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔄 FILTRADO mejorado con estado
  const estudiantesFiltrados = estudiantes.filter((est) => {
    const searchTerm = busqueda.toLowerCase();
    const cumpleBusqueda = 
      est.nombres.toLowerCase().includes(searchTerm) ||
      est.apellidos.toLowerCase().includes(searchTerm) ||
      est.codigo_universitario.toLowerCase().includes(searchTerm) ||
      est.dni.includes(searchTerm);

    // Filtro por estado
    if (filtroEstado === "activos") {
      return cumpleBusqueda && est.estado === "ACTIVO";
    } else if (filtroEstado === "inactivos") {
      return cumpleBusqueda && est.estado === "INACTIVO";
    }
    
    return cumpleBusqueda; // "todos"
  });

  if (cargando) {
    return (
      <div className="gestionar-alumno-container">
        <div className="loading">Cargando estudiantes...</div>
      </div>
    );
  }

  return (
    <div className="gestionar-alumno-container">
      <div className="gestionar-alumno-content">
        <h2>📋 Gestionar Estudiantes</h2>
        <p className="escuela-info">Escuela Profesional de Ingeniería de Sistemas</p>

        <div className="layout-dos-columnas">
          {/* COLUMNA IZQUIERDA */}
          <div className="columna-lista">
            <div className="busqueda-container">
              <input
                type="text"
                placeholder="🔍 Buscar por nombre, apellido, código o DNI..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="input-busqueda"
                autoComplete="off"
              />
            </div>

            {/* 🆕 FILTROS POR ESTADO */}
            <div className="filtros-estado">
              <button 
                className={`filtro-btn ${filtroEstado === 'todos' ? 'activo' : ''}`}
                onClick={() => setFiltroEstado('todos')}
              >
                Todos ({estudiantes.length})
              </button>
              <button 
                className={`filtro-btn ${filtroEstado === 'activos' ? 'activo' : ''}`}
                onClick={() => setFiltroEstado('activos')}
              >
                ✅ Activos ({estudiantes.filter(e => e.estado === 'ACTIVO').length})
              </button>
              <button 
                className={`filtro-btn ${filtroEstado === 'inactivos' ? 'activo' : ''}`}
                onClick={() => setFiltroEstado('inactivos')}
              >
                ❌ Inactivos ({estudiantes.filter(e => e.estado === 'INACTIVO').length})
              </button>
            </div>

            <div className="lista-estudiantes">
              {estudiantesFiltrados.length === 0 ? (
                <p className="no-resultados">No se encontraron estudiantes</p>
              ) : (
                estudiantesFiltrados.map((estudiante) => (
                  <div
                    key={estudiante.estudiante_id}
                    className={`estudiante-item ${
                      estudianteSeleccionado?.estudiante_id === estudiante.estudiante_id
                        ? "seleccionado"
                        : ""
                    } ${estudiante.estado === 'INACTIVO' ? 'inactivo' : ''}`}
                    onClick={() => handleSeleccionarEstudiante(estudiante)}
                  >
                    <div className="estudiante-info">
                      <div className="estudiante-header">
                        <strong>
                          {estudiante.apellidos}, {estudiante.nombres}
                        </strong>
                        <span className={`badge-estado ${estudiante.estado === 'ACTIVO' ? 'activo' : 'inactivo'}`}>
                          {estudiante.estado === 'ACTIVO' ? '✓ Activo' : '✗ Inactivo'}
                        </span>
                      </div>
                      <small>Código: {estudiante.codigo_universitario}</small>
                      <small>DNI: {estudiante.dni}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="columna-formulario">
            {!estudianteSeleccionado ? (
              <div className="placeholder">
                <p>👈 Selecciona un estudiante de la lista para ver sus detalles</p>
              </div>
            ) : (
              <div className="formulario-edicion">
                <div className="header-formulario">
                  <h3>Detalles del Estudiante</h3>
                  {!modoEdicion && (
                    <div className="botones-accion">
                      {estudianteSeleccionado.estado === 'INACTIVO' ? (
                        <button 
                          onClick={() => setMostrarModalReactivar(true)}
                          className="btn-reactivar"
                        >
                          ✅ Reactivar
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={handleEditar} 
                            className="btn-editar"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => setMostrarModalEliminar(true)}
                            className="btn-eliminar"
                          >
                            🗑️ Desactivar
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 🆕 ALERTA DE ESTADO INACTIVO */}
                {estudianteSeleccionado.estado === 'INACTIVO' && (
                  <div className="alert-warning">
                    ⚠️ Este estudiante está <strong>INACTIVO</strong> y no puede acceder al sistema.
                  </div>
                )}

                {mensaje && <div className="alert-success">{mensaje}</div>}
                {error && <div className="alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Nombres *</label>
                    <input
                      type="text"
                      name="nombres"
                      value={formData.nombres}
                      onChange={handleChange}
                      disabled={!modoEdicion || isSubmitting}
                      required
                      autoComplete="given-name"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Apellido Paterno *</label>
                      <input
                        type="text"
                        name="apellido_paterno"
                        value={formData.apellido_paterno}
                        onChange={handleChange}
                        disabled={!modoEdicion || isSubmitting}
                        required
                        autoComplete="family-name"
                      />
                    </div>

                    <div className="form-group">
                      <label>Apellido Materno *</label>
                      <input
                        type="text"
                        name="apellido_materno"
                        value={formData.apellido_materno}
                        onChange={handleChange}
                        disabled={!modoEdicion || isSubmitting}
                        required
                        autoComplete="family-name"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>DNI *</label>
                      <input
                        type="text"
                        name="dni"
                        value={formData.dni}
                        onChange={handleChange}
                        maxLength="8"
                        pattern="[0-9]{8}"
                        disabled={!modoEdicion || isSubmitting}
                        required
                        autoComplete="off"
                      />
                    </div>

                    <div className="form-group">
                      <label>Código Universitario *</label>
                      <input
                        type="text"
                        name="codigo_universitario"
                        value={formData.codigo_universitario}
                        onChange={handleChange}
                        maxLength="10"
                        disabled={!modoEdicion || isSubmitting}
                        required
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Correo Institucional *</label>
                    <input
                      type="email"
                      name="correo_institucional"
                      value={formData.correo_institucional}
                      onChange={handleChange}
                      disabled={!modoEdicion || isSubmitting}
                      required
                      autoComplete="email"
                    />
                    {modoEdicion &&
                      formData.correo_institucional &&
                      !validarCorreoInstitucional(formData.correo_institucional) && (
                        <small className="error-hint">
                          ⚠️ El correo debe terminar en @alumnounfv.edu.pe
                        </small>
                      )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Ciclo actual</label>
                    <input
                      type="text"
                      className="form-control"
                      name="ciclo_actual"
                      value={formData.ciclo_actual}
                      onChange={(e) =>
                        setFormData({ ...formData, ciclo_actual: e.target.value })
                      }
                      placeholder="Ejemplo: VIII"
                      autoComplete="off"
                      disabled={!modoEdicion || isSubmitting}
                    />
                  </div>

                  <div className="form-group">
                    <label>Nro. Telefónico *</label>
                    <input
                      type="text"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleChange}
                      maxLength="9"
                      pattern="[0-9]{9}"
                      disabled={!modoEdicion || isSubmitting}
                      required
                      autoComplete="tel"
                    />
                  </div>

                  <div className="form-group">
                    <label>Escuela</label>
                    <input
                      type="text"
                      value="Ingeniería de Sistemas"
                      disabled
                      className="input-disabled"
                    />
                    <small className="info-text">
                      * El estudiante está asociado exclusivamente a Ingeniería de Sistemas
                    </small>
                  </div>

                  {modoEdicion && (
                    <div className="form-actions">
                      <button
                        type="button"
                        onClick={handleCancelar}
                        className="btn-cancelar"
                        disabled={isSubmitting}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="btn-actualizar"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Actualizando..." : "Actualizar"}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {mostrarModalEliminar && (
        <div
          className="modal-overlay"
          onClick={() => setMostrarModalEliminar(false)}
        >
          <div className="modal-confirmar" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Confirmar Desactivación</h3>
            <p>
              ¿Estás seguro de que deseas <strong>desactivar</strong> al estudiante{" "}
              <strong>
                {formData.nombres} {formData.apellido_paterno}{" "}
                {formData.apellido_materno}
              </strong>
              ?
            </p>
            <p className="advertencia">
              🔒 El estudiante no podrá acceder al sistema hasta que lo reactives.
            </p>
            <div className="modal-botones">
              <button
                onClick={() => setMostrarModalEliminar(false)}
                className="btn-modal-cancelar"
              >
                Cancelar
              </button>
              <button onClick={handleEliminar} className="btn-confirmar-eliminar">
                Sí, Desactivar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarModalReactivar && (
        <div
          className="modal-overlay"
          onClick={() => setMostrarModalReactivar(false)}
        >
          <div className="modal-confirmar" onClick={(e) => e.stopPropagation()}>
            <h3>✅ Confirmar Reactivación</h3>
            <p>
              ¿Estás seguro de que deseas <strong>reactivar</strong> al estudiante{" "}
              <strong>
                {formData.nombres} {formData.apellido_paterno}{" "}
                {formData.apellido_materno}
              </strong>
              ?
            </p>
            <p className="advertencia-success">
              🔓 El estudiante podrá volver a acceder al sistema.
            </p>
            <div className="modal-botones">
              <button
                onClick={() => setMostrarModalReactivar(false)}
                className="btn-modal-cancelar"
              >
                Cancelar
              </button>
              <button onClick={handleReactivar} className="btn-confirmar-reactivar">
                Sí, Reactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionarAlumno;