import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validar formato de OpenAI API Key
function isValidOpenAIKey(key: string): boolean {
  // OpenAI keys: sk-... ou sk-proj-...
  return /^sk-[a-zA-Z0-9\-_]{32,}$/.test(key) || 
         /^sk-proj-[a-zA-Z0-9\-_]{32,}$/.test(key);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  // Criar cliente com service role para operações privilegiadas
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Extrair e validar JWT do header
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.substring(7);
    
    // 2. Verificar usuário autenticado
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Verificar se é admin via user_roles
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      // NUNCA logar informações sobre tentativas de acesso não autorizado
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Parse do body
    const { new_key, secret_name = "OPENAI_API_KEY" } = await req.json();

    // Validar que a chave foi enviada
    if (!new_key || typeof new_key !== "string" || new_key.trim() === "") {
      return new Response(JSON.stringify({ error: "Chave não fornecida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Validar formato da chave OpenAI
    if (secret_name === "OPENAI_API_KEY" && !isValidOpenAIKey(new_key)) {
      return new Response(JSON.stringify({ error: "Formato de chave inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Salvar secret criptografado via função do banco
    const { error: upsertError } = await supabaseAdmin.rpc("upsert_encrypted_secret", {
      p_key_name: secret_name,
      p_value: new_key,
    });

    if (upsertError) {
      console.error("Error updating secret"); // NUNCA logar a chave
      return new Response(JSON.stringify({ error: "Erro ao atualizar" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Retornar sucesso (NUNCA retornar a chave!)
    console.log(`Secret ${secret_name} updated by admin ${user.id}`);
    
    return new Response(JSON.stringify({ status: "updated" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    // NUNCA expor detalhes do erro
    console.error("Secret update error"); // Sem stack trace
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
