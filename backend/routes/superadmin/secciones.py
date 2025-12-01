
from flask import Blueprint, request, jsonify
from psycopg2.extras import RealDictCursor
import psycopg2
from database.db import get_db  

secciones_bp = Blueprint('secciones', __name__)

# ========== RUTAS ==========
@secciones_bp.route('/secciones', methods=['GET'])
def get_secciones():
    """Obtener todas las secciones"""
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT seccion_id, codigo, ciclo_academico, periodo, estado 
            FROM secciones 
            ORDER BY periodo DESC, ciclo_academico, codigo
        """)
        
        secciones = cur.fetchall()
        return jsonify(secciones), 200
        
    except Exception as e:
        print(f"❌ Error al obtener secciones: {str(e)}")
        return jsonify({"error": "Error interno al obtener secciones."}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()


@secciones_bp.route('/secciones', methods=['POST'])
def create_seccion():
    """Crear una nueva sección"""
    data = request.get_json()
    codigo = data.get('codigo')
    ciclo_academico = data.get('ciclo_academico')
    periodo = data.get('periodo')
    estado = data.get('estado', 'ACTIVO')

    if not codigo or not ciclo_academico or not periodo:
        return jsonify({"error": "Datos incompletos: código, ciclo y periodo son requeridos."}), 400

    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Verificar duplicado
        cur.execute("""
            SELECT 1 FROM secciones 
            WHERE codigo = %s AND ciclo_academico = %s AND periodo = %s
        """, (codigo, ciclo_academico, periodo))

        if cur.fetchone():
            return jsonify({"error": "⛔ La sección ya existe."}), 400

        cur.execute("""
            INSERT INTO secciones (codigo, ciclo_academico, periodo, estado) 
            VALUES (%s, %s, %s, %s)
            RETURNING seccion_id, codigo, ciclo_academico, periodo, estado
        """, (codigo, ciclo_academico, periodo, estado))
        
        nueva_seccion = cur.fetchone()
        conn.commit()
        
        return jsonify(nueva_seccion), 201

    except psycopg2.IntegrityError as e:
        if conn: conn.rollback()
        return jsonify({"error": "La sección ya existe."}), 409 

    except Exception as e:
        if conn: conn.rollback()
        print(f"❌ Error al crear sección: {e}")
        return jsonify({"error": "Error interno del servidor."}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@secciones_bp.route('/secciones/<int:id>', methods=['PUT'])
def update_seccion(id):
    """Actualizar una sección existente"""
    data = request.get_json()
    codigo = data.get('codigo')
    ciclo_academico = data.get('ciclo_academico')
    periodo = data.get('periodo')
    estado = data.get('estado', 'ACTIVO')

    if not codigo or not ciclo_academico or not periodo:
        return jsonify({"error": "Datos incompletos"}), 400

    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Verificar que la sección existe
        cur.execute("SELECT * FROM secciones WHERE seccion_id = %s", (id,))
        if not cur.fetchone():
            return jsonify({"error": "Sección no encontrada"}), 404
        
        # Verificar duplicado (excluyendo la sección actual)
        cur.execute("""
            SELECT 1 FROM secciones 
            WHERE codigo = %s AND ciclo_academico = %s AND periodo = %s
            AND seccion_id != %s
        """, (codigo, ciclo_academico, periodo, id))

        if cur.fetchone():
            return jsonify({"error": "⛔ Ya existe otra sección con esos datos."}), 400

        # Actualizar
        cur.execute("""
            UPDATE secciones 
            SET codigo = %s, ciclo_academico = %s, periodo = %s, estado = %s
            WHERE seccion_id = %s
            RETURNING seccion_id, codigo, ciclo_academico, periodo, estado
        """, (codigo, ciclo_academico, periodo, estado, id))
        
        seccion_actualizada = cur.fetchone()
        conn.commit()
        
        return jsonify(seccion_actualizada), 200

    except Exception as e:
        if conn: conn.rollback()
        print(f"❌ Error al actualizar sección: {e}")
        return jsonify({"error": "Error interno del servidor."}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@secciones_bp.route('/secciones/<int:id>', methods=['DELETE'])
def delete_seccion(id):
    """
    Eliminar sección con todas sus dependencias en cascada.
    
    Estructura de dependencias:
    secciones
    ├── asignaciones (nivel 1)
    │   ├── materiales (nivel 2)
    │   └── matriculas (nivel 2)
    │       └── asistencia (nivel 3) [via matricula_id]
    └── sesion_clase (nivel 1)
        └── asistencia (nivel 2) [via sesion_id]
    
    Orden de eliminación:
    1. Asistencias (las más profundas - nivel 3 y 2)
    2. Matrículas (nivel 2)
    3. Materiales (nivel 2)
    4. Sesiones de clase (nivel 1)
    5. Asignaciones (nivel 1)
    6. Sección (raíz)
    """
    force_delete = request.args.get("force") == "true"

    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # 1️⃣ Verificar si existe la sección
        cur.execute("SELECT * FROM secciones WHERE seccion_id = %s", (id,))
        seccion = cur.fetchone()

        if not seccion:
            return jsonify({"error": "NOT_FOUND", "mensaje": "La sección no existe."}), 404

        # 2️⃣ Obtener asignaciones vinculadas
        cur.execute("""
            SELECT 
                a.asignacion_id, 
                d.codigo_docente, 
                c.nombre AS curso,
                c.codigo AS codigo_curso
            FROM asignaciones a
            LEFT JOIN docente d ON d.docente_id = a.docente_id
            LEFT JOIN curso c ON c.curso_id = a.curso_id
            WHERE a.seccion_id = %s
        """, (id,))
        asignaciones = cur.fetchall()

        # 3️⃣ Obtener sesiones de clase vinculadas
        cur.execute("""
            SELECT 
                sc.sesion_id, 
                sc.fecha, 
                sc.hora_inicio,
                sc.hora_fin,
                sc.observaciones,
                c.nombre AS curso,
                (p.nombres || ' ' || p.apellidos) AS docente
            FROM sesion_clase sc
            LEFT JOIN curso c ON sc.curso_id = c.curso_id
            LEFT JOIN docente d ON sc.docente_id = d.docente_id
            LEFT JOIN persona p ON d.persona_id = p.persona_id
            WHERE sc.seccion_id = %s
        """, (id,))
        sesiones_clase = cur.fetchall()

        # 4️⃣ Contar todos los registros relacionados
        matriculas_info = []
        materiales_count = 0
        asistencias_matricula_count = 0
        asistencias_sesion_count = 0
        
        if asignaciones:
            asignacion_ids = [a['asignacion_id'] for a in asignaciones]
            
            # Contar matrículas
            cur.execute("""
                SELECT 
                    m.matricula_id,
                    e.codigo_universitario,
                    c.nombre AS curso
                FROM matriculas m
                JOIN estudiante e ON m.estudiante_id = e.estudiante_id
                JOIN asignaciones a ON m.asignacion_id = a.asignacion_id
                JOIN curso c ON a.curso_id = c.curso_id
                WHERE m.asignacion_id = ANY(%s)
            """, (asignacion_ids,))
            matriculas_info = cur.fetchall()
            matricula_ids = [m['matricula_id'] for m in matriculas_info]
            
            # Contar materiales
            cur.execute("""
                SELECT COUNT(*) as total
                FROM materiales
                WHERE asignacion_id = ANY(%s)
            """, (asignacion_ids,))
            materiales_count = cur.fetchone()['total']
            
            # Contar asistencias vía matrícula
            if matricula_ids:
                cur.execute("""
                    SELECT COUNT(*) as total
                    FROM asistencia
                    WHERE matricula_id = ANY(%s)
                """, (matricula_ids,))
                asistencias_matricula_count = cur.fetchone()['total']
        
        # Contar asistencias vía sesión de clase
        if sesiones_clase:
            sesion_ids = [s['sesion_id'] for s in sesiones_clase]
            cur.execute("""
                SELECT COUNT(*) as total
                FROM asistencia
                WHERE sesion_id = ANY(%s)
            """, (sesion_ids,))
            asistencias_sesion_count = cur.fetchone()['total']

        # 5️⃣ Si hay datos vinculados y NO pidió force → mostrar confirmación
        total_asistencias = asistencias_matricula_count + asistencias_sesion_count
        
        if (asignaciones or sesiones_clase or matriculas_info) and not force_delete:
            detalle_completo = []
            
            # Asignaciones
            for asig in asignaciones:
                detalle_completo.append({
                    "tipo": "Asignación",
                    "descripcion": f"{asig['curso']} - {asig['codigo_docente'] or 'Sin docente'}"
                })
            
            # Sesiones de clase
            for sesion in sesiones_clase:
                fecha_formato = sesion.get('fecha', '').strftime('%d/%m/%Y') if sesion.get('fecha') else 'Sin fecha'
                hora_inicio = sesion.get('hora_inicio', '').strftime('%H:%M') if sesion.get('hora_inicio') else ''
                hora_fin = sesion.get('hora_fin', '').strftime('%H:%M') if sesion.get('hora_fin') else ''
                horario = f"{hora_inicio}-{hora_fin}" if hora_inicio and hora_fin else "Sin horario"
                
                descripcion = f"{sesion.get('curso', 'Sin curso')} - {fecha_formato} {horario}"
                if sesion.get('observaciones'):
                    descripcion += f" ({sesion['observaciones']})"
                
                detalle_completo.append({
                    "tipo": "Sesión de Clase",
                    "descripcion": descripcion
                })
            
            # Matrículas
            for mat in matriculas_info:
                detalle_completo.append({
                    "tipo": "Matrícula",
                    "descripcion": f"{mat['codigo_universitario']} en {mat['curso']}"
                })
            
            # Contadores
            if materiales_count > 0:
                detalle_completo.append({
                    "tipo": "Materiales",
                    "descripcion": f"{materiales_count} archivo(s) de material educativo"
                })
            
            if total_asistencias > 0:
                detalle_completo.append({
                    "tipo": "Asistencias",
                    "descripcion": f"{total_asistencias} registro(s) de asistencia"
                })

            return jsonify({
                "requiere_confirmacion": True,
                "mensaje": f"Esta sección tiene {len(detalle_completo)} registro(s) vinculado(s).",
                "resumen": {
                    "asignaciones": len(asignaciones),
                    "sesiones_clase": len(sesiones_clase),
                    "matriculas": len(matriculas_info),
                    "materiales": materiales_count,
                    "asistencias": total_asistencias
                },
                "detalle": detalle_completo
            }), 409

        # 6️⃣ ELIMINACIÓN EN CASCADA (orden correcto según niveles)
        
        # NIVEL 3 y 2: Eliminar asistencias (las más profundas primero)
        if asignaciones:
            asignacion_ids = [a['asignacion_id'] for a in asignaciones]
            
            # Obtener IDs de matrículas
            cur.execute("""
                SELECT matricula_id FROM matriculas 
                WHERE asignacion_id = ANY(%s)
            """, (asignacion_ids,))
            matricula_ids = [m['matricula_id'] for m in cur.fetchall()]
            
            # Eliminar asistencias vía matricula_id
            if matricula_ids:
                cur.execute("""
                    DELETE FROM asistencia 
                    WHERE matricula_id = ANY(%s)
                """, (matricula_ids,))
                print(f"✅ Eliminadas {cur.rowcount} asistencias (vía matrículas)")
        
        # Eliminar asistencias vía sesion_id
        if sesiones_clase:
            sesion_ids = [s['sesion_id'] for s in sesiones_clase]
            cur.execute("""
                DELETE FROM asistencia 
                WHERE sesion_id = ANY(%s)
            """, (sesion_ids,))
            print(f"✅ Eliminadas {cur.rowcount} asistencias (vía sesiones)")
        
        # NIVEL 2: Eliminar matrículas y materiales
        if asignaciones:
            asignacion_ids = [a['asignacion_id'] for a in asignaciones]
            
            # Eliminar matrículas
            cur.execute("""
                DELETE FROM matriculas 
                WHERE asignacion_id = ANY(%s)
            """, (asignacion_ids,))
            print(f"✅ Eliminadas {cur.rowcount} matrículas")
            
            # Eliminar materiales
            cur.execute("""
                DELETE FROM materiales 
                WHERE asignacion_id = ANY(%s)
            """, (asignacion_ids,))
            print(f"✅ Eliminados {cur.rowcount} materiales")
        
        # NIVEL 1: Eliminar sesiones de clase
        cur.execute("""
            DELETE FROM sesion_clase 
            WHERE seccion_id = %s
        """, (id,))
        print(f"✅ Eliminadas {cur.rowcount} sesiones de clase")
        
        # NIVEL 1: Eliminar asignaciones
        cur.execute("""
            DELETE FROM asignaciones 
            WHERE seccion_id = %s
        """, (id,))
        print(f"✅ Eliminadas {cur.rowcount} asignaciones")

        # RAÍZ: Eliminar la sección
        cur.execute("DELETE FROM secciones WHERE seccion_id = %s", (id,))
        conn.commit()

        return jsonify({"mensaje": "✅ Sección eliminada correctamente"}), 200

    except Exception as e:
        if conn: conn.rollback()
        print("❌ ERROR delete:", e)
        return jsonify({"error": "SERVER_ERROR", "detalle": str(e)}), 500

    finally:
        if cur: cur.close()
        if conn: conn.close()