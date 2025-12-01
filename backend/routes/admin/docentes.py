# -*- coding: utf-8 -*-
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
# 1. Tu correo Gmail real
SENDER_EMAIL = "enzofabian3007@gmail.com" 
# 2. Tu Contraseña de Aplicación de 16 letras
SENDER_PASSWORD = "vrqs bohf cnxx dalf" 

# ===========================
# FUNCIONES AUXILIARES
# ===========================

def enviar_correo_credenciales(destinatario, nombre, correo_inst, password):
    """
    Envía el correo con asunto 'SISTEMA UNFV' y marcado como IMPORTANTE.
    """
    try:
        # Crear el mensaje
        msg = MIMEMultipart()
        
        # --- CABECERAS DEL CORREO ---
        msg['From'] = str(Header(f"Sistema Academico EPIS <{SENDER_EMAIL}>", 'utf-8'))
        msg['To'] = destinatario
        
        # 1. CAMBIO DE TÍTULO
        msg['Subject'] = Header("SISTEMA UNFV", 'utf-8') 

        # 2. MARCAR COMO IMPORTANTE (Alta Prioridad)
        msg['X-Priority'] = '1'
        msg['X-MSMail-Priority'] = 'High'
        msg['Importance'] = 'High'

        # Diseño del correo
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

        # Conexión y envío
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

def validar_correo_personal(correo):
    if not isinstance(correo, str): return False
    return bool(re.match(r"[^@]+@[^@]+\.[^@]+", correo))

def validar_telefono(telefono):
    return bool(re.fullmatch(r'\d{9}', telefono))

def validar_dni(dni):
    return bool(re.fullmatch(r'\d{8}', dni))

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
        if cur: cur.close(); conn.close()

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
        if cur: cur.close(); conn.close()

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
        if cur: cur.close(); conn.close()

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
        if cur: cur.close(); conn.close()

