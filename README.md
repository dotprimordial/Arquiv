<div align="center">
# Arquiv - Plataforma de Normas de Contrução
</div>
<div align="center">
  <h3>Plataforma completa para consulta automatica de normas arquitetônicas por país</h3>
  <p>Busca inteligente, pesquise pela situação e receba a norma ideal para tal</p>
</div>

## Features

- **Busca Semântica IA**: Busca inteligente usando OpenRouter AI para encontrar normas relevantes
- **Suporte PDF**: Upload e visualização de documentos PDF diretamente na plataforma
- **Multi-País**: Suporte para normas de diferentes países (Portugal, Brasil, Moçambique, Angola, etc.)
- **Autenticação**: Sistema de login opcional com recursos admin
- **Responsivo**: Design moderno e adaptável para todos os dispositivos
- **Compartilhamento**: Compartilhe normas em redes sociais
- **Organização**: Estrutura de pastas por país no storage

## Tecnologias

- **Frontend**: Next.js 14, React, TypeScript
- **Estilos**: Tailwind CSS, Framer Motion
- **Backend**: Supabase (Database, Auth, Storage)
- **IA**: OpenRouter API (Claude Haiku)
- **PDF**: Visualizador nativo com iframe
- **Ícones**: Lucide React

## Pré-requisitos

- Node.js 18+
- Conta Supabase
- Chave API OpenRouter

## Instalação

1. **Clone o repositório**
   ```bash
   git clone https://github.com/seu-usuario/arquiv.git
   cd arquiv
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   
   Copie `.env.example` para `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   
   Configure as seguintes variáveis:
   ```env
   # OpenRouter API Key
   NEXT_PUBLIC_OPENROUTER_API_KEY="sua-chave-openrouter"
   
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="sua-chave-anon"
   
   # App URL
   APP_URL="http://localhost:3000"
   ```

4. **Configure o Supabase Storage**
   
   - Crie um bucket chamado `arquiv-files` (com hifen)
   - Configure as políticas de acesso público para leitura
   - O sistema criará automaticamente pastas por país (ex: `mocambique/`, `portugal/`)

5. **Execute a aplicação**
   ```bash
   npm run dev
   ```

   Abra [http://localhost:3000](http://localhost:3000) no navegador.

## Estrutura do Projeto

```
arquiv/
├── app/
│   ├── norm/[country]/[code]/     # Página de detalhes da norma
│   ├── upload/                    # Página de upload (admin)
│   ├── login/                     # Página de login
│   ├── layout.tsx                 # Layout principal
│   └── page.tsx                   # Homepage
├── components/
│   ├── AuthModal.tsx              # Modal de autenticação
│   ├── NormDisplay.tsx            # Exibição de normas
│   ├── CountrySelector.tsx        # Seletor de países
│   └── ...
├── lib/
│   ├── supabase.ts               # Cliente Supabase
│   ├── gemini.ts                 # Lógica de busca IA
│   ├── openrouter.ts             # Cliente OpenRouter
│   └── ...
└── public/
```

## Funcionalidades Principais

### Busca de Normas
- Busca semântica usando IA
- Filtro por país e categoria
- Exibição de trechos relevantes com referências (Capítulo, Artigo, etc.)

### Upload de Normas (Admin)
- Upload de texto formatado ou PDF
- Organização automática por país
- Limite de 50MB para PDFs

### Visualização
- Leitor de PDF integrado
- Interface responsiva
- Modo de compartilhamento social

## 🔧 Configuração do Supabase

### Tabela `norms`
```sql
CREATE TABLE norms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  pdf_url TEXT,
  country TEXT NOT NULL,
  category TEXT NOT NULL,
  keywords TEXT[],
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Bucket Storage
- Nome: `arquiv-files`
- Estrutura: `{pais}/{timestamp}-{nome-arquivo.pdf}`
- Exemplos: `mocambique/1234567890-regeu.pdf`

## Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Licença

Este projeto está sob licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## Suporte

Para suporte, envie um email para seantomasytbr@gmail.com ou abra uma issue no GitHub.

---

<div align="center">
  <p>Feito com ❤️ por Sean Tomás</p>
</div>
