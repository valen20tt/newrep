import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import "../styles/crear-admin.css";

const BASE_URL = "http://localhost:5000/superadmin";

function CrearAdmin() {
  const [formData, setFormData] = useState({
    nombres: "",
    apellido_paterno: "",
    apellido_materno: "",
    correo_personal: "",
    dni: "",
    telefono: "",
    direccion_detalle: "",
    distrito_id: "",
    fecha_nacimiento: "",
    id_formacion: "",
    id_especialidad: "",
    escuela_id: "",
    experiencia_lab: ""
  });

  const [escuelas, setEscuelas] = useState([]);
  const [formaciones, setFormaciones] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [distritos, setDistritos] = useState([]);

  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState("");
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  // ==========================================================
  // 1️⃣ CARGA DE DATOS AUXILIARES
  // ==========================================================
  const cargarDatosAuxiliares = useCallback(async () => {
    try {
      const [resDptos, resEscuelas, resFormaciones, resEspecialidades] =
        await Promise.all([
        axios.get(`${BASE_URL}/ubicaciones/departamentos-geo`),
        axios.get(`${BASE_URL}/academico/escuelas`),
        axios.get(`${BASE_URL}/academico/formaciones`),
        axios.get(`${BASE_URL}/academico/especialidades`)
      ]);

      setDepartamentos(resDptos.data.departamentos || []);
      setEscuelas(resEscuelas.data.escuelas || []);
      setFormaciones(resFormaciones.data.formaciones || []);
      setEspecialidades(resEspecialidades.data.especialidades || []);
      setError("");
    } catch (err) {
      console.error("❌ Error al cargar datos iniciales (AXIOS):", err);
      setError(err.response?.data?.error || "Error al cargar datos auxiliares.");
    }
  }, []);

  useEffect(() => {
    cargarDatosAuxiliares();
  }, [cargarDatosAuxiliares]);

  // ==========================================================
  // 2️⃣ JERARQUÍA DE UBICACIÓN (DEP → PROV → DIST)
  // ==========================================================
  useEffect(() => {
    setProvincias([]);
    setProvinciaSeleccionada("");
    setDistritos([]);
    setFormData((prev) => ({ ...prev, distrito_id: "" }));

    if (departamentoSeleccionado) {
      axios
        .get(`${BASE_URL}/ubicaciones/provincias/${departamentoSeleccionado}`)
        .then((res) => setProvincias(res.data.provincias || []))
        .catch((err) => console.error("Error cargando provincias", err));
    }
  }, [departamentoSeleccionado]);

  useEffect(() => {
    setDistritos([]);
    setFormData((prev) => ({ ...prev, distrito_id: "" }));

    if (provinciaSeleccionada) {
      axios
        .get(`${BASE_URL}/ubicaciones/distritos/${provinciaSeleccionada}`)
        .then((res) => setDistritos(res.data.distritos || []))
        .catch((err) => console.error("Error cargando distritos", err));
    }
  }, [provinciaSeleccionada]);

// ==========================================================
  // ⿣ VALIDACIÓN DE NOMBRES Y APELLIDOS
  // ==========================================================
  const validarTextoHumano = (texto) => {
    if (!texto) return false;
    const regexBasico =
      /^(?=.{2,})([A-Za-zÁÉÍÓÚáéíóúÑñ]{2,})(\s[A-Za-zÁÉÍÓÚáéíóúÑñ]{2,})*$/;
    if (!regexBasico.test(texto.trim())) return false;
    if (/(.)\1{2,}/.test(texto)) return false;
    if (/[aeiouAEIOU]{4,}/.test(texto) || /[^aeiouAEIOU\s]{4,}/.test(texto))
      return false;
    return true;
  };

  // ==========================================================
  // ⿣.1 VALIDACIÓN DE FECHA DE NACIMIENTO
  // ==========================================================
  const validarFechaNacimiento = (fecha) => {
    if (!fecha) return { valido: false, mensaje: "La fecha de nacimiento es obligatoria." };
    
    const fechaNacimiento = new Date(fecha);
    const hoy = new Date();
    
    // Validar que no sea una fecha futura
    if (fechaNacimiento > hoy) {
      return { valido: false, mensaje: "La fecha de nacimiento no puede ser futura." };
    }
    
    // Calcular edad
    let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
    const mesActual = hoy.getMonth();
    const mesNacimiento = fechaNacimiento.getMonth();
    
    // Ajustar edad si aún no ha cumplido años este año
    if (mesActual < mesNacimiento || 
        (mesActual === mesNacimiento && hoy.getDate() < fechaNacimiento.getDate())) {
      edad--;
    }
    
    // Validar edad mínima de 25 años
    if (edad < 25) {
      return { valido: false, mensaje: "El administrador debe tener al menos 25 años de edad." };
    }
    
    return { valido: true, mensaje: "" };
  };

  // ==========================================================
  // 4️⃣ HANDLERS
  // ==========================================================
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  console.log("Datos enviados:", formData);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setError("");

    // Validaciones básicas
    if (!validarTextoHumano(formData.nombres))
      return setError("Por favor, ingrese un nombre válido.");
    if (!validarTextoHumano(formData.apellido_paterno))
      return setError("Ingrese un apellido paterno válido.");
    if (!validarTextoHumano(formData.apellido_materno))
      return setError("Ingrese un apellido materno válido.");
    if (!formData.distrito_id)
      return setError("Seleccione un distrito antes de continuar.");

    // 🔹 Unir los apellidos antes de enviarlos al backend
    const datosAEnviar = {
      ...formData,
      apellidos: `${formData.apellido_paterno} ${formData.apellido_materno}`.trim(),
    };  

    try {
      const response = await fetch(`${BASE_URL}/admins/crear-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosAEnviar)
      });

      const data = await response.json();

      if (response.ok) {
        setMensaje(data.mensaje || "Administrador creado correctamente ✅");
        setFormData({
          nombres: "",
          apellido_paterno: "",
          apellido_materno: "",
          correo_personal: "",
          dni: "",
          telefono: "",
          direccion_detalle: "",
          distrito_id: "",
          fecha_nacimiento: "",
          id_formacion: "",
          id_especialidad: "",
          escuela_id: "",
          experiencia_lab: ""
        });
        setDepartamentoSeleccionado("");
        setProvinciaSeleccionada("");
      } else {
        // ⚠️ Mostrar error específico del backend
        setError(data.error || "Error al crear administrador");
      }
    } catch (err) {
      console.error("❌ Error de conexión:", err);
      setError("Error de conexión con el servidor");
    }
  };

  // ==========================================================
  // 5️⃣ RENDER JSX
  // ==========================================================
  return (
    <div className="crear-admin-container">
      <div className="crear-admin-card">
        <h2>Registrar Administrador</h2>
        {mensaje && <div className="alert success">{mensaje}</div>}
        {error && <div className="alert error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* DATOS PERSONALES */}
          <h3>🧍 Datos Personales</h3>
          <div className="form-row">
            <input
              type="text"
              name="nombres"
              value={formData.nombres}
              onChange={handleChange}
              placeholder="Nombres"
              required
            />
          </div>

          <div className="form-row">
            <input
              type="text"
              name="apellido_paterno"
              value={formData.apellido_paterno}
              onChange={handleChange}
              placeholder="Apellido paterno"
              required
            />
            <input
              type="text"
              name="apellido_materno"
              value={formData.apellido_materno}
              onChange={handleChange}
              placeholder="Apellido materno"
              required
            />
          </div>

          <div className="form-row">
            <input
              type="text"
              name="dni"
              value={formData.dni}
              onChange={handleChange}
              placeholder="DNI (8 dígitos)"
              required
            />
            <input
              type="date"
              name="fecha_nacimiento"
              value={formData.fecha_nacimiento}
              onChange={handleChange}
              required
            />
          </div>

          {/* CONTACTO */}
          <h3>📞 Contacto</h3>
          <div className="form-row">
            <input
              type="email"
              name="correo_personal"
              value={formData.correo_personal}
              onChange={handleChange}
              placeholder="Correo personal"
              required
            />
            <input
              type="text"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="Teléfono (9 dígitos)"
              required
            />
          </div>

          {/* UBICACIÓN */}
          <h3>📍 Ubicación</h3>
          <div className="form-row">
            <select
              value={departamentoSeleccionado}
              onChange={(e) => setDepartamentoSeleccionado(e.target.value)}
              required
            >
              <option value="">Seleccione departamento</option>
              {departamentos.map((d) => (
                <option key={d.departamento_id} value={d.departamento_id}>
                  {d.nombre_departamento}
                </option>
              ))}
            </select>

            <select
              value={provinciaSeleccionada}
              onChange={(e) => setProvinciaSeleccionada(e.target.value)}
              required
              disabled={!departamentoSeleccionado}
            >
              <option value="">Seleccione provincia</option>
              {provincias.map((p) => (
                <option key={p.provincia_id} value={p.provincia_id}>
                  {p.nombre_provincia}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <select
              name="distrito_id"
              value={formData.distrito_id}
              onChange={handleChange}
              required
              disabled={!provinciaSeleccionada}
            >
              <option value="">Seleccione distrito</option>
              {distritos.map((d) => (
                <option key={d.distrito_id} value={d.distrito_id}>
                  {d.nombre_distrito}
                </option>
              ))}
            </select>

            <input
              type="text"
              name="direccion_detalle"
              value={formData.direccion_detalle}
              onChange={handleChange}
              placeholder="Dirección detallada (Ej: Av. Arequipa 1234)"
            />
          </div>

          {/* INFORMACIÓN PROFESIONAL */}
          <h3>🎓 Información Profesional</h3>
          <div className="form-row">
            <select
              name="id_formacion"
              value={formData.id_formacion}
              onChange={handleChange}
              required
            >
              <option value="">Seleccione formación</option>
              {formaciones.map((f) => (
                <option key={f.id_formacion} value={f.id_formacion}>
                  {f.nombre_formacion}
                </option>
              ))}
            </select>

            <select
              name="id_especialidad"
              value={formData.id_especialidad}
              onChange={handleChange}
              required
            >
              <option value="">Seleccione cargo</option>
              {especialidades.map((e) => (
                <option key={e.id_especialidad} value={e.id_especialidad}>
                  {e.nombre_especialidad}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <input
              type="text"
              name="experiencia_lab"
              value={formData.experiencia_lab}
              onChange={handleChange}
              placeholder="Tiempo - Experiencia laboral"
            />
          </div>

          {/* DATOS INSTITUCIONALES */}
          <h3>🏫 Escuela Asignada </h3>
          <select
            name="escuela_id"
            value={formData.escuela_id}
            onChange={handleChange}
            required
          >
            <option value="">Seleccione escuela</option>
            {escuelas.map((escuela) => (
              <option key={escuela.escuela_id} value={escuela.escuela_id}>
                {escuela.nombre_escuela}
              </option>
            ))}
          </select>

          <button type="submit" className="btn-submit">
            💾 Guardar Administrador
          </button>
        </form>
      </div>
    </div>
  );
}

export default CrearAdmin;