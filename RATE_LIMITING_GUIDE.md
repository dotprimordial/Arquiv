# Sistema de Rate Limiting por Usuário

## Visão Geral

Este sistema implementa limite de pesquisas por usuário para proteger a aplicação contra uso excessivo e abuso. O limite é baseado no usuário autenticado e rastreia:

- **Buscas semânticas**: até 30 por hora
- **Total de buscas**: até 100 por hora
- **Buscas por dia**: até 500
- **Buscas por minuto**: até 5 (proteção contra abuse)

## Arquivos Criados

### 1. Migration do Banco de Dados
**Arquivo**: `supabase/migrations/20250512000000_rate_limiting.sql`

Cria:
- Tabela `search_usage` para rastrear cada busca do usuário
- Índices para consultas eficientes
- RLS policies para segurança
- View `user_search_stats` para estatísticas

### 2. Helper de Rate Limiting
**Arquivo**: `lib/rate-limit.ts`

Funções principais:
- `checkRateLimit()`: Verifica se o usuário excedeu o limite
- `recordSearch()`: Registra uma busca no banco de dados
- `getUserSearchStats()`: Obtém estatísticas de uso do usuário
- `resetUserRateLimit()`: Admin pode resetar o limite de um usuário

```typescript
// Exemplo de uso
const { allowed, remaining, reason } = await checkRateLimit(userId, 'semantic');

if (!allowed) {
  throw new Error(reason); // Mostra mensagem amigável
}

// Registra a busca após execução bem-sucedida
await recordSearch(userId, 'semantic', query, country);
```

### 3. Integração nas Ações de Busca
**Arquivo**: `app/actions/norm-actions.ts`

Modificações:
- Importa funções de rate limit
- Adiciona verificação no início de `searchNormsSemantic()`
- Registra cada busca bem-sucedida

### 4. API de Status
**Arquivo**: `app/api/search/rate-limit/route.ts`

Endpoint GET `/api/search/rate-limit`:
- Retorna status atual do rate limit
- Estatísticas de uso
- Tempo de reset

Resposta:
```json
{
  "authenticated": true,
  "rateLimit": {
    "allowed": true,
    "remaining": 25,
    "limit": 30,
    "resetTime": "2025-05-12T15:30:00Z"
  },
  "stats": {
    "searchesLastHour": 5,
    "searchesLastDay": 20,
    "semanticSearches": 8
  }
}
```

### 5. Componente de Exibição
**Arquivo**: `components/SearchRateLimitDisplay.tsx`

Componente React que:
- Exibe status do rate limit em tempo real
- Mostra buscas restantes e total
- Exibe barra de progresso
- Mostra estatísticas de uso
- Modo compacto para integração em barras de pesquisa

## Como Usar

### Adicionar o Componente à UI

```tsx
import SearchRateLimitDisplay from '@/components/SearchRateLimitDisplay';

// Em sua página ou componente:
export default function SearchPage() {
  return (
    <div>
      <SearchRateLimitDisplay 
        compact={true} // ou false para versão completa
        onLimitExceeded={() => console.log('Limite atingido!')}
      />
      {/* resto do código */}
    </div>
  );
}
```

### Modo Compacto (recomendado para barras de busca)
```tsx
<SearchRateLimitDisplay compact={true} />
```
Exibe apenas: ✓ 25 buscas restantes

### Modo Completo (painel de informações)
```tsx
<SearchRateLimitDisplay compact={false} />
```
Exibe:
- Status (dentro/fora do limite)
- Barra de progresso
- Estatísticas (última hora / hoje)
- Tempo de reset

## Configuração do Rate Limit

Para modificar os limites, edite `DEFAULT_RATE_LIMIT` em `lib/rate-limit.ts`:

```typescript
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  semanticSearchesPerHour: 30,    // Buscas semânticas por hora
  totalSearchesPerHour: 100,      // Total de buscas por hora
  totalSearchesPerDay: 500,       // Total de buscas por dia
  searchesPerMinute: 5,           // Proteção contra abuse
};
```

## Verificar Uso de um Usuário

### Via API (como admin)
```bash
curl -X GET http://localhost:3000/api/search/rate-limit \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Via Client Action
```typescript
import { getUserSearchStats } from '@/lib/rate-limit';

const stats = await getUserSearchStats(userId);
console.log(stats);
// {
//   totalSearches: 142,
//   searchesLastHour: 8,
//   searchesLastDay: 45,
//   semanticSearches: 12,
//   lastSearch: Date
// }
```

## Resetar Limite de um Usuário (Admin)

```typescript
import { resetUserRateLimit } from '@/lib/rate-limit';

// Remove todo histórico de buscas do usuário
await resetUserRateLimit(userId);
```

## Resposta do Usuário ao Atingir Limite

Quando um usuário excede o limite, a seguinte mensagem é exibida:
```
"Limite de 30 buscas semânticas por hora excedido. Tente novamente em 15:45:00"
```

## Detalhe de Implementação

### Como o Rate Limit Funciona

1. **Verificação**: Antes de executar uma busca, a função `checkRateLimit()` consulta o banco de dados para contar buscas nos últimos:
   - 1 minuto (para proteção contra abuse)
   - 1 hora (para limite semântico/total)

2. **Registro**: Após a busca bem-sucedida, `recordSearch()` insere um registro em `search_usage` com:
   - `user_id`
   - `search_type` (semantic/keyword/browse)
   - `query_hash` (MD5 da query para deduplicação)
   - `country`
   - `timestamp`

3. **Segurança**: RLS policies garantem que:
   - Usuários só veem seu próprio histórico
   - Admins (na tabela `admin_users`) veem tudo
   - Dados estão protegidos contra acesso não autorizado

4. **Fail Open**: Se houver erro ao verificar rate limit, a busca é permitida (não interrompe a aplicação)

## Monitoramento

Para monitorar uso geral, consulte a view `user_search_stats`:

```sql
SELECT 
  user_id,
  total_searches,
  searches_last_hour,
  searches_last_day,
  semantic_searches,
  last_search
FROM user_search_stats
ORDER BY last_search DESC
LIMIT 50;
```

## Notas de Segurança

- ✅ Limites são verificados antes da execução (não após)
- ✅ Falhas no banco de dados não bloqueiam a aplicação
- ✅ RLS garante que usuários não vejam dados de outros
- ✅ Índices garantem performance mesmo com muitos registros
- ✅ Modo "fail open" para resiliência
