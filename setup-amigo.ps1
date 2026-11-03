# ========================================
# Setup automatico - Calendario DAW
# Para Antonio y sus dos compañeros
# ========================================

$ErrorActionPreference = "Stop"
$Repo = "https://github.com/barbadodev/calendario-daw.git"
$Carpeta = "$HOME\calendario-daw"

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   Setup del Calendario DAW 2º" -ForegroundColor Cyan
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""

# Comprobar Node.js
try {
    $nodeVer = node --version
    Write-Host "[OK] Node.js $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "[!] Node.js no está instalado. Ve a https://nodejs.org y descárgalo (LTS)." -ForegroundColor Red
    Write-Host "    Después vuelve a lanzar este script." -ForegroundColor Yellow
    exit 1
}

# Comprobar git
try {
    $gitVer = git --version
    Write-Host "[OK] Git disponible" -ForegroundColor Green
} catch {
    Write-Host "[!] Git no está instalado. Ve a https://git-scm.com/downloads" -ForegroundColor Red
    exit 1
}

# Clonar repo (o actualizar si ya existe)
if (Test-Path $Carpeta) {
    Write-Host ""
    Write-Host "[i] La carpeta $Carpeta ya existe. Actualizando..." -ForegroundColor Yellow
    Push-Location $Carpeta
    git pull
    Pop-Location
} else {
    Write-Host ""
    Write-Host "[i] Clonando repositorio..." -ForegroundColor Cyan
    git clone $Repo $Carpeta
}

if (-not (Test-Path $Carpeta)) {
    Write-Host "[!] No se pudo clonar. ¿Tienes permisos del repo? (solo para el grupo)" -ForegroundColor Red
    Write-Host "    Pide a Antonio que te invite como colaborador en:" -ForegroundColor Yellow
    Write-Host "    https://github.com/barbadodev/calendario-daw/settings/access" -ForegroundColor Yellow
    exit 1
}

Push-Location $Carpeta

# Configurar scripts/.env si no existe
$envFile = Join-Path $PSScriptRoot "scripts\.env"
if (-not (Test-Path "scripts\.env")) {
    Write-Host "[i] Creando scripts\.env con la configuración del grupo..." -ForegroundColor Cyan
    Set-Content -Path "scripts\.env" -Encoding UTF8 -Value @'
# Configuracion para los scripts CLI del Calendario DAW
# Cambia estas lineas si os dan otra URL

API_URL_PROD=https://calendario-daw.onrender.com
SALA_CODIGO=daw2cordoba2026
'@
}

# Probar la conexión al backend
Write-Host ""
Write-Host "[i] Comprobando que el backend está vivo..." -ForegroundColor Cyan
try {
    $r = Invoke-WebRequest -Uri "https://calendario-daw.onrender.com/api/health" -TimeoutSec 45 -UseBasicParsing
    Write-Host "[OK] Backend responde: $($r.Content)" -ForegroundColor Green
} catch {
    Write-Host "[!] No responde (normal si lleva dormido 15+ min)." -ForegroundColor Yellow
    Write-Host "    Vuelve a lanzar esta prueba en 30 segundos:" -ForegroundColor Yellow
    Write-Host "      Invoke-WebRequest https://calendario-daw.onrender.com/api/health" -ForegroundColor Gray
}

# Probar el CLI
Write-Host ""
Write-Host "[i] Probando comando list-events.js..." -ForegroundColor Cyan
node scripts/list-events.js --dias 14

Pop-Location

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Green
Write-Host "   SETUP COMPLETADO" -ForegroundColor Green
Write-Host "  ====================================" -ForegroundColor Green
Write-Host ""
Write-Host "A partir de ahora, en PowerShell:" -ForegroundColor White
Write-Host ""
Write-Host "  cd $Carpeta" -ForegroundColor Gray
Write-Host "  node scripts\list-events.js --dias 30" -ForegroundColor Gray
Write-Host "  node scripts\add-event.js --titulo ""Prueba"" --modulo dwes --fecha 2026-12-31" -ForegroundColor Gray
Write-Host ""
Write-Host "Y con OpenCode (recomendado):" -ForegroundColor White
Write-Host ""
Write-Host "  cd $Carpeta" -ForegroundColor Gray
Write-Host "  opencode" -ForegroundColor Gray
Write-Host "  # y luego dile: 'apunta examen DWES el 15 a las 9'" -ForegroundColor Gray
Write-Host ""
Write-Host "Web pública del calendario:" -ForegroundColor White
Write-Host "  https://calendario-daw-1.onrender.com" -ForegroundColor Cyan
Write-Host ""
