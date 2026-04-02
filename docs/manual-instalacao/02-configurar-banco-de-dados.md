# Etapa 02 - Configurar Banco de Dados

## 2.1 Abrir o SQL Editor

1. No Dashboard do Supabase, clique em **SQL Editor** (menu lateral)
2. Clique em **New Query**

```
+------------------------------------------+
|  SQL Editor                              |
|                                          |
|  [+ New Query]  <-- Clique aqui         |
|                                          |
+------------------------------------------+
```

## 2.2 Executar o Script de Instalacao

1. Abra o arquivo `docs/DATABASE_SETUP.sql` do projeto
2. Copie **TODO** o conteudo (Ctrl+A, Ctrl+C)
3. Cole no SQL Editor do Supabase (Ctrl+V)
4. Clique em **Run** (ou Ctrl+Enter)

```
+------------------------------------------+
|  SQL Editor                              |
|                                          |
|  -- POUPE AGORA 4.0 - Script...        |
|  CREATE EXTENSION IF NOT EXISTS pgcrypto;|
|  ...                                     |
|  (1288 linhas)                           |
|                                          |
|        [ Run ]  <-- Clique aqui         |
|                                          |
|  Result:                                 |
|  Success. No rows returned              |
|                                          |
+------------------------------------------+
```

> O script demora alguns segundos. Aguarde ate aparecer **"Success"**.

## 2.3 Verificar as Tabelas

1. Va em **Table Editor** (menu lateral)
2. Confirme que **34 tabelas** foram criadas:

```
+------------------------------------------+
|  Table Editor                            |
|                                          |
|  Tables (34):                            |
|                                          |
|  > admin_action_history                  |
|  > admin_notifications                   |
|  > agenda_events                         |
|  > agenda_recurrences                    |
|  > agent_runs                            |
|  > agents                                |
|  > budgets                               |
|  > categories                            |
|  > commitment_reminders                  |
|  > conversation_buffer                   |
|  > currency_rates                        |
|  > encrypted_secrets                     |
|  > family_action_history                 |
|  > family_members                        |
|  > family_notifications                  |
|  > family_plans                          |
|  > financial_commitments                 |
|  > global_settings                       |
|  > goal_reminders                        |
|  > goal_weeks                            |
|  > goals                                 |
|  > inbound_messages                      |
|  > integration_evolution                 |
|  > message_queue                         |
|  > plans                                 |
|  > processing_locks                      |
|  > profiles                              |
|  > recurring_payments                    |
|  > reminders                             |
|  > subscription_payments                 |
|  > subscriptions                         |
|  > transactions                          |
|  > user_reminders                        |
|  > user_roles                            |
|                                          |
+------------------------------------------+
```

> Se alguma tabela estiver faltando, execute o script novamente. Ele usa `IF NOT EXISTS` entao e seguro reexecutar.

## 2.4 Verificar Dados Iniciais

O script ja cria dados iniciais automaticamente:

| Tabela | Dados criados |
|---|---|
| `agents` | 3 agentes IA (Financeiro, Consulta, Compromissos) |
| `categories` | Categorias padrao (Alimentacao, Transporte, etc.) |
| `plans` | Planos de assinatura (Gratuito, Mensal, Anual) |
| `currency_rates` | Taxas de cambio (USD, EUR, AOA, MZN) |
| `integration_evolution` | Registro vazio (para config posterior) |

---

Proximo: [03 - Criar Usuario Admin](03-criar-usuario-admin.md)
