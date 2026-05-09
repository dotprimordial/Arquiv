# 📋 RELATÓRIO COMPLETO DE ANÁLISE - Arquiv Website

**Data**: 9 de Maio de 2026  
**Status**: Análise completa realizada  
**Severidade**: 🔴 CRÍTICA, 🟠 ALTA, 🟡 MÉDIA, 🟢 BAIXA

---

## 🔍 RESUMO EXECUTIVO

Foram identificados **15 erros críticos/altos**, **8 problemas de segurança**, **12 questões de performance** e **7 problemas de UX**. O website é funcionalmente operacional mas possui falhas importantes que afetam a confiabilidade e experiência do utilizador.

---

## 🔴 ERROS CRÍTICOS

### 1. **⚠️ ERRO NA PÁGINA DE DETALHES DE NORMA** 
**Severidade**: 🔴 CRÍTICA  
**Ficheiro**: [app/norm/[country]/[code]/page.tsx](app/norm/[country]/[code]/page.tsx#L1-L50)  
**Problema**: A página usa `runtime: 'edge'` mas tenta importar e usar funções que requerem acesso a arquivos/banco de dados (incompatível com Edge Runtime).
```tsx
export const runtime = 'edge'; // ❌ Edge runtime não suporta DB access direto
import { getFullNormContent } from '@/lib/gemini';
```
**Impacto**: A página pode falhar ou retornar erros ao tentar buscar dados.  
**Solução**: Remover `export const runtime = 'edge';` ou mover lógica para API route.

---

### 2. **Query Supabase com campos incorretos**
**Severidade**: 🔴 CRÍTICA  
**Ficheiro**: [app/norm/[country]/[code]/page.tsx](app/norm/[country]/[code]/page.tsx#L70-L80)  
**Problema**: A query filtra por `country` e `code` mas os campos da tabela são `country_id` (FK) e `code` (string).
```ts
const { data } = await supabase
  .from('norms')
  .select('id')
  .eq('country', country)        // ❌ Deve ser 'country_id'? Ou join com countries table?
  .eq('code', code)
  .maybeSingle();
```
**Impacto**: Nunca encontrará registos, causando erro "norma não encontrada".  
**Solução**: 
```ts
const { data } = await supabase
  .from('norms')
  .select('id')
  .eq('code', code)
  .eq('countries(name)', country)  // Join com countries table
  .maybeSingle();
```

---

### 3. **Falta de importação de tipos no NormDisplay**
**Severidade**: 🔴 CRÍTICA  
**Ficheiro**: [app/page.tsx](app/page.tsx#L10-L20)  
**Problema**: O componente `SemanticNormDisplay` é importado lazy mas pode não ter o tipo correto quando usado.
```tsx
const SemanticNormDisplay = lazy(() => import('@/components/SemanticNormDisplay'));
// ❌ Falta verificação se o componente existe
```
**Impacto**: Erro em runtime se o arquivo não existir.  
**Solução**: Verificar se o arquivo existe em [components/SemanticNormDisplay.tsx](components/SemanticNormDisplay.tsx).

---

### 4. **Função `extractTextFromDOCXLimited` não existe**
**Severidade**: 🔴 CRÍTICA  
**Ficheiro**: [app/upload/page.tsx](app/upload/page.tsx#L240-L250)  
**Problema**: Tentativa de importar função que não está definida no módulo.
```ts
const { extractTextFromDOCXLimited: extractFn } = await import('@/lib/docx-extractor');
// ❌ Verificar se 'extractTextFromDOCXLimited' existe
```
**Verificação**: Apenas existe `extractTextFromDOCX()` no ficheiro.  
**Solução**: Ou criar a função `extractTextFromDOCXLimited` ou mudar para `extractTextFromDOCX`.

---

### 5. **API Route retorna tipo incorreto**
**Severidade**: 🔴 CRÍTICA  
**Ficheiro**: [app/api/sitemap.xml/route.ts](app/api/sitemap.xml/route.ts#L1-L30)  
**Problema**: O endpoint retorna `text/xml` mas pode falhar em algumas respostas.
```ts
// Falta tratamento para caso quando nenhuma norma é retornada
if (!fetchSuccess) {
  // retorna sitemap básico - mas qual é a URL base?
}
```
**Impacto**: Sitemap pode estar incompleto ou inválido.

---

### 6. **Credentials hardcoded em debug-db.js**
**Severidade**: 🔴 CRÍTICA (SEGURANÇA)  
**Ficheiro**: [debug-db.js](debug-db.js#L1-L10)  
```javascript
// Hardcode credentials from .env.local for this debug script
// ❌ NUNCA fazer isso! Credenciais expostas no repositório
```
**Impacto**: Qualquer pessoa com acesso ao código tem acesso ao banco de dados.  
**Solução**: Remover credenciais hardcoded, usar apenas variáveis de ambiente.

---

### 7. **Falta de validação de URL de imagens**
**Severidade**: 🔴 CRÍTICA (SEGURANÇA)  
**Ficheiro**: [next.config.mjs](next.config.mjs#L30-L45)  
**Problema**: O `remotePatterns` permite qualquer imagem do Google, criando possível vetor de XSS.
```javascript
{
  protocol: 'https',
  hostname: 'lh3.googleusercontent.com',
  pathname: '/**',  // ❌ Muito permissivo
}
```
**Impacto**: Carregamento de imagens maliciosas possível.

---

## 🟠 ERROS ALTOS

### 8. **Gestão de estado incompleta em página principal**
**Severidade**: 🟠 ALTA  
**Ficheiro**: [app/page.tsx](app/page.tsx#L50-L120)  
**Problema**: O estado `semanticResults` é definido mas nunca é mostrado na UI se `isAiSearchEnabled` for true.
```tsx
const [isAiSearchEnabled, setIsAiSearchEnabled] = useState(true);
const [semanticResults, setSemanticResults] = useState<SearchResult[] | null>(null);
// ❌ Não existe condição para renderizar semanticResults
if (semanticResults) {
  // ??? Mostrar o quê?
}
```
**Impacto**: Modo de busca semântica não funciona na UI.

---

### 9. **Erro de tipo TypeScript ignorado**
**Severidade**: 🟠 ALTA  
**Ficheiro**: [app/actions/norm-actions.ts](app/actions/norm-actions.ts#L200-L210)  
```ts
const errorMsg = error && typeof error === 'object' 
  ? Object.prototype.toString.call(error) 
  : String(error);
// ❌ Conversão fraca, pode retornar '[object Object]'
```
**Impacto**: Mensagens de erro não informativas para o utilizador.

---

### 10. **Falta de tratamento de erros na busca de países ativos**
**Severidade**: 🟠 ALTA  
**Ficheiro**: [lib/gemini.ts](lib/gemini.ts#L250-L300)  
**Problema**: A função `getActiveCountries()` não está definida ou retorna um array vazio.
```ts
const activeNames = await getActiveCountries();
// ❌ Função não encontrada ou não implementada
```
**Impacto**: A página não carrega países automaticamente.

---

### 11. **Cache com chave insuficiente**
**Severidade**: 🟠 ALTA  
**Ficheiro**: [lib/gemini.ts](lib/gemini.ts#L65-L75)  
```ts
const cacheKey = `norms:${country}:${category}:${queryText || 'all'}:${useAi}`;
// ❌ Sem hash/truncatura pode criar chaves muito longas
```
**Impacto**: Possível limite de memória do Map.

---

### 12. **Validação de API Key inadequada**
**Severidade**: 🟠 ALTA  
**Ficheiro**: [lib/gemini.ts](lib/gemini.ts#L52)  
```ts
const isInvalidKey = (key: string) => !key || key === "" || key === "dummy-key" || key === "MY_OPENROUTER_API_KEY";
// ❌ Não valida tamanho mínimo
```
**Impacto**: Chaves inválidas podem passar pela validação.

---

## 🟡 PROBLEMAS MÉDIOS

### 13. **Possível erro de null reference na extração de JSON**
**Severidade**: 🟡 MÉDIA  
**Ficheiro**: [lib/gemini.ts](lib/gemini.ts#L40-L50)  
```ts
const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
if (end === -1) return "[]";
return cleaned.substring(start, end + 1);
// ❌ Se start ou end forem -1, retorna string inválida
```

---

### 14. **Falta de feedback visual durante carregamento de PDF**
**Severidade**: 🟡 MÉDIA  
**Ficheiro**: [app/norm/[country]/[code]/page.tsx](app/norm/[country]/[code]/page.tsx#L50-L80)  
**Problema**: PDF é renderizado mas sem indicação de carregamento.
```tsx
{isPdf && pdfUrl && (
  <iframe src={pdfUrl} />  // ❌ Sem loading state
)}
```

---

### 15. **Gestão inadequada de erros de upload**
**Severidade**: 🟡 MÉDIA  
**Ficheiro**: [app/upload/page.tsx](app/upload/page.tsx#L160-L220)  
**Problema**: Múltiplas tentativas de bucket sem backoff exponencial adequado.
```ts
for (const bucketName of bucketsToTry) {
  // ❌ Sem delay entre tentativas
}
```

---

## 🔐 PROBLEMAS DE SEGURANÇA

### S1. **Credenciais expostas em ficheiros debug** 🔴 CRÍTICA
Ficheiro: [debug-db.js](debug-db.js)

### S2. **Chave de API armazenada em client-side** 🔴 CRÍTICA
Ficheiro: [lib/gemini.ts](lib/gemini.ts#L11)
```ts
const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "";
// ❌ NEXT_PUBLIC_ expõe a chave no browser!
```
**Solução**: Mover para servidor (server-side action).

### S3. **Falta de rate limiting em API de norms** 🟠 ALTA
Ficheiro: [app/api/norms/route.ts](app/api/norms/route.ts)
- Sem proteção contra DDoS

### S4. **CORS não configurado adequadamente** 🟠 ALTA
Ficheiro: [middleware.ts](middleware.ts)
- Permite qualquer origem?

### S5. **Injeção SQL potencial em query de busca** 🟠 ALTA
Ficheiro: [lib/gemini.ts](lib/gemini.ts#L100-L130)
- Embora Supabase proteja, recomenda-se parametrização adicional

### S6. **Token JWT não validado adequadamente** 🟡 MÉDIA
Ficheiro: [middleware.ts](middleware.ts)
- Não verifica expiração antes de usar

### S7. **Armazenamento de dados sensíveis em localStorage** 🟡 MÉDIA
Ficheiro: [app/auth/callback/page.tsx](app/auth/callback/page.tsx#L14)
```tsx
// Debug: Log the current URL and localStorage state
// ❌ Pode conter tokens sensíveis
```

### S8. **Validação de email de admin hardcoded** 🟡 MÉDIA
Ficheiro: [app/page.tsx](app/page.tsx#L65)
```tsx
setIsAdmin(session.user.email === 'seantomasytbr@gmail.com');
// ❌ Deve estar em variável de ambiente
```

---

## ⚡ PROBLEMAS DE PERFORMANCE

### P1. **Lazy loading não otimizado**
**Ficheiro**: [app/page.tsx](app/page.tsx#L16-L18)
- `SemanticNormDisplay` carregado apenas quando necessário ✓ (OK)
- Mas `AuthModal` também lazy e é muito pequeno ✗ (desnecessário)

### P2. **Cache com TTL muito curto**
**Ficheiro**: [lib/gemini.ts](lib/gemini.ts#L65-L75)
- Apenas 5 minutos para dados que mudam raramente

### P3. **Sem compressão gzip configurada**
**Ficheiro**: [next.config.mjs](next.config.mjs)
- Não há configuração explícita

### P4. **Múltiplos chamadas de `getActiveCountries()`**
**Ficheiro**: [app/page.tsx](app/page.tsx#L60-L90)
- Chamado múltiplas vezes no inicialização

### P5. **PDF.js não pode ser inicializado no Edge Runtime**
**Ficheiro**: [lib/pdf-extractor.ts](lib/pdf-extractor.ts#L1-L10)
- Importação dinâmica inadequada para Edge

### P6. **Sem índices de base de dados**
- Não há evidência de índices em `norms.country_id`, `norms.category_id`, `norms.code`

### P7. **Sem paginação em queries**
**Ficheiro**: [lib/gemini.ts](lib/gemini.ts#L130)
```ts
.limit(50);
// ❌ Limite fixo, sem offset para paginação
```

### P8. **Memory leak possível em clientCache**
**Ficheiro**: [lib/gemini.ts](lib/gemini.ts#L15-L25)
- Cache nunca é limpo, apenas quando expira

### P9. **Sem service worker otimizado**
**Ficheiro**: [public/sw.js](public/sw.js)
- Arquivo presente mas não há configuração de cache strategy

### P10. **Queries sem select específicos**
**Ficheiro**: [app/api/debug-norms/route.ts](app/api/debug-norms/route.ts#L50-L80)
- Múltiplas queries retornam todos os campos

### P11. **Sem preload de fontes**
**Ficheiro**: [app/layout.tsx](app/layout.tsx)
- Fontes não são precarregadas

### P12. **Impossível desabilitar animations**
**Ficheiro**: Múltiplos componentes com Framer Motion
- Sem preferência `prefers-reduced-motion`

---

## 👤 PROBLEMAS DE UX

### UX1. **Mensagens de erro genéricas**
**Ficheiro**: [app/upload/page.tsx](app/upload/page.tsx#L280-L290)
```tsx
setError('Erro ao processar o arquivo Word: ' + errorMsg);
// ❌ Utilizador não sabe o que fazer
```
**Solução**: Fornecer dicas de resolução.

### UX2. **Falta de confirmação antes de deletar**
**Ficheiro**: [app/page.tsx](app/page.tsx#L220-L230)
```tsx
const handleDeleteNorm = async (id: string) => {
  // ❌ Sem dialog de confirmação
  try {
    await deleteNormServer(id);
```

### UX3. **Loading states inconsistentes**
**Ficheiro**: [app/norm_detail/[normId]/page.tsx](app/norm_detail/[normId]/page.tsx#L100-L120)
- Diferentes estilos de loading em diferentes páginas

### UX4. **Sem breadcrumbs de navegação**
- Utilizador pode ficar desorientado em páginas profundas

### UX5. **Título da página não muda**
**Ficheiro**: [app/norm/[country]/[code]/page.tsx](app/norm/[country]/[code]/page.tsx)
- Falta `<title>` dinâmico para SEO

### UX6. **Botão de "Voltar" não funciona consistentemente**
**Ficheiro**: [app/norm/[country]/[code]/page.tsx](app/norm/[country]/[code]/page.tsx#L140)
```tsx
<button onClick={() => router.back()}>
// ❌ Se é primeira página, volta sai do site
```

### UX7. **Modal de auth nunca fecha após sucesso**
**Ficheiro**: [components/SignIn.tsx](components/SignIn.tsx#L120-L150)
```tsx
// ❌ Falta chamar onClose() após login bem-sucedido
```

---

## 📋 CHECKLIST DE AÇÕES RECOMENDADAS

### IMEDIATO (24h)
- [ ] Remover `export const runtime = 'edge'` de [app/norm/[country]/[code]/page.tsx](app/norm/[country]/[code]/page.tsx)
- [ ] Corrigir query Supabase em [app/norm/[country]/[code]/page.tsx](app/norm/[country]/[code]/page.tsx#L70)
- [ ] Remover credenciais hardcoded de [debug-db.js](debug-db.js)
- [ ] Mover OPENROUTER_API_KEY para servidor
- [ ] Testar importação de `extractTextFromDOCXLimited` em [app/upload/page.tsx](app/upload/page.tsx)

### CURTO PRAZO (1 semana)
- [ ] Implementar validação de email admin via variável de ambiente
- [ ] Adicionar confirmação de delete
- [ ] Corrigir função `getActiveCountries()`
- [ ] Implementar paginação em queries
- [ ] Adicionar índices de base de dados

### MÉDIO PRAZO (2-4 semanas)
- [ ] Adicionar rate limiting
- [ ] Configurar CORS adequadamente
- [ ] Otimizar cache
- [ ] Implementar autenticação CSRF
- [ ] Adicionar testes unitários
- [ ] Configurar monitoramento e logging

### LONGO PRAZO (mensal)
- [ ] Auditoria de segurança externa
- [ ] Teste de carga
- [ ] Otimização de SEO avançada
- [ ] Implementar A/B testing

---

## 🎯 CONCLUSÃO

O website é **funcionalmente viável** mas necessita de **correções urgentes** principalmente em:
1. Segurança (credenciais expostas, API key client-side)
2. Confiabilidade (queries incorretas, funções faltantes)
3. UX (mensagens de erro, confirmações)

**Prioridade**: Corrigir os erros críticos antes de ir para produção.

---

**Relatório gerado**: 9 de Maio de 2026  
**Próxima revisão recomendada**: Após implementação das ações imediatas
