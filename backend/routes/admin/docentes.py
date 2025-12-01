# -- coding: utf-8 --
import re
import string
import random
import unicodedata
import smtplib 
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header 
from flask import Blueprint, request, jsonify
from database.db import get_db
from utils.security import hash_password
from psycopg2.extras import RealDictCursor
import psycopg2 
from datetime import datetime, date
from psycopg2 import errors 

docentes_bp = Blueprint('docentes', __name__)

# ========================================================
# 📧 CONFIGURACIÓN DEL CORREO
# ========================================================
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "enzofabian3007@gmail.com" 
SENDER_PASSWORD = "vrqs bohf cnxx dalf" 

# ===========================
# FUNCIONES DE VALIDACIÓN MEJORADAS
# ===========================

def validar_nombres(nombres):
    """
    Valida que los nombres:
    - Solo contengan letras, espacios, tildes y apóstrofes
    - No contengan números ni caracteres especiales
    - Tengan entre 2 y 50 caracteres
    """
    if not isinstance(nombres, str):
        return False, "El nombre debe ser texto"
    
    nombres = nombres.strip()
    
    if len(nombres) < 2:
        return False, "El nombre debe tener al menos 2 caracteres"
    if len(nombres) > 50:
        return False, "El nombre no puede exceder 50 caracteres"
    
    # Solo letras (incluyendo tildes), espacios y apóstrofes
    patron = r'^[a-zA-ZáéíóúÁÉÍÓÚñÑ\'\s]+$'
    if not re.match(patron, nombres):
        return False, "El nombre solo puede contener letras, espacios y apóstrofes"
    
    if not nombres.replace(' ', '').replace("'", ''):
        return False, "El nombre no puede estar vacío"
    
    return True, ""

def validar_apellidos(apellidos):
    """
    Valida que los apellidos:
    - Solo contengan letras, espacios, tildes y apóstrofes
    - No contengan números ni caracteres especiales
    - Tengan entre 2 y 50 caracteres
    """
    if not isinstance(apellidos, str):
        return False, "El apellido debe ser texto"
    
    apellidos = apellidos.strip()
    
    if len(apellidos) < 2:
        return False, "El apellido debe tener al menos 2 caracteres"
    if len(apellidos) > 50:
        return False, "El apellido no puede exceder 50 caracteres"
    
    patron = r'^[a-zA-ZáéíóúÁÉÍÓÚñÑ\'\s]+$'
    if not re.match(patron, apellidos):
        return False, "El apellido solo puede contener letras, espacios y apóstrofes"
    
    if not apellidos.replace(' ', '').replace("'", ''):
        return False, "El apellido no puede estar vacío"
    
    return True, ""

def validar_telefono(telefono):
    """Valida que el teléfono tenga exactamente 9 dígitos numéricos"""
    if not isinstance(telefono, str):
        return False, "El teléfono debe ser texto"
    
    telefono = telefono.strip()
    
    # Solo acepta exactamente 9 dígitos, sin letras ni caracteres especiales
    if not re.fullmatch(r'\d{9}', telefono):
        return False, "El teléfono debe tener exactamente 9 dígitos numéricos"
    
    return True, ""

def validar_dni(dni):
    """Valida que el DNI tenga exactamente 8 dígitos numéricos"""
    if not isinstance(dni, str):
        return False, "El DNI debe ser texto"
    
    dni = dni.strip()
    
    if not re.fullmatch(r'\d{8}', dni):
        return False, "El DNI debe tener exactamente 8 dígitos numéricos"
    
    return True, ""

