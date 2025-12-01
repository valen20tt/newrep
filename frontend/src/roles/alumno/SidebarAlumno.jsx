import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import "./styles/sidebar-alumno.css";

function SidebarAlumno({ usuario, onLogout }) {
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
      <div className={`sidebar-alumno ${colapsado ? "collapsed" : ""}`}>
        {/* Botón de colapsar */}
        <button
          className="collapse-btn"
          onClick={() => setColapsado(!colapsado)}
          title={colapsado ? "Expandir menú" : "Colapsar menú"}
        >
          {colapsado ? <ChevronRight /> : <ChevronLeft />}
        </button>

        <div className="sidebar-header">
          <h2>🎓 Panel Estudiante</h2>
          <div className="user-info">
            <p className="user-name">{usuario.nombres || 'Estudiante'}</p>
            <p className="user-id">Código: {usuario.usuario_id}</p>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <h3 className="sidebar-section">Académico</h3>
          
          <Link 
            to="/alumno/solicitar-matricula" 
            className={`nav-link ${isActive('/alumno/solicitar-matricula')}`}
          >
            <span className="icon">📝</span>
            <span className="text">Solicitar Matrícula</span>
          </Link>

          <Link 
            to="/alumno/mis-asignaciones" 
            className={`nav-link ${isActive('/alumno/mis-asignaciones')}`}
          >
            <span className="icon">📚</span>
            <span className="text">Mis Cursos</span>
          </Link>

          <Link 
            to="/alumno/mi-horario" 
            className={`nav-link ${isActive('/alumno/mi-horario')}`}
          >
            <span className="icon">📅</span>
            <span className="text">Mi Horario</span>
          </Link>

          <h3 className="sidebar-section">Evaluaciones</h3>

          <Link 
            to="/alumno/mis-calificaciones" 
            className={`nav-link ${isActive('/alumno/mis-calificaciones')}`}
          >
            <span className="icon">📊</span>
            <span className="text">Mis Calificaciones</span>
          </Link>

          <h3 className="sidebar-section">Recursos</h3>

          <Link 
            to="/alumno/material" 
            className={`nav-link ${isActive('/alumno/material')}`}
          >
            <span className="icon">📖</span>
            <span className="text">Material de Estudio</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogoutClick} className="alumno-logout-button">
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

export default SidebarAlumno;