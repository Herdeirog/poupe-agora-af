# Guia de Deploy na Vercel - Poupe Agora

## Pré-requisitos

- Conta na [Vercel](https://vercel.com)
- Repositório Git (GitHub, GitLab ou Bitbucket)
- Projeto Supabase configurado

---

## Passo 1: Conectar Repositório

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Importe seu repositório Git
3. Selecione o repositório do Poupe Agora

---

## Passo 2: Configurar Variáveis de Ambiente

Na tela de configuração do projeto, adicione as seguintes variáveis:

### Variáveis Obrigatórias

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `VITE_SUPABASE_URL` | `https://zjqknkdtugzppquhoovx.supabase.co` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | Chave anônima do Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGci...` | Mesma chave anônima |
| `VITE_SUPABASE_PROJECT_ID` | `zjqknkdtugzppquhoovx` | ID do projeto |

### Como Adicionar

1. Vá em **Settings** > **Environment Variables**
2. Para cada variável:
   - Nome: `VITE_SUPABASE_URL`
   - Valor: cole o valor correspondente
   - Ambientes: marque **Production**, **Preview**, **Development**
3. Clique em **Save**

---

## Passo 3: Configurações de Build

A Vercel detectará automaticamente que é um projeto Vite. Verifique:

| Configuração | Valor |
|--------------|-------|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

---

## Passo 4: Deploy

1. Clique em **Deploy**
2. Aguarde o build (geralmente 1-2 minutos)
3. Acesse a URL gerada para testar

---

## Passo 5: Configurar Domínio Customizado (Opcional)

1. Vá em **Settings** > **Domains**
2. Adicione seu domínio (ex: `app.poupeagora.com.br`)
3. Configure os registros DNS conforme instruído:

### Para domínio principal:
```
Tipo: A
Nome: @
Valor: 76.76.21.21
```

### Para subdomínio:
```
Tipo: CNAME
Nome: app
Valor: cname.vercel-dns.com
```

---

## Verificação Pós-Deploy

### Checklist de Funcionamento

- [ ] Página inicial carrega corretamente
- [ ] Login/Cadastro funcionando
- [ ] Dashboard do usuário acessível após login
- [ ] Painel admin acessível para administradores
- [ ] Navegação entre páginas sem erros
- [ ] Dados do Supabase sendo carregados

### Testar Rotas

| Rota | Esperado |
|------|----------|
| `/` | Landing page |
| `/auth` | Página de login |
| `/app/dashboard` | Dashboard (requer login) |
| `/admin` | Painel admin (requer admin) |

---

## Troubleshooting

### Erro: "Variáveis de ambiente não encontradas"

- Verifique se as variáveis estão com prefixo `VITE_`
- Confirme que foram adicionadas para o ambiente correto
- Faça um novo deploy após adicionar variáveis

### Erro: Página em branco

- Verifique o console do navegador (F12)
- Confirme que as variáveis do Supabase estão corretas
- Verifique se o projeto Supabase está ativo

### Erro 404 em rotas internas

- O arquivo `vercel.json` deve ter o rewrite configurado
- Verifique se o arquivo está na raiz do projeto

### Erro de CORS

- Verifique as configurações de URL no Supabase
- Adicione o domínio da Vercel nas URLs permitidas do Supabase:
  - Supabase Dashboard > Authentication > URL Configuration
  - Adicione: `https://seu-projeto.vercel.app`

---

## Configuração do Supabase para Produção

### URLs Permitidas

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **Authentication** > **URL Configuration**
3. Adicione nas URLs permitidas:
   - `https://seu-projeto.vercel.app`
   - `https://seu-dominio-customizado.com` (se aplicável)

### Redirect URLs

Configure os redirects para autenticação:
- Site URL: `https://seu-projeto.vercel.app`
- Redirect URLs: `https://seu-projeto.vercel.app/**`

---

## Monitoramento

### Logs da Vercel

- Acesse **Deployments** > Selecione um deploy > **Functions**
- Veja logs em tempo real

### Logs do Supabase

- Acesse o Supabase Dashboard
- Vá em **Logs** para ver requisições e erros

---

## Atualizações

Para atualizar o projeto em produção:

1. Faça push das alterações para a branch principal (main/master)
2. A Vercel fará deploy automático
3. Verifique o status em **Deployments**

---

## Contato

Em caso de problemas com o deploy, verifique:
- [Documentação Vercel](https://vercel.com/docs)
- [Documentação Supabase](https://supabase.com/docs)

---

*Última atualização: Dezembro 2024*
