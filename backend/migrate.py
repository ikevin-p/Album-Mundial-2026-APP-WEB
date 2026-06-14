# migrate.py
# Script de migración manual para agregar columnas nuevas al mundial.db existente.
# SQLite no soporta ALTER TABLE con DEFAULT en todas las versiones,
# por eso se hace columna por columna con try/except.

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "mundial.db")

migraciones = [
    # Tabla users — columnas del módulo chat
    "ALTER TABLE users ADD COLUMN esta_en_linea INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN ultimo_visto  TEXT",

    # Tablas nuevas del chat (por si create_all no las creó aún)
    """
    CREATE TABLE IF NOT EXISTS salas_chat (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        sala_key  TEXT    NOT NULL UNIQUE,
        creada_en TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS sala_participantes (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        sala_id    INTEGER REFERENCES salas_chat(id),
        usuario_id INTEGER REFERENCES users(id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS mensajes (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        sala_id      INTEGER REFERENCES salas_chat(id),
        remitente_id INTEGER REFERENCES users(id),
        contenido    TEXT    NOT NULL,
        es_del_bot   INTEGER NOT NULL DEFAULT 0,
        enviado_en   TEXT,
        leido        INTEGER NOT NULL DEFAULT 0
    )
    """,
]

conn = sqlite3.connect(DB_PATH)
cur  = conn.cursor()

for sql in migraciones:
    try:
        cur.execute(sql)
        print(f"[OK] {sql.strip()[:60]}...")
    except sqlite3.OperationalError as e:
        # "duplicate column name" o "already exists" → ya estaba, se ignora
        print(f"[SKIP] {e}")

conn.commit()
conn.close()
print("\n✅ Migración completada.")
