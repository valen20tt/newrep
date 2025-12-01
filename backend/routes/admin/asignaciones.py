from flask import Blueprint, request, jsonify
from psycopg2.extras import RealDictCursor
from database.db import get_db
from datetime import datetime, timedelta

asignaciones_bp = Blueprint("asignaciones", __name__)

# -----------------------------
# LISTAR CURSOS
# -----------------------------
@asignaciones_bp.route("/cursos", methods=["GET"])
def listar_cursos():
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            SELECT 
                curso_id, codigo, nombre, creditos, ciclo, tipo,
                horas_teoricas, horas_practicas
            FROM curso
            WHERE estado = TRUE
            ORDER BY nombre ASC
        """)
        cursos = cur.fetchall()
        return jsonify(cursos)
    except Exception as e:
        return jsonify({"error": f"Error al obtener cursos: {str(e)}"}), 500
    finally:
        cur.close()
        conn.close()

# -----------------------------
# LISTAR DOCENTES
# -----------------------------
@asignaciones_bp.route("/docentes", methods=["GET"])
def listar_docentes():
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            SELECT 
                d.docente_id,
                p.nombres,
                p.apellidos,
                (p.nombres || ' ' || p.apellidos) AS nombre_completo,
                u.correo AS correo_docente
            FROM docente d
            JOIN persona p ON d.persona_id = p.persona_id
            JOIN usuario u ON p.usuario_id = u.usuario_id
            WHERE d.estado = TRUE
            ORDER BY p.apellidos ASC
        """)
        docentes = cur.fetchall()
        return jsonify(docentes)
    finally:
        cur.close()
        conn.close()

# -----------------------------
# LISTAR SECCIONES
# -----------------------------
@asignaciones_bp.route("/secciones", methods=["GET"])
def listar_secciones():
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            SELECT seccion_id, codigo, ciclo_academico, periodo
            FROM secciones
            WHERE UPPER(estado) = 'ACTIVO'
            ORDER BY periodo DESC, codigo ASC
        """)
        secciones = cur.fetchall()
        return jsonify(secciones)
    finally:
        cur.close()
        conn.close()

# -----------------------------
# LISTAR AULAS OPERATIVAS
# -----------------------------
@asignaciones_bp.route("/aulas", methods=["GET"])
def listar_aulas():
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            SELECT 
                a.aula_id,
                a.nombre_aula AS nombre,
                a.capacidad,
                p.nombre_pabellon AS pabellon,
                ta.nombre_tipo AS tipo_aula
            FROM aula a
            JOIN pabellon p ON a.pabellon_id = p.pabellon_id
            JOIN tipo_aula_cat ta ON a.tipo_aula_id = ta.tipo_aula_id
            WHERE UPPER(a.estado) = 'OPERATIVO'
            ORDER BY p.nombre_pabellon, a.nombre_aula
        """)
        aulas = cur.fetchall()
        return jsonify(aulas)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

