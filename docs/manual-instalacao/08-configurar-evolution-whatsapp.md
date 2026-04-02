# Etapa 08 - Configurar WhatsApp (Evolution API)

> **Esta etapa e opcional.** A integracao WhatsApp permite que os agentes de IA respondam mensagens e que o sistema envie notificacoes automaticas.

## 8.1 Obter Credenciais da Evolution API

Voce precisa de uma instancia da Evolution API. Pode ser:
- **Evolution Cloud** (https://evolution.app) - servico gerenciado
- **Self-hosted** - instalacao propria

Anote estes dados:
- **URL da API** (ex: `https://api.seuservidor.com.br`)
- **API Key** (chave de autenticacao)

## 8.2 Configurar no Painel Admin

1. Acesse **http://localhost:8080/admin**
2. Va em **Agentes** (menu lateral)
3. Role ate a secao **"Integracao WhatsApp (Evolution API)"**

```
+--------------------------------------------------+
|  Integracao WhatsApp (Evolution API)              |
|                                                    |
|  URL da API Evolution:                             |
|  [https://api.seuservidor.com.br]          <--    |
|                                                    |
|  API Key:                                          |
|  [sua-api-key-aqui]                         <--   |
|                                                    |
|  Nome da Instancia:                                |
|  [poupe-agora]                              <--   |
|                                                    |
|  Webhook Secret (opcional):                        |
|  [                            ]                    |
|                                                    |
+--------------------------------------------------+
```

4. Preencha os 3 campos obrigatorios:
   - **URL da API Evolution** - URL completa da sua Evolution API
   - **API Key** - sua chave de autenticacao
   - **Nome da Instancia** - nome que voce quer dar (ex: `poupe-agora`)

## 8.3 Ativar a Integracao

1. Ative o toggle **"Ativar Integracao"**
2. Clique em **"Salvar Configuracoes"**

```
+--------------------------------------------------+
|  Ativar Integracao                                |
|  Quando ativo, mensagens do WhatsApp serao        |
|  processadas pelos agentes                  [ON]  |
|                                                    |
|  [ Salvar Configuracoes ]                   <--   |
|  [ Testar Conexao ]                               |
|  [ Verificar Status ]                             |
+--------------------------------------------------+
```

3. Clique em **"Testar Conexao"** para verificar se as credenciais estao corretas
4. Deve aparecer: **"Conexao com Evolution API funcionando!"**

## 8.4 Criar Instancia e Conectar WhatsApp

Na secao **"Acoes da Instancia"**:

1. Clique em **"Criar Instancia"** (se ainda nao existe)
2. Clique em **"Gerar QR Code"**

```
+--------------------------------------------------+
|  QR Code                                          |
|                                                    |
|  +------+                                          |
|  |      |  Escaneie este QR Code com o            |
|  | [QR] |  WhatsApp do numero que sera            |
|  |      |  usado pelo sistema.                    |
|  +------+                                          |
|                                                    |
|  1. Abra o WhatsApp no celular                    |
|  2. Va em Configuracoes > Aparelhos conectados    |
|  3. Clique em "Conectar aparelho"                 |
|  4. Escaneie o QR Code acima                      |
+--------------------------------------------------+
```

3. Escaneie o QR Code com o WhatsApp do numero desejado
4. Aguarde a conexao (deve mudar para **"Conectado"**)

## 8.5 Configurar o Webhook

O webhook e o que permite o sistema receber mensagens do WhatsApp.

### Opcao A: Automatico (Recomendado)

1. Clique em **"Configurar Webhook"**
2. Pronto! O webhook sera configurado automaticamente.

### Opcao B: Manual (na Evolution API)

Se preferir configurar manualmente:

1. Copie a URL do webhook que aparece na tela:

```
+--------------------------------------------------+
|  Configuracao do Webhook na Evolution API         |
|                                                    |
|  URL do Webhook:                                   |
|  https://SEU-ID.supabase.co/functions/v1/wa-webhook|
|                                           [Copiar]|
|                                                    |
|  Como configurar manualmente:                      |
|  1. Acesse a Evolution API > Configurations >     |
|     Events > Webhook                               |
|  2. Cole a URL no campo "URL"                     |
|  3. Ative "Webhook Base64"                        |
|  4. Ative o evento "MESSAGES_UPSERT"             |
|  5. Clique em Save                                |
+--------------------------------------------------+
```

2. Na Evolution API, va em **Configurations** > **Events** > **Webhook**
3. Cole a URL copiada no campo **URL**
4. Ative **"Webhook Base64"** (necessario para imagens e audio)
5. Ative o evento **MESSAGES_UPSERT**
6. Clique em **Save**

## 8.6 Testar

Envie uma mensagem de WhatsApp para o numero conectado. O agente de IA deve responder automaticamente (se a OpenAI estiver configurada na Etapa 07).

Se nao responder, verifique:
- A integracao esta ativa (toggle ligado)?
- A conexao esta como "Conectado"?
- A OpenAI API Key foi configurada?
- O webhook esta configurado?

---

Proximo: [09 - Deploy na Vercel](09-deploy-vercel.md)
