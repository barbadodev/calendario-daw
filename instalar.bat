@echo off
echo ========================================
echo  Instalador Calendario DAW
echo ========================================
echo.

echo [1/3] Instalando dependencias del backend...
cd backend
call npm install
cd ..

echo.
echo [2/3] Instalando dependencias del frontend...
cd frontend
call npm install
cd ..

echo.
echo [3/3] Generando claves VAPID para notificaciones...
cd backend
call npx web-push generate-vapid-keys > ..\vapid-keys.txt
cd ..

echo.
echo ========================================
echo  Instalacion completada
echo ========================================
echo.
echo Las claves VAPID se han guardado en vapid-keys.txt
echo Copialas al archivo backend/.env
echo.
echo Ahora configura las variables de entorno:
echo   - backend/.env (Supabase + Moodle + VAPID)
echo   - frontend/.env (Supabase + URL del backend)
echo.
echo Para ejecutar en local:
echo   - Terminal 1: cd backend ^&^& npm run dev
echo   - Terminal 2: cd frontend ^&^& npm run dev
echo.
echo Despues abre http://localhost:5173
echo.
pause