# -----------------------------
# CREAR ASIGNACIÓN
# -----------------------------
@asignaciones_bp.route("/crear-asignacion", methods=["POST"])
def crear_asignacion():
    data = request.get_json() or {}

    # Datos base
    curso_id = data.get("curso_id")
    seccion_id = data.get("seccion_id")
    docente_id = data.get("docente_id")
    cantidad_estudiantes = data.get("estudiantes")
    observaciones = data.get("observaciones", "")

    # Datos de horario TEÓRICO (Bloque 1)
    dia_1 = data.get("dia_1")
    hora_inicio_1 = data.get("hora_inicio_1")
    aula_id_teorica = data.get("aula_id")
    
    # Datos de horario PRÁCTICO (Bloque 2)
    dia_2 = data.get("dia_2")
    hora_inicio_2 = data.get("hora_inicio_2")
    aula_id_practica = data.get("aula_id_2")

    # Validaciones básicas
    if not all([curso_id, seccion_id, docente_id, cantidad_estudiantes]):
        return jsonify({"error": "⚠️ Faltan campos obligatorios del Paso 1."}), 400
    
    try:
        cantidad_estudiantes = int(cantidad_estudiantes)
        if cantidad_estudiantes <= 0:
            return jsonify({"error": "⚠️ La cantidad de estudiantes debe ser mayor a 0."}), 400
    except:
        return jsonify({"error": "⚠️ Cantidad de estudiantes inválida."}), 400

    conn = get_db()
    cur = conn.cursor()

    try:
        # Obtener horas del curso
        cur.execute(
            "SELECT horas_teoricas, horas_practicas FROM curso WHERE curso_id = %s", 
            (curso_id,)
        )
        curso_data = cur.fetchone()
        if not curso_data:
            return jsonify({"error": "Curso no encontrado o inválido."}), 404
        
        horas_teoricas = curso_data[0]
        horas_practicas = curso_data[1]

        # Función para calcular hora_fin (bloques de 50 minutos)
        def calcular_hora_fin(hora_inicio, duracion_horas):
            hora_obj = datetime.strptime(hora_inicio, "%H:%M")
            minutos_duracion = duracion_horas * 50
            hora_fin_obj = hora_obj + timedelta(minutes=minutos_duracion)
            return hora_fin_obj.strftime("%H:%M")

        asignaciones_a_insertar = []

        # ==================== VALIDACIÓN BLOQUE TEÓRICO ====================
        if horas_teoricas > 0:
            if not (dia_1 and hora_inicio_1 and aula_id_teorica):
                return jsonify({"error": f"⚠️ El curso requiere {horas_teoricas} horas teóricas. Debe asignar Día, Horario y Aula 1."}), 400
            
            hora_fin_1 = calcular_hora_fin(hora_inicio_1, horas_teoricas)
            
            # Validar capacidad del aula
            cur.execute("SELECT capacidad FROM aula WHERE aula_id=%s AND UPPER(estado)='OPERATIVO'", (aula_id_teorica,))
            aula = cur.fetchone()
            if not aula:
                return jsonify({"error": "Aula teórica no operativa o inexistente"}), 400
            if cantidad_estudiantes > aula[0]:
                return jsonify({"error": f"Capacidad insuficiente en aula teórica (Capacidad: {aula[0]})"}), 400

            # Validar conflicto de aula (overlap de horarios)
            cur.execute("""
                SELECT 1 FROM asignaciones 
                WHERE dia = %s 
                AND aula_id = %s
                AND (
                    (hora_inicio < %s AND hora_fin > %s) OR
                    (hora_inicio < %s AND hora_fin > %s) OR
                    (hora_inicio >= %s AND hora_fin <= %s)
                )
            """, (dia_1, aula_id_teorica, hora_fin_1, hora_inicio_1, hora_fin_1, hora_inicio_1, hora_inicio_1, hora_fin_1))
            if cur.fetchone():
                return jsonify({"error": f"El aula teórica ya está ocupada el {dia_1} entre {hora_inicio_1} y {hora_fin_1}."}), 400

            # Validar conflicto de docente
            cur.execute("""
                SELECT 1 FROM asignaciones 
                WHERE dia = %s 
                AND docente_id = %s
                AND (
                    (hora_inicio < %s AND hora_fin > %s) OR
                    (hora_inicio < %s AND hora_fin > %s) OR
                    (hora_inicio >= %s AND hora_fin <= %s)
                )
            """, (dia_1, docente_id, hora_fin_1, hora_inicio_1, hora_fin_1, hora_inicio_1, hora_inicio_1, hora_fin_1))
            if cur.fetchone():
                return jsonify({"error": f"El docente ya tiene una clase el {dia_1} entre {hora_inicio_1} y {hora_fin_1}."}), 400
            
            # Validar duplicado curso + sección en mismo horario
            cur.execute("""
                SELECT 1 FROM asignaciones
                WHERE curso_id = %s 
                AND seccion_id = %s 
                AND dia = %s
                AND hora_inicio = %s
            """, (curso_id, seccion_id, dia_1, hora_inicio_1))
            if cur.fetchone():
                return jsonify({"error": "Este curso ya tiene una asignación teórica registrada en esta sección y horario."}), 400
            
            asignaciones_a_insertar.append({
                'dia': dia_1,
                'hora_inicio': hora_inicio_1,
                'hora_fin': hora_fin_1,
                'aula_id': aula_id_teorica,
                'tipo': 'TEORICO'
            })
        else:
            if dia_1 or hora_inicio_1:
                return jsonify({"error": "⚠️ Este curso no tiene horas teóricas (T: 0). No debe asignar Día/Horario 1."}), 400

        # ==================== VALIDACIÓN BLOQUE PRÁCTICO ====================
        if horas_practicas > 0:
            if not (dia_2 and hora_inicio_2 and aula_id_practica):
                return jsonify({"error": f"⚠️ El curso requiere {horas_practicas} horas prácticas. Debe asignar Día, Horario 2 y Aula 2."}), 400
            
            hora_fin_2 = calcular_hora_fin(hora_inicio_2, horas_practicas)
            
            # Validar que no sea el mismo horario que el teórico
            if horas_teoricas > 0 and dia_1 == dia_2 and hora_inicio_1 == hora_inicio_2:
                return jsonify({"error": "⚠️ El horario práctico no puede ser igual al horario teórico."}), 400
            
            # Validar capacidad del aula
            cur.execute("SELECT capacidad FROM aula WHERE aula_id=%s AND UPPER(estado)='OPERATIVO'", (aula_id_practica,))
            aula = cur.fetchone()
            if not aula:
                return jsonify({"error": "Aula práctica no operativa o inexistente"}), 400
            if cantidad_estudiantes > aula[0]:
                return jsonify({"error": f"Capacidad insuficiente en aula práctica (Capacidad: {aula[0]})"}), 400

            # Validar conflicto de aula
            cur.execute("""
                SELECT 1 FROM asignaciones 
                WHERE dia = %s 
                AND aula_id = %s
                AND (
                    (hora_inicio < %s AND hora_fin > %s) OR
                    (hora_inicio < %s AND hora_fin > %s) OR
                    (hora_inicio >= %s AND hora_fin <= %s)
                )
            """, (dia_2, aula_id_practica, hora_fin_2, hora_inicio_2, hora_fin_2, hora_inicio_2, hora_inicio_2, hora_fin_2))
            if cur.fetchone():
                return jsonify({"error": f"El aula práctica ya está ocupada el {dia_2} entre {hora_inicio_2} y {hora_fin_2}."}), 400

            # Validar conflicto de docente
            cur.execute("""
                SELECT 1 FROM asignaciones 
                WHERE dia = %s 
                AND docente_id = %s
                AND (
                    (hora_inicio < %s AND hora_fin > %s) OR
                    (hora_inicio < %s AND hora_fin > %s) OR
                    (hora_inicio >= %s AND hora_fin <= %s)
                )
            """, (dia_2, docente_id, hora_fin_2, hora_inicio_2, hora_fin_2, hora_inicio_2, hora_inicio_2, hora_fin_2))
            if cur.fetchone():
                return jsonify({"error": f"El docente ya tiene una clase el {dia_2} entre {hora_inicio_2} y {hora_fin_2}."}), 400
            
            # Validar duplicado curso + sección
            cur.execute("""
                SELECT 1 FROM asignaciones
                WHERE curso_id = %s 
                AND seccion_id = %s 
                AND dia = %s
                AND hora_inicio = %s
            """, (curso_id, seccion_id, dia_2, hora_inicio_2))
            if cur.fetchone():
                return jsonify({"error": "Este curso ya tiene una asignación práctica registrada en esta sección y horario."}), 400
            
            asignaciones_a_insertar.append({
                'dia': dia_2,
                'hora_inicio': hora_inicio_2,
                'hora_fin': hora_fin_2,
                'aula_id': aula_id_practica,
                'tipo': 'PRACTICO'
            })
        else:
            if dia_2 or hora_inicio_2:
                return jsonify({"error": "⚠️ Este curso no tiene horas prácticas (P: 0). No debe asignar Día/Horario 2."}), 400

        if not asignaciones_a_insertar:
            return jsonify({"error": "⚠️ No se han proporcionado bloques válidos para la asignación."}), 400

        # ==================== INSERCIÓN ====================
        last_id = None
        for asig in asignaciones_a_insertar:
            cur.execute("""
                INSERT INTO asignaciones (
                    curso_id, seccion_id, docente_id, cantidad_estudiantes,
                    observaciones, dia, hora_inicio, hora_fin, aula_id, tipo
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING asignacion_id
            """, (
                curso_id, seccion_id, docente_id, cantidad_estudiantes,
                f"{observaciones} ({asig['tipo']})" if observaciones else asig['tipo'], 
                asig['dia'], asig['hora_inicio'], asig['hora_fin'], 
                asig['aula_id'], asig['tipo']
            ))
            last_id = cur.fetchone()[0]

        conn.commit()
        return jsonify({
            "mensaje": f"✅ Asignación registrada exitosamente. ({len(asignaciones_a_insertar)} bloque(s) creado(s))", 
            "asignacion_id": last_id
        }), 201

    except Exception as e:
        conn.rollback()
        print(f"Error en crear-asignacion: {str(e)}")
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500

    finally:
        cur.close()
        conn.close()

        
