import React, { useState, useEffect } from "react";
import "../styles/eliminar-horario.css";

const EliminarHorario = () => {
  const [horarios, setHorarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [selectedHorario, setSelectedHorario] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [detallesEliminacion, setDetallesEliminacion] = useState(null);
  const [additionalWarning, setAdditionalWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const API_URL_LISTAR = "http://localhost:5000/superadmin/bloques-horarios-listar";
  const API_URL_ELIMINAR = "http://localhost:5000/superadmin/bloques-horarios";

  useEffect(() => {
    const obtenerHorarios = async () => {
      try {
        const respuesta = await fetch(API_URL_LISTAR);
        if (!respuesta.ok) throw new Error("Error al obtener horarios");
        const data = await respuesta.json();
        setHorarios(data);
      } catch (error) {
        console.error("❌ Error al obtener horarios:", error);
        setMensaje("❌ Error al cargar los horarios");
      }
    };
    obtenerHorarios();
  }, []);

  const verificarEliminacion = async (horario) => {
    try {
      const responseAsignaciones = await fetch(
        `${API_URL_ELIMINAR}/${horario.bloque_id}/asignaciones`
      );

      let cantidadAsignaciones = 0;

      if (responseAsignaciones.ok) {
        const dataAsignaciones = await responseAsignaciones.json();
        cantidadAsignaciones = dataAsignaciones.cantidad || 0;
      }

      return { tieneDependencias: false, cantidadDependencias: cantidadAsignaciones };
    } catch (error) {
      console.error("Error en verificación:", error);
      setMensaje("⚠️ Error al verificar las condiciones del horario");
      return { tieneDependencias: false, cantidadDependencias: 0 };
    }
  };

  const handleEliminarClick = async (horario) => {
    setSelectedHorario(horario);
    setMensaje("");
    setAdditionalWarning("");

    const { cantidadDependencias } = await verificarEliminacion(horario);

    if (cantidadDependencias > 0) {
      setAdditionalWarning(
        `⚠️ Este bloque tiene ${cantidadDependencias} asignación(es) con sus respectivas matrículas, materiales, sesiones y asistencias que también serán eliminadas.`
      );
    }

    setShowConfirmModal(true);
  };

  const confirmarEliminacion = async () => {
    setLoading(true);

    try {
      const resp = await fetch(`${API_URL_ELIMINAR}/${selectedHorario.bloque_id}`, {
        method: "DELETE"
      });

      if (resp.ok) {
        const data = await resp.json();
        
        // Eliminar del estado local
        setHorarios(horarios.filter((h) => h.bloque_id !== selectedHorario.bloque_id));
        
        // Guardar detalles para mostrar en modal de éxito
        setDetallesEliminacion({
          codigo_bloque: data.codigo_bloque,
          ...data.detalles
        });
        
        setShowConfirmModal(false);
        setShowSuccessModal(true);
        setSelectedHorario(null);
        setAdditionalWarning("");
      } else {
        const error = await resp.json();
        setMensaje("❌ Error: " + (error.error || "Error al eliminar horario"));
        setShowConfirmModal(false);
      }
    } catch (error) {
      console.error("❌ Error al eliminar horario:", error);
      setMensaje("❌ Error de conexión con la API");
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  const horariosFiltrados = horarios.filter(
    (h) =>
      h.codigo_bloque.toLowerCase().includes(busqueda.toLowerCase()) ||
      h.dia.toLowerCase().includes(busqueda.toLowerCase()) ||
      h.estado.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="eliminar-horario">
      <div className="header-section">
        <h2>🗑️ Eliminar Horario</h2>
        <p className="subtitle">
          Gestiona la eliminación de horarios que ya no estén activos
        </p>
      </div>

      <div className="search-section">
        <input
          type="text"
          placeholder="🔍 Buscar por código, día o estado..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="search-input"
        />
      </div>

      {mensaje && <div className="mensaje-alert">{mensaje}</div>}

      <div className="horarios-grid">
        {horariosFiltrados.length === 0 ? (
          <div className="no-results">
            <p>🕒 No se encontraron horarios</p>
          </div>
        ) : (
          horariosFiltrados.map((h) => (
            <div key={h.bloque_id} className="horario-card">
              <div className="horario-header">
                <span className="horario-codigo">{h.codigo_bloque}</span>
                <span className="horario-dia">{h.dia}</span>
              </div>

              <h3 className="horario-tiempo">
                {h.hora_inicio} - {h.hora_fin}
              </h3>

              <div className="horario-info">
                <div className="info-item">
                  <strong>Estado:</strong> {h.estado}
                </div>
                <div className="info-item">
                  <strong>Turno:</strong>{" "}
                  {h.turno || (parseInt(h.hora_inicio.split(":")[0]) < 12 ? "Mañana" : "Tarde")}
                </div>
              </div>

              <button
                className="btn-eliminar"
                onClick={() => handleEliminarClick(h)}
              >
                🗑️ Eliminar Horario
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal de Confirmación */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => !loading && setShowConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ ¿Confirmar eliminación?</h3>

            <div className="modal-body">
              <p>Estás a punto de eliminar el siguiente horario:</p>
              <div className="horario-detail">
                <strong>{selectedHorario?.codigo_bloque}</strong> - {selectedHorario?.dia}
                <br />
                {selectedHorario?.hora_inicio} - {selectedHorario?.hora_fin}
              </div>
              
              {additionalWarning && (
                <div className="additional-warning">
                  {additionalWarning}
                </div>
              )}
              
              <p className="warning-text">
                ⚠️ Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedHorario(null);
                  setAdditionalWarning("");
                }}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className="btn-confirm"
                onClick={confirmarEliminacion}
                disabled={loading}
              >
                {loading ? "Eliminando..." : "Sí, Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Éxito */}
      {showSuccessModal && detallesEliminacion && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="modal-content modal-success" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon">✅</div>
            <h3 className="success-title">Eliminación Exitosa</h3>

            <div className="modal-body">
              <p>El bloque <strong>{detallesEliminacion.codigo_bloque}</strong> ha sido eliminado correctamente.</p>
              
              {(detallesEliminacion.asignaciones_eliminadas > 0 || 
                detallesEliminacion.sesiones_eliminadas > 0 ||
                detallesEliminacion.matriculas_eliminadas > 0 ||
                detallesEliminacion.materiales_eliminados > 0 ||
                detallesEliminacion.asistencias_eliminadas > 0) && (
                <div className="detalles-box">
                  <h4 className="detalles-title">📋 Detalle de eliminación:</h4>
                  <ul className="detalles-list">
                    {detallesEliminacion.asignaciones_eliminadas > 0 && (
                      <li>Asignaciones: <strong>{detallesEliminacion.asignaciones_eliminadas}</strong></li>
                    )}
                    {detallesEliminacion.sesiones_eliminadas > 0 && (
                      <li>Sesiones: <strong>{detallesEliminacion.sesiones_eliminadas}</strong></li>
                    )}
                    {detallesEliminacion.matriculas_eliminadas > 0 && (
                      <li>Matrículas: <strong>{detallesEliminacion.matriculas_eliminadas}</strong></li>
                    )}
                    {detallesEliminacion.materiales_eliminados > 0 && (
                      <li>Materiales: <strong>{detallesEliminacion.materiales_eliminados}</strong></li>
                    )}
                    {detallesEliminacion.asistencias_eliminadas > 0 && (
                      <li>Asistencias: <strong>{detallesEliminacion.asistencias_eliminadas}</strong></li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn-success"
                onClick={() => {
                  setShowSuccessModal(false);
                  setDetallesEliminacion(null);
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EliminarHorario;