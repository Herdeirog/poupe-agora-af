import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge Function: seed-admin
 * 
 * Cria o usuário admin inicial e dados de teste após a migração do banco.
 * 
 * USO:
 *   curl -X POST https://<project>.supabase.co/functions/v1/seed-admin \
 *     -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"admin_email":"admin@empresa.com","admin_password":"SenhaForte@123","admin_name":"Administrador"}'
 * 
 * Parâmetros opcionais:
 *   - create_test_user: boolean (default: true) - Cria usuário de teste
 *   - test_email: string (default: "cliente@teste.com")
 *   - test_password: string (default: "Cliente@123")
 *   - test_name: string (default: "Cliente Teste")
 */

interface SeedRequest {
  admin_email: string;
  admin_password: string;
  admin_name?: string;
  create_test_user?: boolean;
  test_email?: string;
  test_password?: string;
  test_name?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verificar se a requisição usa service_role key
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.includes(serviceRoleKey)) {
      // Permitir também via apikey header
      const apiKey = req.headers.get("apikey");
      if (apiKey !== serviceRoleKey) {
        return new Response(
          JSON.stringify({ success: false, error: "Esta função requer a chave service_role. Use: Authorization: Bearer <SERVICE_ROLE_KEY>" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const body: SeedRequest = await req.json();

    // Validação
    if (!body.admin_email || !body.admin_password) {
      return new Response(
        JSON.stringify({ success: false, error: "admin_email e admin_password são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.admin_password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: "A senha deve ter no mínimo 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: Record<string, unknown>[] = [];

    // =========================================================
    // 1. CRIAR USUÁRIO ADMIN
    // =========================================================
    console.log(`[seed-admin] Criando admin: ${body.admin_email}`);

    const adminResult = await createUserWithRole(supabase, {
      email: body.admin_email,
      password: body.admin_password,
      name: body.admin_name || "Administrador",
      role: "admin",
    });
    results.push({ type: "admin", ...adminResult });

    // =========================================================
    // 2. CRIAR USUÁRIO DE TESTE (opcional)
    // =========================================================
    if (body.create_test_user !== false) {
      const testEmail = body.test_email || "cliente@teste.com";
      const testPassword = body.test_password || "Cliente@123";
      const testName = body.test_name || "Cliente Teste";

      console.log(`[seed-admin] Criando usuário de teste: ${testEmail}`);

      const testResult = await createUserWithRole(supabase, {
        email: testEmail,
        password: testPassword,
        name: testName,
        role: "user",
      });
      results.push({ type: "test_user", ...testResult });
    }

    // =========================================================
    // 3. VERIFICAR SEED DATA
    // =========================================================
    const checks: Record<string, unknown> = {};

    // Verificar categorias
    const { count: catCount } = await supabase
      .from("categories")
      .select("*", { count: "exact", head: true })
      .is("user_id", null);
    checks.system_categories = catCount || 0;

    // Verificar agentes
    const { count: agentCount } = await supabase
      .from("agents")
      .select("*", { count: "exact", head: true });
    checks.agents = agentCount || 0;

    // Verificar planos (pode não existir se tabela não foi criada)
    try {
      const { count: planCount } = await supabase
        .from("plans")
        .select("*", { count: "exact", head: true });
      checks.plans = planCount || 0;
    } catch {
      checks.plans = "tabela não encontrada";
    }

    // Verificar Evolution config
    const { count: evoCount } = await supabase
      .from("integration_evolution")
      .select("*", { count: "exact", head: true });
    checks.evolution_config = evoCount || 0;

    console.log("[seed-admin] Verificações de seed data:", checks);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Seed executado com sucesso!",
        results,
        seed_data: checks,
        next_steps: [
          "1. Configure as variáveis de ambiente no .env (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)",
          "2. Configure os secrets das Edge Functions no Supabase Dashboard",
          "3. Execute npm install && npm run dev",
          `4. Acesse /auth e faça login com ${body.admin_email}`,
        ],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[seed-admin] Erro:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro interno",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function createUserWithRole(
  supabase: ReturnType<typeof createClient>,
  opts: { email: string; password: string; name: string; role: "admin" | "user" }
) {
  // Verificar se usuário já existe
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find((u: { email?: string }) => u.email === opts.email);

  if (existing) {
    console.log(`[seed-admin] Usuário ${opts.email} já existe (${existing.id}), atualizando...`);

    // Atualizar senha e confirmar email
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password: opts.password,
      email_confirm: true,
    });

    if (updateError) {
      return { email: opts.email, status: "error", error: updateError.message };
    }

    // Garantir profile
    await supabase.from("profiles").upsert(
      {
        id: existing.id,
        email: opts.email,
        full_name: opts.name,
        ativo: true,
        is_admin: opts.role === "admin",
      },
      { onConflict: "id" }
    );

    // Garantir role
    if (opts.role === "admin") {
      await supabase
        .from("user_roles")
        .upsert({ user_id: existing.id, role: "admin" }, { onConflict: "user_id,role" });
    }

    return { email: opts.email, status: "updated", id: existing.id };
  }

  // Criar novo usuário
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: opts.email,
    password: opts.password,
    email_confirm: true,
    user_metadata: { full_name: opts.name },
  });

  if (createError) {
    return { email: opts.email, status: "error", error: createError.message };
  }

  const userId = newUser.user.id;

  // Profile é criado pelo trigger handle_new_user, mas garantir dados extras
  await supabase.from("profiles").upsert(
    {
      id: userId,
      email: opts.email,
      full_name: opts.name,
      ativo: true,
      is_admin: opts.role === "admin",
    },
    { onConflict: "id" }
  );

  // Adicionar role admin
  if (opts.role === "admin") {
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });

    if (roleError) {
      console.warn(`[seed-admin] Erro ao criar role admin (não fatal):`, roleError.message);
    }
  }

  return { email: opts.email, status: "created", id: userId };
}
