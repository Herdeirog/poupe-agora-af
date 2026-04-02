# Etapa 06 - Deploy das Edge Functions

As Edge Functions sao o backend do sistema (envio de mensagens, agentes IA, etc). Precisam ser publicadas no Supabase.

## 6.1 Instalar o Supabase CLI

```bash
npm install -g supabase
```

Verifique a instalacao:

```bash
npx supabase --version
# Deve mostrar algo como: 2.83.0
```

## 6.2 Fazer Login no Supabase CLI

### Opcao A: Login pelo navegador

```bash
npx supabase login
```

Isso abre o navegador para autenticar. Siga as instrucoes.

### Opcao B: Login com token (para ambientes sem navegador)

1. Acesse **https://supabase.com/dashboard/account/tokens**
2. Clique em **Generate new token**
3. Copie o token gerado
4. Execute:

```bash
npx supabase login --token SEU_TOKEN_AQUI
```

## 6.3 Conectar ao Projeto

```bash
cd poupe-agora-4.0
npx supabase link --project-ref SEU_PROJECT_ID
```

> Substitua `SEU_PROJECT_ID` pelo ID do seu projeto (a parte antes de `.supabase.co` na URL).

**Exemplo:**
Se sua URL e `https://abcdefgh.supabase.co`, o project-ref e `abcdefgh`.

```bash
npx supabase link --project-ref abcdefgh
```

Resultado esperado:

```
Finished supabase link.
```

## 6.4 Publicar as Edge Functions

```bash
npx supabase functions deploy --no-verify-jwt
```

> Este comando publica **todas as 25 Edge Functions** de uma vez.

Resultado esperado:

```
Deploying Function: admin-create-user
Deploying Function: admin-delete-user
Deploying Function: admin-update-secret
Deploying Function: agent-router
Deploying Function: ai-engine
...
(25 funcoes no total)
...
Deployed Functions on project abcdefgh:
admin-create-user, admin-delete-user, ...
```

## 6.5 Verificar no Dashboard

1. Va em **Edge Functions** no Supabase Dashboard
2. Clique em **Functions**
3. Confirme que as 25 funcoes aparecem na lista:

```
+------------------------------------------+
|  Functions (25)                          |
|                                          |
|  admin-create-user      | Active        |
|  admin-delete-user      | Active        |
|  admin-update-secret    | Active        |
|  agent-router           | Active        |
|  ai-engine              | Active        |
|  evolution-connect      | Active        |
|  evolution-health       | Active        |
|  init-test-users        | Active        |
|  queue-worker           | Active        |
|  vision-service         | Active        |
|  wa-send                | Active        |
|  wa-webhook             | Active        |
|  ... (e mais 13)                         |
+------------------------------------------+
```

## 6.6 Possivel Problema: "Unauthorized"

Se aparecer erro de autorizacao:

1. Verifique se fez login com a conta correta (`npx supabase projects list`)
2. O projeto deve aparecer na lista
3. Se nao aparecer, faca logout e login com a conta correta:

```bash
echo "y" | npx supabase logout
npx supabase login --token SEU_TOKEN
```

---

Proximo: [07 - Configurar OpenAI](07-configurar-openai.md)
