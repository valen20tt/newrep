from flask import Blueprint, jsonify
from database.db import get_db

horario_bp = Blueprint('horario', __name__)

@horario_bp.route("/mi-horario/<int:estudiante_id>", methods=['GET'])
def obtener_mi_horario(estudiante_id):
    """
    Obtiene el horario semanal del estudiante con información completa
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
                bh.dia,
                bh.hora_inicio,
                bh.hora_fin,
                bh.codigo_bloque,
                bh.bloque_id,
                asig.aula_id,
                asig.asignacion_id,
                COALESCE(p.nombres, '') as docente_nombres,
                COALESCE(p.apellidos, '') as docente_apellidos,
                d.docente_id,
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
            JOIN asignaciones asig ON m.asignacion_id = asig.asignacion_id
            JOIN curso c ON asig.curso_id = c.curso_id
            JOIN secciones s ON asig.seccion_id = s.seccion_id
            LEFT JOIN bloque_horario bh ON asig.bloque_id = bh.bloque_id
            LEFT JOIN docente d ON asig.docente_id = d.docente_id
            LEFT JOIN persona p ON d.persona_id = p.persona_id
            WHERE e.estudiante_id = %s
            AND m.estado = 'ACTIVA'
            AND bh.bloque_id IS NOT NULL
            ORDER BY 
                CASE 
                    WHEN bh.dia = 'Lunes' THEN 1
                    WHEN bh.dia = 'Martes' THEN 2
                    WHEN bh.dia = 'Miercoles' OR bh.dia = 'Miércoles' THEN 3
                    WHEN bh.dia = 'Jueves' THEN 4
                    WHEN bh.dia = 'Viernes' THEN 5
                    WHEN bh.dia = 'Sabado' OR bh.dia = 'Sábado' THEN 6
                    WHEN bh.dia = 'Domingo' THEN 7
                    ELSE 8
                END,
                bh.hora_inicio
        """
        
        cur.execute(query, (estudiante_id,))
        rows = cur.fetchall()
        
        horario = []
        for row in rows:
            # Construir nombre del docente igual que en asignaciones
            docente_nombres = row[13].strip() if row[13] else ''
            docente_apellidos = row[14].strip() if row[14] else ''
            
            if docente_nombres and docente_apellidos:
                docente_completo = f"{docente_nombres} {docente_apellidos}"
            elif docente_nombres:
                docente_completo = docente_nombres
            elif docente_apellidos:
                docente_completo = docente_apellidos
            else:
                docente_completo = 'Sin asignar'
            
            horario.append({
                'curso_id': row[0],
                'curso_nombre': row[1],
                'curso_codigo': row[2],
                'creditos': row[3],
                'seccion_id': row[4],
                'seccion': row[5],
                'dia': row[6],
                'hora_inicio': str(row[7]) if row[7] else None,
                'hora_fin': str(row[8]) if row[8] else None,
                'codigo_bloque': row[9],
                'bloque_id': row[10],
                'aula_id': row[11],
                'asignacion_id': row[12],
                'docente': docente_completo,
                'docente_id': row[15],
                'matricula_id': row[16],
                'porcentaje_asistencia': float(row[17])
            })
        
        return jsonify({
            'horario': horario,
            'total': len(horario)
        }), 200
        
    except Exception as e:
        print(f"❌ Error al obtener horario: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()