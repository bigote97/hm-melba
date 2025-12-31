@echo off
echo ========================================
echo  Generando env.js desde .env
echo ========================================
echo.

REM Verificar si existe .env
if not exist .env (
    echo [ERROR] No se encontró el archivo .env
    echo.
    echo Por favor, copia .env.example a .env y completa con tus valores:
    echo   Copy-Item .env.example .env
    echo.
    pause
    exit /b 1
)

REM Verificar si Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no está instalado o no está en el PATH
    echo.
    echo Instala Node.js desde https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Generando env.js...
node build-env.js

if %errorlevel% == 0 (
    echo.
    echo [OK] env.js generado exitosamente
) else (
    echo.
    echo [ERROR] Hubo un problema al generar env.js
)

echo.
pause
