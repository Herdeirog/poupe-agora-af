import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Operation = 'select' | 'insert' | 'update' | 'upsert' | 'delete';
type TableName = 'profiles' | 'transactions' | 'categories' | 'goals' | 'budgets' | 'reminders' | 'user_reminders' | 'financial_commitments';

interface SyncRequest {
  profile_id: string;
  operation: Operation;
  table: TableName;
  data?: Record<string, unknown> | Record<string, unknown>[];
  filters?: { id?: string; column?: string; value?: unknown };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SyncRequest = await req.json();
    const { profile_id, operation, table, data, filters } = body;

    console.log(`[sync-user-data] ${operation} on ${table} for user ${profile_id}`);

    // Validate required fields
    if (!profile_id || !operation || !table) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: profile_id, operation, table' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate table name
    const validTables: TableName[] = ['profiles', 'transactions', 'categories', 'goals', 'budgets', 'reminders', 'user_reminders', 'financial_commitments'];
    if (!validTables.includes(table)) {
      return new Response(
        JSON.stringify({ error: `Invalid table: ${table}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service_role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let result: unknown = null;
    let error: unknown = null;

    switch (operation) {
      case 'select': {
        let query = supabase.from(table).select('*');
        
        // For user-specific tables, filter by user_id or id (for profiles)
        if (table === 'profiles') {
          query = query.eq('id', profile_id);
        } else {
          query = query.eq('user_id', profile_id);
        }
        
        // Apply additional filters
        if (filters?.id) {
          query = query.eq('id', filters.id);
        }
        if (filters?.column && filters?.value !== undefined) {
          query = query.eq(filters.column, filters.value);
        }
        
        const response = await query;
        result = response.data;
        error = response.error;
        break;
      }

      case 'insert': {
        if (!data) {
          return new Response(
            JSON.stringify({ error: 'Data required for insert' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Ensure user_id is set for non-profile tables
        const insertData = Array.isArray(data) 
          ? data.map(d => table === 'profiles' ? { ...d, id: profile_id } : { ...d, user_id: profile_id })
          : table === 'profiles' ? { ...data, id: profile_id } : { ...data, user_id: profile_id };

        const response = await supabase.from(table).insert(insertData).select();
        result = response.data;
        error = response.error;
        break;
      }

      case 'update': {
        if (!data || !filters?.id) {
          return new Response(
            JSON.stringify({ error: 'Data and filters.id required for update' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Security: ensure we're only updating records belonging to this user
        let query = supabase.from(table).update(data).eq('id', filters.id);
        if (table === 'profiles') {
          query = query.eq('id', profile_id);
        } else {
          query = query.eq('user_id', profile_id);
        }

        const response = await query.select();
        result = response.data;
        error = response.error;
        break;
      }

      case 'upsert': {
        if (!data) {
          return new Response(
            JSON.stringify({ error: 'Data required for upsert' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Add user reference
        const upsertData = table === 'profiles' 
          ? { ...data, id: profile_id }
          : { ...data, user_id: profile_id };

        const onConflictColumn = table === 'profiles' ? 'id' : 'user_id';
        const response = await supabase.from(table).upsert(upsertData, { onConflict: onConflictColumn }).select();
        result = response.data;
        error = response.error;
        break;
      }

      case 'delete': {
        if (!filters?.id) {
          return new Response(
            JSON.stringify({ error: 'filters.id required for delete' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Security: ensure we're only deleting records belonging to this user
        let query = supabase.from(table).delete().eq('id', filters.id);
        if (table === 'profiles') {
          query = query.eq('id', profile_id);
        } else {
          query = query.eq('user_id', profile_id);
        }

        const response = await query.select();
        result = response.data;
        error = response.error;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Invalid operation: ${operation}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (error) {
      console.error(`[sync-user-data] Error:`, error);
      return new Response(
        JSON.stringify({ error: (error as Error).message || 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-user-data] Success:`, result);
    return new Response(
      JSON.stringify({ data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[sync-user-data] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
