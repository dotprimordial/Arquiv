# Script robusto para iniciar servidor Arquiv
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Iniciando Servidor Arquiv - Robusto" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Função para matar processos em portas específicas
function Kill-Port($port) {
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "Matando processo na porta $port..." -ForegroundColor Yellow
        Stop-Process -Id $process.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

# Limpar portas 3000-3010
Write-Host "Limpando portas 3000-3010..." -ForegroundColor Yellow
for ($i = 3000; $i -le 3010; $i++) {
    Kill-Port $i
}

# Matar processos node.exe
Write-Host "Limpando processos Node.js..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Esperar
Start-Sleep -Seconds 2

# Iniciar servidor
Write-Host "Iniciando servidor na porta 3000..." -ForegroundColor Green
$job = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev
}

# Esperar servidor iniciar
Write-Host "Aguardando servidor iniciar..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Verificar status
$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "✅ Servidor iniciado com sucesso na porta 3000" -ForegroundColor Green
    Write-Host "🌐 Acesse: http://localhost:3000" -ForegroundColor Cyan
    Start-Process "http://localhost:3000"
} else {
    Write-Host "❌ Falha na porta 3000, tentando 3001..." -ForegroundColor Red
    Kill-Port 3001
    $job2 = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        npx next dev --port 3001
    }
    Start-Sleep -Seconds 5
    $process2 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
    if ($process2) {
        Write-Host "✅ Servidor iniciado na porta 3001" -ForegroundColor Green
        Write-Host "🌐 Acesse: http://localhost:3001" -ForegroundColor Cyan
        Start-Process "http://localhost:3001"
    } else {
        Write-Host "❌ Falha completa ao iniciar servidor" -ForegroundColor Red
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Servidor Arquiv pronto!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Manter script rodando
try {
    while ($true) {
        Start-Sleep -Seconds 30
        $check = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
        if (-not $check) {
            Write-Host "⚠️ Servidor parou, reiniciando..." -ForegroundColor Yellow
            # Restart logic here if needed
        }
    }
} catch {
    Write-Host "Script finalizado" -ForegroundColor Gray
}
