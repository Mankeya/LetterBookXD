# LetterBookXD

Uma rede social para cinéfilos inspirada no Letterboxd. Construída com arquitetura de microsserviços, utilizando Vue 3 no frontend e Node.js/Go/Java no backend.

## 🚀 Tech Stack

### Frontend
- **Vue 3** + TypeScript
- **Vite** para build e dev server
- **Pinia** para gerenciamento de estado
- **Vue Router** para roteamento
- **Tailwind CSS** para estilização
- **Axios** para requisições HTTP
- **Zod** para validação de schemas

### Backend (API Gateway)
- **Node.js 20** + **Fastify**
- **TypeScript** com strict mode
- **Redis** para cache e sessões
- **MySQL 8** para persistência
- **JWT** para autenticação
- **Zod** para validação
- **OpenAPI/Swagger** para documentação

### Infrastructure
- **Docker** + **Docker Compose** para desenvolvimento
- **GitHub Actions** para CI/CD
- **Nginx** como reverse proxy
- **Turborepo** para monorepo management

## 📁 Estrutura do Projeto

```
letterbookxd/
├── apps/
│   ├── web/              # Frontend Vue 3
│   ├── api-gateway/      # API Gateway (Node.js)
│   ├── auth-service/     # Serviço de Autenticação (Go) - TODO
│   ├── movies-service/   # Serviço de Filmes (Java) - TODO
│   └── reviews-service/  # Serviço de Reviews (Node.js) - TODO
├── packages/
│   ├── shared-types/     # Types TypeScript compartilhados
│   ├── shared-ui/        # Componentes UI compartilhados - TODO
│   ├── config/           # Configuração centralizada
│   └── database/         # Migrations e seeds - TODO
├── docker/
│   ├── mysql/            # Scripts de inicialização MySQL
│   └── nginx/            # Configuração Nginx
├── .github/workflows/    # CI/CD GitHub Actions
├── turbo.json            # Configuração Turborepo
├── docker-compose.yml    # Orquestração local
└── package.json          # Workspace root
```

## 🛠️ Desenvolvimento Local

### Pré-requisitos
- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

### Início Rápido

```bash
# Clone o repositório
git clone https://github.com/Mankeya/LetterBookXD.git
cd LetterBookXD

# Configure variáveis de ambiente
cp .env.example .env

# Suba os containers (MySQL, Redis)
pnpm docker:up

# Instale dependências
pnpm install

# Execute em modo desenvolvimento
pnpm dev
```

### URLs de Desenvolvimento
- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8080
- **API Docs (Swagger)**: http://localhost:8080/docs
- **Health Check**: http://localhost:8080/health

## 📦 Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev              # Inicia todos os apps em modo dev
pnpm docker:up        # Sobe containers Docker
pnpm docker:down      # Para containers Docker
pnpm docker:logs      # Logs dos containers

# Build
pnpm build            # Build de todos os pacotes
pnpm build:web        # Build apenas do frontend
pnpm build:api        # Build apenas da API

# Qualidade de Código
pnpm lint             # ESLint em todos os pacotes
pnpm format           # Prettier format
pnpm typecheck        # TypeScript check

# Testes
pnpm test             # Roda todos os testes

# Banco de Dados
pnpm db:generate      # Gera cliente Prisma
pnpm db:migrate       # Roda migrations
pnpm db:seed          # Popula banco com seeds
```

## 🐳 Docker

### Desenvolvimento
```bash
docker-compose up -d
```

### Produção
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 🔐 Autenticação

A API usa JWT (JSON Web Tokens) para autenticação stateless.

### Endpoints de Auth
- `POST /auth/register` - Registro de usuário
- `POST /auth/login` - Login
- `GET /auth/me` - Perfil do usuário logado
- `PATCH /auth/me` - Atualizar perfil

### Headers
```
Authorization: Bearer <token>
```

## 📚 Documentação da API

Acesse a documentação Swagger em: http://localhost:8080/docs

### Principais Endpoints

#### Filmes
- `GET /movies` - Lista filmes com filtros
- `GET /movies/genres` - Lista gêneros
- `GET /movies/:id` - Detalhes do filme
- `POST /movies/:id/rate` - Avaliar filme

#### Reviews
- `GET /reviews` - Lista reviews
- `GET /reviews/:id` - Detalhes da review
- `POST /reviews` - Criar review
- `PATCH /reviews/:id` - Atualizar review
- `DELETE /reviews/:id` - Deletar review
- `POST /reviews/:id/like` - Curtir/Descurtir

#### Usuários
- `GET /users` - Lista usuários
- `GET /users/:username` - Perfil do usuário
- `POST /users/:username/follow` - Seguir/Deixar de seguir
- `GET /users/:username/followers` - Seguidores
- `GET /users/:username/following` - Seguindo

## 🧪 Testes

```bash
# Frontend
cd apps/web && pnpm test

# API Gateway
cd apps/api-gateway && pnpm test
```

## 📝 Variáveis de Ambiente

Veja `.env.example` para todas as variáveis necessárias.

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `DATABASE_URL` | URL de conexão MySQL | Sim |
| `REDIS_URL` | URL de conexão Redis | Sim |
| `JWT_SECRET` | Chave secreta JWT (min 32 chars) | Sim |
| `TMDB_API_KEY` | Chave API do TMDB | Sim |
| `CORS_ORIGIN` | Origin permitida para CORS | Sim |

## 🚀 Deploy

O deploy é automatizado via GitHub Actions:

1. **Push para `develop`** → Deploy automático para Staging
2. **Push para `main`** → Deploy automático para Produção
3. **Pull Requests** → Roda lint, typecheck, testes e build

### Secrets Necessários no GitHub
- `DOCKER_HUB_USERNAME` - Usuário do Docker Hub
- `DOCKER_HUB_TOKEN` - Token de acesso do Docker Hub
- `VITE_API_URL` - URL da API para o frontend

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-feature`
3. Commit suas mudanças: `git commit -m 'feat: adiciona nova feature'`
4. Push para a branch: `git push origin feature/nova-feature`
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja [LICENSE](LICENSE) para mais detalhes.

## 🙏 Agradecimentos

- [TMDB](https://www.themoviedb.org/) pela API de filmes
- [Letterboxd](https://letterboxd.com/) pela inspiração
- Comunidade open source pelas ferramentas incríveis