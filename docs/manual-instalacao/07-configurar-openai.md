# Etapa 07 - Configurar OpenAI (Agentes de IA)

> **Esta etapa e opcional.** Os agentes de IA so funcionam com uma chave da OpenAI configurada. Sem ela, o sistema funciona normalmente mas os agentes nao respondem via WhatsApp.

## 7.1 Criar Conta na OpenAI

1. Acesse **https://platform.openai.com**
2. Crie uma conta (ou faca login)
3. Adicione creditos na conta (menu Billing)

> Os agentes usam o modelo `gpt-4o-mini` que custa aproximadamente $0.15 por 1M tokens de entrada. E bastante economico.

## 7.2 Gerar API Key

1. Acesse **https://platform.openai.com/api-keys**
2. Clique em **Create new secret key**
3. De um nome (ex: "Poupe Agora")
4. Copie a chave gerada (formato `sk-...`)

```
+------------------------------------------+
|  Create new secret key                   |
|                                          |
|  Name: [Poupe Agora]                    |
|                                          |
|  Your new secret key:                    |
|  sk-proj-abc123def456...          [Copy] |
|                                          |
|  WARNING: Copie agora! Nao sera         |
|  mostrada novamente.                     |
+------------------------------------------+
```

> **IMPORTANTE:** Copie e salve a chave imediatamente. Ela nao sera mostrada novamente.

## 7.3 Configurar no Painel Admin

1. Acesse o sistema como admin: **http://localhost:8080/admin**
2. Va em **Configuracoes** (menu lateral)
3. Role ate a secao **"OpenAI API Key"**

```
+------------------------------------------+
|  OpenAI API Key                          |
|  Configure a chave de API para os        |
|  agentes de IA                           |
|                                          |
|  Seguranca: A chave atual nunca e       |
|  exibida. Preencha apenas se quiser      |
|  substituir a existente.                 |
|                                          |
|  Nova API Key:                           |
|  [sk-proj-abc123def456...]        <--   |
|                                          |
|  Formato: sk-xxxxx ou sk-proj-xxxxx      |
|                                          |
|  [ Atualizar API Key ]            <--   |
+------------------------------------------+
```

4. Cole a chave no campo **"Nova API Key"**
5. Clique em **"Atualizar API Key"**
6. Deve aparecer: **"OpenAI API Key atualizada com sucesso!"**

## 7.4 Verificar Agentes

1. Va em **Agentes** (menu lateral)
2. Confirme que os 3 agentes estao ativos:

```
+------------------------------------------+
|  Agente de Consulta        [Ativo]      |
|  gpt-4o-mini  Temp: 0.7  Max: 1024     |
|                                          |
|  Assistente de Compromissos [Ativo]     |
|  gpt-4o-mini  Temp: 0.7  Max: 1024     |
|                                          |
|  Assistente Financeiro     [Ativo]      |
|  gpt-4o-mini  Temp: 0.7  Max: 1024     |
+------------------------------------------+
```

> Os agentes so vao responder mensagens se a integracao WhatsApp tambem estiver configurada (Etapa 08).

---

Proximo: [08 - Configurar WhatsApp](08-configurar-evolution-whatsapp.md)
