# Fluxo de Pesquisas e Resultados

Este documento descreve, passo a passo, como o website processa pesquisas e apresenta resultados. O objetivo é permitir que um desenvolvedor possa localizar onde alterar a lógica de busca, ranking, paginação e apresentação de resultados.

## 1. Visão Geral

- Entrada do utilizador: o utilizador escreve uma query no frontend (componentes relacionados em [components/NormSearch.tsx](components/NormSearch.tsx) e [components/animated-glowing-search-bar.tsx](components/animated-glowing-search-bar.tsx)).
- O frontend dispara uma ação/endpoint que coordena a pesquisa (ver [app/actions/norm-actions.ts](app/actions/norm-actions.ts)).
- A ação decide entre busca semântica (IA) ou busca textual tradicional e chama as bibliotecas em [lib/semantic-search.ts](lib/semantic-search.ts) e [lib/gemini.ts](lib/gemini.ts) ou executa queries via [lib/supabase-server.ts](lib/supabase-server.ts).
- Resultados são processados (filtragem, paginação, anotação) e devolvidos ao frontend, onde componentes como `NormDisplay` e `SemanticNormDisplay` exibem os dados.

## 2. Fluxo detalhado (passo-a-passo)

1. O utilizador insere a query; o componente de busca aplica debounce e validação mínima.
2. O componente envia a query para a ação/endpoint — geralmente através de uma Server Action ou `fetch()` que aponta para funções em [app/actions/norm-actions.ts](app/actions/norm-actions.ts).
3. `norm-actions` aplica regras de negócio: valida país/categoria, limpa input, gera chaves de cache e verifica rate limit (veja [lib/rate-limit.ts](lib/rate-limit.ts)).
4. Decisão de algoritmo:
   - Se a feature de busca semântica estiver ativa, chama `searchNormsSemantic()` (procure este nome em [app/actions/norm-actions.ts](app/actions/norm-actions.ts)).
   - Caso contrário, executa busca textual com filtros e paginação contra o DB (funções em [lib/supabase-server.ts](lib/supabase-server.ts)).
5. Quando usa IA/semântica:
   - `searchNormsSemantic` invoca [lib/semantic-search.ts](lib/semantic-search.ts) ou [lib/gemini.ts](lib/gemini.ts), que encapsulam chamadas ao provedor de IA, cache e lógica de fallback.
   - Os resultados da IA podem ser mapeados para IDs de normas e depois buscados no DB para obter metadados completos.
6. Pós-processamento: rankeamento final, remoção de duplicados, paginação e enriquecimento (trechos da norma, destaque de termos).
7. Resposta é enviada ao cliente; o frontend atualiza o estado e renderiza via `NormDisplay` / `SemanticNormDisplay`.

## 3. Pontos-chave para alterar a lógica

- Alterar comportamento do frontend (debounce, suggestions, UX): editar [components/NormSearch.tsx](components/NormSearch.tsx) e componentes UI relacionados.
- Mudar decisão entre IA e busca textual: editar as condições em [app/actions/norm-actions.ts](app/actions/norm-actions.ts) (procure flags/variáveis de ambiente como `NEXT_PUBLIC_...` ou checagens de API key).
- Modificar o pipeline semântico: editar [lib/gemini.ts](lib/gemini.ts) ou [lib/semantic-search.ts](lib/semantic-search.ts). Aqui concentre-se em:
  - como a query é transformada em prompt/embedding
  - parâmetros de similaridade e limiares
  - estratégia de mapeamento de resultados IA → IDs de normas
- Alterar busca textual/SQL: editar [lib/supabase-server.ts](lib/supabase-server.ts) e [lib/search-utils.ts](lib/search-utils.ts) para mudar filtros, ordenação e paginação.
- Caching: revisar [lib/cache.ts](lib/cache.ts) e [lib/cache-edge.ts](lib/cache-edge.ts) para ajustar políticas TTL e invalidação.
- Rate limiting e quotas: editar [lib/rate-limit.ts](lib/rate-limit.ts) se precisa ajustar limites por IP/usuário.
- Logging e debug: use [lib/logger.ts](lib/logger.ts) para adicionar traces e facilitar ajustes sem interromper o fluxo.

## 4. Como testar alterações localmente

1. Rodar type-check: `npx tsc --noEmit`.
2. Iniciar modo dev: `npm run dev`.
3. Testar fluxos manuais: abrir a UI e executar pesquisas com vários parâmetros (país, categoria, texto longo).
4. Usar os scripts de teste existentes: veja `test-search.js`, `test-semantic.js` na raiz para exemplos e harnesses.
5. Se modificar chamadas a IA, isolar as chamadas e testar com mocks (ou usar chaves de teste do provedor).

## 5. Checklist de alteração rápida

- [ ] Identificar o file alvo (frontend/backend).
- [ ] Adicionar logs com `logger` antes/ depois da transformação chave.
- [ ] Alterar a função responsável (ver lista em "Pontos-chave").
- [ ] Atualizar testes / criar um pequeno script de verificação.
- [ ] Executar `npx tsc --noEmit` e `npm run dev`.
- [ ] Validar no browser e, se possível, com ferramentas de API (Postman / curl).

## 6. Arquivos de referência (editar conforme necessário)

- [app/actions/norm-actions.ts](app/actions/norm-actions.ts)
- [lib/gemini.ts](lib/gemini.ts)
- [lib/semantic-search.ts](lib/semantic-search.ts)
- [lib/supabase-server.ts](lib/supabase-server.ts)
- [lib/search-utils.ts](lib/search-utils.ts)
- [components/NormSearch.tsx](components/NormSearch.tsx)
- [components/SemanticNormDisplay.tsx](components/SemanticNormDisplay.tsx)
- [lib/rate-limit.ts](lib/rate-limit.ts)
- [lib/cache.ts](lib/cache.ts)
- [lib/logger.ts](lib/logger.ts)

---

Se quiser, eu posso:

- Gerar um PR com uma alteração de exemplo (por exemplo, desativar a busca semântica por default).
- Adicionar testes automatizados que verifiquem respostas esperadas para várias queries.
