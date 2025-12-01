import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Secuencia válida de horarios académicos (cada 50 minutos)
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

export default function CrearBloque() {
  const navigate = useNavigate();

  const [bloque, setBloque] = useState({
    codigo_bloque: "",
    dia: "",
    hora_inicio: "",
  });

  const [mensaje, setMensaje] = useState("");
  const [turno, setTurno] = useState("");
  const [loading, setLoading] = useState(false);

  // Calcula automáticamente la hora fin (siempre +50 minutos)
  const calcularHoraFin = (horaInicio) => {
    if (!horaInicio || !HORARIOS_VALIDOS.includes(horaInicio)) return "";

    const idx = HORARIOS_VALIDOS.indexOf(horaInicio);
    // Si existe el siguiente horario en la secuencia
    if (idx < HORARIOS_VALIDOS.length - 1) {
      return HORARIOS_VALIDOS[idx + 1];
    }
    return ""; // No hay horario siguiente válido
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

  // Determinar turno completo
  const calcularTurno = (horaInicio) => {
    if (!horaInicio) return "";
    const [h] = horaInicio.split(":").map(Number);
    if (h < 12) return "Mañana";
    if (h < 19) return "Tarde";
    return "Noche";
  };

  // Código preview visual
  useEffect(() => {
    const { dia, hora_inicio } = bloque;
    if (!dia || !hora_inicio) {
      setBloque((prev) => ({ ...prev, codigo_bloque: "" }));
      setTurno("");
      return;
    }

    const prefijo = abreviarDia(dia);
    const letraTurno = obtenerTurnoLetra(hora_inicio);
    const codigoVisual = `${prefijo}-${letraTurno}…`;

    setBloque((prev) => ({ ...prev, codigo_bloque: codigoVisual }));
    setTurno(calcularTurno(hora_inicio));
  }, [bloque.dia, bloque.hora_inicio]);

  // Handler de inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setBloque((prev) => ({ ...prev, [name]: value }));

    if (name === "hora_inicio") {
      setTurno(calcularTurno(value));
    }
  };

  const handleSubmit = async () => {
    setMensaje("");

    if (!bloque.dia || !bloque.hora_inicio) {
      setMensaje("⚠️ Completa día y hora de inicio.");
      return;
    }

    const horaFin = calcularHoraFin(bloque.hora_inicio);
    if (!horaFin) {
      setMensaje("⚠️ No hay horario válido posterior para crear el bloque.");
      return;
    }

    const payload = {
      dia: bloque.dia,
      hora_inicio: bloque.hora_inicio,
    };

    console.log("📤 Enviando payload:", payload);

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
      console.log("📥 Respuesta del servidor:", data);

      if (res.ok) {
        setMensaje(
          `✅ Bloque registrado: ${data.codigo_bloque} (${bloque.hora_inicio} - ${data.hora_fin})`
        );

        setBloque((prev) => ({
          ...prev,
          codigo_bloque: data.codigo_bloque,
        }));

        setTimeout(() => {
          setBloque({
            codigo_bloque: "",
            dia: "",
            hora_inicio: "",
          });
          setMensaje("");
          setTurno("");
        }, 3000);
      } else {
        setMensaje(`❌ ${data.error || "No se pudo registrar el bloque."}`);
      }
    } catch (error) {
      console.error("❌ Error:", error);
      setMensaje("❌ Error de conexión con la API.");
    } finally {
      setLoading(false);
    }
  };

  const horaFin = bloque.hora_inicio ? calcularHoraFin(bloque.hora_inicio) : "";

  return (
    <div style={{ maxWidth: 640, margin: "24px auto", padding: 20 }}>
      <h2 style={{ textAlign: "center", marginBottom: 18 }}>
        Registrar Nuevo Bloque Horario
      </h2>

      <div>
        {/* DÍA */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 4 }}>
            Día de la Semana*:
          </label>
          <select
            name="dia"
            value={bloque.dia}
            onChange={handleChange}
            style={{
              display: "block",
              width: "100%",
              padding: "8px",
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
          >
            <option value="">-- Seleccione día --</option>
            <option value="Lunes">Lunes</option>
            <option value="Martes">Martes</option>
            <option value="Miércoles">Miércoles</option>
            <option value="Jueves">Jueves</option>
            <option value="Viernes">Viernes</option>
            <option value="Sábado">Sábado</option>
          </select>
        </div>

        {/* HORA INICIO Y FIN EN LA MISMA FILA */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 4 }}>
              Hora de Inicio*:
            </label>
            <select
              name="hora_inicio"
              value={bloque.hora_inicio}
              onChange={handleChange}
              style={{
                display: "block",
                width: "100%",
                padding: "8px",
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
            >
              <option value="">-- Seleccione --</option>
              {HORARIOS_VALIDOS.slice(0, -1).map((hora) => (
                <option key={hora} value={hora}>
                  {hora}
                </option>
              ))}
            </select>
            <small style={{ display: "block", marginTop: 4, color: "#666" }}>
              Horarios válidos de la secuencia
            </small>
          </div>

          {/* HORA FIN (AUTOMÁTICA) */}
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 4 }}>
              Termina a las:
            </label>
            <input
              type="text"
              value={horaFin || "—"}
              readOnly
              style={{
                display: "block",
                width: "100%",
                padding: "8px",
                borderRadius: 4,
                border: "1px solid #ccc",
                background: "#f5f5f5",
                color: horaFin ? "#333" : "#999",
                fontWeight: horaFin ? "500" : "normal",
              }}
            />
          </div>
        </div>

        {/* CÓDIGO */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 4 }}>
            Código del Bloque:
          </label>
          <input
            type="text"
            name="codigo_bloque"
            value={bloque.codigo_bloque || "—"}
            readOnly
            style={{
              display: "block",
              width: "100%",
              padding: "8px",
              borderRadius: 4,
              border: "1px solid #ccc",
              background: "#f5f5f5",
            }}
          />
          <small style={{ display: "block", marginTop: 4, color: "#666" }}>
            Se genera automáticamente. Ej: LUN-M1
          </small>
        </div>

        {/* INFO AUTOMÁTICA */}
        {turno && (
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginTop: 10,
              marginBottom: 16,
              padding: 12,
              borderRadius: 8,
              background: "rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ flex: 1 }}>
              <strong>Turno:</strong>
              <div style={{ marginTop: 4 }}>{turno}</div>
            </div>
          </div>
        )}

        {/* BOTONES */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate("/superadmin/listar-horario")}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Ver Lista de horarios
          </button>

          <button
            onClick={handleSubmit}
            disabled={!bloque.dia || !bloque.hora_inicio || loading}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 8,
              border: "none",
              background:
                !bloque.dia || !bloque.hora_inicio || loading
                  ? "linear-gradient(135deg,#9bbffb,#7f9fd9)"
                  : "linear-gradient(135deg,#007aff,#005acc)",
              color: "#fff",
              cursor:
                !bloque.dia || !bloque.hora_inicio || loading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {loading ? "Guardando..." : "Guardar Bloque"}
          </button>
        </div>
      </div>

      {mensaje && (
        <p
          style={{
            marginTop: 14,
            padding: 10,
            borderRadius: 6,
            background: mensaje.includes("✅")
              ? "#d4edda"
              : mensaje.includes("⚠️")
              ? "#fff3cd"
              : "#f8d7da",
            color: mensaje.includes("✅")
              ? "#155724"
              : mensaje.includes("⚠️")
              ? "#856404"
              : "#721c24",
          }}
        >
          {mensaje}
        </p>
      )}
    </div>
  );
}
