# test_password.py — verifica que el hash guardado coincide con la contraseña
import sqlite3, os, sys
sys.path.insert(0, os.path.dirname(__file__))

from app.security import verify_password, get_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), "mundial.db")
conn = sqlite3.connect(DB_PATH)
cur  = conn.cursor()
cur.execute("SELECT username, hashed_password FROM users WHERE username = 'admin'")
row = cur.fetchone()
conn.close()

if not row:
    print("❌ Usuario 'admin' no encontrado")
else:
    username, stored_hash = row
    print(f"Hash guardado: {stored_hash[:40]}...")
    result = verify_password("admin123", stored_hash)
    print(f"verify_password('admin123') → {result}")

    # Genera un hash nuevo para comparar
    nuevo = get_password_hash("admin123")
    print(f"Hash nuevo    : {nuevo[:40]}...")
    result2 = verify_password("admin123", nuevo)
    print(f"verify_password con hash nuevo → {result2}")
