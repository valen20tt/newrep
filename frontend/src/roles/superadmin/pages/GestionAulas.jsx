import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Search, Plus, Edit, Trash2, ListChecks } from 'lucide-react';

import ModalAula from './ModalAula.jsx'; 
import '../styles/gestion-aula.css';

const BASE_URL = 'http://localhost:5000/superadmin/aulas/aulas';

// CORRECCIÓN 1: Usamos 'codigo' para que coincida con la Base de Datos y el Modal
const AULA_INICIAL = {
    codigo: '', 
    nombre_aula: '',
    capacidad: '',
    estado: 'OPERATIVO',
    tipo_aula_id: '',
    pabellon_id: '',
};

function GestionAulas() {
    const [aulas, setAulas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [aulaSeleccionada, setAulaSeleccionada] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timerId);
    }, [searchTerm]);

    const cargarAulas = async () => {
        setLoading(true);
        try {
            const res = await axios.get(BASE_URL);
            // console.log("Aulas recibidas:", res.data); // Descomenta esto para ver qué nombres exactos llegan
            setAulas(res.data);
        } catch (err) {
            toast.error("Error al cargar los datos de las aulas.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarAulas();
    }, []);

    const eliminarAula = async (aulaId) => {
        if (!window.confirm("¿Está seguro de eliminar esta aula?")) return;
        try {
            await axios.delete(`${BASE_URL}/${aulaId}`);
            toast.success("🗑️ Aula eliminada exitosamente.");
            cargarAulas();
        } catch (err) {
            const serverError = err.response?.data?.error || "Error al eliminar el aula.";
            toast.error(serverError);
        }
    };

    const handleOpenModal = (aula = null) => {
        setAulaSeleccionada(aula);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setAulaSeleccionada(null);
    };

    const handleSaveAula = async (formData) => {
        try {
            if (formData.aula_id) {
                await axios.put(`${BASE_URL}/${formData.aula_id}`, formData);
                toast.success("✅ Aula modificada exitosamente.");
            } else {
                await axios.post(BASE_URL, formData);
                toast.success("✅ Aula creada exitosamente.");
            }
            handleCloseModal();
            cargarAulas();
        } catch (err) {
            const serverError = err.response?.data?.error || "Error al guardar el aula.";
            toast.error(serverError);
        }
    };

    const getEstadoClass = (estado) => {
        if (estado === 'OPERATIVO') return 'status-tag status-disponible'; 
        if (estado === 'MANTENIMIENTO') return 'status-tag status-mantenimiento';
        return 'status-tag';
    };

    // CORRECCIÓN 2: El filtro ahora busca por 'codigo' (el campo real de la BD)
    // También he añadido soporte por si 'nombre' viene como 'nombre_aula'
    const aulasFiltradas = aulas.filter(aula => {
        const codigo = aula.codigo || aula.codigo_a || ''; // Busca codigo o codigo_a
        const nombre = aula.nombre || aula.nombre_aula || '';
        const ubicacion = aula.ubicacion || aula.pabellon?.nombre_pabellon || '';

        return (
            codigo.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            nombre.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            ubicacion.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
    });

    if (loading) return <div className="loading-state">Cargando gestión de aulas...</div>;

    return (
        <div className="gestion-aulas-container">
            <div className="header-container">
                <h1 className="main-title"><ListChecks size={30} style={{ marginRight: '10px' }} /> Gestión de Aulas</h1>
                <p className="subtitle">Administra las aulas del centro educativo</p>
            </div>
            
            <div className="search-bar-actions">
                <div className="search-input-group">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por código, nombre o ubicación..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    <Plus size={20} /> Nueva Aula
                </button>
            </div>
            <div className="aulas-table-container">
                {aulasFiltradas.length > 0 ? (
                    <table className="aulas-table">
                        <thead>
                            <tr>
                                <th>CÓDIGO</th>
                                <th>NOMBRE</th>
                                <th>CAPACIDAD</th>
                                <th>TIPO</th>
                                <th>UBICACIÓN</th>
                                <th>ESTADO</th>
                                <th>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {aulasFiltradas.map((aula) => (
                                <tr key={aula.aula_id}>
                                    {/* CORRECCIÓN 3: Aquí mostramos 'codigo'. Si por alguna razón tu backend cambia, usamos 'codigo_a' como respaldo */}
                                    <td>{aula.codigo || aula.codigo_a}</td>
                                    
                                    {/* Soporte dual para nombre (nombre o nombre_aula) */}
                                    <td>{aula.nombre || aula.nombre_aula}</td>
                                    
                                    <td>{aula.capacidad}</td>
                                    
                                    {/* Soporte dual para tipo (string directo o objeto) */}
                                    <td>{aula.tipo || aula.tipo_aula?.tipo_nombre || 'N/A'}</td>
                                    
                                    {/* Soporte dual para ubicación (string directo o objeto pabellon) */}
                                    <td>{aula.ubicacion || aula.pabellon?.nombre_pabellon || 'N/A'}</td>
                                    
                                    <td><span className={getEstadoClass(aula.estado)}>{aula.estado}</span></td>
                                    <td className="action-buttons">
                                        <button className="btn-icon btn-edit" onClick={() => handleOpenModal(aula)}><Edit size={16} /></button>
                                        <button className="btn-icon btn-delete" onClick={() => eliminarAula(aula.aula_id)}><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="info-message">{searchTerm ? "No se encontraron aulas." : "No hay aulas registradas."}</div>
                )}
            </div>
            <ModalAula
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveAula}
                aulaData={aulaSeleccionada}
                initialState={AULA_INICIAL} 
            />
        </div>
    );
}

export default GestionAulas;