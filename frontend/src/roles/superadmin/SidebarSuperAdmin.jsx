import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  UserCog,
  PlusCircle,
  FileText,
  ListChecks,
  CalendarClock,
  Home,
  LogOut,
  AlertTriangle,
  Crown,
} from "lucide-react";
import "./styles/sidebar-superadmin.css";

function SidebarSuperAdmin({ usuario, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [colapsado, setColapsado] = useState(false);

  const toggleSection = (section) => {
    const sectionToToggle = openSection === section ? null : section;
    setOpenSection(sectionToToggle);
  };

  const isSectionOpen = (section) => openSection === section;

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
      <div className={`sidebar-superadmin ${colapsado ? "collapsed" : ""}`}>
        {/* Botón de colapsar */}
        <button
          className="collapse-btn-super"
          onClick={() => setColapsado(!colapsado)}
          title={colapsado ? "Expandir menú" : "Colapsar menú"}
        >
          {colapsado ? <ChevronRight /> : <ChevronLeft />}
        </button>

        {/* Header */}
        <div className="sidebar-header-super">
          <h2 className="sidebar-title-super">
            <Crown className="crown-icon" />
            <span className="title-text">SuperAdmin Panel</span>
          </h2>
          <div className="user-info-super">
            <p className="user-name-super">{usuario?.nombres || 'SuperAdmin'}</p>
            <p className="user-id-super">ID: {usuario?.usuario_id || 1}</p>
          </div>
        </div>

        <nav className="sidebar-nav-super">
          {/* Crear Administradores */}
          <Link 
            to="/superadmin/crear-admin" 
            className={`nav-item-super ${isActive('/superadmin/crear-admin')}`}
          >
            <span className="emoji-icon-super">➕</span>
            <span className="nav-text-super">Crear Administradores</span>
          </Link>

          {/* 🔹 Sección: Gestión de Usuarios */}
          <div className="section-super">
            <button
              className={`section-toggle-super ${isSectionOpen("usuarios") ? "open" : ""}`}
              onClick={() => toggleSection("usuarios")}
            >
              <span className="emoji-icon-super">👥</span>
              <span className="nav-text-super">Gestión de Usuarios</span>
              <span className="chevron-super">
                {isSectionOpen("usuarios") ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
            </button>
            {isSectionOpen("usuarios") && (
              <div className="submenu-super">
                <Link 
                  to="/superadmin/gestion-admins" 
                  className={`submenu-item-super ${isActive('/superadmin/gestion-admins')}`}
                >
                  <span className="submenu-icon-super">👨‍💼</span>
                  <span className="submenu-text-super">Modificar Administrador</span>
                </Link>
              </div>
            )}
          </div>

          {/* 🔹 Sección: Gestión de Cursos */}
          <div className="section-super">
            <button
              className={`section-toggle-super ${isSectionOpen("cursos") ? "open" : ""}`}
              onClick={() => toggleSection("cursos")}
            >
              <span className="emoji-icon-super">📚</span>
              <span className="nav-text-super">Gestión de Cursos</span>
              <span className="chevron-super">
                {isSectionOpen("cursos") ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
            </button>

            {isSectionOpen("cursos") && (
              <div className="submenu-super">
                <Link 
                  to="/superadmin/crear-curso" 
                  className={`submenu-item-super ${isActive('/superadmin/crear-curso')}`}
                >
                  <span className="submenu-icon-super">📝</span>
                  <span className="submenu-text-super">Registrar Curso</span>
                </Link>
                <Link 
                  to="/superadmin/actualizar-curso" 
                  className={`submenu-item-super ${isActive('/superadmin/actualizar-curso')}`}
                >
                  <span className="submenu-icon-super">🔄</span>
                  <span className="submenu-text-super">Actualizar Curso</span>
                </Link>
                <Link 
                  to="/superadmin/eliminar-curso" 
                  className={`submenu-item-super ${isActive('/superadmin/eliminar-curso')}`}
                >
                  <span className="submenu-icon-super">❌</span>
                  <span className="submenu-text-super">Eliminar Curso</span>
                </Link>
                <Link 
                  to="/superadmin/consultar-cursos" 
                  className={`submenu-item-super ${isActive('/superadmin/consultar-cursos')}`}
                >
                  <span className="submenu-icon-super">🔍</span>
                  <span className="submenu-text-super">Consultar Curso</span>
                </Link>
              </div>
            )}
          </div>

          {/* 🔹 Sección: Gestión de Horarios */}
          <div className="section-super">
            <button
              className={`section-toggle-super ${isSectionOpen("horarios") ? "open" : ""}`}
              onClick={() => toggleSection("horarios")}
            >
              <span className="emoji-icon-super">🕐</span>
              <span className="nav-text-super">Gestión de Horarios</span>
              <span className="chevron-super">
                {isSectionOpen("horarios") ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
            </button>

            {isSectionOpen("horarios") && (
              <div className="submenu-super">
                <Link 
                  to="/superadmin/registrar-horario" 
                  className={`submenu-item-super ${isActive('/superadmin/registrar-horario')}`}
                >
                  <span className="submenu-icon-super">📝</span>
                  <span className="submenu-text-super">Registrar Horario</span>
                </Link>
                <Link 
                  to="/superadmin/listar-horario" 
                  className={`submenu-item-super ${isActive('/superadmin/listar-horario')}`}
                >
                  <span className="submenu-icon-super">📋</span>
                  <span className="submenu-text-super">Listar Horarios</span>
                </Link>
                <Link 
                  to="/superadmin/editar-horario" 
                  className={`submenu-item-super ${isActive('/superadmin/editar-horario')}`}
                >
                  <span className="submenu-icon-super">✏️</span>
                  <span className="submenu-text-super">Editar Horario</span>
                </Link>
                <Link 
                  to="/superadmin/eliminar-horario" 
                  className={`submenu-item-super ${isActive('/superadmin/eliminar-horario')}`}
                >
                  <span className="submenu-icon-super">🗑️</span>
                  <span className="submenu-text-super">Eliminar Horario</span>
                </Link>
              </div>
            )}
          </div>

          {/* Gestión de Aulas */}
          <Link
            to="/superadmin/Gestion-Aulas"
            className={`nav-item-super ${isActive('/superadmin/Gestion-Aulas')}`}
          >
            <span className="emoji-icon-super">🏛️</span>
            <span className="nav-text-super">Gestión de Aulas</span>
          </Link>

          {/* Gestión de Prerrequisitos */}
          <Link
            to="/superadmin/listar-prerrequisitos"
            className={`nav-item-super ${isActive('/superadmin/listar-prerrequisitos')}`}
          >
            <span className="emoji-icon-super">✅</span>
            <span className="nav-text-super">Gestión de Prerrequisitos</span>
          </Link>

          {/* Gestión de Secciones */}
          <Link
            to="/superadmin/gestionar-secciones"
            className={`nav-item-super ${isActive('/superadmin/gestionar-secciones')}`}
          >
            <span className="emoji-icon-super">📑</span>
            <span className="nav-text-super">Gestión de Secciones</span>
          </Link>
        </nav>

        {/* Footer con botón de cerrar sesión */}
        <div className="sidebar-footer-super">
          <button onClick={handleLogoutClick} className="superadmin-logout-button">
            <LogOut className="nav-icon-super" />
            <span className="nav-text-super">Cerrar Sesión</span>
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

export default SidebarSuperAdmin;