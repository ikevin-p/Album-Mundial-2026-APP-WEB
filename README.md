# Álbum Mundial 2026 — Documentación Técnica

## Descripción
Aplicación móvil Android para gestionar la colección de figuritas del álbum Panini FIFA World Cup 2026. Permite a múltiples usuarios registrar qué láminas tienen, cuáles les faltan y cuáles tienen repetidas para cambiar.

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────┐
│                   App Android                        │
│         Ionic + Angular + Capacitor                  │
│                                                      │
│  Login/Registro → Países → Jugadores → Detalle       │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP + JWT Bearer Token
                       │ (CapacitorHttp / 10.0.2.2:8000)
┌──────────────────────▼──────────────────────────────┐
│                 Backend FastAPI                      │
│                                                      │
│  POST /auth/login       → JWT Token                  │
│  POST /auth/register    → Crear usuario              │
│  GET  /coleccion/       → Láminas + estado usuario   │
│  PATCH /coleccion/{id}  → Actualizar cantidad        │
└──────────────────────┬──────────────────────────────┘
                       │ SQLAlchemy ORM
┌──────────────────────▼──────────────────────────────┐
│              Base de Datos SQLite                    │
│               mundial.db                            │
└─────────────────────────────────────────────────────┘
```

---

## Modelo de Datos

### Tabla: users
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PK | Identificador único |
| username | VARCHAR UNIQUE | Nombre de usuario |
| nombre_real | VARCHAR | Nombre para mostrar |
| hashed_password | VARCHAR | Contraseña hasheada (bcrypt) |

### Tabla: laminas (Catálogo global)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PK | Identificador único |
| codigo_lamina | VARCHAR UNIQUE | Código de lámina (ej: ARG-03) |
| nombre_jugador | VARCHAR | Nombre del jugador o item |
| pais | VARCHAR | País o categoría |
| club | VARCHAR | Club actual del jugador |
| es_lamina_brillante | BOOLEAN | Si es lámina especial |

### Tabla: coleccion (Estado por usuario)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PK | Identificador único |
| user_id | FK → users.id | Usuario dueño |
| lamina_id | FK → laminas.id | Lámina referenciada |
| cantidad | INTEGER | 1=la tiene, 2+=repetidas |

**Restricción**: UNIQUE(user_id, lamina_id) — un usuario no puede tener el mismo registro dos veces.

---

## Stack Tecnológico

### Backend
- **FastAPI** — Framework REST API (Python)
- **SQLAlchemy** — ORM para manejo de BD
- **SQLite** — Base de datos local (archivo mundial.db)
- **JWT (python-jose)** — Autenticación stateless
- **bcrypt (passlib)** — Hash seguro de contraseñas
- **Uvicorn** — Servidor ASGI de desarrollo

### Frontend
- **Ionic Framework** — UI components móviles
- **Angular 17** — Framework frontend (standalone components)
- **Capacitor** — Bridge nativo Android
- **TypeScript** — Tipado estático

---

## Endpoints de la API

### Autenticación

| Método | Ruta | Body | Respuesta |
|--------|------|------|-----------|
| POST | /auth/login | `username`, `password` (form) | `{ access_token, token_type }` |
| POST | /auth/register | `{ username, nombre_real, password }` | `{ id, username, nombre_real }` |

### Colección (requieren JWT Bearer)

| Método | Ruta | Body | Respuesta |
|--------|------|------|-----------|
| GET | /coleccion/ | — | Lista de láminas con estado del usuario |
| PATCH | /coleccion/{id} | `{ cantidad: 0-10 }` | Lámina actualizada |

**Nota**: `cantidad=0` elimina la lámina de la colección, `cantidad>=1` la marca como poseída.

---

## Cómo Levantar el Proyecto

### Requisitos
- Python 3.12
- Node.js 18+
- Android Studio con emulador API 35+

### Backend
```powershell
cd C:\proyectos\album-mundial\backend
venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Swagger disponible en: `http://localhost:8000/docs`

### Frontend (desarrollo en navegador)
```powershell
cd C:\proyectos\albumApp
ionic serve
```

### Frontend (Android)
```powershell
ionic build
ionic capacitor sync android
# Luego Run 'app' en Android Studio
```

**Nota importante**: Para Android, Capacitor usa `environment.prod.ts`. La URL del backend debe ser `http://10.0.2.2:8000` (alias del localhost desde el emulador).

---

## Funcionalidades

### Usuario
- Registro con nombre real y nombre de usuario
- Login con JWT (expira en 24h según configuración)
- Colección independiente por usuario

### Álbum
- **653 láminas** del catálogo oficial Mundial 2026
- **48 selecciones** + categoría Especiales
- 13 láminas por selección: Escudo + Estadio + 11 jugadores representativos
- **29 láminas especiales**: Trofeo, Legends, Future Stars, Capitanes, etc.

### Interacción
- Tocar lámina → marcar como poseída
- Tocar de nuevo → sumar repetida (máx. 10)
- Mantener presionado → quitar del álbum
- Filtros por confederación (CONCACAF/CONMEBOL/UEFA/CAF/AFC/OFC)
- Buscador de selecciones
- Ordenar por: zona / más completo / A-Z / para cambiar
- Estadísticas: tengo / me faltan / para cambiar / % completado

---

## Credenciales de Demo
- Usuario: `admin`
- Contraseña: `admin123`

---

## Autor
Proyecto académico — Ingeniería en Informática, DuocUC
