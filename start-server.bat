@echo off
echo ========================================
echo  Iniciando servidor local para HM-Melba
echo ========================================
echo.

REM Verificar si existe env.js
if not exist env.js (
    echo [ERROR] El archivo env.js no existe!
    echo.
    echo Por favor, copia env.example.js a env.js y configura tus credenciales de Firebase.
    echo.
    echo Ejecuta: Copy-Item env.example.js env.js
    echo.
    pause
    exit /b 1
)

echo Verificando servidor disponible...
echo.

REM Intentar Python 3
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Python encontrado. Iniciando servidor en http://localhost:8000
    echo.
    echo Presiona Ctrl+C para detener el servidor
    echo.
    python -m http.server 8000
    exit /b 0
)

REM Intentar Python 2
python2 --version >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Python 2 encontrado. Iniciando servidor en http://localhost:8000
    echo.
    echo Presiona Ctrl+C para detener el servidor
    echo.
    python2 -m SimpleHTTPServer 8000
    exit /b 0
)

REM Intentar PHP
php --version >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] PHP encontrado. Iniciando servidor en http://localhost:8000
    echo.
    echo Presiona Ctrl+C para detener el servidor
    echo.
    php -S localhost:8000
    exit /b 0
)

REM Si no hay servidor disponible
echo [ERROR] No se encontró ningún servidor HTTP disponible.
echo.
echo Opciones:
echo 1. Instala Python desde https://www.python.org/
echo 2. Instala PHP desde https://www.php.net/
echo 3. Usa Node.js: npx http-server -p 8000
echo 4. Usa la extensión Live Server en VS Code
echo.
pause
