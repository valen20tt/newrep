import React, { useState, useEffect } from "react";
import axios from "axios";
import { Search, Plus, Edit, Trash2, Layers } from "lucide-react";
import ModalConfirmacion from "./Modalconfirmacion.jsx";
import { toast } from "react-toastify";
import ModalSeccion from "./ModalSeccion.jsx";
import "../styles/gestion-secciones.css";
const BASE_URL = "http://localhost:5000/superadmin/secciones";

const SECCION_INICIAL = {
  codigo: "",
  ciclo_academico: "",
  periodo: "",
  estado: "ACTIVO",
};

function GestionSecciones() {
  const [secciones, setSecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seccionSeleccionada, setSeccionSeleccionada] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filtroActual, setFiltroActual] = useState("código");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [seccionAEliminar, setSeccionAEliminar] = useState(null);
  const [detalleAfectaciones, setDetalleAfectaciones] = useState([]); // NUEVO

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  const cargarSecciones = async () => {
    setLoading(true);
    try {
      const res = await axios.get(BASE_URL);
      setSecciones(res.data);
    } catch (err) {
      toast.error("Error al cargar las secciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSecciones();
  }, []);

  // === MODIFICADO: Verificar afectaciones antes de mostrar modal ===
  const solicitarEliminacion = async (id) => {
    try {
      // Intento eliminar sin force=true para obtener las afectaciones
      const res = await axios.delete(`${BASE_URL}/${id}`);

      // Si llega aquí, no había afectaciones, eliminar directamente
      toast.success("🗑️ Sección eliminada exitosamente.");
      cargarSecciones();
    } catch (err) {
      if (
        err.response?.status === 409 &&
        err.response?.data?.requiere_confirmacion
      ) {
        // Hay asignaciones vinculadas, mostrar modal con detalles
        setSeccionAEliminar(id);
        setDetalleAfectaciones(err.response.data.detalle || []);
        setMostrarConfirmacion(true);
      } else if (err.response?.status === 404) {
        toast.error("La sección no existe.");
      } else {
        toast.error("Error al eliminar la sección.");
      }
    }
  };

  // === MODIFICADO: Eliminar con force=true ===
  const eliminarSeccionConFuerza = async () => {
    try {
      await axios.delete(`${BASE_URL}/${seccionAEliminar}?force=true`);
      toast.success("🗑️ Sección y asignaciones eliminadas exitosamente.");
      setMostrarConfirmacion(false);
      setSeccionAEliminar(null);
      setDetalleAfectaciones([]);
      cargarSecciones();
    } catch (err) {
      toast.error("Error al eliminar la sección.");
    }
  };

  const handleOpenModal = (seccion = null) => {
    setSeccionSeleccionada(seccion);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSeccionSeleccionada(null);
  };

  const handleSaveSeccion = async (formData) => {
    try {
      if (formData.seccion_id) {
        await axios.put(`${BASE_URL}/${formData.seccion_id}`, formData);
        toast.success("✅ Sección modificada exitosamente.");
      } else {
        await axios.post(BASE_URL, formData);
        toast.success("✅ Sección creada exitosamente.");
      }
      handleCloseModal();
      cargarSecciones();
    } catch (err) {
      const error = err.response?.data?.error || "Error al guardar la sección.";
      toast.error(error);
    }
  };

  const getEstadoClass = (estado) => {
    if (estado === "ACTIVO") return "status-tag status-disponible";
    if (estado === "INACTIVO") return "status-tag status-mantenimiento";
    return "status-tag";
  };

  const seccionesFiltradas = secciones.filter((sec) => {
    const valor = debouncedSearchTerm.toLowerCase();

    switch (filtroActual) {
      case "código":
        return sec.codigo?.toLowerCase().includes(valor);
      case "ciclo":
        return sec.ciclo_academico?.toLowerCase().includes(valor);
      case "periodo":
        return sec.periodo?.toLowerCase().includes(valor);
      case "estado":
        return sec.estado?.toLowerCase().includes(valor);
      default:
        return true;
    }
  });

  if (loading)
    return (
      <div className="loading-state">Cargando gestión de secciones...</div>
    );

  return (
    <div className="gestion-secciones-container">
      <div className="header-container">
        <h1 className="main-title">
          <Layers size={30} style={{ marginRight: "10px" }} /> Gestión de
          Secciones
        </h1>
        <p className="subtitle">Administra las secciones por ciclo y periodo</p>
      </div>

      <div className="search-bar-actions">
        <div className="search-input-group">
          <Search size={18} />
          <input
            type="text"
            placeholder={`Buscar por ${filtroActual}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={20} /> Nueva Sección
        </button>
      </div>

      <div className="secciones-table-container">
        {seccionesFiltradas.length > 0 ? (
          <table className="secciones-table">
            <thead>
              <tr>
                <th>Secciones</th>
                <th>Ciclo</th>
                <th>Periodo</th>
                <th>Estado</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {seccionesFiltradas.map((sec) => (
                <tr key={sec.seccion_id}>
                  <td>{sec.codigo}</td>
                  <td>{sec.ciclo_academico}</td>
                  <td>{sec.periodo}</td>
                  <td>
                    <span className={getEstadoClass(sec.estado)}>
                      {sec.estado}
                    </span>
                  </td>
                  <td className="action-buttons">
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => handleOpenModal(sec)}
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      className="btn-icon btn-delete"
                      onClick={() => solicitarEliminacion(sec.seccion_id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="info-message">
            {searchTerm
              ? "No se encontraron secciones."
              : "No hay secciones registradas."}
          </div>
        )}
      </div>

      <ModalSeccion
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveSeccion}
        seccionData={seccionSeleccionada}
        initialState={SECCION_INICIAL}
      />

      {/* === MODAL DE CONFIRMACIÓN CON DETALLES === */}
      <ModalConfirmacion
        isOpen={mostrarConfirmacion}
        onClose={() => {
          setMostrarConfirmacion(false);
          setDetalleAfectaciones([]);
        }}
        onConfirm={eliminarSeccionConFuerza}
        detalleAfectaciones={detalleAfectaciones}
      />
    </div>
  );
}

export default GestionSecciones;
