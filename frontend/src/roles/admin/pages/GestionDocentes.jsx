// C:\Users\MATEO\Desktop\bla\newrep\frontend\src\components\GestionDocentes.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Asegúrate de que este path sea correcto para tu nuevo CSS
import '../styles/GestionDocentes.css'; 
import {
  FaPlus, FaSearch, FaFilter, FaEdit, FaTrash, 
  FaChevronLeft, FaChevronRight, FaTimes
} from 'react-icons/fa';

// =======================================================
// --- FUNCIONES DE UTILIDAD (useFetch) ---
// =======================================================
function useFetch(url) {
    const [data, setData] = useState([]);
    useEffect(() => {
      if (url) {
        fetch(url)
          .then(res => res.ok ? res.json() : Promise.reject(new Error(`Fetch error: ${res.status}`)))
          .then(data => {
            // Manejo de la estructura de respuesta (asumiendo que puede venir anidada)
            const key = Object.keys(data)[0];
            setData(Array.isArray(data[key]) ? data[key] : data); 
          })
          .catch(err => { console.error("Error en useFetch:", url, err); setData([]); });
      } else { setData([]); }
    }, [url]);
    return data;
}

// =======================================================
// --- MODAL DE EDICIÓN DE DOCENTE ---
// =======================================================
function ModalEditarDocente({ docente, onClose, onSave }) {
    const [formData, setFormData] = useState(null);
    const [error, setError] = useState("");
    const [selectedDepa, setSelectedDepa] = useState("");
    const [selectedProvi, setSelectedProvi] = useState("");
    
    const baseUrl = "http://127.0.0.1:5000/admin"; 
    
    const escuelas = useFetch(`${baseUrl}/escuelas`);
    const departamentos = useFetch(`${baseUrl}/departamentos`);
    const provincias = useFetch(selectedDepa ? `${baseUrl}/provincias/${selectedDepa}` : null);
    const distritos = useFetch(selectedProvi ? `${baseUrl}/distritos/${selectedProvi}` : null);

    useEffect(() => {
      if (docente) {
        const fecha = docente.fecha_nacimiento ? docente.fecha_nacimiento.split('T')[0].split(' ')[0] : '';
        setFormData({
          nombres: docente.nombres || '', apellidos: docente.apellidos || '',
          dni: docente.dni || '', telefono: docente.telefono || '',
          correo: docente.correo || '', escuela_id: docente.escuela_id || '',
          fecha_nacimiento: fecha, direccion_desc: docente.direccion_desc || '',
          id_distrito: docente.id_distrito || '', estado: docente.estado === true
        });
        // Configurar los selectores de ubicación
        setSelectedDepa(docente.id_departamento || ""); 
        setSelectedProvi(docente.id_provincia || "");
      }
    }, [docente]);

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: name === 'estado' ? (value === 'true') : value }));
    };
    
    const handleDepaChange = (e) => { 
        setSelectedDepa(e.target.value); 
        setSelectedProvi(""); 
        setFormData(f => ({ ...f, id_distrito: "" })); 
    };
    const handleProviChange = (e) => { 
        setSelectedProvi(e.target.value); 
        setFormData(f => ({ ...f, id_distrito: "" })); 
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      // Validación básica
      if (!formData.escuela_id || !formData.id_distrito) { setError("Complete escuela y dirección."); return; }
      setError(""); 
      onSave(docente.usuario_id, formData);
    };

    if (!formData) return null;

    return (
      <div className="modal-overlay"> 
        <div className="modal-content">
          <div className="modal-header">
            <h3>Modificar Docente</h3>
            <button onClick={onClose} className="modal-close-btn"><FaTimes /></button>
          </div>
          
          <div className="modal-body scrollable-content">
            <form onSubmit={handleSubmit}>
              {error && <div className="alert-error">{error}</div>}
              <div className="form-grid">
                <div className="form-group"><label>Nombres</label><input type="text" name="nombres" value={formData.nombres} onChange={handleChange} required /></div>
                <div className="form-group"><label>Apellidos</label><input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} required /></div>
                <div className="form-group"><label>DNI</label><input type="text" name="dni" value={formData.dni} onChange={handleChange} required pattern="\d{8}" title="8 dígitos"/></div>
                <div className="form-group"><label>Teléfono</label><input type="text" name="telefono" value={formData.telefono} onChange={handleChange} required pattern="\d{9}" title="9 dígitos"/></div>
                <div className="form-group full-width"><label>Correo</label><input type="email" name="correo" value={formData.correo} onChange={handleChange} required /></div>
                <div className="form-group"><label>Fecha Nacimiento</label><input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} required /></div>
                <div className="form-group"><label>Estado</label><select name="estado" value={formData.estado} onChange={handleChange} required><option value={true}>Activo</option><option value={false}>Inactivo</option></select></div>
                <div className="form-group full-width"><label>Escuela</label><select name="escuela_id" value={formData.escuela_id} onChange={handleChange} required><option value="">Seleccionar</option>{escuelas.map(esc => (<option key={esc.escuela_id} value={esc.escuela_id}>{esc.nombre_escuela} - {esc.facultad}</option>))}</select></div>
                <hr className="full-width" />
                <div className="form-group"><label>Departamento</label><select value={selectedDepa} onChange={handleDepaChange} required><option value="">Seleccionar</option>{departamentos.map(dep => (<option key={dep.departamento_id} value={dep.departamento_id}>{dep.nombre_departamento}</option>))}</select></div>
                <div className="form-group"><label>Provincia</label><select value={selectedProvi} onChange={handleProviChange} disabled={!selectedDepa} required><option value="">Seleccionar</option>{provincias.map(prov => (<option key={prov.provincia_id} value={prov.provincia_id}>{prov.nombre_provincia}</option>))}</select></div>
                <div className="form-group"><label>Distrito</label><select name="id_distrito" value={formData.id_distrito} onChange={handleChange} disabled={!selectedProvi} required><option value="">Seleccionar</option>{distritos.map(dist => (<option key={dist.distrito_id} value={dist.distrito_id}>{dist.nombre_distrito}</option>))}</select></div>
                <div className="form-group full-width"><label>Dirección</label><input type="text" name="direccion_desc" value={formData.direccion_desc} onChange={handleChange} placeholder="Ej: Av. Principal 123" required /></div>
              </div>
            <button type="submit" className="btn-submit-modal">Guardar Cambios</button>
            </form> 
          </div> 
        </div> 
      </div>
    );
}

