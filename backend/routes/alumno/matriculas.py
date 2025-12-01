# routes/alumno/matriculas.py
from flask import Blueprint, request, jsonify
from psycopg2.extras import RealDictCursor
from database.db import get_db
from datetime import datetime

matriculas_bp = Blueprint("matriculas", __name__)

# -------------------------------------------------------------------
# 🔹 FUNCIÓN AUXILIAR: calcular ciclo actual (2 ciclos por año)
# -------------------------------------------------------------------
def calcular_ciclo_estudiante_anual(ciclo_inicio):
    """
    Calcula el ciclo académico actual de un alumno considerando que
    cada año tiene dos ciclos (I y II, luego III y IV, etc.)
    Ejemplo: ciclo_inicio = "2023-I" → en 2025 estará en el VI ciclo.
    """
    ciclos = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]

    try:
        partes = ciclo_inicio.split("-")
        anio_inicio = int(partes[0])
        semestre_inicio = partes[1].strip().upper() if len(partes) > 1 else "I"

        anio_actual = datetime.now().year
        mes_actual = datetime.now().month

        # Determinar semestre actual (I o II)
        semestre_actual = "I" if mes_actual <= 6 else "II"

        # Años transcurridos
        diferencia_anios = anio_actual - anio_inicio

        # Cada año = 2 ciclos
        ciclo_base = diferencia_anios * 2

        # Sumar si ya estamos en el segundo semestre del año actual
        if semestre_actual == "II":
            ciclo_base += 1

        # Ajustar según semestre inicial del estudiante
        if semestre_inicio == "II":
            ciclo_base -= 1

        # Ciclo numérico (inicia en 1)
        ciclo_num = ciclo_base + 1
        ciclo_num = min(ciclo_num, len(ciclos))

        return ciclos[ciclo_num - 1]

    except Exception as e:
        print("Error al calcular ciclo:", e)
        return "I"


