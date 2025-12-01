from flask import Blueprint, jsonify
from database.db import get_db

asignaciones_bp = Blueprint('asignaciones', __name__)

@asignaciones_bp.route("/mis-asignaciones/<int:estudiante_id>", methods=['GET'])
def obtener_mis_asignaciones(estudiante_id):
    """
    Obtiene todas las asignaciones (cursos) en los que está matriculado el estudiante
    """
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        
        query = """
            SELECT 
                c.curso_id,
                c.nombre as curso_nombre,
                c.codigo as curso_codigo,
                c.creditos,
                s.seccion_id,
                s.codigo as seccion_codigo,
                m.matricula_id,
                m.fecha_matricula,
                m.estado,
                COALESCE(p.nombres, '') as docente_nombres,
                COALESCE(p.apellidos, '') as docente_apellidos,
                bh.dia,
                bh.hora_inicio,
                bh.hora_fin,
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
            JOIN asignaciones asig ON m.asignacion_id = asig.asignacion_id
            JOIN curso c ON asig.curso_id = c.curso_id
            JOIN secciones s ON asig.seccion_id = s.seccion_id
            LEFT JOIN docente d ON asig.docente_id = d.docente_id
            LEFT JOIN persona p ON d.persona_id = p.persona_id
            LEFT JOIN bloque_horario bh ON asig.bloque_id = bh.bloque_id
            WHERE e.estudiante_id = %s
            AND m.estado = 'ACTIVA'
            ORDER BY c.nombre
        """
        
        cur.execute(query, (estudiante_id,))
        rows = cur.fetchall()
        
        if not rows:
            return jsonify({
                'message': 'No tienes asignaciones activas',
                'asignaciones': []
            }), 200
        
        asignaciones = []
        for row in rows:
            # Construir nombre del docente
            docente_nombres = row[9].strip() if row[9] else ''
            docente_apellidos = row[10].strip() if row[10] else ''
            
            if docente_nombres and docente_apellidos:
                docente_completo = f"{docente_nombres} {docente_apellidos}"
            elif docente_nombres:
                docente_completo = docente_nombres
            elif docente_apellidos:
                docente_completo = docente_apellidos
            else:
                docente_completo = 'Sin asignar'
            
            asignaciones.append({
                'curso_id': row[0],
                'curso_nombre': row[1],
                'curso_codigo': row[2],
                'creditos': row[3],
                'seccion_id': row[4],
                'seccion_codigo': row[5],
                'matricula_id': row[6],
                'fecha_matricula': str(row[7]) if row[7] else None,
                'estado': row[8],
                'docente': docente_completo,
                'horario': {
                    'dia': row[11] if row[11] else None,
                    'hora_inicio': str(row[12]) if row[12] else None,
                    'hora_fin': str(row[13]) if row[13] else None
                },
                'porcentaje_asistencia': float(row[14])
            })
        
        return jsonify({
            'asignaciones': asignaciones,
            'total': len(asignaciones)
        }), 200
        
    except Exception as e:
        print(f"❌ Error al obtener asignaciones: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()