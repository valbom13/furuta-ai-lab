@echo off
title Furuta AI Mechanical Lab - Inicializador
cd /d "%~dp0"

echo ============================================================
echo   Iniciando Furuta AI Mechanical Lab (Fisica + IA)
echo ============================================================
echo.

:: Verificar se o Node.js esta instalado
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js e npm nao foram encontrados no PATH!
    echo Por favor, instale o Node.js a partir de https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Verificar se node_modules existe
if not exist "node_modules\" (
    echo [INFO] Instalando dependencias pela primeira vez...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar dependencias.
        pause
        exit /b 1
    )
    echo.
)

echo [INFO] Iniciando o servidor e abrindo o navegador...
echo Acesso direto: http://localhost:3000/
echo Pressione Ctrl+C para encerrar.
echo.

call npm run dev -- --open

pause
