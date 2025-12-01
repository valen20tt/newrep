import re
from flask import Blueprint, request, jsonify
from database.db import get_db
from utils.security import hash_password
from psycopg2.extras import RealDictCursor
from datetime import datetime

# Crear el Blueprint
alumnos_bp = Blueprint("alumnos", __name__)

# ===========================
# FUNCIONES DE VALIDACIÓN
# ===========================
def validar_correo(correo, rol):
    """Valida que el correo tenga el dominio correcto según el rol"""
    dominios = {
        "Docente": "@docenteunfv.edu.pe",
        "Alumno": "@alumnounfv.edu.pe"
    }
    if rol not in dominios:
        return False
    return correo and correo.endswith(dominios[rol])

def validar_telefono(telefono):
    """Valida que el teléfono tenga exactamente 9 dígitos"""
    if not telefono:
        return False
    return bool(re.fullmatch(r'\d{9}', telefono))

def validar_dni(dni):
    """Valida que el DNI tenga exactamente 8 dígitos"""
    if not dni:
        return False
    return bool(re.fullmatch(r'\d{8}', dni))

# ===========================
# CREAR ALUMNO
# ===========================
@alumnos_bp.route("/crear-alumno", methods=["POST"])
def crear_alumno():
    """
    Crea un nuevo alumno en el sistema según la estructura real de la BD.
    ✅ MODIFICACIÓN: Ya no valida correo institucional porque se genera automáticamente
    """
    print("=" * 50)
    print("🔵 INICIO - Crear Alumno")
    print("=" * 50)
    
    if not request.json:
        print("❌ No se recibió JSON")
        return jsonify({"error": "No se recibieron datos"}), 400
    
    data = request.json
    print(f"📨 Datos recibidos: {data}")
    
    # Capturar datos del formulario
    correo_institucional = data.get("correo_institucional")  # Ya viene generado desde el frontend
    correo_personal = data.get("correo_personal")
    nombres = data.get("nombres")
    apellido_paterno = data.get("apellido_paterno")
    apellido_materno = data.get("apellido_materno")
    dni = data.get("dni")
    telefono = data.get("telefono")
    codigo = data.get("codigo_universitario")
    ciclo_ingreso = data.get("ciclo_ingreso")
    escuela_id = data.get("escuela_id", 1)
    
    # Validaciones
    if not all([correo_institucional, nombres, apellido_paterno, apellido_materno, dni, telefono, codigo, ciclo_ingreso, correo_personal]):
        campos_faltantes = []
        if not correo_institucional: campos_faltantes.append("correo_institucional")
        if not correo_personal: campos_faltantes.append("correo_personal")
        if not nombres: campos_faltantes.append("nombres")
        if not apellido_paterno: campos_faltantes.append("apellido_paterno")
        if not apellido_materno: campos_faltantes.append("apellido_materno")
        if not dni: campos_faltantes.append("dni")
        if not telefono: campos_faltantes.append("telefono")
        if not codigo: campos_faltantes.append("codigo_universitario")
        if not ciclo_ingreso: campos_faltantes.append("ciclo_ingreso")
        
        print(f"❌ Campos faltantes: {campos_faltantes}")
        return jsonify({"error": f"Campos faltantes: {', '.join(campos_faltantes)}"}), 400
    
    # ✅ MODIFICACIÓN: Validación del correo institucional más flexible
    if not validar_correo(correo_institucional, "Alumno"):
        return jsonify({"error": "El correo debe terminar en @alumnounfv.edu.pe"}), 400
        
    if not validar_telefono(telefono):
        return jsonify({"error": "El teléfono debe tener exactamente 9 dígitos"}), 400
        
    if not validar_dni(dni):
        return jsonify({"error": "El DNI debe tener exactamente 8 dígitos"}), 400

    conn = None
    cur = None

    try:
        conn = get_db()
        cur = conn.cursor()

        # Verificar duplicados
        print("🔍 Verificando duplicados...")
        
        cur.execute("SELECT codigo_universitario FROM estudiante WHERE codigo_universitario = %s", (codigo,))
        if cur.fetchone():
            return jsonify({"error": "El código universitario ya está registrado"}), 400

        cur.execute("SELECT correo FROM usuario WHERE correo = %s", (correo_institucional,))
        if cur.fetchone():
            return jsonify({"error": "El correo institucional ya está registrado"}), 400

        cur.execute("SELECT dni FROM persona WHERE dni = %s", (dni,))
        if cur.fetchone():
            return jsonify({"error": "El DNI ya está registrado"}), 400

        import random
        import string
        
        # Generar contraseña de 8 caracteres: mayúsculas, minúsculas, números y símbolos
        caracteres = string.ascii_letters + string.digits + "!@#$%&*"
        contrasena_temp = ''.join(random.choice(caracteres) for _ in range(8))
        contrasena_hash = hash_password(contrasena_temp)

        # 1️⃣ Insertar usuario
        print("➡️ Insertando usuario...")
        cur.execute("""
            INSERT INTO usuario (correo, contrasena, estado) 
            VALUES (%s, %s, 'ACTIVO') 
            RETURNING usuario_id
        """, (correo_institucional, contrasena_hash))
        usuario_id = cur.fetchone()[0]
        print(f"✅ Usuario ID: {usuario_id}")

        # 2️⃣ Asignar rol
        print("➡️ Asignando rol...")
        cur.execute("""
            SELECT rol_id FROM rol 
            WHERE LOWER(nombre_rol) IN ('alumno', 'estudiante')
        """)
        rol = cur.fetchone()
        if not rol:
            raise Exception("No se encontró el rol de Estudiante/Alumno en la base de datos")
        
        rol_id = rol[0]
        cur.execute("""
            INSERT INTO usuario_rol (usuario_id, rol_id)
            VALUES (%s, %s)
        """, (usuario_id, rol_id))
        print(f"✅ Rol asignado: {rol_id}")

        # 3️⃣ Insertar persona
        print("➡️ Insertando persona...")
        apellidos = f"{apellido_paterno} {apellido_materno}"
        cur.execute("""
            INSERT INTO persona (usuario_id, nombres, apellidos, dni, telefono) 
            VALUES (%s, %s, %s, %s, %s) 
            RETURNING persona_id
        """, (usuario_id, nombres, apellidos, dni, telefono))
        persona_id = cur.fetchone()[0]
        print(f"✅ Persona ID: {persona_id}")

        # 4️⃣ Insertar estudiante
        print("➡️ Insertando estudiante...")
        cur.execute("""
            INSERT INTO estudiante (codigo_universitario, escuela_id, persona_id, ciclo_actual)
            VALUES (%s, %s, %s, %s)
        """, (codigo, escuela_id, persona_id, ciclo_ingreso))
        print("✅ Estudiante creado")

        conn.commit()
        print("✅ COMMIT exitoso")

        # 📧 Enviar correo de bienvenida con credenciales
        print("=" * 50)
        print("🔵 INICIANDO ENVÍO DE CORREO")
        print("=" * 50)
        
        try:
            from .helpers import enviar_credenciales_estudiante
            print("✅ Función importada correctamente")
            
            nombre_completo = f"{nombres} {apellido_paterno} {apellido_materno}"
            
            envio_exitoso = enviar_credenciales_estudiante(
                correo_destino=correo_personal,
                nombre_completo=nombre_completo,
                correo_institucional=correo_institucional,
                contrasena_temporal=contrasena_temp,
                codigo_universitario=codigo
            )
            
            print(f"📊 Resultado del envío: {envio_exitoso}")
            
            if envio_exitoso:
                print(f"✅ Correo enviado exitosamente a {correo_personal}")
            else:
                print(f"⚠️ Advertencia: El estudiante fue creado pero no se pudo enviar el correo")
                
        except ImportError as ie:
            print(f"❌ ERROR DE IMPORTACIÓN (helpers): {str(ie)}")
            import traceback
            traceback.print_exc()
            envio_exitoso = False
        except Exception as e:
            print(f"❌ ERROR GENERAL AL ENVIAR CORREO: {str(e)}")
            import traceback
            traceback.print_exc()
            envio_exitoso = False

        print("=" * 50)
        print("🟢 FIN - Alumno creado exitosamente")
        print("=" * 50)

        return jsonify({
            "mensaje": "Estudiante registrado exitosamente",
            "correo_enviado": envio_exitoso,
            "datos": {
                "usuario_id": usuario_id,
                "codigo_universitario": codigo,
                "correo_institucional": correo_institucional,
                "contrasena_temporal": contrasena_temp
            }
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error al registrar estudiante: {str(e)}"}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# ===========================================================
# 📚 CONSULTA DE ASIGNACIONES DISPONIBLES SEGÚN EL CICLO ACTUAL
# ===========================================================
@alumnos_bp.route('/asignaciones-disponibles/<int:alumno_id>', methods=['GET'])
def obtener_asignaciones_disponibles(alumno_id):
    """
    Retorna las asignaciones disponibles según el ciclo actual del estudiante.
    """
    conn = None
    cur = None

    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("""
            SELECT estudiante_id, ciclo_actual
            FROM estudiante
            WHERE estudiante_id = %s
        """, (alumno_id,))
        alumno = cur.fetchone()

        if not alumno:
            return jsonify({"error": "Alumno no encontrado"}), 404

        ciclo_registrado = alumno["ciclo_actual"]
        print(f"🧮 Ciclo actual registrado en BD: {ciclo_registrado}")

        match = re.match(r"(\d{4})\s*-\s*(I{1,3}|IV|V|VI|VII|VIII|IX|X)", ciclo_registrado)
        if match:
            anio_ingreso = int(match.group(1))
            semestre_ingreso = match.group(2)
        else:
            anio_ingreso = datetime.now().year
            semestre_ingreso = "I"

        anio_actual = datetime.now().year
        semestre_actual = "I" if datetime.now().month <= 6 else "II"

        diferencia_anios = anio_actual - anio_ingreso
        semestres_pasados = diferencia_anios * 2
        if semestre_actual == "II":
            semestres_pasados += 1

        ciclo_numerico = semestres_pasados + (1 if semestre_ingreso == "I" else 0)

        ciclos_romanos = {
            1: "I", 2: "II", 3: "III", 4: "IV",
            5: "V", 6: "VI", 7: "VII", 8: "VIII",
            9: "IX", 10: "X"
        }
        ciclo_romano = ciclos_romanos.get(ciclo_numerico, "X")

        print(f"🧮 Calculado ciclo actual: {ciclo_romano} ({ciclo_numerico})")

        cur.execute("""
            SELECT 
                a.id_asignacion AS asignacion_id, 
                c.nombre_curso,
                s.nombre AS seccion,
                h.dia,
                h.hora_inicio,
                h.hora_fin,
                h.aula,
                CONCAT(d.nombres, ' ', d.apellidos) AS docente
            FROM asignaciones a
            JOIN cursos c ON a.id_curso = c.id_curso
            JOIN secciones s ON a.id_seccion = s.id_seccion
            JOIN docentes d ON a.id_docente = d.id_docente
            JOIN horarios h ON a.id_horario = h.id_horario
            WHERE c.ciclo = %s
            ORDER BY c.nombre_curso
        """, (ciclo_romano,))

        asignaciones = cur.fetchall()

        return jsonify({
            "alumno_id": alumno_id,
            "ciclo_registrado": ciclo_registrado,
            "ciclo_actual_calculado": ciclo_romano,
            "anio_actual": anio_actual,
            "asignaciones_disponibles": asignaciones
        }), 200

    except Exception as e:
        print("❌ Error en /asignaciones-disponibles:", e)
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# ===========================
# LISTAR ALUMNOS
# ===========================
@alumnos_bp.route("/alumnos", methods=["GET"])
def listar_alumnos():
    """Obtiene la lista completa de alumnos (ACTIVOS e INACTIVOS)"""
    conn = None
    cur = None
    
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT 
                e.estudiante_id,
                e.codigo_universitario,
                p.nombres,
                p.apellidos,
                p.dni,
                p.telefono,
                u.correo AS correo_institucional,
                esc.nombre_escuela,
                esc.facultad,
                u.estado
            FROM estudiante e
            JOIN persona p ON e.persona_id = p.persona_id
            JOIN usuario u ON p.usuario_id = u.usuario_id
            JOIN escuela esc ON e.escuela_id = esc.escuela_id
            ORDER BY 
                CASE WHEN u.estado = 'ACTIVO' THEN 0 ELSE 1 END,
                p.apellidos, p.nombres
        """)
        
        alumnos = cur.fetchall()
        return jsonify({"alumnos": alumnos}), 200
        
    except Exception as e:
        print(f"❌ Error al listar alumnos: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# ===========================
# OBTENER ALUMNO POR ID
# ===========================
@alumnos_bp.route("/alumnos/<int:estudiante_id>", methods=["GET"])
def obtener_alumno(estudiante_id):
    """Obtiene los detalles de un alumno específico"""
    conn = None
    cur = None
    
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT 
                e.estudiante_id,
                e.codigo_universitario,
                p.nombres,
                p.apellidos,
                p.dni,
                p.telefono,
                u.correo AS correo_institucional,
                e.escuela_id,
                e.ciclo_actual,
                esc.nombre_escuela,
                esc.facultad
            FROM estudiante e
            JOIN persona p ON e.persona_id = p.persona_id
            JOIN usuario u ON p.usuario_id = u.usuario_id
            LEFT JOIN escuela esc ON e.escuela_id = esc.escuela_id
            WHERE e.estudiante_id = %s
        """, (estudiante_id,))
        
        alumno = cur.fetchone()
        
        if alumno:
            return jsonify(alumno), 200
        else:
            return jsonify({"error": "Alumno no encontrado"}), 404
            
    except Exception as e:
        print(f"❌ Error al obtener alumno: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# ===========================
# OBTENER ESCUELAS
# ===========================
@alumnos_bp.route("/escuelas", methods=["GET"])
def obtener_escuelas():
    """Obtiene la lista de todas las escuelas"""
    conn = None
    cur = None
    
    try:
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute("SELECT escuela_id, nombre_escuela, facultad FROM escuela ORDER BY nombre_escuela")
        escuelas = cur.fetchall()
        
        return jsonify({
            "escuelas": [
                {
                    "escuela_id": row[0],
                    "nombre_escuela": row[1],
                    "facultad": row[2]
                } for row in escuelas
            ]
        }), 200
        
    except Exception as e:
        print(f"❌ Error al obtener escuelas: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# ===========================
# MODIFICAR ALUMNO
# ===========================
@alumnos_bp.route("/alumnos/<int:estudiante_id>", methods=["PUT"])
def modificar_alumno(estudiante_id):
    """Actualiza la información de un alumno existente."""
    print("=" * 50)
    print(f"🔵 INICIO - Modificar Alumno ID: {estudiante_id}")
    print("=" * 50)
    
    if not request.json:
        print("❌ No se recibieron datos en el request")
        return jsonify({"error": "No se recibieron datos"}), 400
    
    data = request.json
    print(f"📨 Datos recibidos: {data}")
    
    nombres = data.get("nombres")
    apellido_paterno = data.get("apellido_paterno")
    apellido_materno = data.get("apellido_materno")
    dni = data.get("dni")
    telefono = data.get("telefono")
    codigo = data.get("codigo_universitario")
    correo_institucional = data.get("correo_institucional")
    ciclo_actual = data.get("ciclo_actual")
    escuela_id = data.get("escuela_id")

    if not all([nombres, apellido_paterno, apellido_materno, dni, telefono, codigo, correo_institucional, ciclo_actual, escuela_id]):
        missing_fields = [k for k, v in data.items() if v is None or v == ""]
        print(f"❌ Campos obligatorios faltantes o nulos: {missing_fields}")
        return jsonify({
            "error": "Todos los campos obligatorios deben estar presentes",
            "campos_faltantes": missing_fields
        }), 400

    if not validar_correo(correo_institucional, "Alumno"):
        print(f"❌ Formato de correo incorrecto: {correo_institucional}")
        return jsonify({"error": "El correo debe terminar en @alumnounfv.edu.pe"}), 400
    if not validar_telefono(telefono):
        print(f"❌ Formato de teléfono incorrecto: {telefono}")
        return jsonify({"error": "El teléfono debe tener exactamente 9 dígitos"}), 400
    if not validar_dni(dni):
        print(f"❌ Formato de DNI incorrecto: {dni}")
        return jsonify({"error": "El DNI debe tener exactamente 8 dígitos"}), 400

    conn = None
    cur = None

    try:
        conn = get_db()
        cur = conn.cursor()

        print(f"🔍 Buscando estudiante ID: {estudiante_id}")
        cur.execute("""
            SELECT e.persona_id, p.usuario_id, e.codigo_universitario, u.correo, p.dni
            FROM estudiante e
            JOIN persona p ON e.persona_id = p.persona_id
            JOIN usuario u ON p.usuario_id = u.usuario_id
            WHERE e.estudiante_id = %s
        """, (estudiante_id,))
        
        result = cur.fetchone()
        if not result:
            print(f"❌ Estudiante ID {estudiante_id} no encontrado")
            return jsonify({"error": "Estudiante no encontrado"}), 404
        
        persona_id, usuario_id, codigo_actual, correo_actual, dni_actual = result
        print(f"✅ Estudiante encontrado - Persona ID: {persona_id}, Usuario ID: {usuario_id}")

        if codigo != codigo_actual:
            print(f"🔍 Verificando código universitario duplicado: {codigo}")
            cur.execute("""
                SELECT estudiante_id FROM estudiante 
                WHERE codigo_universitario = %s AND estudiante_id != %s
            """, (codigo, estudiante_id))
            if cur.fetchone():
                print(f"❌ Código universitario duplicado: {codigo}")
                return jsonify({"error": "El código universitario ya está registrado por otro estudiante"}), 400

        if correo_institucional != correo_actual:
            print(f"🔍 Verificando correo duplicado: {correo_institucional}")
            cur.execute("""
                SELECT usuario_id FROM usuario 
                WHERE correo = %s AND usuario_id != %s
            """, (correo_institucional, usuario_id))
            if cur.fetchone():
                print(f"❌ Correo institucional duplicado: {correo_institucional}")
                return jsonify({"error": "El correo institucional ya está registrado por otro estudiante"}), 400

        if dni != dni_actual:
            print(f"🔍 Verificando DNI duplicado: {dni}")
            cur.execute("""
                SELECT persona_id FROM persona 
                WHERE dni = %s AND persona_id != %s
            """, (dni, persona_id))
            if cur.fetchone():
                print(f"❌ DNI duplicado: {dni}")
                return jsonify({"error": "El DNI ya está registrado por otro estudiante"}), 400

        if correo_institucional != correo_actual:
            print("➡️ Actualizando correo en usuario")
            cur.execute("UPDATE usuario SET correo = %s WHERE usuario_id = %s", (correo_institucional, usuario_id))

        print("➡️ Actualizando datos de persona")
        apellidos = f"{apellido_paterno} {apellido_materno}"
        cur.execute("""
            UPDATE persona 
            SET nombres = %s, apellidos = %s, dni = %s, telefono = %s
            WHERE persona_id = %s
        """, (nombres, apellidos, dni, telefono, persona_id))

        print("➡️ Actualizando datos de estudiante (código, ciclo, escuela)")
        cur.execute("""
            UPDATE estudiante 
            SET codigo_universitario = %s, ciclo_actual = %s, escuela_id = %s
            WHERE estudiante_id = %s
        """, (codigo, ciclo_actual, escuela_id, estudiante_id))

        conn.commit()
        print("✅ COMMIT exitoso")
        print("=" * 50)
        print("🟢 FIN - Estudiante actualizado exitosamente")
        print("=" * 50)

        return jsonify({
            "mensaje": "Estudiante actualizado correctamente",
            "datos": {
                "estudiante_id": estudiante_id,
                "codigo_universitario": codigo,
                "correo_institucional": correo_institucional
            }
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ ERROR al actualizar estudiante ID {estudiante_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error al actualizar estudiante: {str(e)}"}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# ===========================
# ELIMINAR ALUMNO (DESACTIVAR)
# ===========================
@alumnos_bp.route("/alumnos/<int:estudiante_id>", methods=["DELETE"])
def eliminar_alumno(estudiante_id):
    """Desactiva un estudiante del sistema."""
    print("=" * 50)
    print(f"🔵 INICIO - Eliminar Alumno ID: {estudiante_id}")
    print("=" * 50)
    
    conn = None
    cur = None

    try:
        conn = get_db()
        cur = conn.cursor()

        print(f"🔍 Verificando existencia del estudiante ID: {estudiante_id}")
        cur.execute("""
            SELECT e.persona_id, p.usuario_id, p.nombres, p.apellidos
            FROM estudiante e
            JOIN persona p ON e.persona_id = p.persona_id
            WHERE e.estudiante_id = %s
        """, (estudiante_id,))
        
        result = cur.fetchone()
        if not result:
            print(f"❌ Estudiante ID {estudiante_id} no encontrado")
            return jsonify({"error": "Estudiante no encontrado"}), 404
        
        persona_id, usuario_id, nombres, apellidos = result
        print(f"✅ Estudiante encontrado: {nombres} {apellidos}")

        print("➡️ Desactivando usuario...")
        cur.execute("UPDATE usuario SET estado = 'INACTIVO' WHERE usuario_id = %s", (usuario_id,))

        conn.commit()
        print("✅ COMMIT exitoso")
        print("=" * 50)
        print("🟢 FIN - Estudiante desactivado exitosamente")
        print("=" * 50)

        return jsonify({
            "mensaje": "Estudiante desactivado correctamente",
            "estudiante_id": estudiante_id
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ ERROR al eliminar estudiante ID {estudiante_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error al eliminar estudiante: {str(e)}"}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# ===========================
# REACTIVAR ALUMNO
# ===========================
@alumnos_bp.route("/alumnos/<int:estudiante_id>/reactivar", methods=["PATCH"])
def reactivar_alumno(estudiante_id):
    """Reactiva un estudiante desactivado."""
    print("=" * 50)
    print(f"🔵 INICIO - Reactivar Alumno ID: {estudiante_id}")
    print("=" * 50)
    
    conn = None
    cur = None

    try:
        conn = get_db()
        cur = conn.cursor()

        print(f"🔍 Verificando existencia del estudiante ID: {estudiante_id}")
        cur.execute("""
            SELECT e.persona_id, p.usuario_id, p.nombres, p.apellidos, u.estado
            FROM estudiante e
            JOIN persona p ON e.persona_id = p.persona_id
            JOIN usuario u ON p.usuario_id = u.usuario_id
            WHERE e.estudiante_id = %s
        """, (estudiante_id,))
        
        result = cur.fetchone()
        if not result:
            print(f"❌ Estudiante ID {estudiante_id} no encontrado")
            return jsonify({"error": "Estudiante no encontrado"}), 404
        
        persona_id, usuario_id, nombres, apellidos, estado_actual = result
        print(f"✅ Estudiante encontrado: {nombres} {apellidos} (Estado: {estado_actual})")

        if estado_actual == 'ACTIVO':
            print(f"⚠️ El estudiante ya está activo")
            return jsonify({"mensaje": "El estudiante ya está activo"}), 200

        print("➡️ Reactivando usuario...")
        cur.execute("UPDATE usuario SET estado = 'ACTIVO' WHERE usuario_id = %s", (usuario_id,))

        conn.commit()
        print("✅ COMMIT exitoso")
        print("=" * 50)
        print("🟢 FIN - Estudiante reactivado exitosamente")
        print("=" * 50)

        return jsonify({
            "mensaje": "Estudiante reactivado correctamente",
            "estudiante_id": estudiante_id
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ ERROR al reactivar estudiante ID {estudiante_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error al reactivar estudiante: {str(e)}"}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()