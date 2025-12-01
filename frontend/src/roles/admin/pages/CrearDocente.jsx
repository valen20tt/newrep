import { useState, useEffect } from "react";
import "../styles/crear-docente.css"; 
import { FaChalkboardTeacher, FaEnvelope, FaKey, FaUserCheck, FaIdCard } from 'react-icons/fa';

/**
 * Hook personalizado para simplificar la carga de datos (Ubigeo, Escuelas).
 */
function useFetch(url) {
  const [data, setData] = useState([]);
  useEffect(() => {
    if (url) {
      fetch(url)
        .then(res => res.json())
        .then(data => {
          // Extrae el primer array que encuentre en la respuesta
          setData(data[Object.keys(data)[0]] || []);
        })
        .catch(err => {
          console.error("Error en useFetch:", err);
          setData([]);
        });
    } else {
      setData([]);
    }
  }, [url]);
  return data;
}

function CrearDocente() {
  // --- ESTADO DEL FORMULARIO ---
  // Nota: Ya no pedimos 'contrasena' ni 'correo' institucional aquí.
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    correo_personal: "", // Nuevo campo para el backend
    dni: "",
    telefono: "",
    escuela_id: "",
    fecha_nacimiento: "",
    direccion_desc: "", 
    id_distrito: ""      
  });

  // --- ESTADOS PARA UBIGEO ---
  const [selectedDepa, setSelectedDepa] = useState("");
  const [selectedProvi, setSelectedProvi] = useState("");

  // --- CARGA DE DATOS AUXILIARES ---
  const escuelas = useFetch("http://127.0.0.1:5000/admin/escuelas");
  const departamentos = useFetch("http://127.0.0.1:5000/admin/departamentos");
  const provincias = useFetch(selectedDepa ? `http://127.0.0.1:5000/admin/provincias/${selectedDepa}` : null);
  const distritos = useFetch(selectedProvi ? `http://127.0.0.1:5000/admin/distritos/${selectedProvi}` : null);
  
  // --- ESTADOS DE UI ---
  const [error, setError] = useState("");
  const [credencialesGeneradas, setCredencialesGeneradas] = useState(null); // Almacena la respuesta exitosa

  // --- HANDLERS ---
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCredencialesGeneradas(null);
    setError("");

    try {
      const response = await fetch("http://127.0.0.1:5000/admin/crear-docente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData) 
      });

      const data = await response.json();

      if (response.ok) {
        // ÉXITO: Guardamos las credenciales devueltas por el backend
        setCredencialesGeneradas(data.credenciales);
        
        // Limpiamos el formulario
        setFormData({
          nombres: "", apellidos: "", correo_personal: "",
          dni: "", telefono: "", escuela_id: "", fecha_nacimiento: "",
          direccion_desc: "", id_distrito: ""
        });
        setSelectedDepa("");
        setSelectedProvi("");
        
        // Scroll hacia arriba para ver el mensaje
        window.scrollTo(0, 0);
      } else {
        setError(data.error || "Error al crear docente");
        window.scrollTo(0, 0);
      }
    } catch (error) {
      console.error(error);
      setError("Error de conexión con el servidor");
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="crear-docente-container">
      <div className="crear-docente-form">
        <h2 className="form-title">
          <FaChalkboardTeacher /> Registrar Nuevo Docente
        </h2>
        
        {/* --- BLOQUE DE ÉXITO CON CREDENCIALES --- */}
        {credencialesGeneradas && (
          <div className="alert-success" style={{
              backgroundColor: '#d4edda', 
              color: '#155724', 
              padding: '20px', 
              borderRadius: '8px', 
              marginBottom: '25px', 
              border: '1px solid #c3e6cb',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
          }}>
            <h4 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px'}}>
                <FaUserCheck size={24}/> ¡Docente Creado Exitosamente!
            </h4>
            <p style={{marginBottom: '15px'}}>El sistema ha generado las siguientes credenciales institucionales:</p>
            
            <div style={{backgroundColor: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #e9ecef'}}>
                <ul style={{listStyle: 'none', paddingLeft: 0, margin: 0}}>
                <li style={{marginBottom: '8px'}}>
                    <strong><FaEnvelope style={{color:'#007bff', marginRight:'8px'}}/> Correo Institucional:</strong> <br/>
                    <span style={{fontFamily: 'monospace', fontSize: '1.1em'}}>{credencialesGeneradas.correo_institucional}</span>
                </li>
                <li style={{marginBottom: '8px'}}>
                    <strong><FaKey style={{color:'#dc3545', marginRight:'8px'}}/> Contraseña Generada:</strong> <br/>
                    <span style={{fontFamily: 'monospace', fontSize: '1.1em', backgroundColor: '#f8f9fa', padding: '2px 6px', borderRadius: '4px'}}>
                        {credencialesGeneradas.contrasena}
                    </span>
                </li>
                <li>
                    <strong><FaIdCard style={{color:'#28a745', marginRight:'8px'}}/> Código Docente:</strong> <br/>
                    <span style={{fontFamily: 'monospace', fontSize: '1.1em'}}>{credencialesGeneradas.codigo_docente}</span>
                </li>
                </ul>
            </div>
            <p style={{marginTop: '15px', fontSize: '0.9em', fontStyle: 'italic'}}>
                * Se ha enviado una copia de estos datos al correo personal proporcionado.
            </p>
          </div>
        )}

        {/* --- BLOQUE DE ERROR --- */}
        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* DATOS PERSONALES */}
          <div className="form-group">
              <label>Nombres</label>
              <input type="text" name="nombres" value={formData.nombres} onChange={handleChange} placeholder="Ej: Juan Carlos" required />
          </div>
          <div className="form-group">
              <label>Apellidos</label>
              <input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} placeholder="Ej: Pérez Rodríguez" required />
          </div>
          <div className="form-group">
              <label>DNI (8 dígitos)</label>
              <input type="text" name="dni" value={formData.dni} onChange={handleChange} placeholder="Ej: 12345678" required pattern="\d{8}" title="El DNI debe tener 8 dígitos." />
          </div>
          <div className="form-group">
              <label>Teléfono (9 dígitos)</label>
              <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="Ej: 999888777" required pattern="\d{9}" title="El teléfono debe tener 9 dígitos." />
          </div>
          <div className="form-group">
              <label>Fecha de Nacimiento</label>
              <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} required />
          </div>

          {/* CORREO PERSONAL (IMPORTANTE) */}
          <div className="form-group full-width" style={{gridColumn: 'span 2'}}>
              <label style={{color: '#0056b3', fontWeight: 'bold'}}>Correo Personal (Gmail/Hotmail/etc.)</label>
              <input type="email" name="correo_personal" value={formData.correo_personal} onChange={handleChange} placeholder="ejemplo@gmail.com" required />
              <small style={{display: 'block', marginTop: '5px', color: '#666'}}>
                  A esta dirección enviaremos las credenciales institucionales generadas.
              </small>
          </div>

          <hr style={{gridColumn: 'span 2', border: '0', borderTop: '1px solid #eee', margin: '20px 0'}}/>

          {/* UBICACIÓN */}
          <div className="form-group">
            <label>Departamento</label>
            <select value={selectedDepa} onChange={handleDepaChange} required>
              <option value="">Seleccionar</option>
              {departamentos.map(depa => (
                <option key={depa.departamento_id} value={depa.departamento_id}>{depa.nombre_departamento}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Provincia</label>
            <select value={selectedProvi} onChange={handleProviChange} disabled={!selectedDepa} required>
              <option value="">Seleccionar</option>
              {provincias.map(provi => (
                <option key={provi.provincia_id} value={provi.provincia_id}>{provi.nombre_provincia}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Distrito</label>
            <select name="id_distrito" value={formData.id_distrito} onChange={handleChange} disabled={!selectedProvi} required>
              <option value="">Seleccionar</option>
              {distritos.map(distri => (
                <option key={distri.distrito_id} value={distri.distrito_id}>{distri.nombre_distrito}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Dirección</label>
            <input type="text" name="direccion_desc" value={formData.direccion_desc} onChange={handleChange} placeholder="Calle, Av., Jr., Nro" required />
          </div>

          {/* ESCUELA */}
          <div className="form-group full-width" style={{gridColumn: 'span 2'}}>
            <label>Escuela Profesional</label>
            <select name="escuela_id" value={formData.escuela_id} onChange={handleChange} required>
              <option value="">Seleccionar Escuela</option>
              {escuelas.map(escuela => (
                <option key={escuela.escuela_id} value={escuela.escuela_id}>
                  {escuela.nombre_escuela} - {escuela.facultad}
                </option>
              ))}
            </select>
          </div>
          
          <button type="submit" className="btn-submit">
            Guardar y Generar Credenciales
          </button>
        </form>
      </div>
    </div>
  );
}

export default CrearDocente;