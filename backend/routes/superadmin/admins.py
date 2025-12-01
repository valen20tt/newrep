from flask import Blueprint, request, jsonify
from psycopg2.extras import RealDictCursor
import psycopg2
from database.db import get_db
from utils.security import hash_password
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from routes.superadmin.helpers import (
    generar_contrasena,
    generar_correo_institucional,
    enviar_credenciales
)

admins_bp = Blueprint('admins_bp', __name__)

# ======================================================
# 🔹 FUNCIÓN AUXILIAR: VALIDAR FECHA DE NACIMIENTO
# ======================================================
def validar_fecha_nacimiento(fecha_nacimiento_obj):
    """
    Valida que la fecha de nacimiento corresponda a una persona
    con al menos 25 años de edad y no sea una fecha futura.
    """
    hoy = date.today()
    
    # Validar que no sea fecha futura
    if fecha_nacimiento_obj > hoy:
        return False, "La fecha de nacimiento no puede ser futura."
    
    # Calcular edad usando relativedelta para mayor precisión
    edad = relativedelta(hoy, fecha_nacimiento_obj).years
    
    # Validar edad mínima
    if edad < 25:
        return False, f"El administrador debe tener al menos 25 años. Edad actual: {edad} años."
    
    # Validar edad máxima razonable (120 años)
    if edad > 120:
        return False, "La fecha de nacimiento no es válida (edad excede límite razonable)."
    
    return True, None

# ======================================================
# 🧱 CREAR ADMINISTRADOR (FINAL, CORREGIDO Y MEJORADO)
# ======================================================
@admins_bp.route("/crear-admin", methods=["POST"])
def crear_admin():
    data = request.json

    # === 1️⃣ VALIDACIONES DE CAMPOS OBLIGATORIOS ===
    campos_obligatorios = [
        "nombres", "apellidos", "dni", "telefono", "correo_personal",
        "direccion_detalle", "distrito_id", "fecha_nacimiento",
        "id_formacion", "id_especialidad", "escuela_id"
    ]

    print("📦 JSON recibido en /crear-admin:", data)

    for campo in campos_obligatorios:
        if not data.get(campo):
            return jsonify({"error": f"El campo '{campo}' es obligatorio."}), 400

    # === 2️⃣ VALIDACIONES DE FORMATO ===
    if not data["dni"].isdigit() or len(data["dni"]) != 8:
        return jsonify({"error": "El DNI debe tener exactamente 8 dígitos numéricos."}), 400
    if not data["telefono"].isdigit() or len(data["telefono"]) != 9:
        return jsonify({"error": "El teléfono debe tener 9 dígitos numéricos."}), 400

    # === 3️⃣ CONVERSIÓN Y VALIDACIÓN DE FECHA ===
    fecha_nacimiento_str = data.get("fecha_nacimiento")
    try:
        if "/" in fecha_nacimiento_str:
            fecha_nacimiento_obj = datetime.strptime(fecha_nacimiento_str, "%d/%m/%Y").date()
        else:
            fecha_nacimiento_obj = datetime.strptime(fecha_nacimiento_str, "%Y-%m-%d").date()
    except Exception:
        return jsonify({"error": "Formato de fecha inválido. Use DD/MM/YYYY o YYYY-MM-DD."}), 400

    # 🔹 VALIDAR EDAD MÍNIMA DE 25 AÑOS
    es_valida, mensaje_error = validar_fecha_nacimiento(fecha_nacimiento_obj)
    if not es_valida:
        return jsonify({"error": mensaje_error}), 400

    # === 4️⃣ CREACIÓN DE CREDENCIALES ===
    correo_institucional = generar_correo_institucional(data["nombres"], data["apellidos"])
    contrasena_generada = generar_contrasena()
    contrasena_hash = hash_password(contrasena_generada)

    conn = None
    cur = None

    try:
        conn = get_db()
        cur = conn.cursor()

        # === PASO 1: DIRECCIÓN ===
        cur.execute("""
            INSERT INTO direccion (id_distrito, direccion_detalle)
            VALUES (%s, %s)
            RETURNING id_direccion
        """, (data["distrito_id"], data["direccion_detalle"]))
        direccion_id = cur.fetchone()[0]

        # === PASO 2: USUARIO ===
        cur.execute("""
            INSERT INTO usuario (correo, contrasena, estado)
            VALUES (%s, %s, 'Activo')
            RETURNING usuario_id
        """, (correo_institucional, contrasena_hash))
        usuario_id = cur.fetchone()[0]

        # === PASO 3: PERSONA ===
        # === PASO 3: PERSONA ===
        cur.execute("""
    INSERT INTO persona (usuario_id, id_direccion, nombres, apellidos, dni, telefono, fecha_nacimiento) -- 🔴 CAMBIO AQUÍ
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    RETURNING persona_id
    """, (
    usuario_id, direccion_id, data["nombres"], data["apellidos"],
    data["dni"], data["telefono"], fecha_nacimiento_obj
))
        persona_id = cur.fetchone()[0]

        # === PASO 4: ADMINISTRADOR ===
        cur.execute("""
            INSERT INTO administrador (persona_id, id_formacion, id_especialidad, experiencia_lab, escuela_id, estado)
            VALUES (%s, %s, %s, %s, %s, 'Activo')
        """, (
            persona_id, data["id_formacion"], data["id_especialidad"],
            data.get("experiencia_lab"), data["escuela_id"]
        ))

        # === PASO 5: ROL ===
        cur.execute("""
            INSERT INTO usuario_rol (usuario_id, rol_id)
            VALUES (%s, (SELECT rol_id FROM rol WHERE nombre_rol = 'Admin'))
        """, (usuario_id,))

        conn.commit()

        # === PASO 6: ENVÍO DE CREDENCIALES ===
        enviado = enviar_credenciales(data['correo_personal'], correo_institucional, contrasena_generada)
        if not enviado:
            print(f"⚠ No se pudo enviar el correo a {data['correo_personal']}")

        return jsonify({
            "mensaje": f"✅ Administrador creado exitosamente. Credenciales enviadas a {data['correo_personal']}."
        }), 201

    # === 7️⃣ ERRORES ESPECÍFICOS ===
    except psycopg2.IntegrityError as e:
        if conn:
            conn.rollback()
        error_text = str(e).lower()

        if "dni" in error_text:
            msg = "❌ El DNI ingresado ya está registrado."
        elif "correo" in error_text:
            msg = "❌ El correo institucional generado ya existe."
        elif "telefono" in error_text:
            msg = "❌ El teléfono ingresado ya está registrado."
        elif "id_distrito" in error_text:
            msg = "❌ El distrito seleccionado no existe."
        elif "id_formacion" in error_text:
            msg = "❌ La formación seleccionada no existe."
        elif "id_especialidad" in error_text:
            msg = "❌ La especialidad seleccionada no existe."
        elif "escuela_id" in error_text:
            msg = "❌ La escuela seleccionada no existe."
        else:
            msg = "⚠ Error de integridad en la base de datos. Revise los datos ingresados."
        return jsonify({"error": msg}), 400

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"🔥 Error inesperado al crear administrador: {e}")
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# ======================================================
# 📋 LISTAR ADMINISTRADORES
# ======================================================
@admins_bp.route("/admins", methods=["GET"])
def listar_admins():
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
SELECT 
    u.usuario_id, 
    p.nombres, p.apellidos, p.dni, p.telefono, p.fecha_nacimiento, 
    d.direccion_detalle, dist.nombre_distrito, dist.distrito_id,
    a.id_formacion, f.nombre_formacion AS formacion,
    a.id_especialidad, e.nombre_especialidad AS cargo,
    a.experiencia_lab, a.escuela_id, es.nombre_escuela AS escuela,
    u.correo, a.estado
