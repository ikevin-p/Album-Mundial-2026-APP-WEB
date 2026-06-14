# check_users.py — muestra los usuarios existentes en la DB
import sqlite3, os

conn = sqlite3.connect(os.path.join(os.path.dirname(__file__), "mundial.db"))
cur  = conn.cursor()
cur.execute("SELECT id, username, nombre_real FROM users")
rows = cur.fetchall()
print(f"Total usuarios: {len(rows)}")
for r in rows:
    print(f"  id={r[0]}  username='{r[1]}'  nombre_real='{r[2]}'")
conn.close()
