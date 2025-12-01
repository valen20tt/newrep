from flask import Blueprint, request, jsonify
from datetime import datetime
from database.db import get_db

bloques_horarios_bp = Blueprint('bloques_horarios', __name__)

# Secuencia válida de horarios académicos (cada 50 minutos)
HORARIOS_VALIDOS = [
    "08:00", "08:50", "09:40", "10:30", "11:20", "12:10",
    "13:00", "13:50", "14:40", "15:30", "16:20", "17:10",
    "18:00", "18:50", "19:40", "20:30", "21:20", "22:10"
]

@bloques_horarios_bp.route("/bloques-horarios", methods=["POST"])
def crear_bloque_horario():
    """Crea un bloque horario automáticamente de 50 minutos"""
    data = request.json
    
    # Validación de datos recibidos
    print("📥 Datos recibidos:", data)
    
    dia = data.get("dia")
    hora_inicio = data.get("hora_inicio")

    # Validar campos obligatorios
    if not dia or not hora_inicio:
        return jsonify({"error": "⚠️ Día y hora de inicio son obligatorios."}), 400

    # VALIDACIÓN: Hora de inicio debe pertenecer a la secuencia
    if hora_inicio not in HORARIOS_VALIDOS:
        return jsonify({
            "error": f"⛔ La hora de inicio '{hora_inicio}' no es válida. Debe ser una de: {', '.join(HORARIOS_VALIDOS)}"
        }), 400

    # Calcular automáticamente hora_fin (+50 minutos = siguiente en la secuencia)
    try:
        idx_inicio = HORARIOS_VALIDOS.index(hora_inicio)
        
        # Debe existir un horario siguiente
        if idx_inicio >= len(HORARIOS_VALIDOS) - 1:
            return jsonify({
                "error": "⛔ No hay horario válido posterior para crear el bloque (última hora del día)."
            }), 400
        
        hora_fin = HORARIOS_VALIDOS[idx_inicio + 1]
        print(f"✅ Hora calculada: {hora_inicio} -> {hora_fin}")
        
    except ValueError:
        return jsonify({"error": "⛔ Horario fuera de la secuencia válida."}), 400

    try:
        conn = get_db()
        cur = conn.cursor()

        # Evitar duplicado exacto
        cur.execute("""
            SELECT COUNT(*) 
            FROM bloque_horario 
            WHERE dia = %s AND hora_inicio = %s AND hora_fin = %s;
        """, (dia, hora_inicio, hora_fin))
        
        if cur.fetchone()[0] > 0:
            return jsonify({
                "error": f"⛔ Ya existe un bloque para {dia} entre {hora_inicio} y {hora_fin}."
            }), 400

        # Determinar turno (M/T/N)
        hora_obj = datetime.strptime(hora_inicio, "%H:%M")
        turno = "M" if hora_obj.hour < 12 else "T" if hora_obj.hour < 19 else "N"

        # Obtener el último número correlativo de ese día y turno
        cur.execute("""
            SELECT codigo_bloque 
            FROM bloque_horario 
            WHERE dia = %s AND codigo_bloque LIKE %s
            ORDER BY bloque_id DESC
            LIMIT 1;
        """, (dia, f"{dia[:3].upper()}-{turno}%"))

        ultimo_codigo = cur.fetchone()
        
        if ultimo_codigo and "-" in ultimo_codigo[0]:
            try:
                # Extraer solo los números del código
                parte_numerica = ''.join(ch for ch in ultimo_codigo[0] if ch.isdigit())
                siguiente_num = int(parte_numerica) + 1 if parte_numerica else 1
            except:
                siguiente_num = 1
        else:
            siguiente_num = 1

        codigo_bloque = f"{dia[:3].upper()}-{turno}{siguiente_num}"
        print(f"📝 Código generado: {codigo_bloque}")

        # Insertar en BD
        cur.execute("""
            INSERT INTO bloque_horario (dia, hora_inicio, hora_fin, codigo_bloque)
            VALUES (%s, %s, %s, %s)
            RETURNING bloque_id, codigo_bloque;
        """, (dia, hora_inicio, hora_fin, codigo_bloque))

        resultado = cur.fetchone()
        bloque_id, codigo = resultado
        conn.commit()

        print(f"✅ Bloque creado exitosamente: ID={bloque_id}, Código={codigo}")

        # SOLUCIÓN: Devolver las horas como strings, no como objetos time
        return jsonify({
            "mensaje": "✅ Bloque horario registrado correctamente.",
            "bloque_id": bloque_id,
            "codigo_bloque": codigo,
            "hora_inicio": hora_inicio,  # Ya es string
            "hora_fin": hora_fin,        # Ya es string
            "duracion": "50 minutos"
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        print("❌ Error al registrar bloque horario:", str(e))
        return jsonify({"error": f"Error en el servidor: {str(e)}"}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@bloques_horarios_bp.route("/bloques-horarios/horarios-validos", methods=["GET"])
def obtener_horarios_validos():
    """Retorna la secuencia de horarios válidos"""
    return jsonify({
        "horarios": HORARIOS_VALIDOS,
        "mensaje": "Secuencia de horarios académicos (cada 50 minutos)"
    }), 200


# ======================================================
# Obtener siguiente código sin registrar (PREVIEW)
# ======================================================

@bloques_horarios_bp.route("/bloques-horarios/proximo-codigo", methods=["GET"])
def obtener_proximo_codigo():
    dia = request.args.get("dia")
    hora_inicio = request.args.get("hora_inicio")

    if not dia or not hora_inicio:
        return jsonify({"error": "Faltan parámetros: día y hora_inicio"}), 400

    formato = "%H:%M"
    inicio = datetime.strptime(hora_inicio, formato)

    # Determinar turno
    turno = "M" if inicio.hour < 12 else "T" if inicio.hour < 19 else "N"

    try:
        conn = get_db()
        cur = conn.cursor()

        # Buscar último correlativo
        cur.execute("""
            SELECT codigo_bloque
            FROM bloque_horario
            WHERE dia = %s AND codigo_bloque LIKE %s
            ORDER BY bloque_id DESC
            LIMIT 1;
        """, (dia, f"{dia[:3].upper()}-{turno}%"))

        ultimo = cur.fetchone()

        if ultimo and "-" in ultimo[0]:
            num = ''.join(ch for ch in ultimo[0] if ch.isdigit())
            siguiente_num = int(num) + 1 if num else 1
        else:
            siguiente_num = 1

        codigo_siguiente = f"{dia[:3].upper()}-{turno}{siguiente_num}"

        return jsonify({"codigo_sugerido": codigo_siguiente}), 200

    except Exception as e:
        print("❌ Error:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()
        
# ======================================================
# LISTAR LOS BLOQUES DE HORARIOS 
# ======================================================
@bloques_horarios_bp.route("/bloques-horarios-listar", methods=["GET"])
def listar_bloques_horarios():
    try:
        conn = get_db()
        cur = conn.cursor()

        cur.execute("""
            SELECT 
                bloque_id,
                codigo_bloque,
                dia,
                hora_inicio,
                hora_fin,
                estado
            FROM bloque_horario
            ORDER BY bloque_id ASC;
        """)

        data = cur.fetchall()
        columnas = [desc[0] for desc in cur.description]

        bloques = []
        for fila in data:
            bloque = dict(zip(columnas, fila))

            # ✅ Convertir los objetos time a string (HH:MM)
            if isinstance(bloque["hora_inicio"], (bytes, bytearray)):
                bloque["hora_inicio"] = bloque["hora_inicio"].decode("utf-8")
            else:
                bloque["hora_inicio"] = str(bloque["hora_inicio"])[:5]

            if isinstance(bloque["hora_fin"], (bytes, bytearray)):
                bloque["hora_fin"] = bloque["hora_fin"].decode("utf-8")
            else:
                bloque["hora_fin"] = str(bloque["hora_fin"])[:5]

            bloques.append(bloque)

        return jsonify(bloques), 200

    except Exception as e:
        print("❌ Error al listar bloques:", e)
        return jsonify({"error": str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@bloques_horarios_bp.route("/bloques-horarios/<int:bloque_id>", methods=["PUT"])
def editar_bloque_horario(bloque_id):
    data = request.json
    dia = data.get("dia")
    hora_inicio = data.get("hora_inicio")
    hora_fin = data.get("hora_fin")
    estado = data.get("estado")

    if not all([dia, hora_inicio, hora_fin, estado]):
        return jsonify({"error": "⚠️ Todos los campos obligatorios deben estar completos."}), 400

    formato = "%H:%M"
    inicio = datetime.strptime(hora_inicio, formato)
    fin = datetime.strptime(hora_fin, formato)
    duracion = (fin - inicio).total_seconds() / 3600

    if duracion <= 0:
        return jsonify({"error": "⛔ La hora de fin debe ser posterior a la de inicio."}), 400
    if duracion > 6:
        return jsonify({"error": "⛔ Un bloque no puede durar más de 6 horas."}), 400

    try:
        conn = get_db()
        cur = conn.cursor()

        # ⚠️ Verificar duplicados (excluyendo el mismo bloque)
        cur.execute("""
            SELECT COUNT(*)
            FROM bloque_horario
            WHERE dia = %s AND hora_inicio = %s AND hora_fin = %s AND bloque_id != %s;
        """, (dia, hora_inicio, hora_fin, bloque_id))
        if cur.fetchone()[0] > 0:
            return jsonify({"error": f"⛔ Ya existe un bloque para {dia} entre {hora_inicio} y {hora_fin}."}), 400

        # 📌 Determinar nuevo turno y código si cambia hora/día
        turno = "M" if inicio.hour < 12 else "T" if inicio.hour < 19 else "N"
        cur.execute("""
            SELECT codigo_bloque
            FROM bloque_horario
            WHERE dia = %s AND codigo_bloque LIKE %s
            ORDER BY bloque_id DESC
            LIMIT 1;
        """, (dia, f"{dia[:3].upper()}-{turno}%"))
        ultimo_codigo = cur.fetchone()

        if ultimo_codigo and "-" in ultimo_codigo[0]:
            parte_numerica = ''.join(ch for ch in ultimo_codigo[0] if ch.isdigit())
            siguiente_num = int(parte_numerica) + 1 if parte_numerica else 1
        else:
            siguiente_num = 1

        codigo_bloque = f"{dia[:3].upper()}-{turno}{siguiente_num}"

        # ✏️ Actualizar bloque
        cur.execute("""
            UPDATE bloque_horario
            SET dia = %s, hora_inicio = %s, hora_fin = %s, estado = %s, codigo_bloque = %s
            WHERE bloque_id = %s
            RETURNING bloque_id, codigo_bloque;
        """, (dia, hora_inicio, hora_fin, estado, codigo_bloque, bloque_id))

        result = cur.fetchone()
        conn.commit()

        if not result:
            return jsonify({"error": "❌ Bloque no encontrado."}), 404

        return jsonify({
            "mensaje": "✅ Bloque horario actualizado correctamente.",
            "bloque_id": result[0],
            "codigo_bloque": result[1]
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        print("❌ Error al editar bloque:", e)
        return jsonify({"error": str(e)}), 500

    finally:
        if cur: cur.close()
        if conn: conn.close()

# ======================================================
# ENDPOINT PARA VERIFICAR SI EL BLOQUE TIENE ASIGNACIONES
# ======================================================
@bloques_horarios_bp.route("/bloques-horarios/<int:bloque_id>/asignaciones", methods=["GET"])
def verificar_asignaciones_bloque(bloque_id):
    """Verifica si el bloque tiene asignaciones activas o inactivas"""
    try:
        conn = get_db()
        cur = conn.cursor()

        # Contar asignaciones totales
        cur.execute("""
            SELECT COUNT(*) 
            FROM asignaciones 
            WHERE bloque_id = %s;
        """, (bloque_id,))
        
        cantidad = cur.fetchone()[0]

        return jsonify({
            "cantidad": cantidad,
            "tiene_asignaciones": cantidad > 0
        }), 200

    except Exception as e:
        print("❌ Error al verificar asignaciones:", e)
        return jsonify({"error": str(e)}), 500

    finally:
        if cur: cur.close()
        if conn: conn.close()


# ======================================================
# ENDPOINT PARA VERIFICAR SECCIONES ACTIVAS
# ======================================================
@bloques_horarios_bp.route("/bloques-horarios/<int:bloque_id>/secciones-activas", methods=["GET"])
def verificar_secciones_activas_bloque(bloque_id):
    """Verifica si el bloque tiene secciones activas (con docente asignado)"""
    try:
        conn = get_db()
        cur = conn.cursor()

        # Verificar si hay secciones activas con este bloque
        cur.execute("""
            SELECT COUNT(DISTINCT s.seccion_id)
            FROM asignaciones a
            INNER JOIN secciones s ON a.seccion_id = s.seccion_id
            WHERE a.bloque_id = %s 
              AND s.estado = 'ACTIVO';
        """, (bloque_id,))
        
        cantidad_activas = cur.fetchone()[0]

        return jsonify({
            "tiene_secciones_activas": cantidad_activas > 0,
            "cantidad": cantidad_activas
        }), 200

    except Exception as e:
        print("❌ Error al verificar secciones activas:", e)
        return jsonify({"error": str(e)}), 500

    finally:
        if cur: cur.close()
        if conn: conn.close()


# ======================================================
# DELETE - ELIMINAR BLOQUE DE HORARIO CON CASCADA COMPLETA
# ======================================================
@bloques_horarios_bp.route("/bloques-horarios/<int:bloque_id>", methods=["DELETE"])
def eliminar_bloque_horario(bloque_id):
    """
    Elimina un bloque de horario junto con TODAS sus dependencias en cascada.
    
    ORDEN DE ELIMINACIÓN (de hijos a padres):
    1. asistencia (relacionada con matriculas)
    2. matriculas (relacionadas con asignaciones)
    3. materiales (relacionados con asignaciones)
    4. sesion_clase (relacionadas con asignaciones/secciones)
    5. asignaciones (relacionadas con bloque_horario)
    6. bloque_horario (tabla principal)
    
    Reglas de negocio:
    - NO se puede eliminar si tiene secciones activas
    - SI se puede eliminar si solo tiene asignaciones sin secciones activas
    """
    try:
        conn = get_db()
        cur = conn.cursor()

        # 1️⃣ Verificar que el bloque exista
        cur.execute("SELECT bloque_id, codigo_bloque FROM bloque_horario WHERE bloque_id = %s;", (bloque_id,))
        bloque = cur.fetchone()
        
        if not bloque:
            return jsonify({"error": "❌ El bloque no existe."}), 404

        # 2️⃣ Verificar secciones activas (solo para información, NO bloquea)
        cur.execute("""
            SELECT COUNT(DISTINCT s.seccion_id)
            FROM asignaciones a
            INNER JOIN secciones s ON a.seccion_id = s.seccion_id
            WHERE a.bloque_id = %s 
              AND s.estado = 'ACTIVO';
        """, (bloque_id,))
        
        secciones_activas = cur.fetchone()[0]
        # ✅ Ya NO bloqueamos, solo informamos en el frontend

        # 3️⃣ Obtener todas las asignaciones relacionadas
        cur.execute("""
            SELECT asignacion_id 
            FROM asignaciones 
            WHERE bloque_id = %s;
        """, (bloque_id,))
        
        asignaciones_ids = [row[0] for row in cur.fetchall()]
        asignaciones_count = len(asignaciones_ids)

        # 4️⃣ Obtener todas las secciones relacionadas
        cur.execute("""
            SELECT DISTINCT seccion_id 
            FROM asignaciones 
            WHERE bloque_id = %s;
        """, (bloque_id,))
        
        secciones_ids = [row[0] for row in cur.fetchall()]

        # 5️⃣ Obtener todas las matrículas relacionadas
        matriculas_ids = []
        for asignacion_id in asignaciones_ids:
            cur.execute("""
                SELECT matricula_id 
                FROM matriculas 
                WHERE asignacion_id = %s;
            """, (asignacion_id,))
            matriculas_ids.extend([row[0] for row in cur.fetchall()])
        
        matriculas_count = len(matriculas_ids)

        # 🗑️ INICIO DE ELIMINACIÓN EN CASCADA (de hijos a padres)
        
        # 6️⃣ Eliminar asistencias relacionadas con las matrículas
        asistencias_count = 0
        for matricula_id in matriculas_ids:
            cur.execute("""
                DELETE FROM asistencia 
                WHERE matricula_id = %s;
            """, (matricula_id,))
            asistencias_count += cur.rowcount

        # 7️⃣ Eliminar matrículas relacionadas con las asignaciones
        for asignacion_id in asignaciones_ids:
            cur.execute("""
                DELETE FROM matriculas 
                WHERE asignacion_id = %s;
            """, (asignacion_id,))

        # 8️⃣ Eliminar materiales relacionados con cada asignación
        materiales_count = 0
        for asignacion_id in asignaciones_ids:
            cur.execute("""
                DELETE FROM materiales 
                WHERE asignacion_id = %s;
            """, (asignacion_id,))
            materiales_count += cur.rowcount

        # 9️⃣ Eliminar sesiones de clase relacionadas con las secciones
        sesiones_count = 0
        for seccion_id in secciones_ids:
            cur.execute("""
                DELETE FROM sesion_clase 
                WHERE seccion_id = %s;
            """, (seccion_id,))
            sesiones_count += cur.rowcount

        # 🔟 Eliminar asignaciones relacionadas con el bloque
        cur.execute("""
            DELETE FROM asignaciones 
            WHERE bloque_id = %s;
        """, (bloque_id,))

        # 1️⃣1️⃣ Finalmente, eliminar el bloque de horario
        cur.execute("""
            DELETE FROM bloque_horario 
            WHERE bloque_id = %s;
        """, (bloque_id,))

        conn.commit()

        return jsonify({
            "mensaje": "🗑️ Bloque horario eliminado correctamente.",
            "codigo_bloque": bloque[1],
            "detalles": {
                "asistencias_eliminadas": asistencias_count,
                "matriculas_eliminadas": matriculas_count,
                "materiales_eliminados": materiales_count,
                "sesiones_eliminadas": sesiones_count,
                "asignaciones_eliminadas": asignaciones_count
            }
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        print("❌ Error al eliminar bloque:", e)
        return jsonify({"error": str(e)}), 500

    finally:
        if cur: cur.close()
        if conn: conn.close()


# ======================================================
# CONSULTA PARA VER TODAS LAS RELACIONES DE TU BASE DE DATOS
# ======================================================
@bloques_horarios_bp.route("/bloques-horarios/ver-relaciones", methods=["GET"])
def ver_relaciones_base_datos():
    """
    Endpoint de diagnóstico para ver todas las foreign keys de la base de datos.
    Útil para entender las dependencias entre tablas.
    """
    try:
        conn = get_db()
        cur = conn.cursor()

        cur.execute("""
            SELECT
                tc.table_name AS tabla_hija,
                kcu.column_name AS columna_fk,
                ccu.table_name AS tabla_padre,
                ccu.column_name AS columna_referenciada,
                tc.constraint_name AS nombre_constraint
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
            ORDER BY tc.table_name, ccu.table_name;
        """)

        relaciones = cur.fetchall()
        columnas = [desc[0] for desc in cur.description]

        resultado = []
        for fila in relaciones:
            resultado.append(dict(zip(columnas, fila)))

        return jsonify({
            "total_relaciones": len(resultado),
            "relaciones": resultado
        }), 200

    except Exception as e:
        print("❌ Error al obtener relaciones:", e)
        return jsonify({"error": str(e)}), 500

    finally:
        if cur: cur.close()
        if conn: conn.close()