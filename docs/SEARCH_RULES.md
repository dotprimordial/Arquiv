# Regras de Busca - Arquiv

## 1. A Regra Principal: Processamento de Conteúdo (A IA deve LER)
Leitura Integral do Contexto: A IA não deve apenas retornar títulos. Ela deve realizar a leitura dos trechos (chunks) de texto extraídos do banco de dados que correspondem à country filtrada.

### 1.1 Leitura Obrigatória do Conteúdo das Normas
Quando o usuário realizar uma pesquisa, a IA DEVE:
1. Buscar todas as normas para o país selecionado na tabela `norms`
2. Ler o campo `content` ou `structured_content` de TODAS normas encontradas
3. Processar o conteúdo completo, não apenas os metadados (título, código, descrição)
4. Só então responder com base no que leu de fato nas normas

> **ATENÇÃO**: A IA não deve "adivinhar" ou usar conhecimento prévio. A resposta deve ser baseada EXCLUSIVAMENTE no conteúdo lido das normas no banco de dados.

Interpretação de Linguagem Natural vs. Técnica: A regra principal é: "Traduza a situação do usuário para a exigência da norma".

Exemplo: Se o usuário pergunta "posso construir na beira do mar?", a IA deve ler as normas de Moçambique sobre "Zona de Proteção Parcial" ou "Orla Marítima" e responder com base no que leu ali.

Extração Ativa de Parâmetros: Ao ler, a IA tem a obrigação de extrair valores numéricos (distâncias, áreas, alturas) e condições (pode/não pode).