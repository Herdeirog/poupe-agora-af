# Poupe Agora 4.0

Sistema de Gestão Financeira Pessoal e Familiar com integração WhatsApp via IA.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Pré-requisitos](#pré-requisitos)
4. [Setup Local](#setup-local)
5. [Variáveis de Ambiente](#variáveis-de-ambiente)
6. [Secrets do Supabase](#secrets-do-supabase)
7. [Banco de Dados](#banco-de-dados)
8. [Estrutura do Projeto](#estrutura-do-projeto)
9. [Mapa de Rotas](#mapa-de-rotas)
10. [Edge Functions](#edge-functions)
11. [Modelo de Dados](#modelo-de-dados)
12. [Segurança](#segurança)
13. [Deploy](#deploy)
14. [Documentação Adicional](#documentação-adicional)

---

## Visão Geral

**Poupe Agora** é uma plataforma completa de gestão financeira que permite:

- ✅ Controle de transações (receitas e despesas) via app ou WhatsApp
- ✅ Compromissos financeiros (parcelados e recorrentes)
- ✅ Metas progressivas com acompanhamento semanal
- ✅ Lembretes automatizados via WhatsApp (Evolution API)
- ✅ Plano Família com múltiplos membros
- ✅ Agentes IA para processamento de mensagens WhatsApp
- ✅ Painel administrativo completo (usuários, assinaturas, relatórios)
- ✅ Agenda financeira com calendário
- ✅ Relatórios e análises financeiras
- ✅ Sistema de moedas configurável (BRL, USD, EUR, AOA, MZN)

### Arquitetura

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│   Frontend      │────▶│   Supabase       │────▶│  Evolution API    │
│   React/Vite    │     │   (Auth + DB +   │     │  (WhatsApp)       │
│                 │◀────│    Edge Fns)     │◀────│                   │
└─────────────────┘     └──────────────────┘     └───────────────────┘
                              │
                              ▼
                        ┌──────────────┐
                        │   OpenAI     │
                        │   (GPT-4o)   │
                        └──────────────┘
```

---

## Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Frontend** | React | 18.3+ |
| **Build** | Vite | 5.4+ |
| **Linguagem** | TypeScript | 5.8+ |
| **Estilização** | Tailwind CSS | 3.4+ |
| **Componentes** | shadcn/ui (Radix UI) | latest |
| **Gráficos** | Recharts | 2.15+ |
| **Formulários** | React Hook Form + Zod | 7.61+ / 3.25+ |
| **Roteamento** | React Router DOM | 6.30+ |
| **Estado Servidor** | TanStack React Query | 5.83+ |
| **Backend** | Supabase (PostgreSQL + Auth + Edge Functions) | - |
| **IA** | OpenAI GPT-4o-mini | - |
| **WhatsApp** | Evolution API v2 | - |
| **Deploy** | Vercel | - |

---

## Pré-requisitos

- **Node.js** 18+ (recomendado 20+) - [instalar com nvm](https://github.com/nvm-sh/nvm)
- **npm** ou **bun** como package manager
- **Projeto Supabase** criado em [supabase.com](https://supabase.com)
- **(Opcional)** Evolution API para integração WhatsApp
- **(Opcional)** Chave OpenAI para agentes IA

---

## Setup Local

```bash
# 1. Clonar o repositório
git clone <URL_DO_REPOSITÓRIO>
cd poupe-agora

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente (ver seção abaixo)
cp .env.example .env
# Edite o .env com as credenciais do seu projeto Supabase

# 4. Configurar banco de dados (ver seção "Banco de Dados")

# 5. Iniciar servidor de desenvolvimento
npm run dev
```

### Scripts Disponíveis

```bash
npm run dev      # Servidor de desenvolvimento (porta 5173)
npm run build    # Build de produção
npm run preview  # Preview do build de produção
npm run lint     # Verificação de código (ESLint)
```

---

## Variáveis de Ambiente

### Frontend (.env)

O arquivo `.env` é auto-preenchido ao conectar o projeto ao Supabase:

```env
VITE_SUPABASE_PROJECT_ID="seu-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="sua-anon-key"
VITE_SUPABASE_URL="https://seu-project-id.supabase.co"
```

> ⚠️ **Importante**: Nunca commite o `.env` com valores reais. Para Vercel, configure as variáveis no Dashboard.

---

## Secrets do Supabase

As Edge Functions precisam dos seguintes secrets configurados no Supabase Dashboard:

**Dashboard** → Settings → Edge Functions → Secrets

| Secret | Descrição | Obrigatório |
|--------|-----------|-------------|
| `SUPABASE_URL` | URL do projeto Supabase | ✅ Sim |
| `SUPABASE_ANON_KEY` | Chave anon/publishable | ✅ Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role (bypass RLS) | ✅ Sim |
| `OPENAI_API_KEY` | Chave da API OpenAI (para agentes IA) | Para WhatsApp |
| `RESEND_API_KEY` | Chave da API Resend (para emails) | Para emails |

> 💡 As chaves `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são encontradas em:
> Dashboard → Settings → API

---

## Banco de Dados

### Instalação do Zero (Novo Projeto Supabase)

O arquivo `DATABASE_SETUP.sql` contém o schema completo consolidado (34 tabelas, funções, RLS, triggers, índices e seed data).

**Opção 1 - SQL Editor (Recomendado):**
1. Crie um novo projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **SQL Editor** → New Query
3. Cole o conteúdo completo de `DATABASE_SETUP.sql`
4. Clique em **Run**
5. Verifique que todas as tabelas foram criadas em Table Editor

**Opção 2 - CLI:**
```bash
psql -h db.SEU_PROJECT_ID.supabase.co -p 5432 -U postgres -d postgres -f DATABASE_SETUP.sql
```

### Criar Usuário Admin

Após instalar o banco de dados:

1. Vá em **Authentication** → **Users** no Dashboard
2. Clique em **Add user** → **Create new user**
3. Preencha email e senha do admin
4. Copie o UUID gerado
5. Execute no SQL Editor:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('COLE_O_UUID_AQUI', 'admin');
```

### Migração de Projeto Existente

Se já tem as migrações aplicadas, **não execute** o `DATABASE_SETUP.sql`. Ele é apenas para projetos novos. As migrações em `supabase/migrations/` são o histórico incremental.

### Estrutura do DATABASE_SETUP.sql

O script está organizado em 13 seções:

| Seção | Conteúdo |
|-------|----------|
| 1 | Extensões (pgcrypto) |
| 2 | Enums (app_role) |
| 3 | Funções utilitárias (is_admin, has_role, encrypt/decrypt, etc.) |
| 4 | Tabelas (34 tabelas na ordem de dependência) |
| 5 | RLS habilitado em todas as tabelas |
| 6 | Políticas RLS (100+ policies) |
| 7 | Triggers (handle_new_user + updated_at) |
| 8 | Índices de performance (40+ índices) |
| 9 | Grants (segurança: anon restrito, authenticated controlado) |
| 10 | Realtime (transactions) |
| 11 | Storage (bucket branding) |
| 12 | Seed data (categorias, planos, agentes, moedas) |
| 13 | Instruções para admin inicial |

---

## Estrutura do Projeto

```
├── docs/
│   ├── DATABASE_SETUP.sql          # Script SQL consolidado (instalação do zero)
│   ├── BACKUP_SQL.sql              # Backup SQL completo
│   ├── DOCUMENTATION.md            # Documentação técnica detalhada
│   ├── MANUAL_USUARIO.md           # Manual do usuário final
│   ├── DEPLOY_VERCEL.md            # Guia de deploy na Vercel
│   └── fix_user_creation.sql       # Script de correção de criação de usuários
├── index.html                      # Entry point HTML
├── vite.config.ts                  # Configuração Vite
├── tailwind.config.ts              # Configuração Tailwind + design tokens
├── supabase/
│   ├── config.toml                 # Configuração das Edge Functions
│   ├── migrations/                 # Migrações incrementais do banco
│   ├── fix_user_creation.sql       # Script de correção (referência)
│   └── functions/                  # Edge Functions (Deno/TypeScript)
│       ├── admin-create-user/      # Criar usuário via admin
│       ├── admin-delete-user/      # Deletar usuário via admin
│       ├── admin-update-secret/    # Atualizar secrets criptografados
│       ├── agent-router/           # Roteador de agentes IA
│       ├── ai-engine/              # Motor de processamento IA
│       ├── delete-user-account/    # Auto-exclusão de conta
│       ├── evolution-*/            # Integração Evolution API (6 funções)
│       ├── morning-reminders/      # Lembretes matinais via WhatsApp
│       ├── queue-worker/           # Worker da fila de mensagens
│       ├── send-family-notification/ # Notificações do plano família
│       ├── send-goal-reminders/    # Lembretes de metas
│       ├── send-reminders/         # Lembretes gerais
│       ├── sync-legacy-user/       # Sincronizar usuário legado
│       ├── sync-user-data/         # Sincronizar dados do usuário
│       ├── vision-service/         # Serviço de visão (imagens)
│       ├── wa-send/                # Enviar mensagem WhatsApp
│       └── wa-webhook/             # Webhook de recebimento WhatsApp
└── src/
    ├── App.tsx                     # Componente raiz + rotas
    ├── main.tsx                    # Entry point React
    ├── index.css                   # Design tokens + Tailwind base
    ├── components/
    │   ├── admin/                  # Componentes do painel admin (20+)
    │   ├── app/                    # Componentes do app do usuário (40+)
    │   ├── auth/                   # Rotas protegidas e auth
    │   ├── landing/                # Componentes da landing page
    │   ├── onboarding/             # Tour guiado e setup wizard
    │   └── ui/                     # Componentes base shadcn (50+)
    ├── contexts/
    │   └── CurrencyContext.tsx     # Provider de moeda global
    ├── hooks/                      # 30+ custom hooks
    ├── integrations/
    │   └── supabase/
    │       ├── client.ts           # Cliente Supabase configurado
    │       └── types.ts            # Tipos gerados do schema (READ-ONLY)
    ├── lib/                        # Utilitários (utils, supabase)
    ├── pages/
    │   ├── admin/                  # 20+ páginas do admin
    │   └── app/                    # 20+ páginas do app
    ├── services/                   # 25+ serviços de dados
    └── types/                      # Definições TypeScript
```

---

## Mapa de Rotas

### Públicas

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/` | `Index` | Landing page |
| `/auth` | `Auth` | Login e cadastro |

### App (Usuário Autenticado) — `/app/*`

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/app/dashboard` | `AppDashboard` | Dashboard principal |
| `/app/transactions` | `AppTransactions` | Lista de transações |
| `/app/transactions/new` | `AppTransactionNew` | Nova transação |
| `/app/transactions/:id` | `AppTransactionDetails` | Detalhes da transação |
| `/app/transactions/:id/edit` | `AppTransactionEdit` | Editar transação |
| `/app/reminders` | `AppReminders` | Lembretes financeiros |
| `/app/agenda` | `AppAgenda` | Agenda financeira |
| `/app/goals` | `AppGoals` | Lista de metas |
| `/app/goals/new` | `AppGoalNew` | Nova meta |
| `/app/goals/progressive/new` | `AppProgressiveGoalNew` | Meta progressiva |
| `/app/goals/progressive/:id` | `AppProgressiveGoalProgress` | Progresso da meta |
| `/app/goals/:id` | `AppGoalDetails` | Detalhes da meta |
| `/app/goals/:id/edit` | `AppGoalEdit` | Editar meta |
| `/app/categories` | `AppCategories` | Categorias |
| `/app/profile` | `AppProfile` | Perfil do usuário |
| `/app/profile/edit` | `AppProfileEdit` | Editar perfil |
| `/app/plan` | `AppPlan` | Meu plano |
| `/app/settings` | `AppSettings` | Configurações |
| `/app/integrations` | `AppIntegrations` | Integrações |
| `/app/integrations/google` | `AppGoogleIntegration` | Google Calendar |
| `/app/support` | `AppSupport` | Suporte |
| `/app/calendar` | `AppCalendar` | Calendário |
| `/app/reports` | `AppReports` | Relatórios |

### Admin (Requer role 'admin') — `/admin/*`

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/admin` | `AdminDashboard` | Dashboard admin |
| `/admin/users` | `UsersPage` | Gestão de usuários |
| `/admin/users/:id` | `AdminUserDetails` | Detalhes do usuário |
| `/admin/family-plans` | `AdminFamilyPlans` | Planos família |
| `/admin/subscriptions` | `AdminSubscriptions` | Assinaturas |
| `/admin/subscriptions/dashboard` | `AdminSubscriptionsDashboard` | Dashboard assinaturas |
| `/admin/subscriptions/:id` | `AdminSubscriptionDetails` | Detalhes da assinatura |
| `/admin/transactions` | `AdminTransactions` | Transações (admin) |
| `/admin/transactions/:id` | `AdminTransactionDetails` | Detalhes (admin) |
| `/admin/notifications` | `AdminNotifications` | Notificações |
| `/admin/notifications/:id` | `AdminNotificationDetails` | Detalhes notificação |
| `/admin/reports` | `AdminReports` | Relatórios |
| `/admin/settings` | `AdminSettings` | Configurações do sistema |
| `/admin/plans` | `AdminFinance` | Planos e preços |
| `/admin/agents` | `AdminAgents` | Agentes IA |
| `/admin/agents/logs` | `AdminAgentLogs` | Logs dos agentes |
| `/admin/agents/:agentSlug` | `AdminAgentConfig` | Config do agente |
| `/admin/queue` | `AdminQueueDebug` | Debug da fila |
| `/admin/evolution` | `AdminEvolution` | Config Evolution API |
| `/admin/ai-metrics` | `AdminAIMetrics` | Métricas IA |

---

## Edge Functions

Todas as Edge Functions estão em `supabase/functions/` e são deployadas automaticamente.

| Função | JWT | Descrição |
|--------|-----|-----------|
| `admin-create-user` | ❌ | Cria usuário via admin (usa service_role) |
| `admin-delete-user` | ❌ | Deleta usuário via admin |
| `admin-update-secret` | ❌ | Atualiza secrets criptografados |
| `agent-router` | ❌ | Roteia mensagens para o agente IA correto |
| `ai-engine` | ❌ | Processa mensagens com OpenAI GPT |
| `delete-user-account` | ❌ | Auto-exclusão de conta pelo usuário |
| `evolution-connect` | ❌ | Conectar instância Evolution API |
| `evolution-health` | ❌ | Health check da Evolution API |
| `evolution-instance-create` | ❌ | Criar instância WhatsApp |
| `evolution-logout` | ❌ | Desconectar instância |
| `evolution-set-webhook` | ❌ | Configurar webhook |
| `evolution-status` | ❌ | Status da conexão WhatsApp |
| `init-test-users` | ❌ | Inicializar usuários de teste |
| `morning-reminders` | ❌ | Enviar lembretes matinais via WhatsApp |
| `queue-worker` | ❌ | Processar fila de mensagens pendentes |
| `reprocess-missed-transactions` | ❌ | Reprocessar transações perdidas |
| `send-family-notification` | ❌ | Notificações do plano família |
| `send-goal-reminders` | ❌ | Lembretes de metas semanais |
| `send-reminders` | ❌ | Lembretes gerais |
| `sync-legacy-user` | ❌ | Sincronizar usuário legado |
| `sync-user-data` | ❌ | Sincronizar dados do usuário |
| `vision-service` | ❌ | Processar imagens (recibos/notas) |
| `wa-send` | ❌ | Enviar mensagem via WhatsApp |
| `wa-webhook` | ❌ | Receber mensagens do WhatsApp |

> ⚠️ `verify_jwt = false` em todas as funções. A autenticação é feita internamente via service_role key.

---

## Modelo de Dados

### Tabelas Principais (34 tabelas)

#### Usuários e Autenticação
- `profiles` — Perfil do usuário (linked a auth.users)
- `user_roles` — Roles de usuário (admin, moderator, user)

#### Dados Financeiros
- `transactions` — Transações (receitas/despesas)
- `categories` — Categorias (sistema + personalizadas)
- `goals` — Metas financeiras (simples + progressivas)
- `goal_weeks` — Semanas de metas progressivas
- `budgets` — Orçamento mensal
- `financial_commitments` — Compromissos financeiros
- `recurring_payments` — Histórico de pagamentos recorrentes

#### Lembretes e Agenda
- `reminders` — Lembretes via WhatsApp
- `user_reminders` — Lembretes financeiros do usuário
- `commitment_reminders` — Lembretes de compromissos
- `goal_reminders` — Lembretes de metas
- `agenda_events` — Eventos de agenda
- `agenda_recurrences` — Recorrências de agenda

#### Assinaturas e Admin
- `subscriptions` — Assinaturas dos usuários
- `subscription_payments` — Histórico de pagamentos
- `plans` — Planos disponíveis
- `admin_notifications` — Notificações do admin
- `admin_action_history` — Histórico de ações admin

#### Plano Família
- `family_plans` — Planos família
- `family_members` — Membros do plano
- `family_action_history` — Histórico de ações
- `family_notifications` — Notificações família

#### Sistema de Agentes IA / WhatsApp
- `agents` — Configuração dos agentes IA
- `agent_runs` — Logs de execução dos agentes
- `conversation_buffer` — Buffer de conversação (TTL 2 dias)
- `inbound_messages` — Mensagens recebidas
- `message_queue` — Fila de processamento
- `processing_locks` — Locks de processamento

#### Configurações
- `integration_evolution` — Config da Evolution API
- `encrypted_secrets` — Secrets criptografados
- `global_settings` — Configurações globais
- `currency_rates` — Taxas de câmbio

### Diagrama de Relacionamentos Simplificado

```
auth.users ──1:1──▶ profiles
auth.users ──1:N──▶ user_roles
auth.users ──1:N──▶ transactions ──N:1──▶ categories
auth.users ──1:N──▶ goals ──1:N──▶ goal_weeks
                     goals ──1:N──▶ goal_reminders
auth.users ──1:1──▶ budgets
profiles   ──1:N──▶ reminders
auth.users ──1:N──▶ financial_commitments ──1:N──▶ recurring_payments
                     financial_commitments ──1:N──▶ commitment_reminders
profiles   ──1:N──▶ family_plans ──1:N──▶ family_members
                     family_plans ──1:N──▶ family_notifications
profiles   ──1:N──▶ conversation_buffer ──N:1──▶ agents
profiles   ──1:N──▶ inbound_messages ──1:1──▶ message_queue
```

---

## Segurança

### Row Level Security (RLS)

Todas as 34 tabelas possuem RLS habilitado. Padrões:

- **Usuários**: Acesso apenas aos próprios dados (`user_id = auth.uid()`)
- **Admins**: Acesso total via `is_admin()` (verifica `user_roles`)
- **Público**: Apenas `agents` (ativos) e `categories` (sistema) são legíveis por anon

### Hardening Aplicado

- ✅ Role `anon` restrita: sem acesso a dados sensíveis
- ✅ Função `is_admin()` usa SECURITY DEFINER (evita recursão RLS)
- ✅ Função `has_role()` usa SECURITY DEFINER
- ✅ Secrets criptografados (pgcrypto) — sem SELECT público
- ✅ Trigger `handle_new_user()` cria perfil automaticamente
- ✅ `delete_user_account()` limpa dados em cascata

### Roles de Usuário

Roles são gerenciadas na tabela `user_roles` (separada de `profiles`):

| Role | Descrição |
|------|-----------|
| `admin` | Acesso total ao sistema |
| `moderator` | (Reservado para uso futuro) |
| `user` | Usuário padrão |

---

## Deploy

### Vercel

1. Conecte o repositório no [Vercel Dashboard](https://vercel.com)
2. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
3. Build settings:
   - Framework: Vite
   - Build command: `npm run build`
   - Output: `dist`
4. Adicione rewrite no `vercel.json` (já configurado)

Para instruções detalhadas, consulte [DEPLOY_VERCEL.md](./docs/DEPLOY_VERCEL.md).

### Edge Functions

As Edge Functions são deployadas automaticamente ao fazer push.

Para deploy manual via CLI:
```bash
supabase functions deploy <nome-da-funcao> --project-ref SEU_PROJECT_ID
```

---

## Documentação Adicional

| Documento | Descrição |
|-----------|-----------|
| [DOCUMENTATION.md](./docs/DOCUMENTATION.md) | Documentação técnica detalhada |
| [MANUAL_USUARIO.md](./docs/MANUAL_USUARIO.md) | Manual do usuário final |
| [DEPLOY_VERCEL.md](./docs/DEPLOY_VERCEL.md) | Guia de deploy na Vercel |
| [DATABASE_SETUP.sql](./docs/DATABASE_SETUP.sql) | Script SQL consolidado |
| [BACKUP_SQL.sql](./docs/BACKUP_SQL.sql) | Backup SQL completo |

---

## Checklist de Migração para Novo Projeto

```
□ 1. Criar projeto Supabase
□ 2. Executar DATABASE_SETUP.sql no SQL Editor
□ 3. Verificar tabelas no Table Editor (34 tabelas)
□ 4. Criar usuário admin (Authentication → Users → Add user)
□ 5. Atribuir role admin (SQL: INSERT INTO user_roles)
□ 6. Copiar Project URL e Anon Key (Settings → API)
□ 7. Configurar .env com as credenciais
□ 8. Configurar secrets das Edge Functions (Settings → Edge Functions)
□ 9. npm install && npm run dev
□ 10. Testar login com o usuário admin
□ 11. Verificar painel admin (/admin)
□ 12. (Opcional) Configurar Evolution API para WhatsApp
□ 13. (Opcional) Configurar OpenAI key para agentes IA
□ 14. Deploy na Vercel
```

---

## Licença

© 2024-2026 Poupe Agora - PJ Criativo. Todos os direitos reservados.