def validar_direccion(direccion_detalle):
    """
    Valida que la dirección:
    - Contenga al menos una letra (no solo números)
    - Tenga entre 5 y 200 caracteres
    - Permita letras, números, espacios y caracteres comunes (. , - #)
    """
    if not isinstance(direccion_detalle, str):
        return False, "La dirección debe ser texto"
    
    direccion_detalle = direccion_detalle.strip()
    
    if len(direccion_detalle) < 5:
        return False, "La dirección debe tener al menos 5 caracteres"
    if len(direccion_detalle) > 200:
        return False, "La dirección no puede exceder 200 caracteres"
    
    # Debe contener al menos una letra (no solo números)
    if not re.search(r'[a-zA-ZáéíóúÁÉÍÓÚñÑ]', direccion_detalle):
        return False, "La dirección debe contener al menos una letra, no puede ser solo números"
    
    # Permitir letras, números, espacios y caracteres: . , - # º °
    patron = r'^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\.\,\-\#º°]+$'
    if not re.match(patron, direccion_detalle):
        return False, "La dirección contiene caracteres no permitidos"
    
    return True, ""

def validar_fecha_nacimiento(fecha_str, edad_minima=25, edad_maxima=100):
    """
    Valida la fecha de nacimiento para docentes:
    - Formato válido (YYYY-MM-DD)
    - No puede ser fecha futura
    - Edad mínima: 25 años
    - Edad máxima razonable: 100 años
    """
    if not isinstance(fecha_str, str):
        return False, "La fecha debe ser texto"
    
    try:
        fecha_nacimiento = datetime.strptime(fecha_str, '%Y-%m-%d').date()
    except ValueError:
        return False, "Formato de fecha inválido. Use YYYY-MM-DD"
    
    hoy = date.today()
    
    # No puede ser fecha futura
    if fecha_nacimiento > hoy:
        return False, "La fecha de nacimiento no puede ser futura"
    
    # Calcular edad
    edad = hoy.year - fecha_nacimiento.year - ((hoy.month, hoy.day) < (fecha_nacimiento.month, fecha_nacimiento.day))
    
    # Validar edad mínima
    if edad < edad_minima:
        return False, f"El docente debe tener al menos {edad_minima} años (edad actual: {edad} años)"
    
    # Validar edad máxima razonable
    if edad > edad_maxima:
        return False, f"La edad no puede ser mayor a {edad_maxima} años (edad calculada: {edad} años)"
    
    return True, ""

def validar_correo_personal(correo):
    """Valida el formato de un correo electrónico personal"""
    if not isinstance(correo, str):
        return False, "El correo debe ser texto"
    
    correo = correo.strip()
    
    # Expresión regular para validar correo
    patron = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(patron, correo):
        return False, "El formato del correo electrónico es inválido"
    
    return True, ""

# ===========================
# FUNCIONES AUXILIARES
# ===========================

