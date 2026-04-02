# Etapa 01 - Criar Projeto no Supabase

## 1.1 Criar Conta

1. Acesse **https://supabase.com**
2. Clique em **Start your project** (ou **Sign Up**)
3. Crie sua conta com GitHub ou email

## 1.2 Criar Novo Projeto

1. No Dashboard, clique em **New Project**
2. Preencha os campos:

```
+------------------------------------------+
|  Create a new project                    |
|                                          |
|  Organization:  [Sua Org]               |
|                                          |
|  Project name:  [poupe-agora]    <--    |
|                                          |
|  Database Password:                      |
|  [**************]  [Generate]    <--    |
|                                          |
|  Region:                                 |
|  [South America (Sao Paulo)]     <--    |
|                                          |
|        [ Create new project ]            |
+------------------------------------------+
```

> **IMPORTANTE:** Anote a senha do banco de dados em local seguro.

3. Clique em **Create new project**
4. Aguarde 3-5 minutos ate o projeto ser inicializado

## 1.3 Copiar Credenciais

Apos o projeto ser criado:

1. Va em **Settings** (icone de engrenagem no menu lateral)
2. Clique em **API**

```
+------------------------------------------+
|  API Settings                            |
|                                          |
|  Project URL:                            |
|  https://abcdefgh.supabase.co     [Copy]|
|         ^^^^^^^^                         |
|     Este e o seu Project ID              |
|                                          |
|  Project API Keys:                       |
|                                          |
|  anon (public):                          |
|  eyJhbGciOiJIUzI1NiIs...          [Copy]|
|                                          |
|  service_role (secret):                  |
|  eyJhbGciOiJIUzI1NiIs...          [Copy]|
|                                          |
+------------------------------------------+
```

3. Copie e salve estes 3 valores:

| O que copiar | Onde usar | Exemplo |
|---|---|---|
| **Project URL** | `.env.local` | `https://abcdefgh.supabase.co` |
| **anon key** | `.env.local` | `eyJhbGciOi...` |
| **service_role key** | Secrets das Edge Functions | `eyJhbGciOi...` |

> **ATENCAO:** A `service_role key` tem acesso total ao banco. **Nunca exponha ela no frontend.**

## 1.4 Desabilitar Confirmacao de Email

Para facilitar a criacao de usuarios:

1. Va em **Authentication** (menu lateral)
2. Clique em **Providers**
3. Clique em **Email**
4. Desabilite **Confirm email**

```
+------------------------------------------+
|  Email Provider                          |
|                                          |
|  Enable Email provider     [ON]         |
|                                          |
|  Confirm email             [OFF]  <--   |
|                                          |
|        [ Save ]                          |
+------------------------------------------+
```

5. Clique em **Save**

---

Proximo: [02 - Configurar Banco de Dados](02-configurar-banco-de-dados.md)
