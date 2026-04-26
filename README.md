# TR Farias Express — Sistema de Gestão Logística

> Plataforma completa de gerenciamento operacional para empresas de transporte expresso, integrando OMS, TMS, WMS, controle financeiro, rastreamento em tempo real e emissão de documentos fiscais em um único sistema.

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Funcionalidades](#funcionalidades)
3. [Arquitetura Técnica](#arquitetura-técnica)
4. [Estrutura de Arquivos](#estrutura-de-arquivos)
5. [Modelo de Dados](#modelo-de-dados)
6. [Variáveis de Ambiente](#variáveis-de-ambiente)
7. [Guia de Provisionamento](#guia-de-provisionamento)
8. [Executando Localmente](#executando-localmente)
9. [Testes Automatizados](#testes-automatizados)
10. [Controle de Acesso](#controle-de-acesso)
11. [Fluxo Operacional Recomendado](#fluxo-operacional-recomendado)
12. [Decisões de Arquitetura](#decisões-de-arquitetura)

---

## Visão Geral

O **TR Farias Express** é um sistema web full-stack desenvolvido para centralizar e automatizar as operações de uma empresa de transportes expressos. O sistema cobre todo o ciclo operacional: desde o cadastro de clientes e geração de cotações até o rastreamento de entregas em tempo real, controle de armazém, gestão financeira e emissão de documentos fiscais.

A interface adota uma estética **brutalista industrial** — fundo preto sólido, tipografia condensada branca em alto contraste e divisores vermelhos vibrantes — projetada para uso intensivo em ambientes operacionais.

---

## Funcionalidades

O sistema é organizado em módulos independentes, cada um acessível pela barra lateral de navegação:

| Módulo | Rota | Descrição |
|---|---|---|
| **Dashboard** | `/` | KPIs operacionais em tempo real: pedidos, frota, receita e alertas |
| **Clientes** | `/clients` | Cadastro completo com CNPJ, contato, endereço e controle de status |
| **Pedidos (OMS)** | `/orders` | Ciclo completo do pedido: criação, rastreamento de status e histórico |
| **Transporte (TMS)** | `/transport` | Gestão de veículos, rotas e alocação de recursos |
| **Armazém (WMS)** | `/warehouse` | Controle de estoque, movimentações de entrada/saída e picking |
| **Cotação** | `/quotes` | Precificação dinâmica por peso, distância, volume e urgência |
| **Motoristas** | `/drivers` | Agenciamento, documentação, disponibilidade e histórico |
| **Rastreamento** | `/tracking` | Mapa em tempo real com Google Maps, cálculo de ETA e geofencing |
| **Financeiro** | `/financial` | Registro manual de lançamentos, contas a pagar/receber e fluxo de caixa |
| **Fiscal** | `/fiscal` | Emissão e controle de CT-e e MDF-e |
| **Relatórios** | `/reports` | Relatórios gerenciais com filtros e exportação |
| **Alertas** | `/alerts` | Notificações de eventos críticos com envio por email |

### Fluxo de Cotação → Pedido

O sistema implementa um fluxo integrado onde uma cotação pode ser convertida diretamente em pedido com um único clique:

1. Crie uma cotação vinculada a um cliente com origem, destino, peso e urgência.
2. O motor de precificação calcula o valor automaticamente.
3. Aceite a cotação (botão **ACEITAR**).
4. Converta em pedido (botão **CONVERTER EM PEDIDO**) — todos os dados são transferidos automaticamente.
5. O pedido aparece no OMS com status `PENDENTE` e histórico de origem registrado.

---

## Arquitetura Técnica

O projeto utiliza uma stack moderna e fortemente tipada de ponta a ponta:

| Camada | Tecnologia | Versão |
|---|---|---|
| **Frontend** | React | 19 |
| **Estilização** | Tailwind CSS | 4 |
| **Componentes UI** | shadcn/ui + Radix UI | — |
| **Roteamento frontend** | Wouter | 3 |
| **Backend** | Express | 4 |
| **API** | tRPC | 11 |
| **ORM** | Drizzle ORM | 0.44 |
| **Banco de dados** | MySQL / TiDB | — |
| **Autenticação** | Manus OAuth (JWT + cookies) | — |
| **Mapas** | Google Maps JavaScript API | — |
| **Testes** | Vitest | 2 |
| **Build** | Vite + esbuild | — |
| **Runtime** | Node.js | 22 |
| **Gerenciador de pacotes** | pnpm | 10 |

### Fluxo de Dados

```
Cliente (React) ──tRPC hooks──▶ /api/trpc ──▶ Express Router
                                                    │
                                              tRPC Procedures
                                                    │
                                           server/routers/*.ts
                                                    │
                                              server/db.ts
                                                    │
                                           Drizzle ORM ──▶ MySQL/TiDB
```

Toda a comunicação entre frontend e backend ocorre via **tRPC**, eliminando a necessidade de definição manual de contratos REST. Os tipos fluem de ponta a ponta: uma alteração no schema do banco reflete automaticamente nos hooks do React via inferência TypeScript.

---

## Estrutura de Arquivos

```
tr-farias-express/
│
├── client/                         # Frontend React
│   ├── index.html                  # Entry point HTML (fontes Google)
│   └── src/
│       ├── App.tsx                 # Roteamento e providers globais
│       ├── main.tsx                # Bootstrap da aplicação
│       ├── index.css               # Tema brutalista (variáveis CSS)
│       ├── const.ts                # Constantes e URL de login
│       ├── lib/
│       │   ├── trpc.ts             # Cliente tRPC tipado
│       │   └── utils.ts            # Utilitários (cn, etc.)
│       ├── components/
│       │   ├── DashboardLayout.tsx # Layout principal com sidebar
│       │   ├── Map.tsx             # Componente Google Maps (singleton)
│       │   └── ui/                 # Componentes shadcn/ui
│       ├── pages/
│       │   ├── Home.tsx            # Dashboard com KPIs
│       │   ├── Clients.tsx         # Módulo de Clientes
│       │   ├── Orders.tsx          # OMS — Gestão de Pedidos
│       │   ├── Transport.tsx       # TMS — Transporte e Rotas
│       │   ├── Warehouse.tsx       # WMS — Armazém e Estoque
│       │   ├── Quotes.tsx          # Cotação e Precificação
│       │   ├── Drivers.tsx         # Agenciamento de Motoristas
│       │   ├── Tracking.tsx        # Rastreamento em Tempo Real
│       │   ├── Financial.tsx       # Financeiro — Lançamentos Manuais
│       │   ├── Fiscal.tsx          # Documentos Fiscais (CT-e/MDF-e)
│       │   ├── Reports.tsx         # Relatórios Gerenciais
│       │   └── Alerts.tsx          # Central de Alertas
│       └── contexts/
│           └── ThemeContext.tsx    # Contexto de tema (dark/light)
│
├── server/                         # Backend Express + tRPC
│   ├── routers.ts                  # Router principal (agrega todos)
│   ├── db.ts                       # Query helpers (Drizzle)
│   ├── storage.ts                  # Helpers S3
│   ├── routers/
│   │   ├── dashboard.ts            # KPIs e métricas
│   │   ├── clients.ts              # CRUD de clientes
│   │   ├── orders.ts               # OMS — pedidos e itens
│   │   ├── drivers.ts              # Agenciamento de motoristas
│   │   ├── vehicles.ts             # Gestão de frota
│   │   ├── warehouse.ts            # WMS — estoque e movimentações
│   │   ├── quotes.ts               # Cotação + motor de precificação
│   │   ├── routes.ts               # Rotas de transporte
│   │   ├── tracking.ts             # Rastreamento, ETA e geofencing
│   │   ├── fiscal.ts               # CT-e e MDF-e
│   │   ├── financial.ts            # Lançamentos financeiros
│   │   ├── alerts.ts               # Alertas + notificação por email
│   │   ├── reports.ts              # Relatórios com filtros
│   │   └── stripe.ts               # (Reservado — não exposto na UI)
│   ├── stripe/
│   │   ├── products.ts             # Configuração de produtos Stripe
│   │   └── webhook.ts              # Handler de webhooks Stripe
│   ├── auth.logout.test.ts         # Testes de autenticação
│   ├── features.test.ts            # Testes dos módulos principais
│   └── stripe.test.ts              # Testes do módulo Stripe
│
├── drizzle/
│   ├── schema.ts                   # Definição de todas as tabelas
│   └── relations.ts                # Relações entre tabelas
│
├── shared/
│   ├── const.ts                    # Constantes compartilhadas
│   └── types.ts                    # Tipos compartilhados
│
├── drizzle.config.ts               # Configuração do Drizzle Kit
├── vite.config.ts                  # Configuração do Vite
├── vitest.config.ts                # Configuração do Vitest
├── package.json
└── todo.md                         # Histórico de funcionalidades
```

---

## Modelo de Dados

O banco de dados é composto por **16 tabelas** organizadas por domínio:

| Tabela | Domínio | Descrição |
|---|---|---|
| `users` | Auth | Usuários do sistema com papel (admin/user) |
| `clients` | OMS | Clientes com CNPJ, contato e endereço |
| `drivers` | TMS | Motoristas com CNH, categoria e disponibilidade |
| `vehicles` | TMS | Frota com placa, capacidade e status |
| `warehouses` | WMS | Armazéns com localização e capacidade |
| `inventory` | WMS | Itens de estoque com SKU e quantidades |
| `inventory_movements` | WMS | Entradas e saídas de estoque |
| `orders` | OMS | Pedidos com origem, destino, peso e valor |
| `order_items` | OMS | Itens individuais de cada pedido |
| `order_status_history` | OMS | Histórico de mudanças de status |
| `quotes` | Cotação | Cotações com precificação calculada |
| `routes` | TMS | Rotas com motorista, veículo e pontos |
| `tracking_points` | Rastreamento | Coordenadas GPS com timestamp |
| `fiscal_documents` | Fiscal | CT-e e MDF-e com chave de acesso |
| `financial_transactions` | Financeiro | Lançamentos de receitas e despesas |
| `alerts` | Alertas | Notificações operacionais com prioridade |

### Motor de Precificação

A cotação é calculada pela fórmula:

```
Preço Total = (Base + Peso × 0,45 + Distância × 1,20 + Volume × 15,00) × Multiplicador de Urgência

Multiplicadores:
  Padrão   → 1,0×
  Expresso → 1,5×
  Mesmo Dia → 2,2×
```

---

## Variáveis de Ambiente

O sistema utiliza variáveis de ambiente injetadas pela plataforma Manus. Para provisionamento próprio, configure as seguintes variáveis:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | **Sim** | String de conexão MySQL/TiDB (ex: `mysql://user:pass@host:3306/db`) |
| `JWT_SECRET` | **Sim** | Segredo para assinatura dos cookies de sessão (mínimo 32 caracteres) |
| `VITE_APP_ID` | **Sim** | ID da aplicação no Manus OAuth |
| `OAUTH_SERVER_URL` | **Sim** | URL base do servidor OAuth Manus (backend) |
| `VITE_OAUTH_PORTAL_URL` | **Sim** | URL do portal de login Manus (frontend) |
| `OWNER_OPEN_ID` | **Sim** | OpenID do proprietário (promovido a admin automaticamente) |
| `OWNER_NAME` | Não | Nome do proprietário |
| `BUILT_IN_FORGE_API_URL` | Não | URL da API interna Manus (LLM, mapas, notificações) |
| `BUILT_IN_FORGE_API_KEY` | Não | Chave de autenticação da API interna (server-side) |
| `VITE_FRONTEND_FORGE_API_KEY` | Não | Chave de autenticação da API interna (client-side) |
| `VITE_FRONTEND_FORGE_API_URL` | Não | URL da API interna para o frontend |
| `STRIPE_SECRET_KEY` | Não | Chave secreta Stripe (reservado para uso futuro) |
| `STRIPE_WEBHOOK_SECRET` | Não | Segredo do webhook Stripe |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Não | Chave pública Stripe |

> **Atenção:** Nunca commite o arquivo `.env` no repositório. Utilize variáveis de ambiente do servidor de produção ou um gerenciador de segredos como AWS Secrets Manager, Vault ou o painel de Secrets da plataforma Manus.

---

## Guia de Provisionamento

Esta seção descreve como provisionar o ambiente do zero, seja localmente para desenvolvimento ou em um servidor de produção.

### Pré-requisitos

Certifique-se de ter instalado na máquina:

| Ferramenta | Versão Mínima | Instalação |
|---|---|---|
| **Node.js** | 22.x | [nodejs.org](https://nodejs.org) |
| **pnpm** | 10.x | `npm install -g pnpm` |
| **MySQL** | 8.x | [mysql.com](https://mysql.com) ou use TiDB Cloud |
| **Git** | 2.x | [git-scm.com](https://git-scm.com) |

### 1. Clonar o Repositório

```bash
git clone https://github.com/ismaeldomingosdesousa-ctrl/tr-farias-express.git
cd tr-farias-express
```

### 2. Instalar Dependências

```bash
pnpm install
```

### 3. Configurar o Banco de Dados

#### Opção A — MySQL Local

```sql
-- Execute no MySQL como root
CREATE DATABASE tr_farias_express CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'trfarias'@'localhost' IDENTIFIED BY 'senha_segura_aqui';
GRANT ALL PRIVILEGES ON tr_farias_express.* TO 'trfarias'@'localhost';
FLUSH PRIVILEGES;
```

#### Opção B — TiDB Cloud (recomendado para produção)

1. Acesse [tidbcloud.com](https://tidbcloud.com) e crie um cluster gratuito.
2. Copie a string de conexão no formato: `mysql://user:pass@host:4000/db?ssl=true`.

### 4. Configurar Variáveis de Ambiente

Crie o arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env   # se existir, ou crie manualmente
```

Edite o `.env` com os valores do seu ambiente:

```dotenv
# Banco de dados
DATABASE_URL=mysql://trfarias:senha_segura_aqui@localhost:3306/tr_farias_express

# Autenticação
JWT_SECRET=gere_uma_string_aleatoria_de_pelo_menos_32_caracteres_aqui

# Manus OAuth (obtenha em app.manus.im)
VITE_APP_ID=seu_app_id_aqui
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://app.manus.im
OWNER_OPEN_ID=seu_open_id_aqui
OWNER_NAME=Seu Nome

# API Manus (opcional — para mapas e notificações)
BUILT_IN_FORGE_API_URL=https://forge.manus.ai/v1
BUILT_IN_FORGE_API_KEY=sua_chave_aqui
VITE_FRONTEND_FORGE_API_KEY=sua_chave_frontend_aqui
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.ai/v1
```

### 5. Executar as Migrações do Banco de Dados

O comando abaixo gera e aplica todas as migrações com base no schema definido em `drizzle/schema.ts`:

```bash
pnpm db:push
```

Este comando executa internamente `drizzle-kit generate && drizzle-kit migrate`, criando todas as 16 tabelas no banco de dados.

### 6. Iniciar o Servidor de Desenvolvimento

```bash
pnpm dev
```

O servidor estará disponível em `http://localhost:3000`. O Vite HMR (Hot Module Replacement) está ativo para o frontend.

---

## Executando Localmente

Após o provisionamento, os comandos disponíveis são:

| Comando | Descrição |
|---|---|
| `pnpm dev` | Inicia o servidor de desenvolvimento com hot reload |
| `pnpm build` | Compila o frontend (Vite) e o backend (esbuild) para produção |
| `pnpm start` | Inicia o servidor em modo produção (requer `pnpm build` antes) |
| `pnpm test` | Executa todos os testes com Vitest |
| `pnpm db:push` | Gera e aplica migrações do banco de dados |
| `pnpm check` | Verificação de tipos TypeScript sem compilar |
| `pnpm format` | Formata o código com Prettier |

### Build para Produção

```bash
# 1. Compilar
pnpm build

# 2. Iniciar em produção
NODE_ENV=production pnpm start
```

O build gera:
- `dist/` — servidor Express compilado com esbuild
- `client/dist/` — assets do frontend otimizados pelo Vite

### Deploy com Docker (opcional)

Crie um `Dockerfile` na raiz:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```bash
# Build da imagem
docker build -t tr-farias-express .

# Executar com variáveis de ambiente
docker run -p 3000:3000 \
  -e DATABASE_URL="mysql://..." \
  -e JWT_SECRET="..." \
  -e VITE_APP_ID="..." \
  tr-farias-express
```

---

## Testes Automatizados

O projeto possui **40 testes automatizados** cobrindo os módulos críticos:

```bash
pnpm test
```

| Arquivo de Teste | Testes | Cobertura |
|---|---|---|
| `server/auth.logout.test.ts` | 1 | Logout, limpeza de cookie de sessão |
| `server/features.test.ts` | 30 | Dashboard, Clientes, Pedidos, Motoristas, Veículos, Armazém, Cotação, Rastreamento (ETA + Geofencing), Alertas |
| `server/stripe.test.ts` | 9 | Checkout, Assinaturas, Histórico de Pagamentos |

Os testes utilizam mocks para isolamento de dependências externas (banco de dados, notificações, Google Maps) e são executados em modo `run` (sem watch) no CI.

---

## Controle de Acesso

O sistema implementa controle de acesso baseado em papéis (**RBAC**) com dois níveis:

| Papel | Módulos Acessíveis |
|---|---|
| `user` | Dashboard, Clientes, Pedidos, Motoristas, Armazém, Cotação, Rastreamento, Alertas |
| `admin` | Todos os módulos acima + Transporte (TMS), Financeiro, Fiscal, Relatórios |

O primeiro usuário a fazer login com o `OWNER_OPEN_ID` configurado é automaticamente promovido a `admin`. Para promover outros usuários, edite o campo `role` na tabela `users` diretamente no banco de dados:

```sql
UPDATE users SET role = 'admin' WHERE email = 'email@exemplo.com';
```

---

## Fluxo Operacional Recomendado

O fluxo sugerido para uso diário do sistema segue a sequência:

```
1. CLIENTES     → Cadastre os clientes da empresa
        ↓
2. MOTORISTAS   → Cadastre os motoristas com CNH e documentação
        ↓
3. TRANSPORTE   → Cadastre os veículos da frota
        ↓
4. COTAÇÃO      → Gere cotações para os clientes
        ↓
5. COTAÇÃO      → Aceite a cotação e converta em PEDIDO
        ↓
6. PEDIDOS      → Acompanhe o ciclo do pedido (picking → trânsito → entregue)
        ↓
7. RASTREAMENTO → Monitore a entrega no mapa com ETA em tempo real
        ↓
8. FINANCEIRO   → Registre o recebimento do frete como lançamento
        ↓
9. FISCAL       → Emita o CT-e correspondente à entrega
        ↓
10. RELATÓRIOS  → Gere relatórios gerenciais do período
```

---

## Decisões de Arquitetura

Esta seção documenta as principais decisões técnicas tomadas durante o desenvolvimento:

**tRPC em vez de REST:** A escolha por tRPC elimina a necessidade de definição manual de contratos de API e garante tipagem de ponta a ponta. Qualquer alteração no backend é imediatamente refletida no frontend via TypeScript, reduzindo erros de integração.

**Drizzle ORM em vez de Prisma:** O Drizzle foi escolhido por sua leveza, performance e compatibilidade nativa com MySQL/TiDB sem overhead de geração de cliente. O schema é definido em TypeScript puro, facilitando migrações incrementais.

**Google Maps via proxy Manus:** O componente `Map.tsx` utiliza um proxy autenticado que fornece acesso completo à API do Google Maps sem necessidade de chave própria. O carregamento do script é implementado como singleton para evitar duplicação ao navegar entre páginas.

**Autenticação via Manus OAuth:** O sistema delega toda a autenticação ao Manus OAuth, eliminando a necessidade de gerenciar senhas, tokens de refresh ou fluxos de recuperação de conta. Novos usuários são criados automaticamente no primeiro login.

**Módulo Financeiro sem integração de pagamento:** Por decisão de negócio, o módulo financeiro opera exclusivamente como registro manual de lançamentos. Pagamentos são processados fora do sistema e registrados manualmente, garantindo flexibilidade para qualquer forma de pagamento utilizada pela empresa.

**Separação de routers por domínio:** Cada módulo possui seu próprio arquivo em `server/routers/`, mantendo os arquivos abaixo de 150 linhas e facilitando manutenção e testes independentes.

---

## Licença

Este projeto é de uso privado e proprietário da **TR Farias Express**. Todos os direitos reservados.

---

*Documentação gerada em abril de 2026.*
