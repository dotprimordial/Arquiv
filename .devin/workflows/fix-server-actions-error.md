---
description: Como resolver o erro "Invalid Server Actions request" do Next.js
---

# Resolver Erro "Invalid Server Actions request"

Este erro ocorre quando o cache do Next.js está desatualizado ou corrompido.

## Passos

1. **Parar o servidor**
   - Pressione `Ctrl+C` no terminal onde o servidor está rodando

2. **Limpar cache do Next.js**
   ```powershell
   Remove-Item -Recurse -Force "D:\DEV\Websites\Arquiv\.next"
   ```

3. **Reiniciar o servidor**
   ```powershell
   cd D:\DEV\Websites\Arquiv
   npm run dev -- --port 3000
   ```

4. **Limpar cache do navegador**
   - Pressione `Ctrl+Shift+R` para recarregar sem cache
   - Ou abra em uma aba anônima (Ctrl+Shift+N)

## Se persistir

5. **Reinstalar dependências**
   ```powershell
   Remove-Item -Recurse -Force "D:\DEV\Websites\Arquiv\node_modules"
   Remove-Item "D:\DEV\Websites\Arquiv\package-lock.json"
   npm install
   ```

6. **Usar script de inicialização**
   ```powershell
   .\start-server.ps1
   ```

## Causa

Este erro acontece quando:
- Arquivos Server Actions foram modificados
- O cache `.next` está des sincronizado entre client/server
- Há mudanças em arquivos `.env.local`

## Prevenção

Após modificar arquivos relacionados a:
- Server Actions (`app/actions/*`)
- Variáveis de ambiente (`.env.local`)
- Configurações do Next.js (`next.config.*`)

Sempre reinicie o servidor completamente.
