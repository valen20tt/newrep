from flask import Blueprint, jsonify, request
from database.db import get_db
from datetime import datetime, date

asistencia_bp = Blueprint('asistencia', __name__)

# 1. OBTENER LISTA DE ESTUDIANTES MATRICULADOS - USA ASIGNACION_ID
@asistencia_bp.route("/estudiantes/<int:asignacion_id>", methods=['GET'])
def obtener_estudiantes_clase(asignacion_id):
    """
    Obtiene la lista de estudiantes y verifica si ya se tomó asistencia hoy
    """
    conn = None
    cur = None
    try:
        print(f"🔍 Buscando estudiantes para asignacion_id={asignacion_id}")
        
        conn = get_db()
        cur = conn.cursor()
        
        # Obtener fecha actual
        fecha_hoy = date.today().isoformat()
        
        # Primero obtener la información del horario del bloque
        cur.execute("""
            SELECT 
                bh.hora_inicio,
                bh.hora_fin,
                bh.dia
            FROM asignaciones a
            LEFT JOIN bloque_horario bh ON a.bloque_id = bh.bloque_id
            WHERE a.asignacion_id = %s
        """, (asignacion_id,))
        
        horario_info = cur.fetchone()
        hora_inicio = str(horario_info[0]) if horario_info and horario_info[0] else None
        hora_fin = str(horario_info[1]) if horario_info and horario_info[1] else None
        dia = horario_info[2] if horario_info and horario_info[2] else None
        
        # Obtener curso_id y seccion_id
        cur.execute("""
            SELECT curso_id, seccion_id 
            FROM asignaciones 
            WHERE asignacion_id = %s
        """, (asignacion_id,))
        
        result = cur.fetchone()
        if not result:
            return jsonify({'error': 'Asignación no encontrada'}), 404
        
        curso_id, seccion_id = result
        
        # ⚠️ VERIFICAR SI YA EXISTE ASISTENCIA PARA HOY
        cur.execute("""
            SELECT sesion_id
            FROM sesion_clase
            WHERE curso_id = %s 
            AND seccion_id = %s 
            AND fecha = %s
        """, (curso_id, seccion_id, fecha_hoy))
        
        sesion_existente = cur.fetchone()
        
        if sesion_existente:
            print(f"⚠️ Ya existe asistencia para hoy: {fecha_hoy}")
            return jsonify({
                'error': 'Ya se ha tomado asistencia para el día de hoy',
                'asistencia_tomada': True,
                'fecha': fecha_hoy
            }), 400
        
        # Consulta de estudiantes
        query = """
            SELECT 
                e.estudiante_id,
                p.nombres,
                p.apellidos,
                e.codigo_universitario,
                m.matricula_id,
                COALESCE(
                    (SELECT 
                        ROUND(
                            (COUNT(CASE WHEN a.estado = 'Presente' THEN 1 END)::numeric / 
                            NULLIF(COUNT(*), 0) * 100), 2
                        )
                     FROM asistencia a
                     WHERE a.matricula_id = m.matricula_id
                    ), 0
                ) as porcentaje_asistencia
            FROM matriculas m
            JOIN estudiante e ON m.estudiante_id = e.estudiante_id
            JOIN persona p ON e.persona_id = p.persona_id
            WHERE m.asignacion_id = %s
            AND m.estado = 'ACTIVA'
            ORDER BY p.apellidos, p.nombres
        """
        
        cur.execute(query, (asignacion_id,))
        rows = cur.fetchall()
        
        print(f"✅ Encontrados {len(rows)} estudiantes")
        
        if not rows:
            return jsonify({
                'message': 'No se encontraron estudiantes matriculados en esta clase',
                'estudiantes': [],
                'hora_inicio': hora_inicio,
                'hora_fin': hora_fin,
                'dia': dia
            }), 200
        
        column_names = [desc[0] for desc in cur.description]
        estudiantes = []
        for row in rows:
            estudiante = dict(zip(column_names, row))
            estudiantes.append(estudiante)
        
        return jsonify({
            'estudiantes': estudiantes,
            'total': len(estudiantes),
            'hora_inicio': hora_inicio,
            'hora_fin': hora_fin,
            'dia': dia
        }), 200
        
    except Exception as e:
        print(f"❌ Error al obtener estudiantes: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# 2. REGISTRAR ASISTENCIA - ✅ CORREGIDO CON VALIDACIÓN
@asistencia_bp.route("/registrar", methods=['POST'])
def registrar_asistencia():
    """
    Registra la asistencia usando asignacion_id
    ✅ AHORA VALIDA DUPLICADOS ANTES DE REGISTRAR
    """
    conn = None
    cur = None
    try:
        data = request.get_json()
        
        required = ['asignacion_id', 'docente_id', 'fecha', 'asistencias']
        for field in required:
            if field not in data:
                return jsonify({'error': f'Campo requerido: {field}'}), 400
        
        conn = get_db()
        cur = conn.cursor()
        
        # Obtener curso_id y seccion_id desde asignacion_id
        cur.execute("""
            SELECT curso_id, seccion_id 
            FROM asignaciones 
            WHERE asignacion_id = %s
        """, (data['asignacion_id'],))
        
        result = cur.fetchone()
        if not result:
            return jsonify({'error': 'Asignación no encontrada'}), 404
        
        curso_id, seccion_id = result
        
        # ⚠️⚠️⚠️ VALIDACIÓN CRÍTICA: VERIFICAR SI YA EXISTE ASISTENCIA PARA ESA FECHA
        cur.execute("""
            SELECT sesion_id, fecha
            FROM sesion_clase
            WHERE curso_id = %s 
            AND seccion_id = %s 
            AND fecha = %s
        """, (curso_id, seccion_id, data['fecha']))
        
        sesion_existente = cur.fetchone()
        
        if sesion_existente:
            fecha_formateada = sesion_existente[1].strftime('%d/%m/%Y')
            return jsonify({
                'error': f'Ya existe un registro de asistencia para la fecha {fecha_formateada}. No se pueden crear registros duplicados.',
                'asistencia_tomada': True,
                'fecha': str(sesion_existente[1]),
                'sesion_id': sesion_existente[0]
            }), 409  # 409 Conflict
        
        # ✅ Si no existe, proceder a crear el registro de sesión
        cur.execute("""
            INSERT INTO sesion_clase 
            (curso_id, seccion_id, docente_id, fecha, hora_inicio, hora_fin, observaciones)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING sesion_id
        """, (
            curso_id,
            seccion_id,
            data['docente_id'],
            data['fecha'],
            data.get('hora_inicio'),
            data.get('hora_fin'),
            data.get('observaciones', '')
        ))
        
        sesion_id = cur.fetchone()[0]
        
        # Registrar asistencias
        estudiantes_registrados = 0
        for asistencia in data['asistencias']:
            cur.execute("""
                INSERT INTO asistencia 
                (sesion_id, matricula_id, estado, fecha_registro)
                VALUES (%s, %s, %s, NOW())
            """, (
                sesion_id,
                asistencia['matricula_id'],
                asistencia['estado']
            ))
            estudiantes_registrados += 1
        
        conn.commit()
        
        # Calcular porcentajes de asistencia
        cur.execute("""
            SELECT 
                m.matricula_id,
                p.nombres,
                p.apellidos,
                COUNT(*) FILTER (WHERE a.estado = 'Presente') as presentes,
                COUNT(*) as total_sesiones,
                ROUND(
                    (COUNT(*) FILTER (WHERE a.estado = 'Presente')::numeric / 
                    NULLIF(COUNT(*), 0) * 100), 2
                ) as porcentaje
            FROM matriculas m
            JOIN estudiante e ON m.estudiante_id = e.estudiante_id
            JOIN persona p ON e.persona_id = p.persona_id
            LEFT JOIN asistencia a ON m.matricula_id = a.matricula_id
            WHERE m.asignacion_id = %s
            GROUP BY m.matricula_id, p.nombres, p.apellidos
            HAVING ROUND(
                (COUNT(*) FILTER (WHERE a.estado = 'Presente')::numeric / 
                NULLIF(COUNT(*), 0) * 100), 2
            ) < 70
            ORDER BY porcentaje ASC
        """, (data['asignacion_id'],))
        
        estudiantes_bajo_porcentaje = []
        for row in cur.fetchall():
            estudiantes_bajo_porcentaje.append({
                'matricula_id': row[0],
                'nombre': row[1],
                'apellido': row[2],
                'presentes': row[3],
                'total_sesiones': row[4],
                'porcentaje': float(row[5])
            })
        
        print(f"✅ Asistencia registrada exitosamente para sesión_id={sesion_id}")
        
        return jsonify({
            'message': 'Asistencia registrada exitosamente',
            'sesion_id': sesion_id,
            'estudiantes_registrados': estudiantes_registrados,
            'estudiantes_bajo_porcentaje': estudiantes_bajo_porcentaje
        }), 201
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ Error al registrar asistencia: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# 3. HISTORIAL - ACTUALIZADO
@asistencia_bp.route("/historial/<int:asignacion_id>", methods=['GET'])
def obtener_historial_asistencia(asignacion_id):
    """
    Obtiene el historial usando asignacion_id
    """
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # Primero obtener curso_id y seccion_id
        cur.execute("""
            SELECT curso_id, seccion_id 
            FROM asignaciones 
            WHERE asignacion_id = %s
        """, (asignacion_id,))
        
        result = cur.fetchone()
        if not result:
            return jsonify({'error': 'Asignación no encontrada'}), 404
        
        curso_id, seccion_id = result
        
        query = """
            SELECT 
                sc.sesion_id,
                sc.fecha,
                sc.hora_inicio,
                sc.hora_fin,
                sc.observaciones,
                COUNT(a.asistencia_id) as total_estudiantes,
                COUNT(CASE WHEN a.estado = 'Presente' THEN 1 END) as presentes,
                COUNT(CASE WHEN a.estado = 'Ausente' THEN 1 END) as ausentes,
                COUNT(CASE WHEN a.estado = 'Tardanza' THEN 1 END) as tardanzas
            FROM sesion_clase sc
            LEFT JOIN asistencia a ON sc.sesion_id = a.sesion_id
            WHERE sc.curso_id = %s AND sc.seccion_id = %s
            GROUP BY sc.sesion_id
            ORDER BY sc.fecha DESC, sc.hora_inicio DESC
        """
        
        cur.execute(query, (curso_id, seccion_id))
        rows = cur.fetchall()
        
        historial = []
        for row in rows:
            historial.append({
                'sesion_id': row[0],
                'fecha': str(row[1]) if row[1] else None,
                'hora_inicio': str(row[2]) if row[2] else None,
                'hora_fin': str(row[3]) if row[3] else None,
                'observaciones': row[4],
                'total_estudiantes': row[5],
                'presentes': row[6],
                'ausentes': row[7],
                'tardanzas': row[8]
            })
        
        return jsonify({'historial': historial}), 200
        
    except Exception as e:
        print(f"❌ Error al obtener historial: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# 4. MIS CURSOS - DEVUELVE ASIGNACION_ID
@asistencia_bp.route("/mis-cursos/<int:docente_id>", methods=['GET'])
def obtener_cursos_docente(docente_id):
    """
    Obtiene las asignaciones del docente (ahora incluye asignacion_id)
    """
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        
        query = """
            SELECT DISTINCT
                a.asignacion_id,
                c.curso_id,
                c.nombre as curso_nombre,
                c.codigo as curso_codigo,
                s.seccion_id,
                s.codigo as seccion_codigo,
                a.cantidad_estudiantes
            FROM asignaciones a
            JOIN curso c ON a.curso_id = c.curso_id
            JOIN secciones s ON a.seccion_id = s.seccion_id
            WHERE a.docente_id = %s
            ORDER BY c.nombre, s.codigo
        """
        
        cur.execute(query, (docente_id,))
        rows = cur.fetchall()
        
        cursos = []
        for row in rows:
            cursos.append({
                'asignacion_id': row[0],
                'curso_id': row[1],
                'curso_nombre': row[2],
                'curso_codigo': row[3],
                'seccion_id': row[4],
                'seccion_codigo': row[5],
                'cantidad_estudiantes': row[6]
            })
        
        return jsonify({'cursos': cursos}), 200
        
    except Exception as e:
        print(f"❌ Error al obtener cursos: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# 5. OBTENER HISTORIAL DE ASISTENCIA POR ESTUDIANTE
@asistencia_bp.route("/historial/estudiante/<int:matricula_id>", methods=['GET'])
def obtener_historial_estudiante(matricula_id):
    """
    Obtiene el historial de asistencia de un estudiante específico por matricula_id.
    """
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # Consulta para obtener todas las asistencias de esa matrícula
        query = """
            SELECT 
                sc.fecha,
                sc.hora_inicio,
                a.estado,
                a.fecha_registro
            FROM asistencia a
            JOIN sesion_clase sc ON a.sesion_id = sc.sesion_id
            WHERE a.matricula_id = %s
            ORDER BY sc.fecha ASC, sc.hora_inicio ASC
        """
        
        cur.execute(query, (matricula_id,))
        rows = cur.fetchall()
        
        historial = []
        for row in rows:
            historial.append({
                'fecha': str(row[0]) if row[0] else None,
                'hora_inicio': str(row[1]) if row[1] else None,
                'estado': row[2],
                'fecha_registro': str(row[3])
            })
        
        if not historial:
            return jsonify({
                'message': 'No hay registros de asistencia para este estudiante',
                'historial': []
            }), 200

        return jsonify({'historial': historial}), 200
        
    except Exception as e:
        print(f"❌ Error al obtener historial del estudiante: {e}")
        return jsonify({'error': str(e)}), 500
    
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# 6. OBTENER INFORME DE ASISTENCIA DE UN CURSO
@asistencia_bp.route("/informe/<int:asignacion_id>", methods=['GET'])
def obtener_informe_asistencia(asignacion_id):
    """
    Obtiene el informe completo de asistencia de un curso
    Muestra tabla con estudiantes y sus asistencias por fecha
    """
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # 1. Obtener información del curso
        cur.execute("""
            SELECT c.nombre, s.codigo, a.docente_id
            FROM asignaciones a
            JOIN curso c ON a.curso_id = c.curso_id
            JOIN secciones s ON a.seccion_id = s.seccion_id
            WHERE a.asignacion_id = %s
        """, (asignacion_id,))
        
        curso_info = cur.fetchone()
        if not curso_info:
            return jsonify({'error': 'Curso no encontrado'}), 404
        
        # 2. Obtener todas las sesiones del curso
        cur.execute("""
            SELECT 
                sc.sesion_id,
                sc.fecha,
                sc.hora_inicio,
                sc.hora_fin
            FROM sesion_clase sc
            JOIN asignaciones a ON sc.curso_id = a.curso_id AND sc.seccion_id = a.seccion_id
            WHERE a.asignacion_id = %s
            ORDER BY sc.fecha ASC
        """, (asignacion_id,))
        
        sesiones = []
        for row in cur.fetchall():
            sesiones.append({
                'sesion_id': row[0],
                'fecha': str(row[1]),
                'hora_inicio': str(row[2]) if row[2] else None,
                'hora_fin': str(row[3]) if row[3] else None
            })
        
        # 3. Obtener estudiantes con su asistencia
        cur.execute("""
            SELECT 
                e.estudiante_id,
                p.nombres,
                p.apellidos,
                e.codigo_universitario,
                m.matricula_id
            FROM matriculas m
            JOIN estudiante e ON m.estudiante_id = e.estudiante_id
            JOIN persona p ON e.persona_id = p.persona_id
            WHERE m.asignacion_id = %s
            AND m.estado = 'ACTIVA'
            ORDER BY p.apellidos, p.nombres
        """, (asignacion_id,))
        
        estudiantes = []
        for row in cur.fetchall():
            estudiante_id = row[0]
            matricula_id = row[4]
            
            # Obtener todas las asistencias del estudiante
            cur.execute("""
                SELECT 
                    a.sesion_id,
                    a.estado,
                    sc.fecha
                FROM asistencia a
                JOIN sesion_clase sc ON a.sesion_id = sc.sesion_id
                WHERE a.matricula_id = %s
                ORDER BY sc.fecha ASC
            """, (matricula_id,))
            
            asistencias_dict = {}
            total_sesiones = 0
            presentes = 0
            ausentes = 0
            tardanzas = 0
            
            for ast_row in cur.fetchall():
                sesion_id = ast_row[0]
                estado = ast_row[1]
                fecha = str(ast_row[2])
                
                asistencias_dict[sesion_id] = estado
                total_sesiones += 1
                
                if estado == 'Presente':
                    presentes += 1
                elif estado == 'Ausente':
                    ausentes += 1
                elif estado == 'Tardanza':
                    tardanzas += 1
            
            # Calcular porcentaje
            porcentaje = round((presentes / total_sesiones * 100), 2) if total_sesiones > 0 else 0
            
            estudiantes.append({
                'estudiante_id': estudiante_id,
                'nombres': row[1],
                'apellidos': row[2],
                'codigo_universitario': row[3],
                'matricula_id': matricula_id,
                'asistencias': asistencias_dict,
                'total_sesiones': total_sesiones,
                'presentes': presentes,
                'ausentes': ausentes,
                'tardanzas': tardanzas,
                'porcentaje': porcentaje
            })
        
        return jsonify({
            'curso': {
                'nombre': curso_info[0],
                'seccion': curso_info[1]
            },
            'sesiones': sesiones,
            'estudiantes': estudiantes
        }), 200
        
    except Exception as e:
        print(f"❌ Error al obtener informe: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()