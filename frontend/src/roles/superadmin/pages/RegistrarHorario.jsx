import { useState, useEffect } from "react";
import "../styles/registrar-horario.css";

export default function CrearBloque() {
  const [bloque, setBloque] = useState({
    codigo_bloque: "",
    dia: "",
    hora_inicio: "",
    hora_fin: "",
  });

  const [mensaje, setMensaje] = useState("");
  const [duracion, setDuracion] = useState("");
  const [turno, setTurno] = useState("");
  const [bloqueValido, setBloqueValido] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [bloqueRegistrado, setBloqueRegistrado] = useState(null);
  const [errorMensaje, setErrorMensaje] = useState("");

  // Obtiene el próximo código real desde el backend
  const obtenerCodigoSugerido = async (dia, horaInicio) => {
    if (!dia || !horaInicio) return;

    try {
      const url = `http://localhost:5000/superadmin/bloques-horarios/proximo-codigo?dia=${dia}&hora_inicio=${horaInicio}`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        setBloque((prev) => ({
          ...prev,
          codigo_bloque: data.codigo_sugerido,
        }));
      }
    } catch (e) {
      console.error("Error al obtener código sugerido:", e);
    }
  };

  // Mapa para abreviar días
  const abreviarDia = (dia) => {
    const map = {
      Lunes: "LUN",
      Martes: "MAR",
      Miércoles: "MIE",
      Jueves: "JUE",
      Viernes: "VIE",
      Sábado: "SAB",
    };
    return map[dia] || "";
  };

  // Turno letra
  const obtenerTurnoLetra = (horaInicio) => {
    if (!horaInicio) return "";
    const [h] = horaInicio.split(":").map(Number);
    if (h < 12) return "M";
    if (h < 19) return "T";
    return "N";
  };

  // Calcula duración en minutos
  const calcularDatos = (inicio, fin) => {
    setMensaje("");
    setDuracion("");
    setTurno("");
    setBloqueValido(false);

    if (!inicio || !fin) return;

    const [h1, m1] = inicio.split(":").map(Number);
    const [h2, m2] = fin.split(":").map(Number);

    const totalMin = h2 * 60 + m2 - (h1 * 60 + m1);

    if (totalMin <= 0) {
      setDuracion("⛔ Horario inválido: fin debe ser posterior a inicio");
      return;
    }

    const minMinutos = 50;
    const maxMinutos = 360;

    if (totalMin < minMinutos) {
      setDuracion(`⛔ Duración mínima: ${minMinutos} minutos`);
      return;
    }
    if (totalMin > maxMinutos) {
      setDuracion("⛔ Excede las 6 horas permitidas");
      return;
    }

    const horas = Math.floor(totalMin / 60);
    const minutos = totalMin % 60;
    const texto =
      horas > 0
        ? `${horas} hora${horas > 1 ? "s" : ""}${
            minutos > 0 ? ` ${minutos} min` : ""
          }`
        : `${minutos} min`;

    setDuracion(texto);

    if (h1 < 12) setTurno("Mañana");
    else if (h1 < 19) setTurno("Tarde");
    else setTurno("Noche");

    setBloqueValido(true);
  };

  // Código preview visual
  useEffect(() => {
    const { dia, hora_inicio } = bloque;
    if (!dia || !hora_inicio) {
      setBloque((prev) => ({ ...prev, codigo_bloque: "" }));
      return;
    }

    const prefijo = abreviarDia(dia);
    const letraTurno = obtenerTurnoLetra(hora_inicio);
    const codigoVisual = `${prefijo}-${letraTurno}…`;

    setBloque((prev) => ({ ...prev, codigo_bloque: codigoVisual }));
  }, [bloque.dia, bloque.hora_inicio]);

  // Handler de inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    const nuevo = { ...bloque, [name]: value };

    setBloque(nuevo);

    if (name === "hora_inicio" || name === "hora_fin") {
      calcularDatos(
        name === "hora_inicio" ? value : nuevo.hora_inicio,
        name === "hora_fin" ? value : nuevo.hora_fin
      );
    } else if (name === "dia") {
      calcularDatos(nuevo.hora_inicio, nuevo.hora_fin);
    }

    if (
      (name === "dia" || name === "hora_inicio") &&
      nuevo.dia &&
      nuevo.hora_inicio
    ) {
      obtenerCodigoSugerido(nuevo.dia, nuevo.hora_inicio);
    }
  };

  const handleRegistrarClick = (e) => {
    e.preventDefault();
    setMensaje("");

    if (!bloque.dia || !bloque.hora_inicio || !bloque.hora_fin) {
      setErrorMensaje("Completa día, hora inicio y hora fin.");
      setShowErrorModal(true);
      return;
    }
    if (!bloqueValido) {
      setErrorMensaje("El bloque no es válido. Revisa duración o horas.");
      setShowErrorModal(true);
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmarRegistro = async () => {
    const payload = {
      dia: bloque.dia,
      hora_inicio: bloque.hora_inicio,
      hora_fin: bloque.hora_fin,
    };

    setLoading(true);
    try {
      const res = await fetch(
        "http://localhost:5000/superadmin/bloques-horarios",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setBloqueRegistrado({
          codigo_bloque: data.codigo_bloque,
          dia: bloque.dia,
          hora_inicio: bloque.hora_inicio,
          hora_fin: bloque.hora_fin,
          duracion: duracion,
          turno: turno,
        });

        setShowConfirmModal(false);
        setShowSuccessModal(true);

        // Resetear formulario
        setBloque({
          codigo_bloque: "",
          dia: "",
          hora_inicio: "",
          hora_fin: "",
        });
        setDuracion("");
        setTurno("");
        setBloqueValido(false);
      } else {
        setErrorMensaje(data.error || "No se pudo registrar el bloque.");
        setShowConfirmModal(false);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error(error);
      setErrorMensaje("Error de conexión con la API.");
      setShowConfirmModal(false);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registrar-horario">
      <div className="header-section">
        <h2>📅 Registrar Nuevo Bloque Horario</h2>
        <p className="subtitle">
          Crea nuevos bloques horarios para organizar las clases
        </p>
      </div>

      <form onSubmit={handleRegistrarClick} className="form-horario">
        {/* DÍA */}
        <div className="campo">
          <label>
            Día de la Semana*
            <select
              name="dia"
              value={bloque.dia}
              onChange={handleChange}
              aria-required="true"
            >
              <option value="">-- Seleccione día --</option>
              <option value="Lunes">Lunes</option>
              <option value="Martes">Martes</option>
              <option value="Miércoles">Miércoles</option>
              <option value="Jueves">Jueves</option>
              <option value="Viernes">Viernes</option>
              <option value="Sábado">Sábado</option>
            </select>
          </label>
        </div>

        {/* HORAS */}
        <div className="campo-horas">
          <label>
            Hora Inicio*
            <input
              type="time"
              name="hora_inicio"
              value={bloque.hora_inicio}
              onChange={handleChange}
              aria-required="true"
              min="06:00"
              max="23:00"
            />
            <small>Formato 24h (HH:MM)</small>
          </label>

          <label>
            Hora Fin*
            <input
              type="time"
              name="hora_fin"
              value={bloque.hora_fin}
              onChange={handleChange}
              aria-required="true"
              min="06:30"
              max="23:59"
            />
            <small>Formato 24h (HH:MM)</small>
          </label>
        </div>

        {/* CÓDIGO */}
        <div className="campo">
          <label>
            Código del Bloque
            <input
              type="text"
              name="codigo_bloque"
              value={bloque.codigo_bloque}
              readOnly
              aria-readonly="true"
            />
            <small>Se genera automáticamente. Ej: LUN-M…</small>
          </label>
        </div>

        {/* INFO AUTOMÁTICA */}
        <div className="info-automatica">
          <div className="info-item">
            <strong>⏱️ Duración:</strong>
            <span>{duracion || "—"}</span>
          </div>
          <div className="info-item">
            <strong>🌅 Turno:</strong>
            <span>{turno || "—"}</span>
          </div>
        </div>

        {/* BOTÓN */}
        <div className="botones">
          <button
            type="submit"
            disabled={!bloqueValido || loading}
            className="btn-guardar"
          >
            {loading ? "Guardando..." : "Guardar Bloque"}
          </button>
        </div>
      </form>

      {/* Modal de Confirmación */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => !loading && setShowConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>📅 ¿Confirmar registro?</h3>

            <div className="modal-body">
              <p>Estás a punto de crear el siguiente bloque horario:</p>
              <div className="horario-detail">
                <strong>{bloque.codigo_bloque}</strong> - {bloque.dia}
                <br />
                {bloque.hora_inicio} - {bloque.hora_fin}
                <br />
                <span className="detalle-info">Duración: {duracion} • Turno: {turno}</span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowConfirmModal(false);
                }}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className="btn-confirm"
                onClick={confirmarRegistro}
                disabled={loading}
              >
                {loading ? "Registrando..." : "Sí, Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Éxito */}
      {showSuccessModal && bloqueRegistrado && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="modal-content modal-success" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon">✅</div>
            <h3 className="success-title">Registro Exitoso</h3>

            <div className="modal-body">
              <p>El bloque <strong>{bloqueRegistrado.codigo_bloque}</strong> ha sido creado correctamente.</p>
              
              <div className="detalles-box">
                <h4 className="detalles-title">📋 Detalles del bloque:</h4>
                <ul className="detalles-list">
                  <li>Día: <strong>{bloqueRegistrado.dia}</strong></li>
                  <li>Horario: <strong>{bloqueRegistrado.hora_inicio} - {bloqueRegistrado.hora_fin}</strong></li>
                  <li>Duración: <strong>{bloqueRegistrado.duracion}</strong></li>
                  <li>Turno: <strong>{bloqueRegistrado.turno}</strong></li>
                </ul>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-success"
                onClick={() => {
                  setShowSuccessModal(false);
                  setBloqueRegistrado(null);
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Error */}
      {showErrorModal && (
        <div className="modal-overlay" onClick={() => setShowErrorModal(false)}>
          <div className="modal-content modal-error" onClick={(e) => e.stopPropagation()}>
            <div className="error-icon">❌</div>
            <h3 className="error-title">Error al Registrar</h3>

            <div className="modal-body">
              <p className="error-message">{errorMensaje}</p>
            </div>

            <div className="modal-actions">
              <button
                className="btn-error"
                onClick={() => {
                  setShowErrorModal(false);
                  setErrorMensaje("");
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}