# -------------------------------------------------------------------
# 1️⃣ LISTAR ASIGNACIONES DISPONIBLES (ajustado para matrícula anual)
# -------------------------------------------------------------------
@matriculas_bp.route("/asignaciones-disponibles/<int:alumno_id>", methods=["GET"])
def listar_asignaciones_disponibles(alumno_id):
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # 1️⃣ Buscar el ciclo actual del estudiante
        cur.execute("""
            SELECT e.ciclo_actual
            FROM estudiante e
            LEFT JOIN persona p ON e.persona_id = p.persona_id
            WHERE e.estudiante_id = %s OR p.usuario_id = %s
            LIMIT 1
        """, (alumno_id, alumno_id))
        row = cur.fetchone()

        if not row:
            return jsonify({"error": "Alumno no encontrado"}), 404

        ciclo_registrado = row["ciclo_actual"]
        ciclo_estudiante = calcular_ciclo_estudiante_anual(ciclo_registrado)

        # Mapeo para saber qué ciclo sigue a cuál
        ciclos_orden = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]
        ciclo_indices = {c: i for i, c in enumerate(ciclos_orden)}

        # Si el alumno está en ciclo impar → ver ese y el siguiente
        idx = ciclo_indices.get(ciclo_estudiante, 0)
        ciclo_siguiente = ciclos_orden[idx + 1] if idx + 1 < len(ciclos_orden) else ciclo_estudiante

        # Verificar si el ciclo actual es impar
        es_impar = idx % 2 == 0  # (0 = I, 2 = III, etc.)

        if es_impar:
            ciclos_a_mostrar = (ciclo_estudiante, ciclo_siguiente)
        else:
            ciclos_a_mostrar = (ciclo_estudiante,)

        # 3️⃣ Obtener las asignaciones para los ciclos indicados
        cur.execute("""
            SELECT 
                a.asignacion_id,
                c.nombre AS nombre_curso,
                c.codigo AS codigo_curso,
                c.ciclo,
                s.codigo AS seccion,
                s.periodo,
                (p.nombres || ' ' || p.apellidos) AS docente,
                bh.dia,
                TO_CHAR(bh.hora_inicio, 'HH24:MI') AS hora_inicio,
                TO_CHAR(bh.hora_fin, 'HH24:MI') AS hora_fin,
                au.nombre_aula AS aula,
                au.capacidad
            FROM asignaciones a
            JOIN curso c ON a.curso_id = c.curso_id
            JOIN secciones s ON a.seccion_id = s.seccion_id
            JOIN docente d ON a.docente_id = d.docente_id
            JOIN persona p ON d.persona_id = p.persona_id
            JOIN bloque_horario bh ON a.bloque_id = bh.bloque_id
            JOIN aula au ON a.aula_id = au.aula_id
            WHERE c.ciclo IN %s
            ORDER BY c.ciclo, c.nombre ASC
        """, (ciclos_a_mostrar,))

        data = cur.fetchall()

        return jsonify({
            "ciclo_registrado": ciclo_registrado,
            "ciclo_actual_estudiante": ciclo_estudiante,
            "ciclos_mostrados": ciclos_a_mostrar,
            "asignaciones": data
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# -------------------------------------------------------------------
# 2️⃣ MATRICULAR ALUMNO EN UNA ASIGNACIÓN (con validaciones avanzadas)
# -------------------------------------------------------------------
@matriculas_bp.route("/matricular", methods=["POST"])
def matricular_alumno():
    data = request.get_json() or {}
    estudiante_id = data.get("estudiante_id")
    alumno_id = data.get("alumno_id")
    asignacion_id = data.get("asignacion_id")

    if not asignacion_id:
        return jsonify({"error": "Faltan datos: asignacion_id"}), 400

    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # 🧩 1️⃣ Obtener el estudiante_id si solo se pasa alumno_id
        if not estudiante_id and alumno_id:
            cur.execute("""
                SELECT e.estudiante_id
                FROM estudiante e
                JOIN persona p ON e.persona_id = p.persona_id
                WHERE p.usuario_id = %s
                LIMIT 1
            """, (alumno_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({"error": "No se encontró estudiante asociado."}), 404
            estudiante_id = row["estudiante_id"]

        # 🧩 2️⃣ Obtener los datos del curso y ciclo al que pertenece la asignación
        cur.execute("""
            SELECT a.curso_id, c.ciclo, bh.dia, bh.hora_inicio, bh.hora_fin
            FROM asignaciones a
            JOIN curso c ON a.curso_id = c.curso_id
            JOIN bloque_horario bh ON a.bloque_id = bh.bloque_id
            WHERE a.asignacion_id = %s
        """, (asignacion_id,))
        asignacion = cur.fetchone()

        if not asignacion:
            return jsonify({"error": "Asignación no encontrada."}), 404

        curso_id = asignacion["curso_id"]
        ciclo_curso = asignacion["ciclo"]

        # 🧩 3️⃣ Evitar doble matrícula (ya matriculado en el mismo curso)
        cur.execute("""
            SELECT 1
            FROM matriculas m
            JOIN asignaciones a ON m.asignacion_id = a.asignacion_id
            WHERE m.estudiante_id = %s AND a.curso_id = %s
        """, (estudiante_id, curso_id))
        if cur.fetchone():
            return jsonify({"error": "Ya estás matriculado en este curso (otra sección)."}), 400

        # 🕐 4️⃣ Verificar conflicto de horario (solo dentro del mismo ciclo)
        cur.execute("""
            SELECT c.nombre AS curso, bh.dia, bh.hora_inicio, bh.hora_fin
            FROM matriculas m
            JOIN asignaciones a ON m.asignacion_id = a.asignacion_id
            JOIN curso c ON a.curso_id = c.curso_id
            JOIN bloque_horario bh ON a.bloque_id = bh.bloque_id
            WHERE m.estudiante_id = %s 
            AND m.estado = 'ACTIVA'
            AND c.ciclo = %s
        """, (estudiante_id, ciclo_curso))
        cursos_ciclo = cur.fetchall()

        for m in cursos_ciclo:
            if m["dia"] == asignacion["dia"]:
                # Detecta solapamiento horario
                if (asignacion["hora_inicio"] < m["hora_fin"] and
                    asignacion["hora_fin"] > m["hora_inicio"]):
                    return jsonify({
                        "error": f"Conflicto de horario con el curso '{m['curso']}' del mismo ciclo."
                    }), 400

        # 📘 5️⃣ Verificar prerrequisitos
        cur.execute("""
            SELECT id_curso_requerido
            FROM prerrequisito
            WHERE id_curso = %s
        """, (curso_id,))
        prereqs = [r["id_curso_requerido"] for r in cur.fetchall()]

        if prereqs:
            # Buscar cursos aprobados (nota_final >= 11)
            cur.execute("""
                SELECT c.curso_id
                FROM calificaciones cal
                JOIN asignaciones AS a ON cal.asignacion_id = a.asignacion_id
                JOIN curso c ON a.curso_id = c.curso_id
                WHERE cal.estudiante_id = %s AND cal.nota_final >= 11
            """, (estudiante_id,))
            aprobados = [r["curso_id"] for r in cur.fetchall()]

            faltantes = [req for req in prereqs if req not in aprobados]
            if faltantes:
                return jsonify({
                    "error": "No cumples los prerrequisitos para este curso."
                }), 400

        # 🧾 6️⃣ Registrar la matrícula si pasa todas las verificaciones
        cur.execute("""
            INSERT INTO matriculas (estudiante_id, asignacion_id, fecha_matricula, estado)
            VALUES (%s, %s, NOW(), 'ACTIVA')
        """, (estudiante_id, asignacion_id))
        conn.commit()

        return jsonify({"mensaje": "✅ Matrícula registrada exitosamente."}), 201

    except Exception as e:
        conn.rollback()
        print("❌ Error al matricular:", e)
        return jsonify({"error": f"Error al matricular: {str(e)}"}), 500

    finally:
        cur.close()
        conn.close()




# -------------------------------------------------------------------
# 3️⃣ VER MATRÍCULAS DEL ALUMNO
# -------------------------------------------------------------------
@matriculas_bp.route("/mis-matriculas/<int:alumno_id>", methods=["GET"])
def mis_matriculas(alumno_id):
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # 🧠 1️⃣ Convertir usuario_id → estudiante_id si es necesario
        cur.execute("""
            SELECT e.estudiante_id
            FROM estudiante e
            JOIN persona p ON e.persona_id = p.persona_id
            WHERE e.estudiante_id = %s OR p.usuario_id = %s
            LIMIT 1
        """, (alumno_id, alumno_id))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "No se encontró estudiante asociado."}), 404

        estudiante_id = row["estudiante_id"]

        # 🧠 2️⃣ Consultar las matrículas, incluyendo el ciclo del curso
        cur.execute("""
            SELECT 
                m.matricula_id,
                c.nombre AS curso,
                c.codigo AS codigo_curso,
                c.ciclo AS ciclo,  -- ✅ agregamos el ciclo
                s.codigo AS seccion,
                s.periodo,
                (p.nombres || ' ' || p.apellidos) AS docente,
                bh.dia,
                TO_CHAR(bh.hora_inicio, 'HH24:MI') AS hora_inicio,
                TO_CHAR(bh.hora_fin, 'HH24:MI') AS hora_fin,
                au.nombre_aula AS aula,
                m.estado,
                m.fecha_matricula
            FROM matriculas m
            JOIN asignaciones a ON m.asignacion_id = a.asignacion_id
            JOIN curso c ON a.curso_id = c.curso_id  -- aquí viene el ciclo
            JOIN secciones s ON a.seccion_id = s.seccion_id
            JOIN docente d ON a.docente_id = d.docente_id
            JOIN persona p ON d.persona_id = p.persona_id
            JOIN bloque_horario bh ON a.bloque_id = bh.bloque_id
            JOIN aula au ON a.aula_id = au.aula_id
            WHERE m.estudiante_id = %s
            ORDER BY c.ciclo, m.fecha_matricula DESC
        """, (estudiante_id,))

        matriculas = cur.fetchall()
        return jsonify(matriculas)

    except Exception as e:
        print("❌ Error al obtener matrículas:", e)
        return jsonify({"error": f"Error al obtener matrículas: {str(e)}"}), 500
    finally:
        cur.close()
        conn.close()

# ================================================
# ❌ ELIMINAR (DESMATRICULAR) UNA MATRÍCULA
# ================================================
@matriculas_bp.route('/desmatricular/<int:matricula_id>', methods=['DELETE'])
def desmatricular_curso(matricula_id):
    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("DELETE FROM matriculas WHERE matricula_id = %s", (matricula_id,))
        conn.commit()
        return jsonify({"mensaje": "✅ Matrícula eliminada correctamente"}), 200

    except Exception as e:
        conn.rollback()
        print("❌ Error al eliminar matrícula:", e)
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        conn.close()

