@echo off
echo ========================================
echo Iniciando Servidor Arquiv - Robusto
echo ========================================

REM Matar processos Node.js existentes nas portas 3000-3010
echo Limpando portas...
for /l %%i in (3000,1,3010) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%i"') do taskkill /F /PID %%a 2>nul
)

REM Matar processos node.exe antigos
echo Limpando processos Node.js...
taskkill /F /IM node.exe 2>nul

REM Esperar um momento
timeout /t 2 /nobreak >nul

REM Iniciar servidor na porta 3000
echo Iniciando servidor na porta 3000...
start /B cmd /c "cd /d "%~dp0" && npm run dev"

REM Esperar servidor iniciar
echo Aguardando servidor iniciar...
timeout /t 5 /nobreak >nul

REM Verificar se está rodando
echo Verificando status...
netstat -ano | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo ✅ Servidor iniciado com sucesso na porta 3000
    echo 🌐 Acesse: http://localhost:3000
    start http://localhost:3000
) else (
    echo ❌ Falha ao iniciar servidor
    echo Tentando porta alternativa...
    start /B cmd /c "cd /d "%~dp0" && npx next dev --port 3001"
    timeout /t 3 /nobreak >nul
    netstat -ano | findstr ":3001" >nul
    if %errorlevel% equ 0 (
        echo ✅ Servidor iniciado na porta 3001
        echo 🌐 Acesse: http://localhost:3001
        start http://localhost:3001
    ) else (
        echo ❌ Falha completa ao iniciar servidor
    )
)

echo ========================================
echo Servidor Arquiv pronto!
echo ========================================
pause