# -----------------------------
# LISTAR ASIGNACIONES
# -----------------------------
@asignaciones_bp.route("/listar-asignaciones", methods=["GET"])
def listar_asignaciones():
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            SELECT 
                a.asignacion_id,
                a.curso_id,
                a.seccion_id,
                a.docente_id,
                a.cantidad_estudiantes,
                a.observaciones,
                a.bloque_id,
                a.aula_id
            FROM asignaciones a
            ORDER BY a.asignacion_id DESC
        """)
        asignaciones = cur.fetchall()
        return jsonify(asignaciones)
    except Exception as e:
        return jsonify({"error": f"Error al listar asignaciones: {str(e)}"}), 500
    finally:
        cur.close()
        conn.close()


# -----------------------------
# EDITAR ASIGNACIÓN
# -----------------------------
@asignaciones_bp.route("/editar-asignacion/<int:asignacion_id>", methods=["PUT"])
def editar_asignacion(asignacion_id):
    data = request.get_json() or {}

    curso_id = data.get("curso_id")
    seccion_id = data.get("seccion_id")
    docente_id = data.get("docente_id")
    cantidad_estudiantes = data.get("estudiantes")
    observaciones = data.get("observaciones", "")
    bloque_id = data.get("horario_id")
    aula_id = data.get("aula_id")

    if not all([curso_id, seccion_id, docente_id, cantidad_estudiantes, bloque_id, aula_id]):
        return jsonify({"error": "⚠️ Faltan campos obligatorios"}), 400

    try:
        cantidad_estudiantes = int(cantidad_estudiantes)
        if cantidad_estudiantes <= 0:
            return jsonify({"error": "⚠️ La cantidad de estudiantes debe ser mayor que 0."}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "⚠️ La cantidad de estudiantes debe ser un número válido."}), 400

    conn = get_db()
    cur = conn.cursor()

    try:
        # Validar que la asignación existe
        cur.execute("SELECT 1 FROM asignaciones WHERE asignacion_id=%s", (asignacion_id,))
        if not cur.fetchone():
            return jsonify({"error": "La asignación no existe."}), 404

        # Validar capacidad del aula
        cur.execute("SELECT capacidad FROM aula WHERE aula_id=%s AND UPPER(estado)='OPERATIVO'", (aula_id,))
        aula = cur.fetchone()
        if not aula:
            return jsonify({"error": "El aula seleccionada no está operativa o no existe."}), 400

        capacidad_aula = aula[0]
        if cantidad_estudiantes > capacidad_aula:
            return jsonify({
                "error": f"La cantidad de estudiantes ({cantidad_estudiantes}) supera la capacidad del aula ({capacidad_aula})."
            }), 400

        # Validar conflicto de aula (excepto la asignación actual)
        cur.execute("""
            SELECT 1 FROM asignaciones 
            WHERE bloque_id=%s AND aula_id=%s AND asignacion_id != %s
        """, (bloque_id, aula_id, asignacion_id))
        if cur.fetchone():
            return jsonify({"error": "El aula ya está ocupada en ese horario."}), 400

        # Validar conflicto de docente (excepto la asignación actual)
        cur.execute("""
            SELECT 1 FROM asignaciones 
            WHERE bloque_id=%s AND docente_id=%s AND asignacion_id != %s
        """, (bloque_id, docente_id, asignacion_id))
        if cur.fetchone():
            return jsonify({"error": "El docente ya tiene una clase asignada en ese horario."}), 400

        # Actualizar asignación
        cur.execute("""
            UPDATE asignaciones
            SET curso_id = %s,
                seccion_id = %s,
                docente_id = %s,
                cantidad_estudiantes = %s,
                observaciones = %s,
                bloque_id = %s,
                aula_id = %s
            WHERE asignacion_id = %s
        """, (curso_id, seccion_id, docente_id, cantidad_estudiantes, observaciones, bloque_id, aula_id, asignacion_id))

        conn.commit()
        return jsonify({"mensaje": "✅ Asignación actualizada exitosamente."}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Error interno: {str(e)}"}), 500

    finally:
        cur.close()
        conn.close()


# -----------------------------
# ELIMINAR ASIGNACIÓN
# -----------------------------
@asignaciones_bp.route("/eliminar-asignacion/<int:asignacion_id>", methods=["DELETE"])
def eliminar_asignacion(asignacion_id):
    conn = get_db()
    cur = conn.cursor()

    try:
        # Verificar que la asignación existe
        cur.execute("SELECT 1 FROM asignaciones WHERE asignacion_id=%s", (asignacion_id,))
        if not cur.fetchone():
            return jsonify({"error": "La asignación no existe."}), 404

        # Eliminar asignación
        cur.execute("DELETE FROM asignaciones WHERE asignacion_id=%s", (asignacion_id,))
        conn.commit()

        return jsonify({"mensaje": "✅ Asignación eliminada exitosamente."}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Error interno: {str(e)}"}), 500

    finally:
        cur.close()
        conn.close()