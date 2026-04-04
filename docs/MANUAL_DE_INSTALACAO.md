# Manual de Instalacao Completo

> **Sistema de Gestao Financeira | v2.1.0**
> Atualizado em: 2026-04-04

---

## Indice

1. [Requisitos](#1-requisitos)
2. [Criar Projeto Supabase](#2-criar-projeto-supabase)
3. [Configurar Banco de Dados](#3-configurar-banco-de-dados)
4. [Criar Usuario Admin](#4-criar-usuario-admin)
5. [Configurar Secrets](#5-configurar-secrets)
6. [Clonar e Configurar Projeto](#6-clonar-e-configurar-projeto)
7. [Deploy Edge Functions](#7-deploy-edge-functions)
8. [Deploy na Vercel](#8-deploy-na-vercel)
9. [Configurar OpenAI (Opcional)](#9-configurar-openai-opcional)
10. [Configurar WhatsApp (Opcional)](#10-configurar-whatsapp-opcional)
11. [Verificacao Final](#11-verificacao-final)
12. [Solucao de Problemas](#12-solucao-de-problemas)

---

## 1. Requisitos

Antes de comecar, voce precisa ter:

| Requisito | Versao | Obrigatorio |
|-----------|--------|:-----------:|
| Node.js | 18+ (recomendado 20+) | Sim |
| Git | Qualquer | Sim |
| npm | Incluso no Node.js | Sim |
| Conta Supabase | Gratuita funciona | Sim |
| Conta Vercel | Gratuita funciona | Sim |
| Conta OpenAI | Com creditos | Nao |
| Evolution API | Servidor proprio | Nao |

---

## 2. Criar Projeto Supabase

### 2.1 Criar conta

Acesse [supabase.com](https://supabase.com) e crie uma conta (login com GitHub e recomendado).

### 2.2 Criar projeto

1. Clique em **"New Project"**
2. Preencha:
   - **Nome:** Nome do seu projeto
   - **Database Password:** Gere uma senha forte e salve
   - **Region:** South America (Sao Paulo) - `sa-east-1`
3. Clique em **"Create new project"**
4. Aguarde ~2 minutos para o projeto ficar pronto

### 2.3 Copiar credenciais

Va em **Settings > API** e copie:

```
SUPABASE_URL       = https://xxxxxxxx.supabase.co
SUPABASE_ANON_KEY  = eyJhbGci... (chave publica)
SERVICE_ROLE_KEY   = eyJhbGci... (chave secreta - NUNCA exponha no frontend)
```

> **IMPORTANTE:** Guarde a `SERVICE_ROLE_KEY` em local seguro. Ela tem acesso total ao banco.

### 2.4 Desativar confirmacao de email

1. Va em **Authentication > Providers > Email**
2. Desative **"Confirm email"**
3. Salve

Isso permite que usuarios facam login imediatamente apos o cadastro.

---

## 3. Configurar Banco de Dados

### 3.1 Executar o script SQL

1. No Supabase Dashboard, va em **SQL Editor**
2. Clique em **"New query"**
3. Cole **TODO** o conteudo do arquivo `docs/BACKUP_SQL.sql`
4. Clique em **"Run"**

> O script cria todas as 33 tabelas, funcoes, triggers, policies, indexes e dados iniciais dentro de uma transacao (BEGIN/COMMIT). Se algo falhar, nada e aplicado.

### 3.2 Verificar criacao

Execute no SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Voce deve ver **33 tabelas**:

```
admin_action_history    family_action_history   message_queue
admin_notifications     family_members          plans
agenda_events           family_notifications    processing_locks
agenda_recurrences      family_plans            profiles
agent_runs              financial_commitments   recurring_payments
agents                  global_settings         reminders
budgets                 goal_reminders          subscription_payments
categories              goal_weeks              subscriptions
commitment_reminders    inbound_messages        transactions
conversation_buffer     integration_evolution   user_reminders
currency_rates          encrypted_secrets       user_roles
```

### 3.3 Dados iniciais criados automaticamente

| Tipo | Quantidade | Descricao |
|------|:----------:|-----------|
| Categorias | 12 | 8 despesas + 4 receitas padrao |
| Planos | 4 | Gratuito, Basico, Premium, Elite |
| Agentes IA | 4 | Financeiro, Consulta, Geral, Compromissos |
| Moedas | 5 | BRL, USD, EUR, AOA, MZN |
| Storage | 1 | Bucket `branding` (logos e favicons) |

### 3.4 Permissoes (GRANTs)

O script ja configura todas as permissoes:

| Role | Acesso |
|------|--------|
| `anon` | SELECT em `agents`, `categories`, `global_settings` |
| `authenticated` | CRUD completo em todas as tabelas de usuario |
| `service_role` | Acesso total (usado pelas Edge Functions) |

### 3.5 Storage (branding)

O bucket `branding` e criado automaticamente com as policies:

- Upload: usuarios autenticados
- Leitura: publico (para exibir logo/favicon)
- Atualizacao/Delecao: usuarios autenticados

---

## 4. Criar Usuario Admin

### 4.1 Criar usuario

No Supabase Dashboard:

1. Va em **Authentication > Users**
2. Clique em **"Add user"**
3. Preencha email e senha do administrador
4. Clique em **"Create user"**

### 4.2 Copiar UUID

Na lista de usuarios, copie o **UUID** do usuario recem-criado (coluna `UID`).

### 4.3 Atribuir role admin

Execute no SQL Editor:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('SEU-UUID-AQUI', 'admin');
```

### 4.4 Verificar

```sql
SELECT
  u.email,
  ur.role
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.role = 'admin';
```

Deve retornar o email do admin com role `admin`.

---

## 5. Configurar Secrets

### 5.1 Secrets obrigatorias

No Supabase Dashboard, va em **Edge Functions > Secrets** e verifique:

| Secret | Valor | Notas |
|--------|-------|-------|
| `SUPABASE_URL` | `https://xxx.supabase.co` | Geralmente auto-configurado |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Geralmente auto-configurado |

### 5.2 Secrets opcionais

| Secret | Valor | Quando configurar |
|--------|-------|-------------------|
| `OPENAI_API_KEY` | `sk-...` | Para ativar agentes IA |

> A `OPENAI_API_KEY` tambem pode ser configurada depois pelo painel admin (Configuracoes > Integracoes).

---

## 6. Clonar e Configurar Projeto

### 6.1 Clonar repositorio

```bash
git clone https://github.com/SEU-USUARIO/SEU-REPO.git
cd SEU-REPO
```

### 6.2 Instalar dependencias

```bash
npm install
```

### 6.3 Configurar variaveis de ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

> Use a **Anon Key** (publica), NUNCA a Service Role Key no frontend.

### 6.4 Testar localmente

```bash
npm run dev
```

Acesse `http://localhost:8080` e faca login com o admin criado na etapa 4.

---

## 7. Deploy Edge Functions

### 7.1 Instalar Supabase CLI

```bash
npm install -g supabase
```

### 7.2 Login

```bash
npx supabase login
```

Isso abre o navegador para autenticacao. Ou use token direto:

```bash
npx supabase login --token SEU_TOKEN
```

> Gere o token em: https://supabase.com/dashboard/account/tokens

### 7.3 Linkar projeto

```bash
npx supabase link --project-ref SEU_PROJECT_ID
```

O `PROJECT_ID` e a parte antes de `.supabase.co` na URL (ex: `oxyrybdblpxgyrdxykpv`).

### 7.4 Deploy de todas as funcoes

```bash
npx supabase functions deploy --no-verify-jwt
```

### 7.5 Verificar

No Dashboard, va em **Edge Functions**. Todas as funcoes devem aparecer como **"Active"**.

---

## 8. Deploy na Vercel

### 8.1 Opcao A: Via Dashboard (recomendado)

1. Acesse [vercel.com](https://vercel.com) e faca login
2. Clique em **"Import Project"**
3. Importe o repositorio Git
4. Adicione as variaveis de ambiente:

| Variavel | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` |

5. Verifique o build:
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Clique em **Deploy**

### 8.2 Opcao B: Via CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy para producao
vercel --prod
```

### 8.3 Configurar URL no Supabase

**IMPORTANTE** - Sem isso o login nao funciona em producao:

1. No Supabase Dashboard, va em **Authentication > URL Configuration**
2. Configure:
   - **Site URL:** `https://seu-dominio.vercel.app`
   - **Redirect URLs:** `https://seu-dominio.vercel.app/**`

### 8.4 Dominio personalizado (opcional)

Se voce tem um dominio proprio:

1. Na Vercel, va em **Settings > Domains**
2. Adicione seu dominio
3. Configure o DNS (CNAME para `cname.vercel-dns.com`)
4. Atualize a URL no Supabase (etapa 8.3)

---

## 9. Configurar OpenAI (Opcional)

### 9.1 Obter API Key

1. Acesse [platform.openai.com](https://platform.openai.com)
2. Crie conta e adicione creditos (minimo $5)
3. Va em **API Keys** e gere uma nova chave

### 9.2 Configurar no painel

1. Acesse o sistema como admin
2. Va em **Configuracoes > Integracoes**
3. Cole a API Key no campo "OpenAI API Key"
4. Salve

### 9.3 Verificar agentes

Va em **Agentes** no painel admin. Os 4 agentes devem estar como **"Ativo"**:

| Agente | Funcao |
|--------|--------|
| Assistente Financeiro | Analise de gastos e dicas |
| Agente Consulta | Consultas ao banco de dados |
| Assistente Geral | Conversas gerais |
| Assistente Compromissos | Gestao de contas a pagar |

> Modelo utilizado: `gpt-4o-mini` (~$0.15 por 1M tokens de entrada)

---

## 10. Configurar WhatsApp (Opcional)

### 10.1 Requisitos

- Servidor com **Evolution API** rodando
- Credenciais: URL da API e API Key

### 10.2 Configurar no painel

1. Va em **Configuracoes > Integracoes**
2. Preencha:
   - URL da Evolution API
   - Nome da instancia
   - API Key
3. Salve e ative o toggle

### 10.3 Conectar WhatsApp

1. Va em **Configuracoes > WhatsApp**
2. Clique em **"Gerar QR Code"**
3. Escaneie com o WhatsApp do numero que sera usado
4. Aguarde o status mudar para **"Conectado"**

### 10.4 Configurar Webhook

Clique em **"Configurar Webhook"** (automatico) ou configure manualmente:

```
URL:    https://SEU-PROJECT-ID.supabase.co/functions/v1/wa-webhook
Evento: MESSAGES_UPSERT
Base64: Ativado
```

### 10.5 Testar

Envie uma mensagem pelo WhatsApp para o numero configurado. O agente IA deve responder automaticamente.

---

## 11. Verificacao Final

### Checklist obrigatorio

| Item | Como verificar | Status |
|------|----------------|:------:|
| Landing page carrega | Acesse a URL raiz | [ ] |
| Login funciona | Use as credenciais do admin | [ ] |
| Dashboard admin carrega | Acesse `/admin` | [ ] |
| Console sem erros | F12 > Console | [ ] |
| 33 tabelas criadas | SQL Editor (ver etapa 3.2) | [ ] |
| Categorias padrao existem | Painel > Dashboard | [ ] |
| Edge Functions ativas | Dashboard > Edge Functions | [ ] |
| Branding funciona | Configuracoes > trocar nome | [ ] |
| Cores atualizam | Configuracoes > trocar cor | [ ] |
| Logo upload funciona | Configuracoes > subir logo | [ ] |
| URL configurada no Supabase | Authentication > URL Config | [ ] |

### Checklist opcional

| Item | Como verificar | Status |
|------|----------------|:------:|
| OpenAI API Key salva | Configuracoes > Integracoes | [ ] |
| Agentes IA ativos | Agentes > status "Ativo" | [ ] |
| WhatsApp conectado | Configuracoes > WhatsApp | [ ] |
| Webhook configurado | WhatsApp > status do webhook | [ ] |
| Mensagem WhatsApp funciona | Enviar mensagem de teste | [ ] |

---

## 12. Solucao de Problemas

### "Email ou senha incorretos"

```
Causa: Credenciais incorretas ou usuario nao existe
Solucao:
  1. Verifique se o usuario existe em Authentication > Users
  2. Verifique se "Confirm email" esta desativado
  3. Verifique se .env.local aponta para o projeto correto
```

### Tela preta / loading infinito

```
Causa: Problema de permissoes no banco (GRANTs)
Solucao:
  1. Abra o SQL Editor no Supabase
  2. Execute o arquivo docs/fix_user_creation.sql
  3. Recarregue a pagina (Ctrl+Shift+R)
```

### "permission denied for table X"

```
Causa: GRANTs faltando para a role authenticated ou anon
Solucao:
  Execute no SQL Editor:

  GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
  GRANT SELECT ON public.global_settings TO anon;

  Ou execute o fix_user_creation.sql completo para aplicar todos os GRANTs.
```

### Configuracoes nao salvam / nome nao muda

```
Causa: Falta GRANT na tabela global_settings
Solucao:
  Execute no SQL Editor:

  GRANT SELECT ON public.global_settings TO anon;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_settings TO authenticated;
```

### Logo nao faz upload

```
Causa: Falta policy de storage no bucket branding
Solucao:
  Execute no SQL Editor:

  GRANT ALL ON storage.objects TO authenticated;
  GRANT ALL ON storage.buckets TO authenticated;
```

### Edge Functions retornam 404

```
Causa: Funcoes nao deployadas
Solucao:
  1. npx supabase login
  2. npx supabase link --project-ref SEU_PROJECT_ID
  3. npx supabase functions deploy --no-verify-jwt
```

### WhatsApp nao responde

```
Causa: Varias possiveis
Verificar:
  1. Toggle de integracao esta ativado?
  2. Status da conexao e "Conectado"?
  3. Webhook esta configurado?
  4. OpenAI API Key esta salva?
  5. Edge Functions estao deployadas?
  6. Logs: Dashboard > Edge Functions > wa-webhook > Logs
```

### Deploy Vercel falha

```
Causa: Variaveis de ambiente faltando
Solucao:
  1. Verifique se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estao configuradas
  2. Na Vercel: Settings > Environment Variables
  3. Redeploy: vercel --prod
```

---

## Arquitetura do Sistema

```
+------------------+     +-------------------+     +------------------+
|                  |     |                   |     |                  |
|  Frontend (Vite) | --> |   Supabase Auth   | --> |   PostgreSQL     |
|  React + TailCSS |     |   + RLS Policies  |     |   33 tabelas     |
|                  |     |                   |     |   82 policies    |
+------------------+     +-------------------+     +------------------+
        |                         |
        v                         v
+------------------+     +-------------------+
|                  |     |                   |
|  Vercel (CDN)    |     |  Edge Functions   |
|  Hospedagem      |     |  25 funcoes       |
|                  |     |  (Deno runtime)   |
+------------------+     +-------------------+
                                  |
                    +-------------+-------------+
                    |                           |
              +----------+              +----------+
              | OpenAI   |              | Evolution|
              | GPT-4o   |              | WhatsApp |
              | (agentes)|              | (bot)    |
              +----------+              +----------+
```

---

## Arquivos de Referencia

| Arquivo | Descricao |
|---------|-----------|
| `docs/BACKUP_SQL.sql` | Backup completo do banco (usar para instalacao limpa) |
| `docs/DATABASE_SETUP.sql` | Script de setup do banco (alternativa ao backup) |
| `docs/fix_user_creation.sql` | Script de correcao de permissoes e trigger |
| `vercel.json` | Configuracao de deploy Vercel |
| `.env.local` | Variaveis de ambiente (criar manualmente) |
| `.env.example` | Modelo para o .env.local |

---

> **Suporte:** Em caso de duvidas, abra uma issue no repositorio do projeto.