# ===========================
# CREAR DOCENTE
# ===========================
@docentes_bp.route("/crear-docente", methods=["POST"])
def crear_docente():
    data = request.json
    
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

    try:
        correo_institucional = generar_correo_inst(nombres, apellidos)
        contrasena_generada = generar_contrasena_aleatoria()
        contrasena_hash = hash_password(contrasena_generada)
    except Exception as e:
        return jsonify({"error": f"Error generando credenciales: {str(e)}"}), 400

    if not all([correo_personal, nombres, apellidos, dni, telefono, escuela_id, fecha_nacimiento_str, direccion_detalle, id_distrito]):
        return jsonify({"error": "Todos los campos son obligatorios"}), 400
    
    if not validar_correo_personal(correo_personal): return jsonify({"error": "Correo personal inválido"}), 400
    if not validar_telefono(telefono): return jsonify({"error": "Teléfono inválido"}), 400
    if not validar_dni(dni): return jsonify({"error": "DNI inválido"}), 400

    try:
        fecha_nacimiento = datetime.strptime(fecha_nacimiento_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Formato de fecha inválido"}), 400

    conn = None; cur = None
    try:
        conn = get_db(); cur = conn.cursor()
        
        cur.execute("INSERT INTO usuario (correo, contrasena, estado) VALUES (%s, %s, %s) RETURNING usuario_id", 
                    (correo_institucional, contrasena_hash, True))
        usuario_id = cur.fetchone()[0]
        
        cur.execute("INSERT INTO direccion (direccion_detalle, id_distrito) VALUES (%s, %s) RETURNING id_direccion", 
                    (direccion_detalle, id_distrito))
        id_direccion = cur.fetchone()[0]
        
        cur.execute("""
            INSERT INTO persona (usuario_id, nombres, apellidos, dni, telefono, fecha_nacimiento, id_direccion) 
            VALUES (%s, %s, %s, %s, %s, %s, %s) 
            RETURNING persona_id
        """, (usuario_id, nombres, apellidos, dni, telefono, fecha_nacimiento, id_direccion))
        
        persona_id = cur.fetchone()[0]
        
        cur.execute("INSERT INTO usuario_rol (usuario_id, rol_id) VALUES (%s, (SELECT rol_id FROM rol WHERE nombre_rol='Docente'))", (usuario_id,))

        cur.execute("""
            INSERT INTO docente (persona_id, escuela_id, id_direccion, estado, codigo_docente)
            VALUES (%s, %s, %s, %s, generar_codigo_docente()) 
            RETURNING codigo_docente
        """, (persona_id, escuela_id, id_direccion, estado_docente))
        
        codigo_generado = cur.fetchone()[0] 

        conn.commit()

        # Envío de Correo Real con cabeceras de Importancia
        envio_exitoso = enviar_correo_credenciales(correo_personal, f"{nombres} {apellidos}", correo_institucional, contrasena_generada)
        
        mensaje_final = "Docente creado con éxito."
        if not envio_exitoso:
            mensaje_final += " (Advertencia: Correo no enviado)."

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
        if "usuario_correo_key" in str(e):
             return jsonify({"error": f"El correo {correo_institucional} ya existe. Intente nuevamente."}), 400
        return jsonify({"error": "DNI o Correo ya registrado."}), 400
    except (Exception, psycopg2.Error) as e:
        if conn: conn.rollback()
        return jsonify({"error": f"Error servidor: {str(e)}"}), 500
    finally:
        if cur: cur.close(); conn.close()

# ... (MANTÉN LAS RUTAS DE LISTAR, EDITAR Y ELIMINAR QUE YA ESTABAN) ...
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
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close(); conn.close()

@docentes_bp.route("/docentes/<int:usuario_id>", methods=["PUT"])
def modificar_docente(usuario_id):
    data = request.json
    nombres = data.get("nombres"); apellidos = data.get("apellidos")
    dni = data.get("dni"); telefono = data.get("telefono"); fecha_nacimiento = data.get("fecha_nacimiento")
    correo = data.get("correo"); estado_docente = data.get("estado")
    escuela_id = data.get("escuela_id")
    direccion_detalle = data.get("direccion_desc"); id_distrito = data.get("id_distrito")

    if estado_docente is None: return jsonify({"error": "Faltan datos"}), 400

    conn = None; cur = None
    try:
        conn = get_db(); cur = conn.cursor()
        
        cur.execute("UPDATE persona SET nombres=%s, apellidos=%s, dni=%s, telefono=%s, fecha_nacimiento=%s WHERE usuario_id = %s", 
                    (nombres, apellidos, dni, telefono, fecha_nacimiento, usuario_id))
        if cur.rowcount == 0: conn.rollback(); return jsonify({"error": "No encontrado"}), 404

        if correo: cur.execute("UPDATE usuario SET correo=%s WHERE usuario_id = %s", (correo, usuario_id))

        cur.execute("""
            UPDATE docente SET escuela_id=%s, estado=%s
            WHERE persona_id = (SELECT persona_id FROM persona WHERE usuario_id=%s)
            RETURNING id_direccion
        """, (escuela_id, estado_docente, usuario_id))

        res = cur.fetchone()
        if not res: conn.rollback(); return jsonify({"error": "No encontrado"}), 404
        id_direccion = res[0]

        if id_direccion:
              cur.execute("UPDATE direccion SET direccion_detalle=%s, id_distrito=%s WHERE id_direccion = %s", (direccion_detalle, id_distrito, id_direccion))
        else:
              cur.execute("INSERT INTO direccion (direccion_detalle, id_distrito) VALUES (%s, %s) RETURNING id_direccion", (direccion_detalle, id_distrito))
              id_new = cur.fetchone()[0]
              cur.execute("UPDATE docente SET id_direccion = %s WHERE persona_id = (SELECT persona_id FROM persona WHERE usuario_id=%s)", (id_new, usuario_id))
        
        conn.commit()
        return jsonify({"mensaje": "Actualizado"}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close(); conn.close()

@docentes_bp.route("/docentes/<int:usuario_id>", methods=["DELETE"])
def eliminar_docente(usuario_id):
    conn = None; cur = None
    try:
        conn = get_db(); cur = conn.cursor()
        
        cur.execute("SELECT persona_id FROM persona WHERE usuario_id=%s", (usuario_id,))
        res = cur.fetchone()
        if not res: return jsonify({"error": "No encontrado"}), 404
        persona_id = res[0]
        
        cur.execute("SELECT id_direccion FROM docente WHERE persona_id=%s", (persona_id,))
        res_doc = cur.fetchone()
        id_direccion = res_doc[0] if res_doc else None
        
        cur.execute("DELETE FROM usuario_rol WHERE usuario_id=%s", (usuario_id,))
        cur.execute("DELETE FROM docente WHERE persona_id=%s", (persona_id,))
        cur.execute("DELETE FROM persona WHERE persona_id=%s", (persona_id,))
        cur.execute("DELETE FROM usuario WHERE usuario_id=%s", (usuario_id,))
        
        if id_direccion: cur.execute("DELETE FROM direccion WHERE id_direccion=%s", (id_direccion,))
        
        conn.commit()
        return jsonify({"mensaje": "Eliminado"})
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close(); conn.close()

@docentes_bp.route("/docentes-activos", methods=["GET"])
def listar_docentes_activos():
    conn = None; cur = None
    try:
        conn = get_db(); cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT doc.docente_id, p.nombres, p.apellidos, doc.codigo_docente FROM docente doc INNER JOIN persona p ON doc.persona_id = p.persona_id WHERE doc.estado = TRUE ORDER BY p.apellidos")
        return jsonify(cur.fetchall())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close(); conn.close()