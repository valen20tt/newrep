from flask import Blueprint, jsonify
from psycopg2.extras import RealDictCursor
from database.db import get_db

horario_bp = Blueprint('horario', __name__)

@horario_bp.route('/mi-horario/<int:estudiante_id>', methods=['GET'])
def obtener_mi_horario(estudiante_id):
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # CONSULTA CORREGIDA:
        # 1. Elimina 'bloque_horario'
        # 2. Lee dia, hora y aula directo de 'asignaciones'
        # 3. Ordena por día de la semana y hora
        query = """
            SELECT 
                c.nombre as curso,
                c.codigo as codigo_curso,
                c.creditos,
                s.codigo as seccion,
                asig.dia,
                TO_CHAR(asig.hora_inicio, 'HH24:MI') as hora_inicio,
                TO_CHAR(asig.hora_fin, 'HH24:MI') as hora_fin,
                asig.tipo as tipo_sesion, -- TEORICO / PRACTICO
                au.nombre_aula as aula,
                au.pabellon_id, -- Opcional, si quieres mostrar pabellón
                COALESCE(p.nombres || ' ' || p.apellidos, 'Sin asignar') as docente
            FROM matriculas m
            JOIN asignaciones asig ON m.asignacion_id = asig.asignacion_id
            JOIN curso c ON asig.curso_id = c.curso_id
            JOIN secciones s ON asig.seccion_id = s.seccion_id
            LEFT JOIN aula au ON asig.aula_id = au.aula_id
            LEFT JOIN docente d ON asig.docente_id = d.docente_id
            LEFT JOIN persona p ON d.persona_id = p.persona_id
            WHERE m.estudiante_id = %s 
            AND m.estado = 'ACTIVA'
            ORDER BY 
                CASE 
                    WHEN asig.dia = 'Lunes' THEN 1
                    WHEN asig.dia = 'Martes' THEN 2
                    WHEN asig.dia = 'Miércoles' THEN 3
                    WHEN asig.dia = 'Jueves' THEN 4
                    WHEN asig.dia = 'Viernes' THEN 5
                    WHEN asig.dia = 'Sábado' THEN 6
                    ELSE 7 
                END,
                asig.hora_inicio
        """
        
        cur.execute(query, (estudiante_id,))
        horario = cur.fetchall()
        
        return jsonify(horario), 200
        
    except Exception as e:
        print(f"❌ Error al obtener horario: {e}")
        return jsonify({'error': str(e)}), 500
    
    finally:
        if cur: cur.close()
        if conn: conn.close()