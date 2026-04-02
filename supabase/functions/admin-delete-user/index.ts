import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
  userId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Validate caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !caller) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is admin
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const isAdmin = callerRoles?.some(r => r.role === "admin");
    
    // Also check is_admin flag in profiles as fallback
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", caller.id)
      .single();

    if (!isAdmin && !callerProfile?.is_admin) {
      console.error("User is not admin:", caller.id);
      return new Response(
        JSON.stringify({ success: false, error: "Acesso negado. Apenas administradores podem excluir usuários." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: DeleteUserRequest = await req.json();
    const { userId } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "ID do usuário é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${caller.email} deleting user ${userId}`);

    // Prevent self-deletion
    if (userId === caller.id) {
      return new Response(
        JSON.stringify({ success: false, error: "Você não pode excluir sua própria conta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete related data in correct order (avoid FK violations)
    const deletionResults: Record<string, { deleted: boolean; error?: string }> = {};

    // 1. Delete transactions
    const { error: txError } = await supabaseAdmin
      .from("transactions")
      .delete()
      .eq("user_id", userId);
    deletionResults.transactions = { deleted: !txError, error: txError?.message };
    if (txError) console.warn("Error deleting transactions:", txError);

    // 2. Delete goals
    const { error: goalsError } = await supabaseAdmin
      .from("goals")
      .delete()
      .eq("user_id", userId);
    deletionResults.goals = { deleted: !goalsError, error: goalsError?.message };
    if (goalsError) console.warn("Error deleting goals:", goalsError);

    // 3. Delete reminders
    const { error: remindersError } = await supabaseAdmin
      .from("reminders")
      .delete()
      .eq("user_id", userId);
    deletionResults.reminders = { deleted: !remindersError, error: remindersError?.message };
    if (remindersError) console.warn("Error deleting reminders:", remindersError);

    // 4. Delete budgets
    const { error: budgetsError } = await supabaseAdmin
      .from("budgets")
      .delete()
      .eq("user_id", userId);
    deletionResults.budgets = { deleted: !budgetsError, error: budgetsError?.message };
    if (budgetsError) console.warn("Error deleting budgets:", budgetsError);

    // 5. Delete subscriptions
    const { error: subsError } = await supabaseAdmin
      .from("subscriptions")
      .delete()
      .eq("user_id", userId);
    deletionResults.subscriptions = { deleted: !subsError, error: subsError?.message };
    if (subsError) console.warn("Error deleting subscriptions:", subsError);

    // 6. Delete user_roles
    const { error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    deletionResults.user_roles = { deleted: !rolesError, error: rolesError?.message };
    if (rolesError) console.warn("Error deleting user_roles:", rolesError);

    // 7. Delete categories created by user
    const { error: categoriesError } = await supabaseAdmin
      .from("categories")
      .delete()
      .eq("user_id", userId);
    deletionResults.categories = { deleted: !categoriesError, error: categoriesError?.message };
    if (categoriesError) console.warn("Error deleting categories:", categoriesError);

    // 8. Delete conversation_buffer
    const { error: bufferError } = await supabaseAdmin
      .from("conversation_buffer")
      .delete()
      .eq("user_id", userId);
    deletionResults.conversation_buffer = { deleted: !bufferError, error: bufferError?.message };
    if (bufferError) console.warn("Error deleting conversation_buffer:", bufferError);

    // 9. Delete agent_runs
    const { error: runsError } = await supabaseAdmin
      .from("agent_runs")
      .delete()
      .eq("user_id", userId);
    deletionResults.agent_runs = { deleted: !runsError, error: runsError?.message };
    if (runsError) console.warn("Error deleting agent_runs:", runsError);

    // 10. Delete inbound_messages
    const { error: inboundError } = await supabaseAdmin
      .from("inbound_messages")
      .delete()
      .eq("user_id", userId);
    deletionResults.inbound_messages = { deleted: !inboundError, error: inboundError?.message };
    if (inboundError) console.warn("Error deleting inbound_messages:", inboundError);

    // 11. Delete message_queue
    const { error: queueError } = await supabaseAdmin
      .from("message_queue")
      .delete()
      .eq("user_id", userId);
    deletionResults.message_queue = { deleted: !queueError, error: queueError?.message };
    if (queueError) console.warn("Error deleting message_queue:", queueError);

    // 12. Delete processing_locks
    const { error: locksError } = await supabaseAdmin
      .from("processing_locks")
      .delete()
      .eq("user_id", userId);
    deletionResults.processing_locks = { deleted: !locksError, error: locksError?.message };
    if (locksError) console.warn("Error deleting processing_locks:", locksError);

    // 13. Delete profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);
    deletionResults.profiles = { deleted: !profileError, error: profileError?.message };
    if (profileError) {
      console.error("Error deleting profile:", profileError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro ao excluir perfil: ${profileError.message}`,
          deletionResults 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 14. Delete from auth.users (CRITICAL - this is what actually removes the user)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    deletionResults.auth_users = { deleted: !authDeleteError, error: authDeleteError?.message };

    if (authDeleteError) {
      console.error("Error deleting from auth.users:", authDeleteError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro ao excluir autenticação: ${authDeleteError.message}`,
          deletionResults 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${userId} deleted successfully by admin ${caller.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Usuário excluído permanentemente",
        deletionResults 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro inesperado" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