def enviar_correo_credenciales(destinatario, nombre, correo_inst, password):
    """
    Envía el correo con asunto 'SISTEMA UNFV' y marcado como IMPORTANTE.
    """
    try:
        msg = MIMEMultipart()
        
        msg['From'] = str(Header(f"Sistema Academico EPIS <{SENDER_EMAIL}>", 'utf-8'))
        msg['To'] = destinatario
        msg['Subject'] = Header("SISTEMA UNFV", 'utf-8') 
        msg['X-Priority'] = '1'
        msg['X-MSMail-Priority'] = 'High'
        msg['Importance'] = 'High'

        cuerpo_html = f"""
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #d32f2f; padding: 20px; text-align: center; color: white;">
                <h2 style="margin: 0;">SISTEMA UNFV - NOTIFICACI&Oacute;N</h2>
            </div>
            <div style="padding: 20px;">
                <p>Estimado/a <strong>{nombre}</strong>,</p>
                <p>Se ha registrado su cuenta de docente en el Sistema de Gesti&oacute;n Acad&eacute;mica.</p>
                <p>A continuaci&oacute;n, sus credenciales de acceso:</p>
                
                <div style="background-color: #fff3cd; padding: 15px; border-left: 5px solid #ffc107; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>&#128231; Usuario:</strong> {correo_inst}</p>
                    <p style="margin: 5px 0;"><strong>&#128273; Contrase&ntilde;a:</strong> {password}</p>
                </div>

                <p><strong>IMPORTANTE:</strong> Por seguridad, cambie su contrase&ntilde;a inmediatamente al ingresar.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <small style="color: #777;">Universidad Nacional Federico Villarreal - EPIS</small>
            </div>
        </div>
        """
        
        msg.attach(MIMEText(cuerpo_html, 'html', 'utf-8'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls() 
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        text = msg.as_string()
        server.sendmail(SENDER_EMAIL, destinatario, text)
        server.quit()
        
        print(f"✅ Correo enviado correctamente a: {destinatario}")
        return True
    except Exception as e:
        print(f"❌ Error al enviar correo: {str(e)}")
        return False

def generar_contrasena_aleatoria(longitud=10):
    caracteres = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(random.choice(caracteres) for i in range(longitud))

def normalizar_texto(texto):
    return ''.join(c for c in unicodedata.normalize('NFD', texto)
                   if unicodedata.category(c) != 'Mn').lower().replace("ñ", "n")

def generar_correo_inst(nombres, apellidos):
    nombre_norm = normalizar_texto(nombres.split()[0])
    apellido_norm = normalizar_texto(apellidos.split()[0])
    dominio = "@docenteunfv.edu.pe"
    return f"{nombre_norm}{apellido_norm}{dominio}"

# ===========================
# ENDPOINTS DE UBIGEO Y ESCUELAS
# ===========================

@docentes_bp.route("/departamentos", methods=["GET"])
def obtener_departamentos_ubigeo():
    conn = None; cur = None
    try:
        conn = get_db(); cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT departamento_id, nombre_departamento FROM departamento_geo ORDER BY nombre_departamento")
        return jsonify({"departamentos": cur.fetchall()}) 
    except (Exception, psycopg2.Error) as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@docentes_bp.route("/provincias/<string:id_departamento>", methods=["GET"])
def obtener_provincias_ubigeo(id_departamento):
    conn = None; cur = None
    try:
        conn = get_db(); cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT provincia_id, nombre_provincia FROM provincia WHERE departamento_id = %s ORDER BY nombre_provincia", (id_departamento,))
        return jsonify({"provincias": cur.fetchall()})
    except (Exception, psycopg2.Error) as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@docentes_bp.route("/distritos/<string:id_provincia>", methods=["GET"])
def obtener_distritos_ubigeo(id_provincia):
    conn = None; cur = None
    try:
        conn = get_db(); cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT distrito_id, nombre_distrito FROM distrito WHERE provincia_id = %s ORDER BY nombre_distrito", (id_provincia,))
        return jsonify({"distritos": cur.fetchall()})
    except (Exception, psycopg2.Error) as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@docentes_bp.route("/escuelas", methods=["GET"])
def obtener_escuelas():
    conn = None; cur = None
    try:
        conn = get_db(); cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT escuela_id, nombre_escuela, facultad FROM escuela ORDER BY nombre_escuela")
        return jsonify({"escuelas": cur.fetchall()})
    except (Exception, psycopg2.Error) as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

    # ===========================
# CREAR DOCENTE (CON TODAS LAS VALIDACIONES)
# ===========================
@docentes_bp.route("/crear-docente", methods=["POST"])
def crear_docente():
    data = request.json
    
    print("\n--- JSON RECIBIDO EN /crear-docente ---")
    print(data)
    print("-----------------------------------------\n")
    
    # Extraer datos
    correo_personal = data.get("correo_personal")
    nombres = data.get("nombres")
    apellidos = data.get("apellidos")
    dni = data.get("dni")
    telefono = data.get("telefono")
    fecha_nacimiento_str = data.get("fecha_nacimiento")
    direccion_detalle = data.get("direccion_desc")
    id_distrito = data.get("id_distrito")
    escuela_id = data.get("escuela_id")
    estado_docente = True

    # ===== VALIDACIONES OBLIGATORIAS =====
    if not all([correo_personal, nombres, apellidos, dni, telefono, escuela_id, fecha_nacimiento_str, direccion_detalle, id_distrito]):
        print(">> ERROR 400: Faltan campos obligatorios.")
        return jsonify({"error": "Todos los campos son obligatorios"}), 400
    
    # ===== VALIDAR CORREO PERSONAL =====
    valido_correo, mensaje_correo = validar_correo_personal(correo_personal)
    if not valido_correo:
        print(f">> ERROR 400: Correo personal inválido ({correo_personal}). {mensaje_correo}")
        return jsonify({"error": mensaje_correo}), 400
    
    # ===== VALIDAR NOMBRES =====
    valido_nombres, mensaje_nombres = validar_nombres(nombres)
    if not valido_nombres:
        print(f">> ERROR 400: Nombres inválidos ({nombres}). {mensaje_nombres}")
        return jsonify({"error": mensaje_nombres}), 400
    
    # ===== VALIDAR APELLIDOS =====
    valido_apellidos, mensaje_apellidos = validar_apellidos(apellidos)
    if not valido_apellidos:
        print(f">> ERROR 400: Apellidos inválidos ({apellidos}). {mensaje_apellidos}")
        return jsonify({"error": mensaje_apellidos}), 400
    
    # ===== VALIDAR DNI =====
    valido_dni, mensaje_dni = validar_dni(dni)
    if not valido_dni:
        print(f">> ERROR 400: DNI inválido ({dni}). {mensaje_dni}")
        return jsonify({"error": mensaje_dni}), 400
    
    # ===== VALIDAR TELÉFONO =====
    valido_telefono, mensaje_telefono = validar_telefono(telefono)
    if not valido_telefono:
        print(f">> ERROR 400: Teléfono inválido ({telefono}). {mensaje_telefono}")
        return jsonify({"error": mensaje_telefono}), 400
    
    # ===== VALIDAR FECHA DE NACIMIENTO (MÍNIMO 25 AÑOS) =====
    valido_fecha, mensaje_fecha = validar_fecha_nacimiento(fecha_nacimiento_str, edad_minima=25)
    if not valido_fecha:
        print(f">> ERROR 400: Fecha inválida ({fecha_nacimiento_str}). {mensaje_fecha}")
        return jsonify({"error": mensaje_fecha}), 400
    
    fecha_nacimiento = datetime.strptime(fecha_nacimiento_str, '%Y-%m-%d').date()
    
    # ===== VALIDAR DIRECCIÓN =====
    valido_direccion, mensaje_direccion = validar_direccion(direccion_detalle)
    if not valido_direccion:
        print(f">> ERROR 400: Dirección inválida. {mensaje_direccion}")
        return jsonify({"error": mensaje_direccion}), 400

    # ===== GENERAR CREDENCIALES =====
    try:
        correo_institucional = generar_correo_inst(nombres, apellidos)
        contrasena_generada = generar_contrasena_aleatoria()
        contrasena_hash = hash_password(contrasena_generada)
    except Exception as e:
        print(f">> ERROR 400: Error generando credenciales: {str(e)}")
        return jsonify({"error": f"Error generando credenciales: {str(e)}"}), 400

    # ===== INSERCIÓN EN BASE DE DATOS =====
    conn = None; cur = None
    try:
        conn = get_db(); cur = conn.cursor()
        
        # Crear usuario
        cur.execute("INSERT INTO usuario (correo, contrasena, estado) VALUES (%s, %s, %s) RETURNING usuario_id", 
                    (correo_institucional, contrasena_hash, True))
        usuario_id = cur.fetchone()[0]
        
        # Crear dirección
        cur.execute("INSERT INTO direccion (direccion_detalle, id_distrito) VALUES (%s, %s) RETURNING id_direccion", 
                    (direccion_detalle, id_distrito))
        id_direccion = cur.fetchone()[0]
        
        # Crear persona
        cur.execute("""
            INSERT INTO persona (usuario_id, nombres, apellidos, dni, telefono, fecha_nacimiento, id_direccion) 
            VALUES (%s, %s, %s, %s, %s, %s, %s) 
            RETURNING persona_id
        """, (usuario_id, nombres, apellidos, dni, telefono, fecha_nacimiento, id_direccion))
        
        persona_id = cur.fetchone()[0]
        
        # Asignar rol
        cur.execute("INSERT INTO usuario_rol (usuario_id, rol_id) VALUES (%s, (SELECT rol_id FROM rol WHERE nombre_rol='Docente'))", 
                   (usuario_id,))

        # Crear docente
        cur.execute("""
            INSERT INTO docente (persona_id, escuela_id, id_direccion, estado, codigo_docente)
            VALUES (%s, %s, %s, %s, generar_codigo_docente()) 
            RETURNING codigo_docente
        """, (persona_id, escuela_id, id_direccion, estado_docente))
        
        codigo_generado = cur.fetchone()[0] 

        conn.commit()

        # Envío de Correo
        envio_exitoso = enviar_correo_credenciales(correo_personal, f"{nombres} {apellidos}", correo_institucional, contrasena_generada)
        
        mensaje_final = "Docente creado con éxito."
        if not envio_exitoso:
            mensaje_final += " (Advertencia: Correo no enviado)."

        print(">> ÉXITO 201: Docente creado con éxito.")
        return jsonify({
            "mensaje": mensaje_final, 
            "usuario_id": usuario_id, 
            "credenciales": {
                "correo_institucional": correo_institucional,
                "contrasena": contrasena_generada,
                "codigo_docente": codigo_generado
            }
        }), 201

    except errors.UniqueViolation as e:
        if conn: conn.rollback()
        print(f">> ERROR 400 (BD): {str(e)}")
        error_msg = str(e)
        if "persona_dni_key" in error_msg:
            return jsonify({"error": "El DNI ya está registrado en el sistema"}), 400
        if "usuario_correo_key" in error_msg:
            return jsonify({"error": f"El correo {correo_institucional} ya existe. Intente nuevamente."}), 400
        return jsonify({"error": "DNI o Correo ya registrado."}), 400
        
    except (Exception, psycopg2.Error) as e:
        if conn: conn.rollback()
        print(f"\n!! ERROR 500 (FATAL): {str(e)} !!\n")
        db_error_msg = str(getattr(e, 'pgerror', repr(e)))
        if "generar_codigo_docente" in db_error_msg:
             return jsonify({"error": "Error en la función de BD para generar código"}), 500
        return jsonify({"error": f"Error servidor: {str(e)}"}), 500
        
    finally:
        if cur: cur.close()
        if conn: conn.close()

# ==========================
# LISTAR DOCENTES
# ==========================
@docentes_bp.route("/docentes", methods=["GET"])
def listar_docentes():
    conn = None; cur = None
    try:
        conn = get_db(); cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
        SELECT 
            doc.docente_id, u.usuario_id, p.nombres, p.apellidos, p.dni, p.telefono, p.fecha_nacimiento,
            u.correo, doc.estado, e.nombre_escuela, e.escuela_id, d.direccion_detalle AS direccion_desc, 
            d.id_direccion, dist.distrito_id AS id_distrito, dist.nombre_distrito AS distrito,
            prov.provincia_id AS id_provincia, prov.nombre_provincia AS provincia,
            dep.departamento_id AS id_departamento, dep.nombre_departamento AS departamento,
            doc.codigo_docente
        FROM docente doc
        LEFT JOIN persona p ON doc.persona_id = p.persona_id
        LEFT JOIN usuario u ON p.usuario_id = u.usuario_id 
        LEFT JOIN escuela e ON doc.escuela_id = e.escuela_id
        LEFT JOIN direccion d ON doc.id_direccion = d.id_direccion
        LEFT JOIN distrito dist ON d.id_distrito = dist.distrito_id
        LEFT JOIN provincia prov ON dist.provincia_id = prov.provincia_id
        LEFT JOIN departamento_geo dep ON prov.departamento_id = dep.departamento_id
        LEFT JOIN usuario_rol ur ON u.usuario_id = ur.usuario_id
        LEFT JOIN rol r ON ur.rol_id = r.rol_id
        WHERE r.nombre_rol = 'Docente' 
        ORDER BY p.apellidos, p.nombres
        """)
        docentes = cur.fetchall()
        
        for docente in docentes:
            if docente.get('fecha_nacimiento'):
                docente['fecha_nacimiento'] = docente['fecha_nacimiento'].isoformat() if hasattr(docente['fecha_nacimiento'], 'isoformat') else None
            if 'estado' in docente:
                docente['estado'] = docente['estado'] is True
        
        return jsonify(docentes)
        
    except (Exception, psycopg2.Error) as e:
        print(f"Error en listar_docentes: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# ===========================
# MODIFICAR DOCENTE (CON VALIDACIONES)
# ===========================
@docentes_bp.route("/docentes/<int:usuario_id>", methods=["PUT"])
def modificar_docente(usuario_id):
    data = request.json
    
    # Extraer datos
    nombres = data.get("nombres")
    apellidos = data.get("apellidos")
    dni = data.get("dni")
    telefono = data.get("telefono")
    fecha_nacimiento = data.get("fecha_nacimiento")
    correo = data.get("correo")
    estado_docente = data.get("estado")
    escuela_id = data.get("escuela_id")
    direccion_detalle = data.get("direccion_desc")
    id_distrito = data.get("id_distrito")

    # Validar que no falten datos
    if estado_docente is None:
        return jsonify({"error": "Faltan datos obligatorios"}), 400

    # ===== VALIDAR NOMBRES =====
    if nombres:
        valido_nombres, mensaje_nombres = validar_nombres(nombres)
        if not valido_nombres:
            return jsonify({"error": mensaje_nombres}), 400
    
    # ===== VALIDAR APELLIDOS =====
    if apellidos:
        valido_apellidos, mensaje_apellidos = validar_apellidos(apellidos)
        if not valido_apellidos:
            return jsonify({"error": mensaje_apellidos}), 400
    
    # ===== VALIDAR DNI =====
    if dni:
        valido_dni, mensaje_dni = validar_dni(dni)
        if not valido_dni:
            return jsonify({"error": mensaje_dni}), 400
    
    # ===== VALIDAR TELÉFONO =====
    if telefono:
        valido_telefono, mensaje_telefono = validar_telefono(telefono)
        if not valido_telefono:
            return jsonify({"error": mensaje_telefono}), 400
    
    # ===== VALIDAR FECHA DE NACIMIENTO =====
    if fecha_nacimiento:
        valido_fecha, mensaje_fecha = validar_fecha_nacimiento(fecha_nacimiento, edad_minima=25)
        if not valido_fecha:
            return jsonify({"error": mensaje_fecha}), 400
    
    # ===== VALIDAR DIRECCIÓN =====
    if direccion_detalle:
        valido_direccion, mensaje_direccion = validar_direccion(direccion_detalle)
        if not valido_direccion:
            return jsonify({"error": mensaje_direccion}), 400

    conn = None; cur = None
    try:
        conn = get_db(); cur = conn.cursor()
        
        # Actualizar persona
        cur.execute("UPDATE persona SET nombres=%s, apellidos=%s, dni=%s, telefono=%s, fecha_nacimiento=%s WHERE usuario_id = %s", 
                    (nombres, apellidos, dni, telefono, fecha_nacimiento, usuario_id))
        if cur.rowcount == 0:
            conn.rollback()
            return jsonify({"error": "Persona no encontrada"}), 404

        # Actualizar correo si se proporciona
        if correo:
            cur.execute("UPDATE usuario SET correo=%s WHERE usuario_id = %s", (correo, usuario_id))

        # Actualizar docente
        cur.execute("""
            UPDATE docente SET escuela_id=%s, estado=%s
            WHERE persona_id = (SELECT persona_id FROM persona WHERE usuario_id=%s)
            RETURNING id_direccion
        """, (escuela_id, estado_docente, usuario_id))

        res = cur.fetchone()
        if not res:
            conn.rollback()
            return jsonify({"error": "Docente no encontrado"}), 404
        id_direccion = res[0]

        # Actualizar o crear dirección
        if id_direccion:
            cur.execute("UPDATE direccion SET direccion_detalle=%s, id_distrito=%s WHERE id_direccion = %s", 
                       (direccion_detalle, id_distrito, id_direccion))
        else:
            cur.execute("INSERT INTO direccion (direccion_detalle, id_distrito) VALUES (%s, %s) RETURNING id_direccion", 
                       (direccion_detalle, id_distrito))
            id_new = cur.fetchone()[0]
            cur.execute("UPDATE docente SET id_direccion = %s WHERE persona_id = (SELECT persona_id FROM persona WHERE usuario_id=%s)", 
                       (id_new, usuario_id))
        
        conn.commit()
        return jsonify({"mensaje": "Docente actualizado con éxito"}), 200
        
    except errors.UniqueViolation as e:
        if conn: conn.rollback()
        error_msg = str(e)
        if "persona_dni_key" in error_msg:
            return jsonify({"error": "El DNI ya está registrado en el sistema"}), 400
        if "usuario_correo_key" in error_msg:
            return jsonify({"error": "El correo electrónico ya está registrado"}), 400
        return jsonify({"error": "Valor duplicado (DNI o correo)"}), 400
    except (Exception, psycopg2.Error) as e:
        if conn: conn.rollback()
        print(f"Error en modificar_docente: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# ===========================
# ELIMINAR DOCENTE
# ===========================
@docentes_bp.route("/docentes/<int:usuario_id>", methods=["DELETE"])
def eliminar_docente(usuario_id):
    conn = None; cur = None
    try:
        conn = get_db(); cur = conn.cursor()
        
        # 1. Obtener IDs dependientes
        cur.execute("SELECT persona_id FROM persona WHERE usuario_id=%s", (usuario_id,))
        res = cur.fetchone()
        if not res:
            return jsonify({"error": "Docente no encontrado"}), 404
        persona_id = res[0]
        
        
        cur.execute("SELECT id_direccion FROM docente WHERE persona_id=%s", (persona_id,))
        res_doc = cur.fetchone()
        id_direccion = res_doc[0] if res_doc else None
        
        # 2. Eliminar en orden INVERSO a la dependencia
        cur.execute("DELETE FROM usuario_rol WHERE usuario_id=%s", (usuario_id,))
        cur.execute("DELETE FROM docente WHERE persona_id=%s", (persona_id,))
        cur.execute("DELETE FROM persona WHERE persona_id=%s", (persona_id,))
        cur.execute("DELETE FROM usuario WHERE usuario_id=%s", (usuario_id,))
        
        if id_direccion:
            cur.execute("DELETE FROM direccion WHERE id_direccion=%s", (id_direccion,))
        
        conn.commit()
        print(f"✅ Docente eliminado: usuario_id={usuario_id}")
        return jsonify({"mensaje": "Docente eliminado con éxito"}), 200
        
    except errors.ForeignKeyViolation as e:
        if conn: conn.rollback()
        print(f"❌ Error FK en eliminar_docente: {str(e)}")
        return jsonify({"error": "No se puede eliminar: El docente tiene datos asociados (ej. cursos asignados)"}), 409
    except (Exception, psycopg2.Error) as e:
        if conn: conn.rollback()
        print(f"❌ Error en eliminar_docente: {str(e)}")
        return jsonify({"error": "Error interno al eliminar docente"}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# ===========================
# LISTAR DOCENTES ACTIVOS
# ===========================
@docentes_bp.route("/docentes-activos", methods=["GET"])
def listar_docentes_activos():
    """
    Lista solo los docentes con estado = TRUE para dropdown o selects
    """
    conn = None; cur = None
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT 
                doc.docente_id, 
                p.nombres, 
                p.apellidos, 
                doc.codigo_docente,
                CONCAT(p.nombres, ' ', p.apellidos) as nombre_completo
            FROM docente doc
            INNER JOIN persona p ON doc.persona_id = p.persona_id
            WHERE doc.estado = TRUE
            ORDER BY p.apellidos, p.nombres
        """)
        
        docentes_activos = cur.fetchall()
        
        return jsonify(docentes_activos), 200
        
    except (Exception, psycopg2.Error) as e:
        print(f"Error en listar_docentes_activos: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()