import re
from flask import Blueprint, request, jsonify
from database.db import get_db
from utils.security import hash_password, verify_password
from psycopg2.extras import RealDictCursor

perfiladmin_bp = Blueprint("perfiladmin_bp", __name__)

# ===========================
# FUNCIONES DE VALIDACIÓN
# ===========================
def validar_telefono(telefono):
    return telefono and telefono.isdigit() and len(telefono) == 9

def validar_correo(correo):
    patron = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(patron, correo))

# ===========================
# OBTENER MI PERFIL (Administrador logueado)
# ===========================
@perfiladmin_bp.route("/mi-perfil/<int:usuario_id>", methods=["GET"])
def obtener_mi_perfil(usuario_id):
    conn = None
    cur = None
    
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT 
                u.usuario_id,
                u.correo AS correo_institucional,
                u.primer_login,
                p.nombres,
                p.apellidos,
                p.dni,
                p.telefono,
                p.fecha_nacimiento,
                d.direccion_detalle,
                d.id_distrito,
                dist.nombre_distrito,
                dist.provincia_id,
                prov.nombre_provincia,
                prov.departamento_id,
                dep.nombre_departamento,
                a.id_formacion,
                f.nombre_formacion,
                a.id_especialidad,
                esp.nombre_especialidad,
                a.experiencia_lab,
                a.escuela_id,
                e.nombre_escuela,
                e.facultad,
                a.estado
            FROM usuario u
            JOIN persona p ON u.usuario_id = p.usuario_id
            JOIN administrador a ON p.persona_id = a.persona_id
            LEFT JOIN direccion d ON p.id_direccion = d.id_direccion
            LEFT JOIN distrito dist ON d.id_distrito = dist.distrito_id
            LEFT JOIN provincia prov ON dist.provincia_id = prov.provincia_id
            LEFT JOIN departamento_geo dep ON prov.departamento_id = dep.departamento_id
            LEFT JOIN formacion f ON a.id_formacion = f.id_formacion
            LEFT JOIN especialidad esp ON a.id_especialidad = esp.id_especialidad
            LEFT JOIN escuela e ON a.escuela_id = e.escuela_id
            WHERE u.usuario_id = %s
        """, (usuario_id,))
        
        admin = cur.fetchone()
        
        if admin:
            # Dividir apellidos en paterno y materno
            apellidos = admin['apellidos'].split(' ', 1) if admin['apellidos'] else ['', '']
            admin['apellido_paterno'] = apellidos[0] if len(apellidos) > 0 else ''
            admin['apellido_materno'] = apellidos[1] if len(apellidos) > 1 else ''
            
            return jsonify(admin)
        else:
            return jsonify({"error": "Perfil de administrador no encontrado"}), 404
            
    except Exception as e:
        print(f"❌ Error al obtener perfil: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# ===========================
# MODIFICAR MI PERFIL - SOLO CONTACTO Y UBICACIÓN
# ===========================
@perfiladmin_bp.route("/mi-perfil/<int:usuario_id>", methods=["PUT"])
def modificar_mi_perfil(usuario_id):
    data = request.json
    
    telefono = data.get("telefono")
    direccion_detalle = data.get("direccion_detalle")
    distrito_id = data.get("distrito_id")
    
    # Validaciones
    if telefono and not validar_telefono(telefono):
        return jsonify({"error": "El teléfono debe tener exactamente 9 dígitos numéricos"}), 400
    
    if not distrito_id:
        return jsonify({"error": "Debe seleccionar un distrito"}), 400
    
    conn = None
    cur = None
    
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # 1️⃣ Verificar existencia de persona
        cur.execute("""
            SELECT p.persona_id, p.direccion_id 
            FROM persona p 
            WHERE p.usuario_id = %s
        """, (usuario_id,))
        
        resultado = cur.fetchone()
        if not resultado:
            return jsonify({"error": "Administrador no encontrado"}), 404
        
        persona_id, direccion_id = resultado
        
        # 2️⃣ Actualizar PERSONA (solo teléfono)
        cur.execute("""
            UPDATE persona 
            SET telefono = %s
            WHERE persona_id = %s
        """, (telefono, persona_id))
        
        # 3️⃣ Actualizar DIRECCIÓN
        if direccion_id:
            cur.execute("""
                UPDATE direccion 
                SET direccion_detalle = %s, id_distrito = %s
                WHERE id_direccion = %s
            """, (direccion_detalle, distrito_id, direccion_id))
        else:
            cur.execute("""
                INSERT INTO direccion (direccion_detalle, id_distrito)
                VALUES (%s, %s) RETURNING id_direccion
            """, (direccion_detalle, distrito_id))
            nueva_direccion_id = cur.fetchone()[0]
            
            cur.execute("""
                UPDATE persona 
                SET direccion_id = %s 
                WHERE persona_id = %s
            """, (nueva_direccion_id, persona_id))
        
        conn.commit()
        return jsonify({"mensaje": "✅ Tu perfil ha sido actualizado correctamente"}), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ Error al modificar perfil: {e}")
        return jsonify({"error": f"Error al actualizar perfil: {str(e)}"}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# ===========================
# MODIFICAR CONTRASEÑA (Apartado Credenciales)
# ===========================
@perfiladmin_bp.route("/mi-perfil/<int:usuario_id>/cambiar-contrasena", methods=["PUT"])
def cambiar_contrasena(usuario_id):
    data = request.json
    
    contrasena_actual = data.get("contrasena_actual")
    contrasena_nueva = data.get("contrasena_nueva")
    confirmar_contrasena = data.get("confirmar_contrasena")
    
    # Validaciones
    if not contrasena_actual or not contrasena_nueva or not confirmar_contrasena:
        return jsonify({"error": "Todos los campos son obligatorios"}), 400
    
    if contrasena_nueva != confirmar_contrasena:
        return jsonify({"error": "Las contraseñas nuevas no coinciden"}), 400
    
    if len(contrasena_nueva) < 8:
        return jsonify({"error": "La contraseña debe tener al menos 8 caracteres"}), 400
    
    conn = None
    cur = None
    
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # 1️⃣ Verificar contraseña actual
        cur.execute("SELECT contrasena FROM usuario WHERE usuario_id = %s", (usuario_id,))
        resultado = cur.fetchone()
        if not resultado:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        contrasena_almacenada = resultado[0]
        
        if not verify_password(contrasena_actual, contrasena_almacenada):
            return jsonify({"error": "La contraseña actual es incorrecta"}), 401
        
        # 2️⃣ Actualizar nueva contraseña y marcar primer_login = FALSE
        contrasena_hash = hash_password(contrasena_nueva)
        cur.execute("""
            UPDATE usuario 
            SET contrasena = %s, primer_login = FALSE
            WHERE usuario_id = %s
        """, (contrasena_hash, usuario_id))
        
        conn.commit()
        return jsonify({"mensaje": "✅ Contraseña actualizada correctamente"}), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ Error al cambiar contraseña: {e}")
        return jsonify({"error": f"Error al cambiar contraseña: {str(e)}"}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@perfiladmin_bp.route("/mi-perfil/<int:usuario_id>/marcar-login", methods=["PUT"])
def marcar_login(usuario_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE usuario SET primer_login = FALSE WHERE usuario_id = %s", (usuario_id,))
    conn.commit()
    return jsonify({"mensaje": "Primer login actualizado"})

# ===========================
# OBTENER ESCUELAS (Helper)
# ===========================
@perfiladmin_bp.route("/escuelas", methods=["GET"])
def obtener_escuelas():
    conn = None
    cur = None
    
    try:
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT escuela_id, nombre_escuela, facultad 
            FROM escuela 
            ORDER BY nombre_escuela
        """)
        escuelas = cur.fetchall()
        
        return jsonify({
            "escuelas": [
                {
                    "escuela_id": row[0],
                    "nombre_escuela": row[1],
                    "facultad": row[2]
                } for row in escuelas
            ]
        })
        
    except Exception as e:
        print(f"❌ Error al obtener escuelas: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
