# =============================================
# Setup Calendario DAW - Windows (CMD)
# =============================================

@echo off
setlocal
echo.
echo ========================================
echo  Setup del Calendario DAW 2o
echo ========================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Node.js no esta instalado.
    echo     Descarga e instala la version LTS desde:
    echo     https://nodejs.org
    echo     Luego vuelve a ejecutar este script.
    pause
    exit /b 1
)

where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Git no esta instalado.
    echo     Descarga e instala desde:
    echo     https://git-scm.com/downloads
    pause
    exit /b 1
)

echo [1/3] Clonando el repositorio (o actualizando)...
if exist "%USERPROFILE%\calendario-daw" (
    cd /d "%USERPROFILE%\calendario-daw"
    git pull
    cd /d "%USERPROFILE%"
) else (
    git clone https://github.com/barbadodev/calendario-daw.git "%USERPROFILE%\calendario-daw"
)

echo.
echo [2/3] Comprobando el backend...
curl -s --max-time 45 https://calendario-daw.onrender.com/api/health
echo.

echo.
echo [3/3] Probando CLI (eventos proximos)...
cd /d "%USERPROFILE%\calendario-daw"
node scripts\list-events.js --dias 14

echo.
echo ========================================
echo  SETUP COMPLETADO
echo ========================================
echo.
echo A partir de ahora, para anadir eventos desde CMD:
echo   cd %%USERPROFILE%%\calendario-daw
echo   node scripts\add-event.js --titulo "..." --modulo dwes --fecha 2026-01-15
echo.
echo O con OpenCode (recomendado):
echo   cd %%USERPROFILE%%\calendario-daw
echo   opencode
echo   ...y dile: "anade examen DWES el 15 a las 9"
echo.
echo Web publica: https://calendario-daw-1.onrender.com
echo   Usuario: tu nombre   Clave: daw2cordoba2026
echo.
pause
