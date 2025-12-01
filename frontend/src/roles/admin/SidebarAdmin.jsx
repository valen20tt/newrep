import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut, AlertTriangle } from "lucide-react";
import "./styles/sidebar-admin.css";

function SidebarAdmin({ usuario, onLogout }) {
  const [colapsado, setColapsado] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    onLogout();
    navigate("/");
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <>
      <div className={`sidebar-admin ${colapsado ? "collapsed" : ""}`}>
        {/* Botón de colapsar */}
        <button
          className="collapse-btn"
          onClick={() => setColapsado(!colapsado)}
          title={colapsado ? "Expandir menú" : "Colapsar menú"}
        >
          {colapsado ? <ChevronRight /> : <ChevronLeft />}
        </button>

        {/* Encabezado */}
        <div className="sidebar-header">
          <h2>PORTAL ADMINISTRADOR</h2>
          <p>Sistema Académico</p>
        </div>

        {/* Información del usuario */}
        <div className="user-info">
          <p className="user-id">Usuario ID: {usuario.usuario_id}</p>
          <p className="user-name">
            Admin ({usuario.nombres || "Administrador"})
          </p>
        </div>

        {/* Navegación */}
        <nav className="sidebar-nav">
          <h3 className="sidebar-section">Mi Cuenta</h3>
          <Link to="/admin/mi-perfil">
            <span className="nav-icon">👤</span>
            <span className="nav-text">Mi Perfil</span>
          </Link>

          <h3 className="sidebar-section">Gestión de Personal</h3>
          <Link to="/admin/crear-docente">
            <span className="nav-icon">🧑</span>
            <span className="nav-text">Crear Docente</span>
          </Link>
          <Link to="/admin/crear-estudiante">
            <span className="nav-icon">🎓</span>
            <span className="nav-text">Crear Estudiante</span>
          </Link>
          <Link to="/admin/gestion-docentes">
            <span className="nav-icon">✏️</span>
            <span className="nav-text">Modificar Datos Docente</span>
          </Link>
          <Link to="/admin/gestion-alumnos">
            <span className="nav-icon">📖</span>
            <span className="nav-text">Modificar Datos Estudiante</span>
          </Link>

          <h3 className="sidebar-section">Asignaciones</h3>

          <Link to="/admin/registrar-asignaciones">
            <span className="nav-icon">🆕</span>
            <span className="nav-text">Registrar Asignaciones</span>
          </Link>

          <Link to="/admin/listar-editar-asignaciones">
            <span className="nav-icon">📋</span>
            <span className="nav-text"> Listar y Editar Asignaciones</span>
          </Link>

          <Link to="/admin/eliminar-asignaciones">
            <span className="nav-icon">🗑️</span>
            <span className="nav-text">Eliminar Asignaciones</span>
          </Link>
        </nav>

        {/*  BOTÓN DE CERRAR SESIÓN */}
        {/* Footer */}
        <div className="sidebar-footer">
          <button onClick={handleLogoutClick} className="logout-link">
            <span className="nav-icon"><LogOut size={18} /></span>
            <span className="nav-text">Cerrar Sesión</span>
          </button>
        </div>
      </div>
      {/* 🔔 MODAL DE CONFIRMACIÓN DE CIERRE DE SESIÓN */}
      {showLogoutModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <div className="logout-modal-icon">
              <AlertTriangle size={48} color="#f59e0b" />
            </div>
            <h3 className="logout-modal-title">¿Estás seguro de cerrar sesión?</h3>
            <p className="logout-modal-message">
              Si tienes cambios sin guardar, se perderán al cerrar sesión.
            </p>
            <div className="logout-modal-buttons">
              <button onClick={cancelLogout} className="btn-cancel">
                Cancelar
              </button>
              <button onClick={confirmLogout} className="btn-confirm">
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SidebarAdmin;