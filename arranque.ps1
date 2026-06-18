# ╔══════════════════════════════════════════════════════════════╗
# ║   ÁLBUM MUNDIAL 2026 — ARRANQUE AUTOMÁTICO                    ║
# ║   IP del WiFi → environments → Ollama → backend + frontend   ║
# ╚══════════════════════════════════════════════════════════════╝
#
# Ejecutar desde la raíz que contiene ambos proyectos (frontend y backend
# como carpetas hermanas), o ajustar BACKEND_DIR / FRONTEND_DIR abajo.

$ErrorActionPreference = "Stop"

# ── Rutas del proyecto ────────────────────────────────────────
# Por defecto asume que este script vive en la raíz junto a "albumApp" y
# "album-mundial". Si tu estructura es distinta, edita estas dos líneas.
$ROOT         = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND_DIR  = Join-Path (Split-Path -Parent $ROOT) "album-mundial\backend"
$FRONTEND_DIR = $ROOT
$ENV_DEV      = "$FRONTEND_DIR\src\environments\environment.ts"
$ENV_PROD     = "$FRONTEND_DIR\src\environments\environment.prod.ts"
$PORT_BACK    = 8001
$PORT_FRONT   = 8100
$OLLAMA_MODEL = "llama3.2:3b"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   ALBUM MUNDIAL 2026 - ARRANQUE" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# ── PASO 0: Detectar la IP del adaptador Wi-Fi ────────────────
# El hotspot del celular entra por el adaptador "Wi-Fi", sea cual sea
# el rango (10.x.x.x o 192.168.x.x). Esto evita confundirlo con
# VirtualBox (192.168.56.x) o WSL/Hyper-V (vEthernet).
Write-Host "[0] Buscando IP del WiFi (hotspot del celular)..." -ForegroundColor Yellow

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object {
            $_.InterfaceAlias -like "Wi-Fi*" -and
            $_.IPAddress -notlike "169.254.*"      # descarta auto-IP sin red
        } |
        Select-Object -First 1).IPAddress

# Plan B: si no hay "Wi-Fi", probar un rango 10.x.x.x (hotspot clasico),
# excluyendo siempre VirtualBox (192.168.56.x).
if (-not $ip) {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 |
            Where-Object {
                $_.IPAddress -like "10.*" -and
                $_.IPAddress -notlike "192.168.56.*"
            } |
            Select-Object -First 1).IPAddress
}

if (-not $ip) {
    Write-Host ""
    Write-Host "  ERROR: No se encontro IP de WiFi/hotspot." -ForegroundColor Red
    Write-Host "  -> Conecta el PC al WiFi compartido del celular y reintenta." -ForegroundColor Red
    Write-Host ""
    Write-Host "  IPs disponibles ahora mismo:" -ForegroundColor DarkGray
    Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notlike "127.*" } |
        Select-Object IPAddress, InterfaceAlias | Format-Table -AutoSize
    Read-Host "Presiona ENTER para salir"
    exit 1
}

Write-Host "  IP detectada: $ip" -ForegroundColor Green
Write-Host ""

# ── PASO 1: Actualizar environments solo si la IP cambio ──────
Write-Host "[1] Verificando configuracion de la app..." -ForegroundColor Yellow

$ipActual = ""
if (Test-Path $ENV_DEV) {
    # Acepta cualquier IP (10.x o 192.168.x), no solo 10.x
    $match = Select-String -Path $ENV_DEV -Pattern "http://(\d+\.\d+\.\d+\.\d+):" | Select-Object -First 1
    if ($match) { $ipActual = $match.Matches.Groups[1].Value }
}

if ($ipActual -eq $ip) {
    Write-Host "  La IP no cambio ($ip). No se recompila nada." -ForegroundColor Green
} else {
    Write-Host "  IP cambio: '$ipActual' -> '$ip'. Actualizando environments..." -ForegroundColor Magenta

    $contenidoDev = @"
// environment.ts - desarrollo (generado por arranque.ps1)
export const environment = {
  production: false,
  apiUrl   : 'http://${ip}:$PORT_BACK',
  socketUrl: 'http://${ip}:$PORT_BACK',
};
"@
    Set-Content -Path $ENV_DEV -Value $contenidoDev -Encoding UTF8

    $contenidoProd = @"
// environment.prod.ts - Android/Capacitor (generado por arranque.ps1)
export const environment = {
  production: true,
  apiUrl   : 'http://${ip}:$PORT_BACK',
  socketUrl: 'http://${ip}:$PORT_BACK',
};
"@
    Set-Content -Path $ENV_PROD -Value $contenidoProd -Encoding UTF8

    Write-Host "  OK -> environments actualizados a $ip" -ForegroundColor Green
    Write-Host "  AVISO: si vas a usar el APK del celular, debes RECOMPILAR." -ForegroundColor Red
}
Write-Host ""

