import React, { useEffect, useState } from "react";
import * as XLSX from 'xlsx-js-style';
import '../styles/tomar-asistencia.css';

function TomarAsistencia() {
  const docenteId = sessionStorage.getItem("docente_id");

  // Estados principales
  const [vista, setVista] = useState('seleccionar');
  const [cursos, setCursos] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null);
  const [estudiantes, setEstudiantes] = useState([]);
  const [asistencias, setAsistencias] = useState({});
  
  // Datos de la sesión
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [observaciones, setObservaciones] = useState('');
  
  // Estados de informe
  const [informe, setInforme] = useState(null);
  
  // Estados de UI
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    if (!docenteId) {
      setError("No se encontró el ID del docente. Por favor, inicie sesión.");
      return;
    }
    cargarCursos();
  }, [docenteId]);

  const cargarCursos = async () => {
    setCargando(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/asistencia/mis-cursos/${docenteId}`);
      if (!response.ok) throw new Error('Error al cargar cursos');
      const data = await response.json();
      setCursos(data.cursos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const seleccionarCurso = async (curso) => {
    setCursoSeleccionado(curso);
    setCargando(true);
    setError(null);
    
    try {
      const response = await fetch(
        `http://localhost:5000/api/asistencia/estudiantes/${curso.asignacion_id}`
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.asistencia_tomada) {
          setError(`⚠️ ${data.error}`);
          setCargando(false);
          return;
        }
        throw new Error('Error al cargar estudiantes');
      }
      
      setEstudiantes(data.estudiantes);
      
      if (data.hora_inicio) {
        setHoraInicio(data.hora_inicio.substring(0, 5));
      }
      if (data.hora_fin) {
        setHoraFin(data.hora_fin.substring(0, 5));
      }
      
      const asistenciasIniciales = {};
      data.estudiantes.forEach(est => {
        asistenciasIniciales[est.matricula_id] = null;
      });
      setAsistencias(asistenciasIniciales);
      
      setVista('tomar');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const marcarAsistencia = (matriculaId, estado) => {
    setAsistencias(prev => ({
      ...prev,
      [matriculaId]: estado
    }));
  };

  const marcarTodos = (estado) => {
    const nuevasAsistencias = {};
    estudiantes.forEach(est => {
      nuevasAsistencias[est.matricula_id] = estado;
    });
    setAsistencias(nuevasAsistencias);
  };

  const guardarAsistencia = async () => {
    if (!horaInicio || !horaFin) {
      setError("Por favor, ingrese las horas de inicio y fin de la clase");
      return;
    }

    const sinMarcar = estudiantes.filter(est => !asistencias[est.matricula_id]);
    if (sinMarcar.length > 0) {
      setError(`Faltan marcar ${sinMarcar.length} estudiantes`);
      return;
    }

    setCargando(true);
    setError(null);

    const asistenciasArray = Object.entries(asistencias).map(([matricula_id, estado]) => ({
      matricula_id: parseInt(matricula_id),
      estado
    }));

    // ⚠️ IMPORTANTE: Enviar fecha en formato local sin conversión UTC
    const fechaLocal = fecha; // Ya está en formato YYYY-MM-DD

    const payload = {
      asignacion_id: cursoSeleccionado.asignacion_id,
      docente_id: parseInt(docenteId),
      fecha: fechaLocal,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      observaciones,
      asistencias: asistenciasArray
    };

    try {
      const response = await fetch('http://localhost:5000/api/asistencia/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      // Si hay error de duplicado (código 409)
      if (response.status === 409) {
        setError(data.error);
        setCargando(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar asistencia');
      }
      
      setExito(true);
      setTimeout(() => {
        reiniciar();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const verInforme = async (curso) => {
    setCursoSeleccionado(curso);
    setCargando(true);
    setError(null);
    
    try {
      const response = await fetch(
        `http://localhost:5000/api/asistencia/informe/${curso.asignacion_id}`
      );
      
      if (!response.ok) throw new Error('Error al cargar informe');
      
      const data = await response.json();
      
      // 🔧 FIX: Formatear fechas correctamente para evitar cambios de zona horaria
      if (data.sesiones) {
        data.sesiones = data.sesiones.map(sesion => ({
          ...sesion,
          fecha: sesion.fecha.split('T')[0] // Tomar solo YYYY-MM-DD
        }));
      }
      
      setInforme(data);
      setVista('informe');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const reiniciar = () => {
    setVista('seleccionar');
    setCursoSeleccionado(null);
    setEstudiantes([]);
    setAsistencias({});
    setObservaciones('');
    setInforme(null);
    setError(null);
    setExito(false);
    setFecha(new Date().toISOString().split('T')[0]);
    setHoraInicio('');
    setHoraFin('');
  };

  const exportarExcel = () => {
    if (!informe) return;

    const datosExcel = [];
    
    datosExcel.push(['INFORME DE ASISTENCIA']);
    datosExcel.push([`${informe.curso.nombre} - Sección ${informe.curso.seccion}`]);
    datosExcel.push([`Generado el: ${new Date().toLocaleDateString('es-PE', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      timeZone: 'America/Lima'
    })}`]);
    datosExcel.push([]);

    const encabezados = [
      'N°',
      'Código',
      'Nombre Completo',
      ...informe.sesiones.map(s => {
        const fecha = s.fecha.includes('T') ? s.fecha.split('T')[0] : s.fecha;
        const [year, month, day] = fecha.split('-');
        return `${day}/${month}`;
      }),
      'Total',
      'Presentes',
      'Ausentes',
      'Tardanzas',
      '% Asistencia'
    ];
    datosExcel.push(encabezados);

    informe.estudiantes.forEach((estudiante, index) => {
      const fila = [
        index + 1,
        estudiante.codigo_universitario,
        `${estudiante.nombres} ${estudiante.apellidos}`,
        ...informe.sesiones.map(sesion => {
          const estado = estudiante.asistencias[sesion.sesion_id];
          if (estado === 'Presente') return '✓';
          if (estado === 'Ausente') return '✗';
          if (estado === 'Tardanza') return '⏱';
          return '-';
        }),
        estudiante.total_sesiones,
        estudiante.presentes,
        estudiante.ausentes,
        estudiante.tardanzas,
        estudiante.porcentaje / 100
      ];
      datosExcel.push(fila);
    });

    datosExcel.push([]);
    datosExcel.push(['RESUMEN GENERAL']);
    datosExcel.push(['Total Estudiantes:', informe.estudiantes.length]);
    datosExcel.push(['Total Sesiones:', informe.sesiones.length]);
    datosExcel.push(['Promedio Asistencia:', 
      (informe.estudiantes.reduce((sum, e) => sum + e.porcentaje, 0) / informe.estudiantes.length / 100)
    ]);

    const ws = XLSX.utils.aoa_to_sheet(datosExcel);
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // Estilos para el Excel (manteniendo tu código original de estilos)
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = ws[XLSX.utils.encode_cell({r: 0, c: C})];
      if (cell) {
        cell.s = {
          font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "2C3E50" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
    }

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: range.e.c } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: range.e.c } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: range.e.c } }
    ];

    const colWidths = [
      { wch: 5 },
      { wch: 15 },
      { wch: 40 },
      ...informe.sesiones.map(() => ({ wch: 10 })),
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 }
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');

    const nombreArchivo = `Asistencia_${informe.curso.nombre.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('es-PE', { 
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      timeZone: 'America/Lima'
    }).replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  };

  const imprimirInforme = () => {
    window.print();
  };

  const calcularEstadisticas = () => {
    let presentes = 0, ausentes = 0, tardanzas = 0;
    Object.values(asistencias).forEach(estado => {
      if (estado === 'Presente') presentes++;
      else if (estado === 'Ausente') ausentes++;
      else if (estado === 'Tardanza') tardanzas++;
    });
    return { presentes, ausentes, tardanzas };
  };

  const stats = calcularEstadisticas();

  if (cargando && vista === 'seleccionar') {
    return (
      <div className="loading-container">
        <div className="loading-spinner">⏳</div>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="asistencia-container">
      
      {vista === 'seleccionar' && (
        <div>
          <div className="asistencia-header">
            <div className="header-title">
              <h1>📋 Gestión de Asistencia</h1>
              <p>Selecciona un curso para continuar</p>
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              <strong>⚠️ {error}</strong>
            </div>
          )}

          <div className="cursos-grid">
            {cursos.map(curso => (
              <div key={curso.asignacion_id} className="curso-card">
                <div className="curso-header">
                  <h3>{curso.curso_nombre}</h3>
                  <span className="curso-badge">{curso.curso_codigo}</span>
                </div>
                <div className="curso-info">
                  <p>Sección: <strong>{curso.seccion_codigo}</strong></p>
                  <p>Estudiantes: <strong>{curso.cantidad_estudiantes}</strong></p>
                </div>
                <div className="curso-actions">
                  <button 
                    className="btn btn-success btn-block"
                    onClick={() => seleccionarCurso(curso)}
                  >
                    📝 Tomar Asistencia
                  </button>
                  <button 
                    className="btn btn-secondary btn-block"
                    onClick={() => verInforme(curso)}
                  >
                    📊 Ver Informe
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {vista === 'tomar' && (
        <div>
          <div className="asistencia-header">
            <div className="header-title">
              <h1>{cursoSeleccionado.curso_nombre}</h1>
              <p>Sección {cursoSeleccionado.seccion_codigo} • {fecha}</p>
            </div>
            <button 
              className="btn btn-secondary"
              onClick={reiniciar}
            >
              ← Volver
            </button>
          </div>

          <div className="sesion-form">
            <div className="form-grid">
              <div className="form-group">
                <label>📅 Fecha</label>
                <input 
                  type="date" 
                  value={fecha} 
                  onChange={(e) => setFecha(e.target.value)}
                  disabled
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>🕐 Hora Inicio</label>
                <input 
                  type="time" 
                  value={horaInicio} 
                  onChange={(e) => setHoraInicio(e.target.value)}
                  required
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>🕑 Hora Fin</label>
                <input 
                  type="time" 
                  value={horaFin} 
                  onChange={(e) => setHoraFin(e.target.value)}
                  required
                  className="form-control"
                />
              </div>
            </div>
            <div className="form-group">
              <label>📝 Observaciones (opcional)</label>
              <textarea 
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: Clase de introducción..."
                className="form-control"
              />
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card total">
              <div className="stat-value">{estudiantes.length}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-card presentes">
              <div className="stat-value">{stats.presentes}</div>
              <div className="stat-label">Presentes</div>
            </div>
            <div className="stat-card ausentes">
              <div className="stat-value">{stats.ausentes}</div>
              <div className="stat-label">Ausentes</div>
            </div>
            <div className="stat-card tardanzas">
              <div className="stat-value">{stats.tardanzas}</div>
              <div className="stat-label">Tardanzas</div>
            </div>
          </div>

          <div className="d-flex gap-2 mb-3">
            <button 
              className="btn btn-success btn-block"
              onClick={() => marcarTodos('Presente')}
            >
              ✓ Marcar todos presentes
            </button>
            <button 
              className="btn btn-danger btn-block"
              onClick={() => marcarTodos('Ausente')}
            >
              ✗ Marcar todos ausentes
            </button>
          </div>

          <div className="table-container">
            <div className="table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre Completo</th>
                    <th className="text-center">Presente</th>
                    <th className="text-center">Ausente</th>
                    <th className="text-center">Tardanza</th>
                    <th className="text-center">% Asistencia</th>
                  </tr>
                </thead>
                <tbody>
                  {estudiantes.map((estudiante) => (
                    <tr key={estudiante.matricula_id}>
                      <td>{estudiante.codigo_universitario}</td>
                      <td>{estudiante.nombres} {estudiante.apellidos}</td>
                      <td className="text-center">
                        <button
                          className={`attendance-btn ${asistencias[estudiante.matricula_id] === 'Presente' ? 'presente active' : ''}`}
                          onClick={() => marcarAsistencia(estudiante.matricula_id, 'Presente')}
                        >
                          ✓
                        </button>
                      </td>
                      <td className="text-center">
                        <button
                          className={`attendance-btn ${asistencias[estudiante.matricula_id] === 'Ausente' ? 'ausente active' : ''}`}
                          onClick={() => marcarAsistencia(estudiante.matricula_id, 'Ausente')}
                        >
                          ✗
                        </button>
                      </td>
                      <td className="text-center">
                        <button
                          className={`attendance-btn ${asistencias[estudiante.matricula_id] === 'Tardanza' ? 'tardanza active' : ''}`}
                          onClick={() => marcarAsistencia(estudiante.matricula_id, 'Tardanza')}
                        >
                          ⏱
                        </button>
                      </td>
                      <td className="text-center">
                        <span className={`percentage-badge ${
                          estudiante.porcentaje_asistencia < 70 ? 'low' : 
                          estudiante.porcentaje_asistencia >= 90 ? 'high' : 'medium'
                        }`}>
                          {estudiante.porcentaje_asistencia}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              <strong>⚠️ {error}</strong>
            </div>
          )}

          {exito && (
            <div className="alert alert-success">
              <strong>✅ ¡Asistencia guardada exitosamente!</strong>
            </div>
          )}

          <div className="d-flex gap-2 mt-3">
            <button 
              className="btn btn-secondary"
              onClick={() => verInforme(cursoSeleccionado)}
            >
              📊 Ver Informe de Asistencia
            </button>
            <button 
              className="btn btn-primary btn-block btn-lg"
              onClick={guardarAsistencia}
              disabled={cargando}
            >
              {cargando ? 'Guardando...' : '💾 Guardar Asistencia'}
            </button>
          </div>
        </div>
      )}

      {vista === 'informe' && informe && (
        <div>
          <div className="asistencia-header">
            <div className="header-title">
              <h1>📊 Informe de Asistencia</h1>
              <p>{informe.curso.nombre} - Sección {informe.curso.seccion}</p>
              <p>
                Generado el: {new Date().toLocaleDateString('es-PE', { 
                  day: '2-digit', 
                  month: 'long', 
                  year: 'numeric',
                  timeZone: 'America/Lima'
                })}
              </p>
            </div>
            <div className="header-actions">
              <button className="btn btn-secondary" onClick={reiniciar}>
                ← Volver
              </button>
              <button className="btn btn-primary" onClick={imprimirInforme}>
                🖨️ Imprimir
              </button>
              <button className="btn btn-success" onClick={exportarExcel}>
                📥 Exportar Excel
              </button>
            </div>
          </div>

          <div className="table-container">
            <div className="table-wrapper">
              <table className="informe-table">
                <thead>
                  <tr>
                    <th rowSpan="2">N°</th>
                    <th rowSpan="2">Código</th>
                    <th rowSpan="2">Nombre Completo</th>
                    <th colSpan={informe.sesiones.length}>Fechas de Clase</th>
                    <th rowSpan="2">Total</th>
                    <th rowSpan="2">Presente</th>
                    <th rowSpan="2">Ausente</th>
                    <th rowSpan="2">Tardanza</th>
                    <th rowSpan="2">% Asistencia</th>
                  </tr>
                  <tr>
                    {informe.sesiones.map((sesion) => {
                      const fecha = sesion.fecha.includes('T') ? sesion.fecha.split('T')[0] : sesion.fecha;
                      const [year, month, day] = fecha.split('-');
                      return (
                        <th key={sesion.sesion_id}>
                          {`${day}/${month}`}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {informe.estudiantes.map((estudiante, index) => (
                    <tr key={estudiante.matricula_id}>
                      <td className="text-center">{index + 1}</td>
                      <td>{estudiante.codigo_universitario}</td>
                      <td>{estudiante.nombres} {estudiante.apellidos}</td>
                      {informe.sesiones.map(sesion => {
                        const estado = estudiante.asistencias[sesion.sesion_id];
                        return (
                          <td key={sesion.sesion_id} className="text-center">
                            {estado === 'Presente' && <span className="attendance-mark presente">✓</span>}
                            {estado === 'Ausente' && <span className="attendance-mark ausente">✗</span>}
                            {estado === 'Tardanza' && <span className="attendance-mark tardanza">⏱</span>}
                            {!estado && <span className="attendance-mark empty">-</span>}
                          </td>
                        );
                      })}
                      <td className="text-center"><strong>{estudiante.total_sesiones}</strong></td>
                      <td className="text-center col-presentes">{estudiante.presentes}</td>
                      <td className="text-center col-ausentes">{estudiante.ausentes}</td>
                      <td className="text-center col-tardanzas">{estudiante.tardanzas}</td>
                      <td className="text-center">
                        <span className={`percentage-badge ${
                          estudiante.porcentaje < 70 ? 'low' : 
                          estudiante.porcentaje >= 90 ? 'high' : 'medium'
                        }`}>
                          {estudiante.porcentaje}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="resumen-general">
            <h3>📈 Resumen General</h3>
            <div className="resumen-grid">
              <div className="resumen-item">
                <span>Total Sesiones:</span>
                <strong>{informe.sesiones.length}</strong>
              </div>
              <div className="resumen-item">
                <span>Total Estudiantes:</span>
                <strong>{informe.estudiantes.length}</strong>
              </div>
              <div className="resumen-item promedio">
                <span>Promedio Asistencia:</span>
                <strong>
                  {(informe.estudiantes.reduce((sum, e) => sum + e.porcentaje, 0) / informe.estudiantes.length).toFixed(2)}%
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default TomarAsistencia;