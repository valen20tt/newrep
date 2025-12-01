// ModalAula.jsx - VERSIÓN FINAL CORREGIDA

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TIPOS_URL = 'http://localhost:5000/superadmin/pabellones/tipos-aula';
const PABELLONES_URL = 'http://localhost:5000/superadmin/pabellones/pabellones';

const AULA_INICIAL = {
    codigo:'',
    nombre_aula: '',
    capacidad: '',
    estado: 'OPERATIVO',
    tipo_aula_id: '',
    pabellon_id: '',
};

function validateAula(values) {
  let errors = {};
  if (!values.nombre_aula) errors.nombre_aula = "El nombre del aula es obligatorio.";
  if (!values.capacidad) errors.capacidad = "La capacidad es obligatoria.";
  else if (isNaN(values.capacidad) || values.capacidad <= 0) errors.capacidad = "Debe ser un número positivo.";
  if (!values.tipo_aula_id) errors.tipo_aula_id = "Debe seleccionar un tipo.";
  if (!values.pabellon_id) errors.pabellon_id = "Debe seleccionar un pabellón.";
  return errors;
}

function ModalAula({ isOpen, onClose, onSave, aulaData }) {
    const [tiposAula, setTiposAula] = useState([]);
    const [pabellones, setPabellones] = useState([]);
    const [values, setValues] = useState(AULA_INICIAL);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEditing = aulaData && aulaData.aula_id;

    useEffect(() => {
        if (isSubmitting && Object.keys(errors).length === 0) {
            onSave(values);
            setIsSubmitting(false);
        } else {
            setIsSubmitting(false);
        }
    }, [errors, isSubmitting, onSave, values]);
    
    // Efecto #1: Cargar catálogos (tipos y pabellones) solo cuando se abre el modal
    useEffect(() => {
        if (isOpen) {
            axios.get(TIPOS_URL).then(res => {
                console.log("Tipos de aula cargados:", res.data);
                setTiposAula(res.data || []);
            }).catch(err => console.error("Error cargando tipos de aula", err));

            axios.get(PABELLONES_URL).then(res => {
                console.log("Pabellones cargados:", res.data);
                setPabellones(res.data || []);
            }).catch(err => console.error("Error cargando pabellones", err));
            
            setErrors({}); // Limpiar errores al abrir
        }
    }, [isOpen]);

    // Efecto #2: Rellenar el formulario, AHORA MÁS ROBUSTO
    useEffect(() => {
        if (!isOpen) return; // No hacer nada si el modal está cerrado

        if (isEditing) {
            // Solo intentar rellenar si los catálogos ya cargaron
            if (tiposAula.length > 0 && pabellones.length > 0) {
                console.log("Datos para editar:", aulaData);

                const tipoEncontrado = tiposAula.find(t => t.nombre_tipo === aulaData.tipo);
                const pabellonEncontrado = pabellones.find(p => p.nombre_pabellon === aulaData.ubicacion);
                
                console.log("Tipo encontrado:", tipoEncontrado);
                console.log("Pabellón encontrado:", pabellonEncontrado);

                setValues({
                  aula_id: aulaData.aula_id,
                  nombre_aula: aulaData.nombre,
                  capacidad: aulaData.capacidad,
                  estado: aulaData.estado,
                  tipo_aula_id: tipoEncontrado?.tipo_aula_id || '',
                  pabellon_id: pabellonEncontrado?.pabellon_id || ''
                });
            }
        } else {
            // Si es para crear, simplemente resetea el formulario
            setValues(AULA_INICIAL);
        }
    }, [isOpen, isEditing, aulaData, tiposAula, pabellones]);


    const handleChange = (event) => {
        setValues({ ...values, [event.target.name]: event.target.value });
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        setErrors(validateAula(values));
        setIsSubmitting(true);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{isEditing ? 'Editar Aula' : 'Nueva Aula'}</h2>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-group">
                        <label>Nombre del Aula *</label>
                        <input type="text" name="nombre_aula" value={values.nombre_aula || ''} onChange={handleChange} className={errors.nombre_aula ? 'input-error' : ''} />
                        {errors.nombre_aula && <p className="error-text">{errors.nombre_aula}</p>}
                    </div>
                    <div className="form-group">
                        <label>Capacidad *</label>
                        <input type="number" name="capacidad" value={values.capacidad || ''} onChange={handleChange} className={errors.capacidad ? 'input-error' : ''} />
                        {errors.capacidad && <p className="error-text">{errors.capacidad}</p>}
                    </div>
                    <div className="form-group">
                        <label>Tipo de Aula *</label>
                        <select name="tipo_aula_id" value={values.tipo_aula_id || ''} onChange={handleChange} className={errors.tipo_aula_id ? 'input-error' : ''}>
                            <option value="">Seleccione un tipo</option>
                            {tiposAula.map(tipo => <option key={tipo.tipo_aula_id} value={tipo.tipo_aula_id}>{tipo.nombre_tipo}</option>)}
                        </select>
                         {errors.tipo_aula_id && <p className="error-text">{errors.tipo_aula_id}</p>}
                    </div>
                    <div className="form-group">
                        <label>Pabellón *</label>
                        <select name="pabellon_id" value={values.pabellon_id || ''} onChange={handleChange} className={errors.pabellon_id ? 'input-error' : ''}>
                            <option value="">Seleccione un pabellón</option>
                            {pabellones.map(pab => <option key={pab.pabellon_id} value={pab.pabellon_id}>{pab.nombre_pabellon}</option>)}
                        </select>
                         {errors.pabellon_id && <p className="error-text">{errors.pabellon_id}</p>}
                    </div>
                    <div className="form-group">
                        <label>Estado *</label>
                        <select name="estado" value={values.estado || 'OPERATIVO'} onChange={handleChange}>
                            <option value="OPERATIVO">Operativo</option>
                            <option value="MANTENIMIENTO">Mantenimiento</option>
                        </select>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary">{isEditing ? 'Guardar Cambios' : 'Registrar Aula'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ModalAula;