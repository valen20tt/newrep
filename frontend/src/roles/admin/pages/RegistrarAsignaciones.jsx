import React, { useEffect, useState, useMemo } from "react";
import { ChevronDown, Users, BookOpen, Clock } from "lucide-react";
import "../styles/registrar-asignaciones.css";

export default function RegistrarAsignaciones() {
  const API_BASE = "http://localhost:5000/admin";

  const [cursos, setCursos] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [aulas, setAulas] = useState([]);
  const [secciones, setSecciones] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null);

  const DIAS_SEMANA = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  const HORARIOS_VALIDOS = [
    "08:00",
    "08:50",
    "09:40",
    "10:30",
    "11:20",
    "12:10",
    "13:00",
    "13:50",
    "14:40",
    "15:30",
    "16:20",
    "17:10",
    "18:00",
    "18:50",
    "19:40",
    "20:30",
    "21:20",
    "22:10",
  ];

  const [formData, setFormData] = useState({
    curso_id: "",
    seccion_id: "",
    estudiantes: "",
    docente_id: "",
    observaciones: "",
    // REMOVER: horario_id, horario_id_2
    // AGREGAR:
    dia_1: "",
    hora_inicio_1: "",
    aula_id: "",
    dia_2: "",
    hora_inicio_2: "",
    aula_id_2: "",
    periodo: "",
    seccion_codigo: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [docRes, cursoRes, aulaRes, seccionRes] = await Promise.all([
          fetch(`${API_BASE}/docentes`),
          fetch(`${API_BASE}/cursos`),
          fetch(`${API_BASE}/aulas`),
          fetch(`${API_BASE}/secciones`),
        ]);

        if (!docRes.ok || !cursoRes.ok || !aulaRes.ok || !seccionRes.ok)
          throw new Error("Error al cargar datos del servidor");

        const [docentesData, cursosData, aulasData, seccionesData] =
          await Promise.all([
            docRes.json(),
            cursoRes.json(),
            aulaRes.json(),
            seccionRes.json(),
          ]);

        setDocentes(
          (docentesData || []).map((d) => ({
            ...d,
            docente_id: d.docente_id,
          }))
        );
        setCursos(cursosData || []);
        setAulas(aulasData || []);
        setSecciones(seccionesData || []);
      } catch (error) {
        console.error("❌ Error al cargar datos:", error);
        setMensaje(
          "Error de conexión con el backend. Asegúrese que Flask esté activo."
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (docentes.length > 0 && formData.docente_id) {
      const docenteIdStr = String(formData.docente_id);
      const match = docentes.some((d) => String(d.docente_id) === docenteIdStr);
      if (match) {
        setFormData((prev) => ({ ...prev, docente_id: docenteIdStr }));
      }
    }
  }, [docentes]);

  // Agregar estas funciones después del useEffect de docentes:
  const calcularHoraFin = (horaInicio, cantidadHoras) => {
    if (!horaInicio || !cantidadHoras) return "";

    const [horas, minutos] = horaInicio.split(":").map(Number);
    const minutosIniciales = horas * 60 + minutos;
    const duracionMinutos = cantidadHoras * 50; // 50 min por hora académica
    const minutosFin = minutosIniciales + duracionMinutos;

    const horasFin = Math.floor(minutosFin / 60);
    const minutosFin2 = minutosFin % 60;

    return `${String(horasFin).padStart(2, "0")}:${String(minutosFin2).padStart(
      2,
      "0"
    )}`;
  };

  const horaFin1 = useMemo(() => {
    return calcularHoraFin(
      formData.hora_inicio_1,
      cursoSeleccionado?.horas_teoricas
    );
  }, [formData.hora_inicio_1, cursoSeleccionado?.horas_teoricas]);

  const horaFin2 = useMemo(() => {
    return calcularHoraFin(
      formData.hora_inicio_2,
      cursoSeleccionado?.horas_practicas
    );
  }, [formData.hora_inicio_2, cursoSeleccionado?.horas_practicas]);

  const handleCursoChange = (e) => {
    const cursoId = e.target.value;
    const curso = cursos.find((c) => String(c.curso_id) === cursoId);
    setCursoSeleccionado(curso || null);
    setFormData((prev) => ({
      ...prev,
      curso_id: cursoId,
      dia_1: "",
      hora_inicio_1: "",
      aula_id: "",
      dia_2: "",
      hora_inicio_2: "",
      aula_id_2: "",
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSeccionChange = (e) => {
    const seccionId = e.target.value;
    const seccionSeleccionada = secciones.find(
      (s) => String(s.seccion_id) === seccionId
    );
    setFormData((prev) => ({
      ...prev,
      seccion_id: seccionId,
      periodo: seccionSeleccionada ? seccionSeleccionada.periodo : "",
    }));
  };

  const handleValidation = () => {
    if (!cursoSeleccionado) {
      return "Debe seleccionar un curso.";
    }
    const hT = cursoSeleccionado.horas_teoricas;
    const hP = cursoSeleccionado.horas_practicas;

    // CAMBIAR:
    if (
      hT > 0 &&
      (!formData.dia_1 || !formData.hora_inicio_1 || !formData.aula_id)
    ) {
      return `El curso requiere ${hT} horas teóricas. Debe asignar Día, Horario y Aula 1.`;
    }
    if (hP > 0) {
      // CAMBIAR:
      if (!formData.dia_2 || !formData.hora_inicio_2 || !formData.aula_id_2) {
        return `El curso requiere ${hP} horas prácticas. Debe asignar Día, Horario 2 y Aula 2.`;
      }
    } else {
      // CAMBIAR:
      if (formData.dia_2 || formData.hora_inicio_2) {
        return "El curso no tiene horas prácticas (P: 0). No se puede asignar Día/Horario 2.";
      }
    }
    if (!formData.docente_id) return "Debe seleccionar un docente.";
    if (!formData.estudiantes) return "Debe indicar la cantidad de estudiantes";

    const estNum = Number(formData.estudiantes);
    if (Number.isNaN(estNum) || estNum <= 0)
      return "N° de estudiantes inválido.";

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");

    // AGREGAR validación:
    const validationError = handleValidation();
    if (validationError) {
      setMensaje(`⚠️ Error de validación: ${validationError}`);
      return;
    }

    // AGREGAR toNumberOrNull:
    const toNumberOrNull = (val) => {
      if (val === "" || val === null || typeof val === "undefined") return null;
      const n = Number(val);
      return Number.isNaN(n) ? null : n;
    };

    // AGREGAR payload:
    const payload = {
      curso_id: toNumberOrNull(formData.curso_id),
      seccion_id: toNumberOrNull(formData.seccion_id),
      estudiantes: toNumberOrNull(formData.estudiantes),
      docente_id: toNumberOrNull(formData.docente_id),
      observaciones: formData.observaciones || "",
      dia_1: formData.dia_1 || null,
      hora_inicio_1: formData.hora_inicio_1 || null,
      aula_id: toNumberOrNull(formData.aula_id),
      dia_2: cursoSeleccionado?.horas_practicas > 0 ? formData.dia_2 : null,
      hora_inicio_2:
        cursoSeleccionado?.horas_practicas > 0 ? formData.hora_inicio_2 : null,
      aula_id_2:
        cursoSeleccionado?.horas_practicas > 0
          ? toNumberOrNull(formData.aula_id_2)
          : null,
    };

    try {
      const res = await fetch(`${API_BASE}/crear-asignacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setMensaje(
          data.error ||
            "❌ Error al registrar la asignación. Verifique los datos."
        );
        return;
      }

      setMensaje(data.mensaje || "✅ Asignación creada correctamente");

      // CAMBIAR el reset:
      setFormData({
        curso_id: "",
        seccion_id: "",
        estudiantes: "",
        docente_id: "",
        observaciones: "",
        dia_1: "",
        hora_inicio_1: "",
        aula_id: "",
        dia_2: "",
        hora_inicio_2: "",
        aula_id_2: "",
        periodo: "",
        seccion_codigo: "",
      });
      setCursoSeleccionado(null);
    } catch (err) {
      console.error(err);
      setMensaje("❌ Error de conexión con el servidor");
    }
  };
  const tieneHorasTeoricas = cursoSeleccionado?.horas_teoricas > 0;
  const tieneHorasPracticas = cursoSeleccionado?.horas_practicas > 0;
  return (
    <>
      <div className="page-center">
        <div
          className="p-6 max-w-4xl mx-auto rounded-2xl mt-8 glass-card"
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "1.5rem",
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            width: "100%",
            maxWidth: "1024px",
            marginTop: "2rem",
          }}
        >
          <h2 className="text-3xl font-extrabold mb-8 text-center text-blue-800 border-b pb-3">
            Nueva Asignación de Cursos y Horarios
          </h2>

          <form onSubmit={handleSubmit} className="asignaciones-form">
            <section>
              <h3 className="text-xl font-semibold mb-4 text-gray-700 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-500" />
                Paso 1: Información General
              </h3>

              <div
                className="form-column"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "1.5rem",
                }}
              >
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Curso
                  </label>
                  <div className="relative">
                    <select
                      name="curso_id"
                      value={formData.curso_id}
                      onChange={handleCursoChange}
                      required
                      style={{ appearance: "none" }}
                    >
                      <option value="">Seleccionar curso</option>
                      {cursos.map((c) => (
                        <option key={c.curso_id} value={String(c.curso_id)}>
                          {c.nombre} (T:{c.horas_teoricas} | P:
                          {c.horas_practicas}) — {c.ciclo}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label>Docente *</label>
                  <select
                    name="docente_id"
                    value={formData.docente_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccionar docente</option>
                    {Array.isArray(docentes) && docentes.length > 0 ? (
                      docentes.map((d) => (
                        <option
                          key={d.docente_id || d.dni}
                          value={d.docente_id || d.dni}
                        >
                          {d.nombres && d.apellidos
                            ? `${d.nombres} ${d.apellidos}`
                            : d.apellidos || "Sin nombre"}
                        </option>
                      ))
                    ) : (
                      <option disabled>Cargando docentes...</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sección *
                  </label>
                  <div className="relative">
                    <select
                      name="seccion_codigo"
                      value={formData.seccion_codigo || ""}
                      onChange={(e) => {
                        const codigoSeleccionado = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          seccion_codigo: codigoSeleccionado,
                          seccion_id: "",
                          periodo: "",
                        }));
                      }}
                      required
                      style={{ appearance: "none" }}
                    >
                      <option value="">Letra de Sección</option>
                      {[...new Set(secciones.map((s) => s.codigo))].map(
                        (letra) => (
                          <option key={letra} value={letra}>
                            {letra}
                          </option>
                        )
                      )}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Periodo *
                  </label>
                  <div className="relative">
                    <select
                      name="seccion_id"
                      value={formData.seccion_id}
                      onChange={handleSeccionChange}
                      required
                      disabled={!formData.seccion_codigo}
                      style={{ appearance: "none" }}
                    >
                      <option value="">
                        {formData.seccion_codigo
                          ? "Seleccionar periodo"
                          : "Primero selecciona sección"}
                      </option>
                      {secciones
                        .filter((s) => s.codigo === formData.seccion_codigo)
                        .map((s) => (
                          <option
                            key={s.seccion_id}
                            value={String(s.seccion_id)}
                          >
                            {s.periodo} ({s.ciclo_academico})
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estudiantes *
                  </label>
                  <input
                    type="number"
                    name="estudiantes"
                    value={formData.estudiantes}
                    onChange={handleChange}
                    required
                    placeholder="N° de estudiantes"
                    min="1"
                  />
                </div>

                <div className="lg:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones
                  </label>
                  <textarea
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleChange}
                    placeholder="Notas adicionales..."
                    rows="2"
                  />
                </div>
              </div>
            </section>

            <section
              style={{
                padding: "1.5rem",
                borderRadius: "0.5rem",
                border: `1px solid ${
                  tieneHorasTeoricas ? "#6ee7b7" : "#d1d5db"
                }`,
                backgroundColor: tieneHorasTeoricas ? "#ecfdf5" : "#f9fafb",
              }}
            >
              <h3 className="text-xl font-semibold mb-4 text-gray-700 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-green-500" />
                Paso 2: Horas Teóricas (Bloque 1)
                <span
                  className={`ml-3 text-sm font-normal px-2 py-1 rounded-full`}
                  style={{
                    backgroundColor: tieneHorasTeoricas ? "#a7f3d0" : "#e5e7eb",
                    color: tieneHorasTeoricas ? "#065f46" : "#4b5563",
                  }}
                >
                  {cursoSeleccionado
                    ? tieneHorasTeoricas
                      ? `Requerido: ${cursoSeleccionado.horas_teoricas} hrs`
                      : "No requerido (T: 0)"
                    : "Seleccione un curso"}
                </span>
              </h3>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Día */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Día *
                  </label>
                  <div className="relative">
                    <select
                      name="dia_1"
                      value={formData.dia_1}
                      onChange={handleChange}
                      required={tieneHorasTeoricas}
                      disabled={!tieneHorasTeoricas}
                      style={{ appearance: "none" }}
                    >
                      <option value="">
                        {tieneHorasTeoricas ? "Seleccionar día" : "No aplica"}
                      </option>
                      {DIAS_SEMANA.map((dia) => (
                        <option key={dia} value={dia}>
                          {dia}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Hora Inicio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora Inicio *
                  </label>
                  <div className="relative">
                    <select
                      name="hora_inicio_1"
                      value={formData.hora_inicio_1}
                      onChange={handleChange}
                      required={tieneHorasTeoricas}
                      disabled={!tieneHorasTeoricas}
                      style={{ appearance: "none" }}
                    >
                      <option value="">
                        {tieneHorasTeoricas ? "Seleccionar hora" : "No aplica"}
                      </option>
                      {HORARIOS_VALIDOS.map((hora) => (
                        <option key={hora} value={hora}>
                          {hora}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Duración calculada */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duración (calculada)
                  </label>
                  <input
                    type="text"
                    value={
                      formData.hora_inicio_1 &&
                      cursoSeleccionado?.horas_teoricas
                        ? `${formData.hora_inicio_1} - ${horaFin1} (${
                            cursoSeleccionado.horas_teoricas * 50
                          } min)`
                        : "---"
                    }
                    disabled
                    style={{
                      backgroundColor: "#f3f4f6",
                      cursor: "not-allowed",
                      color: "#6b7280",
                    }}
                  />
                </div>

                {/* Aula */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aula 1 *
                  </label>
                  <div className="relative">
                    <select
                      name="aula_id"
                      value={formData.aula_id}
                      onChange={handleChange}
                      required={tieneHorasTeoricas}
                      disabled={!tieneHorasTeoricas}
                      style={{ appearance: "none" }}
                    >
                      <option value="">
                        {tieneHorasTeoricas ? "Seleccionar aula" : "No aplica"}
                      </option>
                      {aulas.map((a) => (
                        <option key={a.aula_id} value={String(a.aula_id)}>
                          {a.nombre} (Pab: {a.pabellon} - Tipo: {a.tipo_aula})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </section>

            <section
              style={{
                padding: "1.5rem",
                borderRadius: "0.5rem",
                border: `1px solid ${
                  tieneHorasPracticas ? "#93c5fd" : "#d1d5db"
                }`,
                backgroundColor: tieneHorasPracticas ? "#eff6ff" : "#f9fafb",
              }}
            >
              <h3 className="text-xl font-semibold mb-4 text-gray-700 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-500" />
                Paso 3: Horas Prácticas (Bloque 2)
                <span
                  className={`ml-3 text-sm font-normal px-2 py-1 rounded-full`}
                  style={{
                    backgroundColor: tieneHorasPracticas
                      ? "#bfdbfe"
                      : "#e5e7eb",
                    color: tieneHorasPracticas ? "#1e40af" : "#4b5563",
                  }}
                >
                  {cursoSeleccionado
                    ? tieneHorasPracticas
                      ? `Requerido: ${cursoSeleccionado.horas_practicas} hrs`
                      : "No requerido (P: 0)"
                    : "Seleccione un curso"}
                </span>
              </h3>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Día 2 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Día {tieneHorasPracticas ? "*" : "(No requerido)"}
                  </label>
                  <div className="relative">
                    <select
                      name="dia_2"
                      value={formData.dia_2}
                      onChange={handleChange}
                      required={tieneHorasPracticas}
                      disabled={!tieneHorasPracticas}
                      style={{ appearance: "none" }}
                    >
                      <option value="">
                        {tieneHorasPracticas ? "Seleccionar día" : "No aplica"}
                      </option>
                      {DIAS_SEMANA.map((dia) => (
                        <option key={dia} value={dia}>
                          {dia}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Hora Inicio 2 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora Inicio {tieneHorasPracticas ? "*" : "(No requerido)"}
                  </label>
                  <div className="relative">
                    <select
                      name="hora_inicio_2"
                      value={formData.hora_inicio_2}
                      onChange={handleChange}
                      required={tieneHorasPracticas}
                      disabled={!tieneHorasPracticas}
                      style={{ appearance: "none" }}
                    >
                      <option value="">
                        {tieneHorasPracticas ? "Seleccionar hora" : "No aplica"}
                      </option>
                      {HORARIOS_VALIDOS.map((hora) => (
                        <option key={hora} value={hora}>
                          {hora}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Duración 2 calculada */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duración (calculada)
                  </label>
                  <input
                    type="text"
                    value={
                      formData.hora_inicio_2 &&
                      cursoSeleccionado?.horas_practicas
                        ? `${formData.hora_inicio_2} - ${horaFin2} (${
                            cursoSeleccionado.horas_practicas * 50
                          } min)`
                        : "---"
                    }
                    disabled
                    style={{
                      backgroundColor: "#f3f4f6",
                      cursor: "not-allowed",
                      color: "#6b7280",
                    }}
                  />
                </div>

                {/* Aula 2 */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aula 2 {tieneHorasPracticas ? "*" : "(No requerido)"}
                  </label>
                  <div className="relative">
                    <select
                      name="aula_id_2"
                      value={formData.aula_id_2}
                      onChange={handleChange}
                      required={tieneHorasPracticas}
                      disabled={!tieneHorasPracticas}
                      style={{ appearance: "none" }}
                    >
                      <option value="">
                        {tieneHorasPracticas ? "Seleccionar aula" : "No aplica"}
                      </option>
                      {aulas.map((a) => (
                        <option key={a.aula_id} value={String(a.aula_id)}>
                          {a.nombre} (Pab: {a.pabellon} - Tipo: {a.tipo_aula})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </section>

            {mensaje && (
              <p
                className="mt-4 text-center font-semibold"
                style={{ color: mensaje.startsWith("❌") ? "red" : "green" }}
              >
                {mensaje}
              </p>
            )}

            <div className="mt-8 text-center">
              <button type="submit" className="btn-primary">
                Registrar Asignación
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
