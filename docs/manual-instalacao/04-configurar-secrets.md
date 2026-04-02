# Etapa 04 - Configurar Secrets das Edge Functions

As Edge Functions precisam de chaves para funcionar. Vamos configura-las.

## 4.1 Acessar a Tela de Secrets

1. Va em **Edge Functions** (menu lateral, icone de raio)
2. Clique em **Secrets**

```
+------------------------------------------+
|  Edge Function Secrets                   |
|                                          |
|  ADD OR REPLACE SECRETS                  |
|                                          |
|  Name              | Value               |
|  [CLIENT_KEY     ] | [              ]    |
|                                          |
|  [ + Add another ]                       |
|                                          |
|              [ Save ]                    |
+------------------------------------------+
```

## 4.2 Adicionar Secrets Obrigatorios

> As chaves `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` ja existem automaticamente no Supabase. Voce so precisa adicionarlas se elas **nao aparecerem** na lista de "default secrets".

Verifique se os seguintes secrets ja existem:

| Secret | Valor | Onde encontrar |
|---|---|---|
| `SUPABASE_URL` | `https://SEU-ID.supabase.co` | Settings > API > Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Settings > API > service_role |

> Esses dois geralmente ja vem configurados automaticamente. Se ja estiverem la, **pule para 4.3**.

Se **nao** existirem, adicione manualmente:

1. No campo **Name**, digite: `SUPABASE_URL`
2. No campo **Value**, cole a URL do projeto
3. Clique em **Add another**
4. Repita para `SUPABASE_SERVICE_ROLE_KEY`
5. Clique em **Save**

## 4.3 (Opcional) Adicionar OpenAI API Key

Se quiser usar os agentes de IA agora:

1. Clique em **Add another**
2. **Name:** `OPENAI_API_KEY`
3. **Value:** sua chave da OpenAI (formato `sk-...`)
4. Clique em **Save**

> Voce tambem pode configurar isso depois pelo painel admin do sistema (Etapa 07).

## 4.4 Resultado Final

Seus secrets devem ficar assim:

```
+------------------------------------------+
|  Edge Function Secrets                   |
|                                          |
|  NAME                    | UPDATED       |
|  SUPABASE_URL            | default       |
|  SUPABASE_ANON_KEY       | default       |
|  SUPABASE_SERVICE_ROLE.. | default       |
|  OPENAI_API_KEY          | just now      |
|                                          |
+------------------------------------------+
```

---

Proximo: [05 - Clonar e Configurar Projeto](05-clonar-e-configurar-projeto.md)
