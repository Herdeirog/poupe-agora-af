# Etapa 05 - Clonar e Configurar o Projeto

## 5.1 Clonar o Repositorio

Abra o terminal e execute:

```bash
git clone https://github.com/pjcriativo/poupe-agora-4.0.git
cd poupe-agora-4.0
```

## 5.2 Instalar Dependencias

```bash
npm install
```

> Aguarde a instalacao (pode levar 1-2 minutos).

## 5.3 Criar Arquivo de Ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```bash
# Windows (PowerShell)
New-Item .env.local

# Linux/Mac
touch .env.local
```

Abra o arquivo e adicione (substituindo pelos seus valores da Etapa 01):

```env
VITE_SUPABASE_URL=https://SEU-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

**Exemplo real:**

```env
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **IMPORTANTE:** O arquivo `.env.local` nao deve ser commitado no Git (ja esta no `.gitignore`).

## 5.4 Iniciar o Servidor de Desenvolvimento

```bash
npm run dev
```

O servidor vai iniciar:

```
  VITE v5.4.19  ready in 250 ms

  > Local:   http://localhost:8080/
  > Network: http://192.168.x.x:8080/
```

## 5.5 Testar o Login

1. Abra o navegador em **http://localhost:8080**
2. Voce vera a pagina de login
3. Digite o email e senha do admin (criado na Etapa 03)
4. Clique em **Entrar**

```
+------------------------------------------+
|          Poupe Agora                     |
|                                          |
|  Email:                                  |
|  [admin@seudominio.com.br]              |
|                                          |
|  Senha:                                  |
|  [**************]                        |
|                                          |
|        [ Entrar ]                        |
|                                          |
+------------------------------------------+
```

5. Se o login for bem-sucedido, voce sera redirecionado para o **painel admin** (`/admin`)

## 5.6 Possivel Problema: "Email ou senha incorretos"

Se o login falhar:

1. Verifique se o `.env.local` tem a URL e key corretas
2. Verifique se o email e senha estao corretos
3. Reinicie o servidor (`Ctrl+C` e `npm run dev` novamente)
4. Limpe o cache do navegador (Ctrl+Shift+Delete)

---

Proximo: [06 - Deploy Edge Functions](06-deploy-edge-functions.md)
