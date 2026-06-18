# Álbum Mundial 2026 — Backend (FastAPI)

## Descripción
API REST + WebSocket para la app AlbumFIFA: gestión de colección de
láminas Panini del Mundial 2026, intercambios entre usuarios, chat en
tiempo real y un chatbot con IA local (Ollama).

El frontend (Ionic/Angular) vive en la rama `master` de este mismo repo,
como proyecto hermano `albumApp`. Ver su README para el setup conjunto.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                      App Android / Web                    │
│              Ionic + Angular + Capacitor                  │
└───────────────┬─────────────────────────┬─────────────────┘
                │ HTTP + JWT Bearer         │ WebSocket (Socket.IO)
┌───────────────▼─────────────────────────▼─────────────────┐
│                      Backend FastAPI                       │
│                                                             │
│  /auth/*        → login, registro, JWT                     │
│  /coleccion/*    → CRUD de láminas del usuario               │
│  /chat/*         → historial, resumen de colección (REST)    │
│  Socket.IO       → chat P2P, presencia, reacciones, bot      │
│       │                                                     │
│       └── chatbot/  → stream a Ollama (llama3.2:3b, local)   │
└───────────────┬─────────────────────────────────────────────┘
                │ SQLAlchemy ORM
┌───────────────▼─────────────────────────────────────────────┐
│                  Base de Datos SQLite (mundial.db)            │
└───────────────────────────────────────────────────────────────┘
```

---

## Stack Tecnológico
- **FastAPI** — API REST asíncrona, con Swagger automático en `/docs`.
- **SQLAlchemy** — ORM.
- **SQLite** — Base de datos local (`mundial.db`).
- **python-jose + bcrypt (passlib)** — JWT y hash de contraseñas.
  ⚠️ `bcrypt` debe quedar fijo en `4.0.1` (ver `requirements.txt`) — versiones
  4.1+ rompen `passlib` (falta `__about__`).
- **python-socketio** — chat en tiempo real, presencia, reacciones.
- **Ollama** — motor de IA local para el chatbot. Sin API de pago, sin costo
  por consulta, datos privados (no sale nada a la nube).
- **Uvicorn** — servidor ASGI.

---

## Modelo de datos (resumen)

| Tabla         | Campos clave                                             |
|---------------|------------------------------------------------------------|
| `users`       | id, username, nombre_real, hashed_password                |
| `laminas`     | id, codigo_lamina (ej: ARG-03), nombre_jugador, pais, club, es_lamina_brillante |
| `coleccion`   | id, user_id (FK), lamina_id (FK), cantidad — UNIQUE(user_id, lamina_id) |
| `mensajes`    | id, sala_id (FK), remitente_id, contenido, es_del_bot, enviado_en |
| `sala_chat` / `sala_participante` | salas de chat P2P y sus participantes        |

`cantidad=0` en `coleccion` elimina el registro; `cantidad>=1` la marca como
poseída; `cantidad>1` indica repetidas disponibles para intercambio.

---

## Setup

### 1. Variables de entorno
Copia `.env.example` a `.env` y completa los valores:
```powershell
cp .env.example .env
```
Genera una `SECRET_KEY` propia:
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Entorno virtual y dependencias
```powershell
python -m venv venv
venv\Scripts\pip install -r requirements.txt
```

### 3. Ollama (motor del chatbot)
```powershell
ollama pull llama3.2:3b
ollama serve
```
Si usas otro modelo, ajusta `OLLAMA_MODEL` en `.env`.

### 4. Levantar el servidor
```powershell
venv\Scripts\python.exe -m uvicorn app.main:socket_app --host 0.0.0.0 --port 8001 --reload
```
Swagger: `http://localhost:8001/docs`

⚠️ El puerto **8000 puede estar bloqueado por `svchost` en Windows** — este
proyecto usa el **8001** para evitarlo. Si cambias el puerto, abre el
firewall (PowerShell como administrador):
```powershell
netsh advfirewall firewall add rule name="AlbumFIFA Backend" dir=in action=allow protocol=TCP localport=8001
```

### Arranque automático (recomendado)
El frontend (`albumApp/arranque.ps1`) levanta backend + frontend + verifica
Ollama de un solo paso, detectando la IP de red automáticamente. Ver su
README para más detalle.

---

## Endpoints principales

### Auth
| Método | Ruta            | Body                                    | Respuesta |
|--------|-----------------|------------------------------------------|-----------|
| POST   | /auth/login     | `username`, `password` (form)             | `{ access_token, token_type }` |
| POST   | /auth/register  | `{ username, nombre_real, password }`     | `{ id, username, nombre_real }` |

### Colección (requieren JWT Bearer)
| Método | Ruta              | Body              | Respuesta |
|--------|-------------------|---------------------|-----------|
| GET    | /coleccion/       | —                   | Láminas + estado del usuario |
| PATCH  | /coleccion/{id}   | `{ cantidad: 0-10 }` | Lámina actualizada |

### Chat (requieren JWT Bearer)
| Método | Ruta                  | Respuesta |
|--------|------------------------|-----------|
| GET    | /chat/historial-bot    | Historial de mensajes con el chatbot |
| DELETE | /chat/historial-bot    | Borra el historial del chatbot |
| GET    | /chat/resumen-bot      | Progreso, faltantes, repetidas y brillantes del usuario (alimenta la bienvenida y sugerencias del bot) |
| GET    | /chat/historial/{id}   | Historial de chat P2P con otro usuario |

### Eventos Socket.IO
| Evento (cliente → servidor) | Evento (servidor → cliente) | Uso |
|------------------------------|--------------------------------|------|
| `mensaje_al_bot`             | `bot_chunk`, `bot_fin`         | Chat con Panini Pal (streaming) |
| `detener_bot`                | —                                | Cancela la generación en curso |
| `enviar_mensaje`             | `nuevo_mensaje`, `mensaje_enviado` | Chat P2P |
| `reaccionar`                 | `reaccion`                      | Reacción emoji a un mensaje (tiempo real, no persiste) |
| `marcar_leidos`               | `mensajes_leidos`               | Confirmación de lectura |

---

## El chatbot "Panini Pal"

- Corre sobre `llama3.2:3b` vía Ollama, en streaming (token por token).
- Recibe en su contexto un resumen real de la colección del usuario
  (progreso, faltantes, repetidas, brillantes) — ver `app/routers/chat/contexto.py`.
- Si necesitas más calidad y menos velocidad, cambia `OLLAMA_MODEL=llama3.1:8b`
  en `.env` (ya viene más lento en CPU, pero sigue el contexto mejor).

---

## Credenciales de demo
```
usuario: admin
clave  : admin123
```

## Notas para el futuro
- Si la verificación de Ollama en `arranque.ps1` reporta "falta el modelo"
  aunque sí esté instalado, revisa que el script use `@(...)` al contar
  resultados de `Where-Object` en PowerShell — sin eso, `.Count` puede
  evaluar como vacío en vez de `0` y dar falsos negativos.
- El frontend (Capacitor) compila la IP del backend **dentro del APK**. Cada
  vez que cambie la red, hay que recompilar el APK (ver README del frontend).

## Autor
Proyecto académico — Ingeniería en Informática, Duoc UC.