// =======================================================
// --- MODAL DE FILTROS AVANZADOS (FALTANTE - AÑADIDO) ---
// =======================================================
function ModalFiltrosAvanzados({ onClose, onApplyFilters, escuelas }) {
    const [escuelaId, setEscuelaId] = useState('');

    const handleApply = () => {
        // Enviar los filtros seleccionados al componente padre
        onApplyFilters({
            escuela_id: escuelaId,
            // Agregar más filtros aquí si es necesario
        });
        onClose();
    };

    const handleClear = () => {
        setEscuelaId('');
        onApplyFilters({}); // Aplica filtros vacíos para limpiar
        onClose();
    };

    return (
        <div className="modal-overlay"> 
            {/* Clase filter-modal para ajustar el ancho con CSS */}
            <div className="modal-content filter-modal">
                <div className="modal-header">
                    <h3>Filtros Avanzados</h3>
                    <button onClick={onClose} className="modal-close-btn"><FaTimes /></button>
                </div>
                
                <div className="modal-body">
                    <div className="form-group">
                        <label>Filtrar por Escuela</label>
                        <select 
                            value={escuelaId} 
                            onChange={(e) => setEscuelaId(e.target.value)}
                        >
                            <option value="">Todas las Escuelas</option>
                            {escuelas.map(esc => (
                                <option key={esc.escuela_id} value={esc.escuela_id}>
                                    {esc.nombre_escuela} - {esc.facultad}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="modal-filter-buttons">
                        <button 
                            className="btn btn-secondary" 
                            type="button" 
                            onClick={handleClear}
                        >
                            Limpiar Filtros
                        </button>
                        <button 
                            className="btn btn-primary" 
                            type="button" 
                            onClick={handleApply}
                        >
                            Aplicar Filtros
                        </button>
                    </div>
                </div> 
            </div> 
        </div>
    );
}


// =======================================================
// --- COMPONENTE PRINCIPAL (GestionDocentes) ---
// =======================================================
function GestionDocentes() {
  const navigate = useNavigate();
  const [docentes, setDocentes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos los estados');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentDocente, setCurrentDocente] = useState(null);
  const [isFiltrosModalOpen, setIsFiltrosModalOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({});
  // Llamada de fetch para obtener escuelas para el filtro
  const escuelasParaFiltro = useFetch("http://127.0.0.1:5000/admin/escuelas");
  const baseUrl = "http://127.0.0.1:5000/admin"; 

  useEffect(() => { fetchDocentes(); }, []);

  const fetchDocentes = async () => {
      try {
          setLoading(true); setError(null);
          const response = await fetch(`${baseUrl}/docentes`);
          if (!response.ok) throw new Error(`HTTP error ${response.status}`);
          const data = await response.json();
          setDocentes(data);
        } catch (err) { console.error("Error al cargar docentes:", err); setError("No se pudieron cargar los datos.");
        } finally { setLoading(false); }
  };
  
  const handleDelete = async (usuario_id) => {
    const confirmacion = window.confirm("¿Estás seguro de ELIMINAR este docente?\n\nCUIDADO: Esto es irreversible y fallará si tiene cursos o asignaciones asociadas.");
    if (!confirmacion) return;

    try {
      const response = await fetch(`${baseUrl}/docentes/${usuario_id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();

      if (response.ok) {
        alert("Docente eliminado correctamente.");
        fetchDocentes(); 
      } else {
        alert(data.error || "Error al eliminar el docente.");
      }
    } catch (err) {
      console.error("Error eliminando:", err);
      alert("Error de conexión al intentar eliminar.");
    }
  };

  const handleEditClick = (docente) => { setCurrentDocente(docente); setIsEditModalOpen(true); };
  const handleCloseEditModal = () => { setIsEditModalOpen(false); setCurrentDocente(null); };

  const handleSave = async (usuario_id, formData) => {
    try {
        const response = await fetch(`${baseUrl}/docentes/${usuario_id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Error al actualizar");
        alert("Docente actualizado con éxito");
        handleCloseEditModal(); fetchDocentes();
      } catch (err) { console.error("Error al guardar:", err); alert(`Error al guardar: ${err.message}`); }
  };

  const handleFiltrosClick = () => { setIsFiltrosModalOpen(true); };
  const handleCloseFiltrosModal = () => { setIsFiltrosModalOpen(false); };
  const handleApplyAdvancedFilters = (filters) => { setAdvancedFilters(filters); };

  // Filtra la lista
  const filteredDocentes = docentes.filter(docente => {
    const nombreCompleto = `${docente.nombres || ''} ${docente.apellidos || ''}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    
    // 1. Filtrado por búsqueda rápida
    const matchesSearch =
        nombreCompleto.includes(search) ||
        (docente.dni || '').includes(search) ||
        (docente.codigo_docente || '').toLowerCase().includes(search); 

    // 2. Filtrado por estado (select principal)
    const estadoDocenteBooleano = docente.estado === true;
    let matchesStatus = true;
    if (statusFilter === 'Activo') { matchesStatus = estadoDocenteBooleano; }
    else if (statusFilter === 'Inactivo') { matchesStatus = !estadoDocenteBooleano; }

    // 3. Filtrado avanzado (modal)
    let matchesAdvanced = true;
    if (advancedFilters.escuela_id && docente.escuela_id != advancedFilters.escuela_id) {
        matchesAdvanced = false;
    }

    return matchesSearch && matchesStatus && matchesAdvanced;
  });

  // Renderiza las filas
  const renderTablaBody = () => {
    const colSpanCount = 8;
    if (loading) return <tr><td colSpan={colSpanCount} className="table-message">Cargando...</td></tr>;
    if (error) return <tr><td colSpan={colSpanCount} className="table-message error">{error}</td></tr>;
    if (filteredDocentes.length === 0) return <tr><td colSpan={colSpanCount} className="table-message">No se encontraron docentes.</td></tr>;

    return filteredDocentes.map((docente) => {
      // Lógica de código visual (simplificada)
      const numeroFormateado = String(docente.docente_id).padStart(3, '0');
      const currentYear = new Date().getFullYear();
      const codigoVisual = `DOC-${currentYear}-${numeroFormateado}`; 
      
      const estadoBooleano = docente.estado === true;
      const estadoTexto = estadoBooleano ? 'Activo' : 'Inactivo';
      const estadoClase = estadoBooleano ? 'activo' : 'inactivo';

      return (
        <tr key={docente.usuario_id || docente.docente_id}>
          {/* Columna 1: CÓDIGO */}
          <td>{docente.codigo_docente || codigoVisual || 'N/A'}</td>
          
          {/* Columna 2: DOCENTE (Nombre y Apellido apilados) */}
          <td>
            <strong>{docente.nombres}</strong> <br/> 
            <span className="docente-apellido">{docente.apellidos}</span>
          </td>
          
          {/* Columna 3: DNI */}
          <td>{docente.dni || 'N/A'}</td>
          
          {/* Columna 4: ESPECIALIDAD (Usamos el nombre de la escuela) */}
          <td>{docente.nombre_escuela || 'Desconocida'}</td>
          
          {/* Columna 5: GRADO (Valor de diseño) */}
          <td>{'Doctor'}</td> 
          
          {/* Columna 6: EMAIL */}
          <td>{docente.correo}</td>
          
          {/* Columna 7: ESTADO */}
          <td>
            <span className={`status-pill ${estadoClase}`}>
              {estadoTexto}
            </span>
          </td>
          
          {/* Columna 8: ACCIONES (Tacho y Lápiz) */}
          <td className="action-icons">
            <FaTrash 
              className="icon-delete" 
              title="Eliminar" 
              onClick={() => handleDelete(docente.usuario_id)} 
            />
            <FaEdit 
              className="icon-edit" 
              title="Editar" 
              onClick={() => handleEditClick(docente)} 
            />
          </td>
        </tr>
      );
    });
  };

  // JSX principal
  return (
    <div className="gestion-container">
      {/* Cabecera */}
      <div className="gestion-header">
        <div className="header-title">
            <h1>Gestión de Docentes - EPIS</h1> 
            <p>Escuela Profesional de Ingeniería de Sistemas</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/crear-docente')}>
          <FaPlus /> Registrar Nuevo Docente
        </button>
      </div>
      
      {/* Filtros */}
      <div className="gestion-filters">
        {/* Búsqueda Ancha */}
        <div className="search-bar">
          <FaSearch className="search-icon" />
          <input type="text" placeholder="Buscar por Nombre o Código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {/* Dropdown Estado */}
        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="Todos los estados">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
        </select>
        {/* Botón Filtros Avanzados */}
        <button className="btn btn-secondary" onClick={handleFiltrosClick}>
          <FaFilter /> Filtros
        </button>
      </div>
      
      {/* Tabla */}
      <div className="table-wrapper">
        <table className="gestion-table"> 
          <thead>
            <tr>
              <th style={{ width: '12%' }}>CÓDIGO</th>
              <th style={{ width: '15%' }}>DOCENTE</th>
              <th style={{ width: '10%' }}>DNI</th>
              <th style={{ width: '15%' }}>ESPECIALIDAD</th>
              <th style={{ width: '10%' }}>GRADO</th>
              <th style={{ width: '18%' }}>EMAIL</th>
              <th style={{ width: '10%' }}>ESTADO</th>
              <th style={{ width: '10%' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>{renderTablaBody()}</tbody>
        </table>
      </div>
      
      {/* Paginación */}
      <div className="gestion-pagination">
        <span>Mostrando **{filteredDocentes.length}** de **{docentes.length}** docentes</span>
        <div className="pagination-buttons">
          <button className="btn-pagination" disabled><FaChevronLeft /> Ant</button>
          <button className="btn-pagination active">1</button>
          <button className="btn-pagination" disabled><FaChevronRight /> Sig</button>
        </div>
      </div>
      
      {/* Modal de Edición */}
      {isEditModalOpen && (
        <ModalEditarDocente 
          docente={currentDocente} 
          onClose={handleCloseEditModal} 
          onSave={handleSave} 
        />
      )}
      
      {/* Modal de Filtros (CORREGIDO: El componente ya está definido arriba) */}
      {isFiltrosModalOpen && (
        <ModalFiltrosAvanzados 
          onClose={handleCloseFiltrosModal} 
          onApplyFilters={handleApplyAdvancedFilters} 
          escuelas={escuelasParaFiltro}
        />
      )}
    </div>
  );
}

export default GestionDocentes;