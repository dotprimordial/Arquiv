# 🚨 RESUMO RÁPIDO - ERROS CRÍTICOS ENCONTRADOS

## Top 7 Erros Mais Importantes

### 1️⃣ **CRÍTICO: Credenciais Hardcoded Expostas**
- **Ficheiro**: `debug-db.js`
- **Risco**: Qualquer pessoa com acesso ao código tem acesso ao BD
- **Ação**: Remover imediatamente

### 2️⃣ **CRÍTICO: API Key no Client-Side**
- **Ficheiro**: `lib/gemini.ts` (linha 11)
- **Risco**: `NEXT_PUBLIC_OPENROUTER_API_KEY` expõe a chave no browser
- **Ação**: Mover para servidor, usar server actions

### 3️⃣ **CRÍTICO: Runtime Edge com DB Access**
- **Ficheiro**: `app/norm/[country]/[code]/page.tsx` (linha 1)
- **Risco**: Página falha ao tentar acessar banco de dados
- **Ação**: Remover `export const runtime = 'edge'`

### 4️⃣ **CRÍTICO: Query Supabase Incorreta**
- **Ficheiro**: `app/norm/[country]/[code]/page.tsx` (linha ~70)
- **Erro**: Filtra por `country` mas coluna é `country_id`
- **Ação**: Corrigir query com join correto

### 5️⃣ **CRÍTICO: Função Não Existe**
- **Ficheiro**: `app/upload/page.tsx` (linha ~240)
- **Erro**: Tenta importar `extractTextFromDOCXLimited` que não existe
- **Ação**: Criar função ou usar a existente `extractTextFromDOCX`

### 6️⃣ **ALTO: Email Admin Hardcoded**
- **Ficheiro**: `app/page.tsx` (linha ~65)
- **Erro**: `setIsAdmin(session.user.email === 'seantomasytbr@gmail.com')`
- **Ação**: Mover para variável de ambiente `ADMIN_EMAIL`

### 7️⃣ **ALTO: Falta de Tratamento de Resultado Semântico**
- **Ficheiro**: `app/page.tsx`
- **Erro**: `semanticResults` nunca é renderizado na UI
- **Ação**: Implementar UI para exibir resultados da busca semântica

---

## 📊 Distribuição de Problemas

| Categoria | Quantidade | Status |
|-----------|-----------|--------|
| 🔴 Críticos | 7 | ⚠️ Urgente |
| 🟠 Altos | 5 | 🔧 Importante |
| 🟡 Médios | 3 | 📋 Planejado |
| 🟢 Baixos | 2 | ℹ️ Considerado |
| 🔐 Segurança | 8 | ⚠️ Crítica |
| ⚡ Performance | 12 | 📋 Planejado |
| 👤 UX | 7 | 📋 Planejado |

---

## ✅ Checklist de Correção Imediata

```
SEGURANÇA (Fazer hoje):
☐ Remover credenciais de debug-db.js
☐ Mover OPENROUTER_API_KEY para servidor
☐ Mover ADMIN_EMAIL para .env
☐ Validar CORS configuração

FUNCIONALIDADE (Fazer hoje):
☐ Remover 'export const runtime = edge' da página de norma
☐ Corrigir query Supabase na página de detalhes
☐ Verificar se extractTextFromDOCXLimited existe
☐ Testar carregamento de SemanticNormDisplay

TESTES (Amanhã):
☐ Página de detalhes de norma carrega corretamente?
☐ Upload de DOCX funciona?
☐ Login/logout funciona?
☐ Busca semântica funciona?
☐ Borrar norma solicita confirmação?
```

---

## 🔗 Ficheiros Afetados (em ordem de urgência)

1. **debug-db.js** - Segurança crítica
2. **lib/gemini.ts** - Chave API exposta
3. **app/norm/[country]/[code]/page.tsx** - Query incorreta
4. **app/upload/page.tsx** - Função faltante
5. **app/page.tsx** - Admin email hardcoded
6. **app/api/norms/route.ts** - Sem rate limiting
7. **next.config.mjs** - Remotepatterns permissivo
8. **middleware.ts** - CORS não configurado

---

## 💡 Dicas para Corrigir

### Corrigir Query Supabase
```typescript
// ❌ Errado
const { data } = await supabase
  .from('norms')
  .select('id')
  .eq('country', country)
  .eq('code', code)
  .maybeSingle();

// ✅ Correto
const { data } = await supabase
  .from('norms')
  .select('id, code, title, countries(name)')
  .eq('code', code)
  .eq('countries.name', country)
  .maybeSingle();
```

### Mover API Key para Servidor
```typescript
// ❌ Errado - Expõe no browser
const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;

// ✅ Correto - Usa server action
'use server';
const apiKey = process.env.OPENROUTER_API_KEY;
```

### Usar Variável de Ambiente para Admin
```typescript
// ❌ Errado - Hardcoded
setIsAdmin(session.user.email === 'seantomasytbr@gmail.com');

// ✅ Correto - Via env
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';
setIsAdmin(session.user.email === ADMIN_EMAIL);
```

---

## 📞 Próximas Ações

1. **Hoje**: Aplicar correções críticas (2-3 horas)
2. **Amanhã**: Testar todas as funcionalidades (1-2 horas)
3. **Semana**: Implementar segurança adicional (4-6 horas)
4. **Mês**: Auditoria externa (planejado)

---

**Documento criado**: 9 de Maio de 2026  
**Prioridade**: 🔴 MÁXIMA - Não colocar em produção sem resolver estes erros
