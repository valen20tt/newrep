import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import "../styles/modal-confirmacion.css";
function ModalConfirmacion({
  isOpen,
  onClose,
  onConfirm,
  detalleAfectaciones,
}) {
  if (!isOpen) return null;

  const hayAsignaciones = detalleAfectaciones && detalleAfectaciones.length > 0;

  // Función para obtener la clase CSS del badge según el tipo
  const getBadgeClass = (tipo) => {
    const tipoLower = tipo?.toLowerCase() || "";

    if (tipoLower.includes("asignación")) return "badge-asignacion";
    if (tipoLower.includes("matrícula")) return "badge-matricula";
    if (tipoLower.includes("sesión")) return "badge-sesion";
    if (tipoLower.includes("materiales")) return "badge-materiales";
    if (tipoLower.includes("asistencias")) return "badge-asistencias";

    return "badge-registro";
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-confirmacion-amplio">
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-header-warning">
          <AlertTriangle size={48} color="#f59e0b" />
          <h2>¿Confirmar eliminación?</h2>
        </div>

        {hayAsignaciones ? (
          <>
            <div className="modal-warning-message">
              <p>
                Esta sección tiene{" "}
                <strong>{detalleAfectaciones.length} registro(s)</strong>{" "}
                vinculado(s). Al eliminarla, también se eliminarán los
                siguientes datos:
              </p>
            </div>

            <div className="tabla-afectaciones">
              <table>
                <thead>
                  <tr>
                    <th>Tipo de Registro</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {detalleAfectaciones.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <span className={`badge ${getBadgeClass(item.tipo)}`}>
                          {item.tipo ||
                            (item.codigo_docente ? "Asignación" : "Registro")}
                        </span>
                      </td>
                      <td>
                        {item.descripcion ||
                          (item.codigo_docente && item.curso
                            ? `${item.curso} - ${item.codigo_docente}`
                            : "Sin información")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer-warning">
              <strong>
                ⚠️ Esta acción eliminará todos estos registros permanentemente
              </strong>
            </div>
          </>
        ) : (
          <div className="modal-warning-message">
            <p>
              ¿Estás seguro de que deseas eliminar esta sección?
              <br />
              <strong>Esta acción no se puede deshacer.</strong>
            </p>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>
            Cancelar
          </button>

          <button className="btn-delete" onClick={onConfirm}>
            <Trash2 size={18} />
            Sí, eliminar todo
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalConfirmacion;
