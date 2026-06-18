# AlbumFIFA — Álbum Mundial 2026 (Panini)

Proyecto académico (Duoc UC, Ingeniería en Informática) — app híbrida de
colección e intercambio de láminas del Mundial 2026, con chat en tiempo real
y un asistente con IA local.

## Estructura del proyecto

Este repo (`Album-Mundial-2026-APP-WEB`) contiene **dos partes en ramas distintas**:

- **`master`** → Frontend (este código). Ionic + Angular + Capacitor.
- **`backend`** → Backend. FastAPI + SQLAlchemy + SQLite + Socket.IO + Ollama.

Para correr el proyecto completo necesitas **ambas ramas clonadas como carpetas
hermanas**, así:

```
proyectos/
├── albumApp/          ← esta rama (master)
└── album-mundial/
    └── backend/        ← rama "backend"
```

Clonar ambas:
```bash
git clone -b master  https://github.com/ikevin-p/Album-Mundial-2026-APP-WEB.git albumApp
git clone -b backend https://github.com/ikevin-p/Album-Mundial-2026-APP-WEB.git album-mundial
```

## Stack técnico

| Capa       | Tecnología                                          |
|------------|------------------------------------------------------|
| Frontend   | Ionic + Angular, compilado a Android vía Capacitor   |
| Backend    | FastAPI (Python), SQLAlchemy, SQLite                 |
| Auth       | JWT (python-jose + bcrypt)                           |
| Tiempo real| Socket.IO (chat P2P, presencia, reacciones)          |
| IA         | Ollama corriendo `llama3.2:3b` en local — sin API de pago, sin costo |

## Arranque rápido (todo automático)

El archivo `arranque.ps1` (en la raíz de este repo) hace todo el trabajo:
detecta tu IP de red WiFi/hotspot, actualiza los `environment.ts` solo si
cambió, verifica que Ollama esté corriendo con el modelo correcto, y levanta
backend + frontend cada uno en su propia ventana.

```powershell
.\arranque.ps1
```

Requiere que `albumApp` y `album-mundial/backend` sean carpetas hermanas (ver
estructura arriba). Si tu estructura es distinta, edita las rutas al inicio
del script.

### Qué hace exactamente
1. Detecta la IP del adaptador WiFi (sirve tanto para hotspot del celular
   como para wifi normal; ignora siempre `192.168.56.x`, que es VirtualBox).
2. Si la IP cambió respecto a la guardada, reescribe `environment.ts` y
   `environment.prod.ts` con la IP nueva.
3. Verifica que Ollama esté corriendo y tenga el modelo `llama3.2:3b`. Si no
   está corriendo, lo arranca.
4. Abre el backend (`uvicorn`, puerto 8001) en una ventana.
5. Abre el frontend (`ionic serve`, puerto 8100) en otra ventana.

### ⚠️ Si vas a usar el APK instalado en un celular
La IP queda **compilada dentro del APK**. Si `arranque.ps1` reporta que la IP
cambió, tienes que recompilar antes de que el APK funcione:
```powershell
cd albumApp
ionic build --prod
npx cap sync android
cd android
.\gradlew.bat assembleDebug
# luego instalar con adb:
# adb install -r app\build\outputs\apk\debug\app-debug.apk
```
El APK queda en `android\app\build\outputs\apk\debug\app-debug.apk`.

## Arranque manual (paso a paso, sin el script)

**1. Backend**
```powershell
cd album-mundial\backend
python -m venv venv
venv\Scripts\pip install -r requirements.txt
venv\Scripts\python.exe -m uvicorn app.main:socket_app --host 0.0.0.0 --port 8001 --reload
```

**2. Ollama** (el motor del chatbot)
```powershell
ollama pull llama3.2:3b
ollama serve
```

**3. Frontend**
```powershell
cd albumApp
npm install
ionic serve --host=0.0.0.0 --port=8100
```

**4. Configurar la IP** — antes de levantar el frontend, edita
`src/environments/environment.ts` y `environment.prod.ts`: reemplaza el
placeholder `192.168.1.100` por la IP real de tu adaptador WiFi
(`ipconfig` → busca el adaptador WiFi, no VirtualBox).

## Credenciales de prueba
```
usuario: admin
clave  : admin123
```

## Notas y lecciones aprendidas (por si algo falla en el futuro)

- **La IP siempre va por el adaptador "Wi-Fi".** No asumas que el hotspot da
  `10.x.x.x`; puede dar `192.168.x.x` según el teléfono. El script ya
  resuelve esto solo.
- **Ignora siempre `192.168.56.x`** — es el adaptador virtual de VirtualBox,
  no una red real.
- **Puerto 8000 puede estar bloqueado por `svchost` en Windows.** Este
  proyecto usa el **8001** para evitarlo. Si lo cambias, hay que abrir el
  puerto en el firewall (PowerShell como administrador):
  ```powershell
  netsh advfirewall firewall add rule name="AlbumFIFA Backend" dir=in action=allow protocol=TCP localport=8001
  ```
- **`CapacitorHttp` debe estar deshabilitado** (ver `capacitor.config.ts`):
  si se activa, rompe el interceptor JWT de Angular en dispositivos físicos.
- **bcrypt debe quedar fijo en `4.0.1`** en el backend — versiones 4.1+
  rompen `passlib` (falta el atributo `__about__`).
- **Para ver la pantalla del celular en el PC** (útil para grabar demos):
  `scrcpy` (más fluido que el Device Mirroring de Android Studio).
  Instalación: `winget install --id=Genymobile.scrcpy -e`
  Uso: `scrcpy -s <serial-del-dispositivo>` (ver serial con `adb devices`).
- **El emulador de Android Studio no puede usar la IP del hotspot
  directamente.** Desde dentro del emulador, tu PC anfitrión se llama
  `10.0.2.2`, no su IP real de red. Si necesitas que el emulador funcione,
  hay que compilar un APK aparte con `apiUrl` apuntando a `10.0.2.2`.

## Funcionalidades principales
- CRUD completo de colección de láminas (registrar, editar, eliminar).
- Progreso por selección/país, con cálculo de faltantes y repetidas.
- Wishlist y matching automático de intercambios entre usuarios.
- Chat P2P en tiempo real (Socket.IO): presencia, "escribiendo...",
  reacciones con emoji, confeti al cerrar un trato.
- Chatbot "Panini Pal" con streaming de respuesta, markdown, contexto real
  de la colección del usuario, sugerencias dinámicas y bienvenida
  personalizada con el progreso del álbum.
- Autenticación JWT con Guard de rutas e interceptor HTTP.
