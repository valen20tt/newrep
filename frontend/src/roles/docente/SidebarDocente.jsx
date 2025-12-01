import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import './styles/sidebar-docente.css';

function SidebarDocente({ usuario, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [colapsado, setColapsado] = useState(false);

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

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
      <div className={`sidebar-docente ${colapsado ? "collapsed" : ""}`}>
        {/* Botón de colapsar */}
        <button
          className="collapse-btn"
          onClick={() => setColapsado(!colapsado)}
          title={colapsado ? "Expandir menú" : "Colapsar menú"}
        >
          {colapsado ? <ChevronRight /> : <ChevronLeft />}
        </button>

        <div className="sidebar-header">
          <h2>👨‍🏫 Panel Docente</h2>
          <div className="user-info">
            <p className="user-name">{usuario.nombre || 'Docente'}</p>
            <p className="user-id">ID: {usuario.usuario_id}</p>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <Link 
            to="/docente/perfil" 
            className={`nav-link ${isActive('/docente/perfil')}`}
          >
            <span className="icon">👤</span>
            <span className="text">Mi Perfil</span>
          </Link>

          <Link 
            to="/docente/registrar-nota" 
            className={`nav-link ${isActive('/docente/registrar-nota')}`}
          >
            <span className="icon">📝</span>
            <span className="text">Registrar Calificación</span>
          </Link>

          <Link 
            to="/docente/subir-material" 
            className={`nav-link ${isActive('/docente/subir-material')}`}
          >
            <span className="icon">📂</span>
            <span className="text">Subir Material</span>
          </Link>

          <Link 
            to="/docente/calendario" 
            className={`nav-link ${isActive('/docente/calendario')}`}
          >
            <span className="icon">📆</span>
            <span className="text">Mi Calendario</span>
          </Link>

          <Link 
            to="/docente/asistencia" 
            className={`nav-link ${isActive('/docente/asistencia')}`}
          >
            <span className="icon">📋</span>
            <span className="text">Tomar Asistencia</span>
          </Link>

          <Link 
            to="/docente/reportes" 
            className={`nav-link ${isActive('/docente/reportes')}`}
          >
            <span className="icon">📊</span>
            <span className="text">Reportes</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogoutClick} className="docente-logout-button">
            <span className="icon"><LogOut size={20} /></span>
            <span className="text">Cerrar Sesión</span>
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

export default SidebarDocente;