# ── PASO 2: Verificar / arrancar OLLAMA (el cerebro del bot) ──
# Sin Ollama corriendo, el chatbot responde con error. Lo verificamos
# y, si no responde, lo levantamos antes de seguir.
Write-Host "[2] Verificando OLLAMA (motor del bot)..." -ForegroundColor Yellow

# Funcion: consulta la lista de modelos de Ollama. Devuelve el objeto o $null.
function Get-OllamaTags {
    try { return Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 3 }
    catch { return $null }
}

$r = Get-OllamaTags

# Si Ollama no responde, lo arrancamos.
if (-not $r) {
    Write-Host "  Ollama no responde. Iniciando 'ollama serve'..." -ForegroundColor Magenta
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'OLLAMA - motor del bot' -ForegroundColor Cyan; ollama serve"
}

# Reintenta hasta 6 veces (12s) a que Ollama responda Y tenga el modelo.
# Esto evita el falso "falta el modelo" cuando Ollama recien arranca.
$tieneModelo = $false
for ($i = 1; $i -le 6; $i++) {
    if (-not $r) { $r = Get-OllamaTags }
    if ($r) {
        $tieneModelo = @($r.models | Where-Object { $_.name -like "$OLLAMA_MODEL*" }).Count -gt 0
        if ($tieneModelo) { break }
    }
    Start-Sleep -Seconds 2
    $r = Get-OllamaTags
}

if ($tieneModelo) {
    Write-Host "  OK -> Ollama activo con el modelo $OLLAMA_MODEL." -ForegroundColor Green
} elseif ($r) {
    Write-Host "  AVISO: Ollama corre pero no veo el modelo $OLLAMA_MODEL." -ForegroundColor Red
    Write-Host "  -> Verifica con:  ollama list   (si falta:  ollama pull $OLLAMA_MODEL)" -ForegroundColor Red
} else {
    Write-Host "  AVISO: No se pudo verificar Ollama. El bot podria no responder." -ForegroundColor Red
    Write-Host "  -> Abre otra terminal y ejecuta:  ollama serve" -ForegroundColor Red
}
Write-Host ""

# ── PASO 3: Levantar el BACKEND en ventana propia ─────────────
Write-Host "[3] Abriendo BACKEND (puerto $PORT_BACK)..." -ForegroundColor Yellow

$cmdBack = "cd '$BACKEND_DIR'; " +
           "Write-Host 'BACKEND - Album Mundial 2026' -ForegroundColor Cyan; " +
           "venv\Scripts\python.exe -m uvicorn app.main:socket_app --host 0.0.0.0 --port $PORT_BACK --reload"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmdBack
Write-Host "  Backend lanzado en ventana nueva." -ForegroundColor Green
Write-Host ""

# Pequena espera para que el backend arranque antes del front
Start-Sleep -Seconds 4

# ── PASO 4: Levantar el FRONTEND en ventana propia ────────────
Write-Host "[4] Abriendo FRONTEND (puerto $PORT_FRONT)..." -ForegroundColor Yellow

$cmdFront = "cd '$FRONTEND_DIR'; " +
            "Write-Host 'FRONTEND - Album Mundial 2026' -ForegroundColor Cyan; " +
            "ionic serve --host=0.0.0.0 --port=$PORT_FRONT"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmdFront
Write-Host "  Frontend lanzado en ventana nueva." -ForegroundColor Green
Write-Host ""

# ── Resumen final ─────────────────────────────────────────────
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   TODO LISTO" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Backend  : http://${ip}:$PORT_BACK/docs"
Write-Host "  App web  : http://localhost:$PORT_FRONT"
Write-Host "  Celular  : http://${ip}:$PORT_FRONT"
Write-Host "  Login    : admin / admin123"
Write-Host ""
Write-Host "  NOTA: los errores 'Token invalido' en el backend ANTES" -ForegroundColor DarkGray
Write-Host "  de hacer login son normales. Desaparecen al iniciar sesion." -ForegroundColor DarkGray
Write-Host ""
Read-Host "Presiona ENTER para cerrar esta ventana (las otras siguen abiertas)"
