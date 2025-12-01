import psycopg2
from flask import g
import os

def get_db():
    if "db" not in g:
        g.db = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            database=os.getenv("DB_NAME", "SUN_BLACK"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASS", "123456"),
            connect_timeout=5   
        )
    return g.db

def init_db(app):
    @app.teardown_appcontext
    def close_connection(exception):
        db = g.pop("db", None)
        if db is not None:
            db.close()