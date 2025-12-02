import { useState, useEffect } from "react";
import "../styles/crear-alumno.css";

function CrearAlumno() {
  const [formData, setFormData] = useState({
    nombres: "",
    apellido_paterno: "",
    apellido_materno: "",
    correo_institucional: "", // Ahora se genera automáticamente
    correo_personal: "",
    dni: "",
    telefono: "",
    codigo_universitario: "",
    ciclo_ingreso: ""
  });

  const [ciclosAcademicos, setCiclosAcademicos] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const generarCiclos = () => {
      const ciclos = [];
      const añoActual = new Date().getFullYear();
      
      for (let año = 2020; año <= añoActual + 1; año++) {
        ciclos.push(`${año}-I`);
        ciclos.push(`${año}-II`);
      }
      
      setCiclosAcademicos(ciclos.reverse());
    };

    generarCiclos();
  }, []);

  // ========== FUNCIÓN PARA GENERAR CORREO INSTITUCIONAL ==========
  const generarCorreoInstitucional = (codigoUniversitario) => {
    if (!codigoUniversitario || codigoUniversitario.length !== 10) return "";
    
    // Generar correo usando el código universitario
    return `${codigoUniversitario}@alumnounfv.edu.pe`;
  };

  // ========== FUNCIONES DE VALIDACIÓN ==========
  
  const validarCodigoUniversitario = (codigo) => {
    const errors = [];
    
    if (!/^\d{10}$/.test(codigo)) {
      errors.push("Debe contener exactamente 10 dígitos");
      return errors;
    }
    
    const todosIguales = codigo.split('').every(digit => digit === codigo[0]);
    if (todosIguales) {
      errors.push("No puede contener todos los dígitos iguales");
    }
    
    return errors;
  };

  const validarDNI = (dni) => {
    const errors = [];
    
    if (!/^\d{8}$/.test(dni)) {
      errors.push("Debe contener exactamente 8 dígitos");
      return errors;
    }
    
    const todosIguales = dni.split('').every(digit => digit === dni[0]);
    if (todosIguales) {
      errors.push("No puede contener todos los dígitos iguales");
    }
    
    return errors;
  };

  const validarNombres = (nombres) => {
    const errors = [];
    
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombres)) {
      errors.push("Solo debe contener letras");
    }
    
    if (nombres.length < 2) {
      errors.push("Debe tener al menos 2 caracteres");
    }
    if (nombres.length > 50) {
      errors.push("No puede exceder 50 caracteres");
    }
    
    if (/\s{3,}/.test(nombres)) {
      errors.push("No puede tener espacios excesivos");
    }
    
    return errors;
  };

  // ✅ MODIFICACIÓN: Se removió la validación que impedía apellidos iguales
  const validarApellidos = (paterno, materno) => {
    const errors = [];
    
    const validarFormato = (apellido, tipo) => {
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(apellido)) {
        errors.push(`${tipo} solo debe contener letras`);
      }
      if (apellido.length < 2) {
        errors.push(`${tipo} debe tener al menos 2 caracteres`);
      }
      if (apellido.length > 30) {
        errors.push(`${tipo} no puede exceder 30 caracteres`);
      }
    };
    
    if (paterno) validarFormato(paterno, "Apellido paterno");
    if (materno) validarFormato(materno, "Apellido materno");
    
    return errors;
  };

  const validarTelefono = (telefono) => {
    const errors = [];
    
    if (!/^\d{9}$/.test(telefono)) {
      errors.push("Debe contener exactamente 9 dígitos");
      return errors;
    }
    
    const todosIguales = telefono.split('').every(digit => digit === telefono[0]);
    if (todosIguales) {
      errors.push("No puede contener todos los dígitos iguales");
    }
    
    if (!telefono.startsWith('9')) {
      errors.push("El teléfono debe comenzar con 9");
    }
    
    return errors;
  };

  const validarCampo = (name, value) => {
    let errors = [];
    
    switch(name) {
      case 'codigo_universitario':
        errors = validarCodigoUniversitario(value);
        break;
      case 'dni':
        errors = validarDNI(value);
        break;
      case 'nombres':
        errors = validarNombres(value);
        break;
      case 'apellido_paterno':
      case 'apellido_materno':
        errors = validarApellidos(
          name === 'apellido_paterno' ? value : formData.apellido_paterno,
          name === 'apellido_materno' ? value : formData.apellido_materno
        );
        break;
      case 'telefono':
        errors = validarTelefono(value);
        break;
    }
    
    setValidationErrors(prev => ({
      ...prev,
      [name]: errors
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    let newValue = value;
    
    // Restricciones de entrada en tiempo real
    if (name === 'dni' || name === 'telefono' || name === 'codigo_universitario') {
      newValue = value.replace(/\D/g, '');
    }
    
    if (name === 'nombres' || name === 'apellido_paterno' || name === 'apellido_materno') {
      newValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    }
    
    // ✅ MODIFICACIÓN: Generar correo automáticamente cuando cambia el código universitario
    const newFormData = {
      ...formData,
      [name]: newValue
    };
    
    if (name === 'codigo_universitario') {
      newFormData.correo_institucional = generarCorreoInstitucional(newValue);
    }
    
    setFormData(newFormData);
    
    // Validar en tiempo real
    if (newValue) {
      validarCampo(name, newValue);
    } else {
      setValidationErrors(prev => ({
        ...prev,
        [name]: []
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setError("");

    // Validar todos los campos antes de enviar
    const allErrors = {
      codigo_universitario: validarCodigoUniversitario(formData.codigo_universitario),
      dni: validarDNI(formData.dni),
      nombres: validarNombres(formData.nombres),
      apellidos: validarApellidos(formData.apellido_paterno, formData.apellido_materno),
      telefono: validarTelefono(formData.telefono)
    };

    const hayErrores = Object.values(allErrors).some(errors => errors.length > 0);
    
    if (hayErrores) {
      setError("Por favor corrija los errores en el formulario");
      setValidationErrors({
        codigo_universitario: allErrors.codigo_universitario,
        dni: allErrors.dni,
        nombres: allErrors.nombres,
        apellido_paterno: allErrors.apellidos,
        apellido_materno: allErrors.apellidos,
        telefono: allErrors.telefono
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:5000/admin/alumnos/crear-alumno", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          escuela_id: 1
        })
      });

      const data = await response.json();

      if (response.ok) {
        const mensajeExito = data.correo_enviado 
          ? "Estudiante registrado exitosamente ✅\n📧 Se envió un correo con las credenciales al correo personal" 
          : "Estudiante registrado exitosamente ✅\n⚠️ No se pudo enviar el correo (pero el estudiante fue creado)";
        
        setMensaje(mensajeExito);
        setValidationErrors({});
        
        setTimeout(() => {
          setFormData({
            nombres: "",
            apellido_paterno: "",
            apellido_materno: "",
            correo_institucional: "",
            correo_personal: "",
            dni: "",
            telefono: "",
            codigo_universitario: "",
            ciclo_ingreso: ""
          });
          setIsSubmitting(false);
        }, 3000);
      } else {
        setError(data.error || "Error al registrar estudiante");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Error de conexión con el servidor");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="crear-alumno-container">
      <div className="crear-alumno-form">
        <h2>🎓 Registrar Estudiante</h2>
        <p className="escuela-info">Escuela Profesional de Ingeniería de Sistemas</p>
        
        {mensaje && <div className="alert-success">{mensaje}</div>}
        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Nombres */}
          <div className="form-group">
            <label>Nombres *</label>
            <input
              type="text"
              name="nombres"
              value={formData.nombres}
              onChange={handleChange}
              placeholder="Ingrese nombres completos"
              maxLength="50"
              required
              disabled={isSubmitting}
              style={validationErrors.nombres?.length > 0 ? { borderColor: '#ef4444' } : {}}
            />
            {validationErrors.nombres?.map((err, idx) => (
              <small key={idx} className="error-hint">⚠️ {err}</small>
            ))}
          </div>

          {/* Apellidos en fila */}
          <div className="form-row">
            <div className="form-group">
              <label>Apellido Paterno *</label>
              <input
                type="text"
                name="apellido_paterno"
                value={formData.apellido_paterno}
                onChange={handleChange}
                placeholder="Apellido paterno"
                maxLength="30"
                required
                disabled={isSubmitting}
                style={validationErrors.apellido_paterno?.length > 0 ? { borderColor: '#ef4444' } : {}}
              />
              {validationErrors.apellido_paterno?.map((err, idx) => (
                <small key={idx} className="error-hint">⚠️ {err}</small>
              ))}
            </div>

            <div className="form-group">
              <label>Apellido Materno *</label>
              <input
                type="text"
                name="apellido_materno"
                value={formData.apellido_materno}
                onChange={handleChange}
                placeholder="Apellido materno"
                maxLength="30"
                required
                disabled={isSubmitting}
                style={validationErrors.apellido_materno?.length > 0 ? { borderColor: '#ef4444' } : {}}
              />
              {validationErrors.apellido_materno?.map((err, idx) => (
                <small key={idx} className="error-hint">⚠️ {err}</small>
              ))}
            </div>
          </div>

          {/* DNI y Código Universitario */}
          <div className="form-row">
            <div className="form-group">
              <label>DNI *</label>
              <input
                type="text"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                placeholder="8 dígitos"
                maxLength="8"
                required
                disabled={isSubmitting}
                style={validationErrors.dni?.length > 0 ? { borderColor: '#ef4444' } : {}}
              />
              {validationErrors.dni?.map((err, idx) => (
                <small key={idx} className="error-hint">⚠️ {err}</small>
              ))}
            </div>

            <div className="form-group">
              <label>Código Universitario *</label>
              <input
                type="text"
                name="codigo_universitario"
                value={formData.codigo_universitario}
                onChange={handleChange}
                placeholder="10 dígitos (Ej: 2024001234)"
                maxLength="10"
                required
                disabled={isSubmitting}
                style={validationErrors.codigo_universitario?.length > 0 ? { borderColor: '#ef4444' } : {}}
              />
              {validationErrors.codigo_universitario?.map((err, idx) => (
                <small key={idx} className="error-hint">⚠️ {err}</small>
              ))}
            </div>
          </div>

          {/* ✅ MODIFICACIÓN: Correo Institucional ahora es de solo lectura (generado automáticamente con código) */}
          <div className="form-group">
            <label>Correo Institucional (Generado Automáticamente)</label>
            <input
              type="email"
              name="correo_institucional"
              value={formData.correo_institucional}
              placeholder="Se generará con tu código universitario"
              readOnly
              disabled
              style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
            />
            <small style={{ color: '#6b7280', fontSize: '0.875rem', display: 'block', marginTop: '0.25rem' }}>
              ℹ️ Se genera automáticamente usando tu código universitario
            </small>
          </div>

          {/* Correo Personal */}
          <div className="form-group">
            <label>Correo Personal *</label>
            <input
              type="email"
              name="correo_personal"
              value={formData.correo_personal}
              onChange={handleChange}
              placeholder="correo@gmail.com"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Teléfono y Ciclo de Ingreso */}
          <div className="form-row">
            <div className="form-group">
              <label>Nro. Telefónico *</label>
              <input
                type="text"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="9 dígitos (comienza con 9)"
                maxLength="9"
                required
                disabled={isSubmitting}
                style={validationErrors.telefono?.length > 0 ? { borderColor: '#ef4444' } : {}}
              />
              {validationErrors.telefono?.map((err, idx) => (
                <small key={idx} className="error-hint">⚠️ {err}</small>
              ))}
            </div>

            <div className="form-group">
              <label>Ciclo de Ingreso *</label>
              <select
                name="ciclo_ingreso"
                value={formData.ciclo_ingreso}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              >
                <option value="">Seleccionar ciclo</option>
                {ciclosAcademicos.map(ciclo => (
                  <option key={ciclo} value={ciclo}>
                    {ciclo}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="btn-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CrearAlumno;