FROM usuario u
JOIN persona p ON u.usuario_id = p.usuario_id 
JOIN administrador a ON p.persona_id = a.persona_id 
JOIN usuario_rol ur ON u.usuario_id = ur.usuario_id
JOIN rol r ON ur.rol_id = r.rol_id
LEFT JOIN direccion d ON p.id_direccion = d.id_direccion  -- 🔴 CAMBIO AQUÍ (antes decía p.direccion_id)
LEFT JOIN distrito dist ON d.id_distrito = dist.distrito_id 
LEFT JOIN formacion f ON a.id_formacion = f.id_formacion
LEFT JOIN especialidad e ON a.id_especialidad = e.id_especialidad
LEFT JOIN escuela es ON a.escuela_id = es.escuela_id
WHERE r.nombre_rol = 'Admin'
ORDER BY p.nombres ASC
""")
        admins = cur.fetchall()
        return jsonify({"admins": admins})
    except Exception as e:
        print("Error al listar admins:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# ======================================================
# ✏ MODIFICAR ADMINISTRADOR
# ======================================================
@admins_bp.route("/admins/<int:usuario_id>", methods=["PUT"])
def modificar_admin(usuario_id):
    data = request.json
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()

        # 🔹 VALIDAR FECHA DE NACIMIENTO SI SE ESTÁ ACTUALIZANDO
        if data.get("fecha_nacimiento"):
            try:
                if "/" in data["fecha_nacimiento"]:
                    fecha_obj = datetime.strptime(data["fecha_nacimiento"], "%d/%m/%Y").date()
                else:
                    fecha_obj = datetime.strptime(data["fecha_nacimiento"], "%Y-%m-%d").date()
                
                es_valida, mensaje_error = validar_fecha_nacimiento(fecha_obj)
                if not es_valida:
                    return jsonify({"error": mensaje_error}), 400
                    
                data["fecha_nacimiento"] = fecha_obj  # ✅ usar el objeto ya validado
                
            except Exception:
                return jsonify({"error": "Formato de fecha inválido."}), 400

        # 1️⃣ ACTUALIZAR USUARIO
        if data.get("correo"):
            cur.execute("UPDATE usuario SET correo = %s WHERE usuario_id = %s", (data["correo"], usuario_id))

        # 2️⃣ OBTENER persona_id y direccion_id
        cur.execute("SELECT persona_id, direccion_id FROM persona WHERE usuario_id = %s", (usuario_id,))
        persona = cur.fetchone()
        if not persona:
            return jsonify({"error": "Persona no encontrada"}), 404
        persona_id, direccion_id = persona


        # 3️⃣ ACTUALIZAR PERSONA
        cur.execute("""
            UPDATE persona SET
                nombres = %s, apellidos = %s, dni = %s,
                telefono = %s, fecha_nacimiento = %s
            WHERE persona_id = %s
        """, (data.get("nombres"), data.get("apellidos"), data.get("dni"),
              data.get("telefono"), data.get("fecha_nacimiento"), persona_id))

        # 4️⃣ ACTUALIZAR DIRECCIÓN
        if direccion_id:
            cur.execute("""
                UPDATE direccion SET direccion_detalle = %s, id_distrito = %s
                WHERE id_direccion = %s
            """, (data.get("direccion_detalle"), data.get("distrito_id"), direccion_id))
        else:
            cur.execute("""
                INSERT INTO direccion (direccion_detalle, id_distrito)
                VALUES (%s, %s) RETURNING id_direccion
            """, (data.get("direccion_detalle"), data.get("distrito_id")))
            nueva_direccion = cur.fetchone()[0]
            # En el bloque 4️⃣ ACTUALIZAR DIRECCIÓN (parte else/insert o update persona)
            cur.execute("UPDATE persona SET id_direccion = %s WHERE persona_id = %s", 
            (nueva_direccion, persona_id))

        # 5️⃣ ACTUALIZAR ADMINISTRADOR
        cur.execute("""
            UPDATE administrador SET
                id_formacion = %s, id_especialidad = %s,
                experiencia_lab = %s, escuela_id = %s, estado = %s
            WHERE persona_id = %s
        """, (data.get("id_formacion"), data.get("id_especialidad"),
              data.get("experiencia_lab"), data.get("escuela_id"),
              data.get("estado"), persona_id))

        conn.commit()
        return jsonify({"mensaje": "Administrador actualizado correctamente ✅"})
    except Exception as e:
        if conn: conn.rollback()
        print("❌ Error al modificar admin:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()


# ======================================================
# ❌ ELIMINAR ADMINISTRADOR (CORREGIDO)
# ======================================================
@admins_bp.route("/admins/<int:usuario_id>", methods=["DELETE"])
def eliminar_admin(usuario_id):
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()

        # 1️⃣ Obtener persona_id asociado al usuario
        cur.execute("SELECT persona_id FROM persona WHERE usuario_id = %s", (usuario_id,))
        persona = cur.fetchone()
        if not persona:
            return jsonify({"error": "No se encontró persona asociada a este usuario"}), 404

        persona_id = persona[0]

        # 2️⃣ Eliminar primero de administrador
        cur.execute("DELETE FROM administrador WHERE persona_id = %s", (persona_id,))

        # 3️⃣ Eliminar la persona
        cur.execute("DELETE FROM persona WHERE persona_id = %s", (persona_id,))

        # 4️⃣ Eliminar relaciones en usuario_rol y luego el usuario
        cur.execute("DELETE FROM usuario_rol WHERE usuario_id = %s", (usuario_id,))
        cur.execute("DELETE FROM usuario WHERE usuario_id = %s", (usuario_id,))

        conn.commit()
        return jsonify({"mensaje": "Administrador eliminado correctamente ✅"})

    except Exception as e:
        if conn:
            conn.rollback()
        print("Error al eliminar admin:", e)
        return jsonify({"error": "Error al eliminar administrador"}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# ======================================================
# 🔄 CAMBIAR ESTADO (Activo/Inactivo)
# ======================================================
@admins_bp.route("/admins/<int:usuario_id>/estado", methods=["PATCH"])
def cambiar_estado_admin(usuario_id):
    data = request.json
    nuevo_estado = data.get("estado")
    if nuevo_estado not in ["Activo", "Inactivo"]:
        return jsonify({"error": "Estado inválido"}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE administrador SET estado=%s WHERE usuario_id=%s", (nuevo_estado, usuario_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"mensaje": f"Estado actualizado a {nuevo_estado}"})