# Etapa 03 - Criar Usuario Administrador

## 3.1 Criar Usuario no Supabase Auth

1. Va em **Authentication** (menu lateral)
2. Clique em **Users**
3. Clique em **Add user** > **Create new user**

```
+------------------------------------------+
|  Create new user                         |
|                                          |
|  Email:                                  |
|  [admin@seudominio.com.br]        <--   |
|                                          |
|  Password:                               |
|  [SuaSenhaForte123!]              <--   |
|                                          |
|  [ ] Auto Confirm User                   |
|                                          |
|     [ Cancel ]  [ Create user ]          |
+------------------------------------------+
```

4. Preencha email e senha do administrador
5. Clique em **Create user**

## 3.2 Copiar o UUID do Usuario

Apos criar, o usuario aparece na lista:

```
+------------------------------------------------------------------+
|  Users                                                            |
|                                                                   |
|  Email                    | UID                    | Created      |
|  admin@seudominio.com.br | a7b3c4d5-e6f7-...     | just now     |
|                           |  ^^^^^^^^^^^^^^^^                     |
|                           |  Copie este UUID!                     |
+------------------------------------------------------------------+
```

1. Clique no usuario para ver os detalhes
2. Copie o **User UID** (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

## 3.3 Atribuir Role de Admin

1. Va em **SQL Editor**
2. Execute este SQL (substituindo o UUID):

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('COLE_O_UUID_AQUI', 'admin');
```

**Exemplo real:**
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('a7b3c4d5-e6f7-8901-2345-678901234567', 'admin');
```

3. Clique em **Run**
4. Deve aparecer: **Success. No rows returned**

## 3.4 Verificar

Execute este SQL para confirmar:

```sql
SELECT u.email, r.role
FROM auth.users u
JOIN public.user_roles r ON r.user_id = u.id;
```

Resultado esperado:

```
email                      | role
---------------------------+------
admin@seudominio.com.br   | admin
```

---

Proximo: [04 - Configurar Secrets](04-configurar-secrets.md)
