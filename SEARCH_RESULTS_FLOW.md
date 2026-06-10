# Fluxo de Pesquisa e Resultados do Website

Este documento descreve o fluxo completo de pesquisa na aplicação Arquiv, desde a entrada do utilizador até a renderização dos resultados na página.

## 1. Entrada do utilizador

1. O utilizador escolhe um país em `CountrySelector`.
2. O utilizador digita uma query na barra de pesquisa principal: `components/ui/action-search-bar.tsx`.
3. A query também pode vir de outros componentes de busca, mas o fluxo principal está em `app/page.tsx`.
4. Existe um botão de alternância de busca inteligente/IA: `isAiSearchEnabled` determina se a pesquisa usa busca semântica ou busca tradicional.

## 2. Comportamento do frontend

- `app/page.tsx` mantém o estado da pesquisa:
  - `searchQuery`
  - `selectedCountry`
  - `selectedCategory`
  - `isAiSearchEnabled`
  - `isLoading`
  - `semanticResults`
  - `norms`
- Quando o utilizador envia a pesquisa, `handleSearch()` recebe a query.
- Há um debounce de 500ms antes de chamar `fetchNorms(...)` para evitar chamadas excessivas.
- `fetchNorms(...)` é disparado também sempre que mudam país, categoria, toggle IA ou query.

## 3. Decisão entre busca semântica e busca tradicional

No `app/page.tsx`:

- Se `searchQuery` não estiver vazio e `isAiSearchEnabled` estiver `true`, a aplicação renderiza `SemanticNormDisplay`.
- Caso contrário, a aplicação renderiza `NormDisplay`.

Isso significa que o pedido de pesquisa pode seguir dois caminhos diferentes:

### 3.1. Busca semântica (IA)

- `fetchNorms()` chama a ação que roda busca semântica.
- A aplicação usa o backend em `app/actions/norm-actions.ts` para decidir e processar a pesquisa.
- A função `searchNormsSemantic()` é a responsável por executar a busca IA, lidando com:
  - geração de embeddings
  - chamada ao provedor de IA
  - cache
  - fallback para busca textual se necessário
- O resultado retornado para o frontend é um array de `SearchResult` que pode incluir várias secções de uma mesma norma.

### 3.2. Busca tradicional

- `fetchNorms()` chama `getArchitecturalNorms(...)` ou outra função de consulta tradicional ao banco.
- O backend usa `lib/supabase-server.ts` e `lib/search-utils.ts` para montar a query SQL / filtros.
- A busca tradicional retorna uma lista de normas completas em vez de secções IA-rankeadas.

## 4. Rate limit e controle de uso

- O componente `SearchRateLimitDisplay` em `components/SearchRateLimitDisplay.tsx` consulta `/api/search/rate-limit`.
- Se a busca semântica ultrapassa o limite, o frontend suspende a pesquisa IA e mostra aviso ao utilizador.
- No `app/page.tsx`, se houver erro de limite, o estado `hasExceededLimit` é atualizado e a busca semântica é desativada.

## 5. Processamento de resultados no frontend

### 5.1. Resultados semânticos

- `SemanticNormDisplay.tsx` recebe `results: SearchResult[] | null`.
- Os resultados são agrupados por `normId` usando `useMemo()`.
- Cada norma agrupa secções relevantes ordenadas pela similaridade.
- A interface mostra:
  - código da norma
  - título da norma
  - país
  - número de secções relevantes encontradas
  - resumo de cada secção e hierarquia de títulos/artigos
- O componente também permite gerar resumos adicionais via `generateNormSummaryServer()`.

### 5.2. Resultados tradicionais

- `NormDisplay.tsx` exibe a lista de normas retornada pelo backend.
- Este componente lida com paginação, mensagens de erro e mensagens de "nenhuma norma encontrada".
- Também permite ações de administração se o utilizador for admin.

## 6. Onde alterar cada parte do fluxo

- Frontend da pesquisa e UX: `components/NormSearch.tsx`, `components/ui/action-search-bar.tsx`.
- Lógica de decisão entre IA e busca tradicional: `app/page.tsx` e `app/actions/norm-actions.ts`.
- Betas e IA: `lib/semantic-search.ts`, `lib/gemini.ts`.
- Busca textual tradicional / filtros SQL: `lib/supabase-server.ts`, `lib/search-utils.ts`.
- Cache e TTL: `lib/cache.ts`, `lib/cache-edge.ts`.
- Rate limit: `lib/rate-limit.ts`.
- Logs e debug: use `logger` em `app/page.tsx` e `lib/logger.ts`.

## 7. Fluxo simplificado passo a passo

1. Utilizador define país e categoria.
2. Utilizador digita query e envia busca.
3. `handleSearch()` atualiza o estado e aguarda debounce.
4. `fetchNorms()` é chamado com os parâmetros atuais.
5. Backend decide entre `searchNormsSemantic()` ou busca tradicional.
6. Resultados são consultados no banco ou gerados pela IA.
7. O backend retorna os dados processados para o frontend.
8. O frontend renderiza com `SemanticNormDisplay` ou `NormDisplay`.
9. O utilizador vê resultados agrupados, ordenados e com destaques relevantes.

## 8. Referências rápidas

- `app/page.tsx`
- `app/actions/norm-actions.ts`
- `lib/semantic-search.ts`
- `lib/gemini.ts`
- `lib/supabase-server.ts`
- `lib/search-utils.ts`
- `components/SemanticNormDisplay.tsx`
- `components/NormDisplay.tsx`
- `components/NormSearch.tsx`
- `components/SearchRateLimitDisplay.tsx`

---

> Nota: existe também uma versão deste conteúdo em `docs/SEARCH_RESULTS_FLOW.md`, mas este ficheiro foi criado em `/` conforme solicitado.
