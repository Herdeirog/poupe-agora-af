-- EXTENSIONS
create extension if not exists "pgcrypto";

-- ROLES
create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now()
);

insert into roles (name)
values ('admin'), ('client')
on conflict (name) do nothing;

-- TENANTS
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text default 'individual',
  created_at timestamptz default now()
);

-- PROFILES
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role_id uuid references roles(id),
  active boolean default true,
  created_at timestamptz default now()
);

-- USER_TENANTS
create table if not exists user_tenants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  is_owner boolean default false,
  created_at timestamptz default now(),
  unique (user_id, tenant_id)
);

-- RLS ENABLE
alter table profiles enable row level security;
alter table tenants enable row level security;
alter table user_tenants enable row level security;

-- ADMIN CHECK FUNCTION
create or replace function is_admin(uid uuid)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1
    from profiles p
    join roles r on r.id = p.role_id
    where p.id = uid
      and r.name = 'admin'
  );
$$;

-- PROFILES POLICIES
create policy "profiles_select_own_or_admin"
on profiles
for select
using (
  auth.uid() = id or is_admin(auth.uid())
);

create policy "profiles_update_own_or_admin"
on profiles
for update
using (
  auth.uid() = id or is_admin(auth.uid())
);

create policy "profiles_delete_admin_only"
on profiles
for delete
using (
  is_admin(auth.uid())
);

-- TENANTS POLICIES
create policy "tenants_select_by_membership_or_admin"
on tenants
for select
using (
  exists (
    select 1
    from user_tenants ut
    where ut.user_id = auth.uid()
      and ut.tenant_id = tenants.id
  )
  or is_admin(auth.uid())
);

create policy "tenants_admin_only"
on tenants
for all
using (
  is_admin(auth.uid())
);

-- USER_TENANTS POLICIES
create policy "user_tenants_select_own_or_admin"
on user_tenants
for select
using (
  user_id = auth.uid() or is_admin(auth.uid())
);

create policy "user_tenants_insert_self"
on user_tenants
for insert
with check (
  user_id = auth.uid()
);

create policy "user_tenants_admin_only"
on user_tenants
for update
using (
  is_admin(auth.uid())
);

create policy "user_tenants_admin_delete"
on user_tenants
for delete
using (
  is_admin(auth.uid())
);

-- SIGNUP TRIGGER FUNCTION
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  v_role_id uuid;
  v_tenant_id uuid;
  v_name text;
begin
  select id into v_role_id from roles where name = 'client';

  v_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.email
  );

  insert into profiles (id, full_name, role_id)
  values (new.id, v_name, v_role_id);

  insert into tenants (name)
  values (v_name)
  returning id into v_tenant_id;

  insert into user_tenants (user_id, tenant_id, is_owner)
  values (new.id, v_tenant_id, true);

  return new;
end;
$$;

-- SIGNUP TRIGGER
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function handle_new_user();
