# reset_admin.py — resetea la contraseña de admin a "admin123"
# o crea el usuario si no existe
import sqlite3, os, sys
sys.path.insert(0, os.path.dirname(__file__))

from app.security import get_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), "mundial.db")
conn = sqlite3.connect(DB_PATH)
cur  = conn.cursor()

nuevo_hash = get_password_hash("admin123")

# Intentar actualizar primero
cur.execute("UPDATE users SET hashed_password = ? WHERE username = 'admin'", (nuevo_hash,))
if cur.rowcount == 0:
    # No existía — crearlo
    cur.execute(
        "INSERT INTO users (username, nombre_real, hashed_password, esta_en_linea) VALUES (?, ?, ?, 0)",
        ("admin", "Administrador", nuevo_hash)
    )
    print("✅ Usuario 'admin' creado con contraseña 'admin123'")
else:
    print("✅ Contraseña de 'admin' reseteada a 'admin123'")

conn.commit()
conn.close()
