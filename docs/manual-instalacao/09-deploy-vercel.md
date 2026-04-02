# Etapa 09 - Deploy na Vercel (Producao)

## 9.1 Criar Conta na Vercel

1. Acesse **https://vercel.com**
2. Crie uma conta (pode usar GitHub)

## 9.2 Importar o Projeto

1. No Dashboard da Vercel, clique em **Add New** > **Project**
2. Selecione **Import Git Repository**
3. Escolha o repositorio `poupe-agora-4.0`
4. Clique em **Import**

## 9.3 Configurar Variaveis de Ambiente

Antes de fazer o deploy, adicione as variaveis:

1. Na tela de import, abra **Environment Variables**
2. Adicione:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://SEU-ID.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | sua anon key |

```
+------------------------------------------+
|  Environment Variables                   |
|                                          |
|  Name:                                   |
|  [VITE_SUPABASE_URL]                    |
|                                          |
|  Value:                                  |
|  [https://abcdefgh.supabase.co]         |
|                                          |
|  [+ Add]                                 |
|                                          |
|  (Repita para VITE_SUPABASE_ANON_KEY)  |
+------------------------------------------+
```

## 9.4 Configurar Build

A Vercel deve detectar automaticamente:

| Configuracao | Valor |
|---|---|
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

> Se nao detectar, configure manualmente em **Settings** > **General**.

## 9.5 Deploy

1. Clique em **Deploy**
2. Aguarde 1-2 minutos
3. Apos o build, sua URL estara disponivel:

```
https://poupe-agora-4-0.vercel.app
```

## 9.6 Configurar URL no Supabase

**IMPORTANTE:** Para que o login funcione em producao, voce precisa registrar a URL da Vercel no Supabase.

1. Va no **Supabase Dashboard** > **Authentication** > **URL Configuration**
2. Em **Site URL**, coloque sua URL da Vercel:

```
https://poupe-agora-4-0.vercel.app
```

3. Em **Redirect URLs**, adicione:

```
https://poupe-agora-4-0.vercel.app/**
```

4. Clique em **Save**

```
+------------------------------------------+
|  URL Configuration                       |
|                                          |
|  Site URL:                               |
|  [https://poupe-agora-4-0.vercel.app]   |
|                                          |
|  Redirect URLs:                          |
|  https://poupe-agora-4-0.vercel.app/**  |
|                                          |
|        [ Save ]                          |
+------------------------------------------+
```

## 9.7 Testar em Producao

1. Acesse sua URL da Vercel
2. Faca login com o usuario admin
3. Verifique se tudo funciona normalmente

---

Proximo: [10 - Verificacao Final](10-verificacao-final.md)
