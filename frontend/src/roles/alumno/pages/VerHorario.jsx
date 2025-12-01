import { useEffect, useState } from "react";
import "../styles/ver-horario.css";

function VerHorario({ estudianteId }) {
  const [horario, setHorario] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vistaActual, setVistaActual] = useState('semana');
  const [claseSeleccionada, setClaseSeleccionada] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  const DIAS_ORDEN = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  useEffect(() => {
    const obtenerHorario = async () => {
      try {
        const res = await fetch(`http://localhost:5000/alumno/mi-horario/${estudianteId}`);
        const data = await res.json();
        setHorario(data.horario || []);
      } catch (error) {
        console.error("Error al obtener horario:", error);
      } finally {
        setLoading(false);
      }
    };

    obtenerHorario();
  }, [estudianteId]);

  const abrirModal = (clase) => {
    setClaseSeleccionada(clase);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setTimeout(() => setClaseSeleccionada(null), 300);
  };

  // Calcular rango de horas dinámicamente
  const horaAMinutos = (hora) => {
    if (!hora) return 0;
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  };

  const obtenerRangoHoras = () => {
    if (horario.length === 0) return { inicio: 7, fin: 20 };
    
    let horaMin = 24 * 60;
    let horaMax = 0;

    horario.forEach(clase => {
      const inicio = horaAMinutos(clase.hora_inicio);
      const fin = horaAMinutos(clase.hora_fin);
      horaMin = Math.min(horaMin, inicio);
      horaMax = Math.max(horaMax, fin);
    });

    return {
      inicio: Math.floor(horaMin / 60),
      fin: Math.ceil(horaMax / 60)
    };
  };

  const rangoHoras = obtenerRangoHoras();
  const horas = Array.from(
    { length: rangoHoras.fin - rangoHoras.inicio + 1 },
    (_, i) => {
      const hora = rangoHoras.inicio + i;
      return `${hora.toString().padStart(2, '0')}:00`;
    }
  );

  // Organizar horario por día
  const horarioPorDia = {};
  DIAS_ORDEN.forEach(dia => {
    horarioPorDia[dia] = horario.filter(item => item.dia === dia);
  });

  // Calcular posición para vista calendario
  const calcularPosicion = (clase) => {
    const inicioMinutos = horaAMinutos(clase.hora_inicio);
    const finMinutos = horaAMinutos(clase.hora_fin);
    const duracionMinutos = finMinutos - inicioMinutos;
    
    const inicioDelDia = rangoHoras.inicio * 60;
    const offsetMinutos = inicioMinutos - inicioDelDia;
    
    const pixelesPorMinuto = 100 / 60; // 100px por hora
    
    return {
      top: offsetMinutos * pixelesPorMinuto,
      height: duracionMinutos * pixelesPorMinuto
    };
  };

  // Función para obtener color de clase
  const obtenerColor = (index) => {
    const colores = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5', 'color-6'];
    return colores[index % colores.length];
  };

  if (loading) {
    return (
      <div className="ver-horario-container">
        <div className="ver-horario-content">
          <div className="loading-card-estudiante">
            <div className="loading-pulse-estudiante">
              <div className="loading-bar-estudiante"></div>
              <div className="loading-text-estudiante">Cargando horario...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (horario.length === 0) {
    return (
      <div className="ver-horario-container">
        <div className="ver-horario-content">
          <div className="empty-state-estudiante">
            <div className="empty-icon-estudiante">📚</div>
            <p>No tienes horarios asignados</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ver-horario-container">
      <div className="ver-horario-content">
        {/* Header */}
        <div className="ver-horario-header">
          <div className="header-content-estudiante">
            <div className="header-title-estudiante">
              <h1>📅 Mi Horario Semanal</h1>
              <p>Gestión de clases y horarios académicos</p>
            </div>
            <div className="header-buttons-estudiante">
              <button
                onClick={() => setVistaActual('semana')}
                className={`btn-vista-estudiante ${vistaActual === 'semana' ? 'active' : ''}`}
              >
                Vista Semana
              </button>
              <button
                onClick={() => setVistaActual('lista')}
                className={`btn-vista-estudiante ${vistaActual === 'lista' ? 'active' : ''}`}
              >
                Vista Lista
              </button>
            </div>
          </div>
        </div>

        {vistaActual === 'semana' ? (
          /* Vista Calendario */
          <div className="calendario-estudiante-wrapper">
            <div className="calendario-estudiante-scroll">
              <div className="calendario-estudiante-grid">
                {/* Header días */}
                <div className="grid-header-estudiante">
                  <div className="hora-header-estudiante">Hora</div>
                  {DIAS_ORDEN.map(dia => (
                    <div key={dia} className="dia-header-estudiante">
                      <div className="dia-nombre-estudiante">{dia}</div>
                      <div className="dia-count-estudiante">
                        {horarioPorDia[dia]?.length || 0} clases
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grid horas */}
                <div className="grid-body-estudiante">
                  <div className="hora-column-estudiante">
                    {horas.map(hora => (
                      <div key={hora} className="hora-cell-estudiante">
                        {hora}
                      </div>
                    ))}
                  </div>

                  {/* Columnas días */}
                  {DIAS_ORDEN.map((dia, diaIndex) => (
                    <div key={dia} className="dia-column-estudiante">
                      {horas.map(hora => (
                        <div key={hora} className="hora-slot-estudiante"></div>
                      ))}

                      {/* Clases */}
                      {horarioPorDia[dia]?.map((clase, index) => {
                        const posicion = calcularPosicion(clase);
                        const color = obtenerColor(diaIndex * 3 + index);
                        
                        return (
                          <div
                            key={`${dia}-${index}`}
                            className={`clase-block-estudiante ${color}`}
                            style={{
                              top: `${posicion.top}px`,
                              height: `${posicion.height}px`,
                              cursor: 'pointer'
                            }}
                            onClick={() => abrirModal(clase)}
                          >
                            <div className="clase-content-estudiante">
                              <div className="clase-info">
                                <div className="clase-titulo-estudiante">{clase.curso_nombre}</div>
                                <div className="clase-hora-estudiante">
                                  {clase.hora_inicio?.substring(0, 5)} - {clase.hora_fin?.substring(0, 5)}
                                </div>
                              </div>
                              <div className="clase-detalles-estudiante">
                                <div>📚 {clase.curso_codigo} - Sec. {clase.seccion}</div>
                                <div>🏫 Aula {clase.aula_id}</div>
                                <div>👨‍🏫 {clase.docente}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Vista Lista */
          <div className="lista-container-estudiante">
            {DIAS_ORDEN.map(dia => {
              const clasesDelDia = horarioPorDia[dia];
              if (!clasesDelDia || clasesDelDia.length === 0) return null;

              return (
                <div key={dia} className="lista-dia-estudiante">
                  <div className="lista-dia-header-estudiante">
                    <h3>{dia}</h3>
                    <span className="lista-badge-estudiante">
                      {clasesDelDia.length} {clasesDelDia.length === 1 ? 'clase' : 'clases'}
                    </span>
                  </div>
                  <div className="lista-clases-estudiante">
                    {clasesDelDia
                      .sort((a, b) => horaAMinutos(a.hora_inicio) - horaAMinutos(b.hora_inicio))
                      .map((clase, index) => (
                        <div 
                          key={`${dia}-${index}`} 
                          className="lista-clase-item-estudiante"
                          onClick={() => abrirModal(clase)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="lista-hora-estudiante">
                            <div className="hora-inicio-estudiante">{clase.hora_inicio?.substring(0, 5)}</div>
                            <div className="hora-fin-estudiante">{clase.hora_fin?.substring(0, 5)}</div>
                          </div>
                          <div className="lista-clase-info-estudiante">
                            <h4>{clase.curso_nombre}</h4>
                            <div className="lista-clase-meta-estudiante">
                              <span>📚 {clase.curso_codigo} - Sección {clase.seccion}</span>
                              <span>🏫 Aula {clase.aula_id}</span>
                              <span>👨‍🏫 {clase.docente}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Estadísticas */}
        {horario.length > 0 && (
          <div className="estadisticas-grid-estudiante">
            <div className="estadistica-card-estudiante">
              <div className="estadistica-valor-estudiante">{horario.length}</div>
              <div className="estadistica-label-estudiante">Total de Clases</div>
            </div>
            <div className="estadistica-card-estudiante">
              <div className="estadistica-valor-estudiante">
                {Object.values(horarioPorDia).filter(d => d.length > 0).length}
              </div>
              <div className="estadistica-label-estudiante">Días Activos</div>
            </div>
            <div className="estadistica-card-estudiante">
              <div className="estadistica-valor-estudiante">
                {new Set(horario.map(c => c.curso_codigo)).size}
              </div>
              <div className="estadistica-label-estudiante">Cursos Diferentes</div>
            </div>
          </div>
        )}

        {/* Modal de Detalles de Clase */}
        {modalAbierto && claseSeleccionada && (
          <div className="modal-overlay" onClick={cerrarModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>📚 Detalles de la Clase</h2>
                <button className="modal-close" onClick={cerrarModal}>✕</button>
              </div>
              
              <div className="modal-body">
                {/* Curso Info */}
                <div className="modal-section">
                  <h3 className="modal-section-title">Información del Curso</h3>
                  <div className="modal-info-grid">
                    <div className="modal-info-item">
                      <span className="modal-info-label">📖 Curso:</span>
                      <span className="modal-info-value">{claseSeleccionada.curso_nombre}</span>
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">🔢 Código:</span>
                      <span className="modal-info-value">{claseSeleccionada.curso_codigo}</span>
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">⭐ Créditos:</span>
                      <span className="modal-info-value">{claseSeleccionada.creditos}</span>
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">👥 Sección:</span>
                      <span className="modal-info-value">{claseSeleccionada.seccion}</span>
                    </div>
                  </div>
                </div>

                {/* Horario Info */}
                <div className="modal-section">
                  <h3 className="modal-section-title">Horario</h3>
                  <div className="modal-info-grid">
                    <div className="modal-info-item">
                      <span className="modal-info-label">📅 Día:</span>
                      <span className="modal-info-value">{claseSeleccionada.dia}</span>
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">🕐 Hora Inicio:</span>
                      <span className="modal-info-value">{claseSeleccionada.hora_inicio?.substring(0, 5)}</span>
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">🕑 Hora Fin:</span>
                      <span className="modal-info-value">{claseSeleccionada.hora_fin?.substring(0, 5)}</span>
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">🔢 Bloque:</span>
                      <span className="modal-info-value">{claseSeleccionada.codigo_bloque || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Ubicación Info */}
                <div className="modal-section">
                  <h3 className="modal-section-title">Ubicación</h3>
                  <div className="modal-info-grid">
                    <div className="modal-info-item modal-info-item-full">
                      <span className="modal-info-label">🏫 Aula:</span>
                      <span className="modal-info-value-highlight">{claseSeleccionada.aula_id || 'No asignada'}</span>
                    </div>
                  </div>
                </div>

                {/* Docente Info */}
                <div className="modal-section">
                  <h3 className="modal-section-title">Docente</h3>
                  <div className="modal-info-grid">
                    <div className="modal-info-item modal-info-item-full">
                      <span className="modal-info-label">👨‍🏫 Profesor:</span>
                      <span className="modal-info-value">{claseSeleccionada.docente}</span>
                    </div>
                  </div>
                </div>

                {/* Asistencia Info */}
                <div className="modal-section">
                  <h3 className="modal-section-title">Asistencia</h3>
                  <div className="modal-asistencia-container">
                    <div className="modal-asistencia-value">
                      {claseSeleccionada.porcentaje_asistencia}%
                    </div>
                    <div className="modal-asistencia-bar">
                      <div 
                        className="modal-asistencia-bar-fill"
                        style={{ 
                          width: `${claseSeleccionada.porcentaje_asistencia}%`,
                          background: claseSeleccionada.porcentaje_asistencia >= 70 ? '#27ae60' : '#e74c3c'
                        }}
                      ></div>
                    </div>
                    <div className="modal-asistencia-label">
                      {claseSeleccionada.porcentaje_asistencia >= 70 ? '✅ Buen nivel' : '⚠️ Atención requerida'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="modal-btn-close" onClick={cerrarModal}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerHorario;