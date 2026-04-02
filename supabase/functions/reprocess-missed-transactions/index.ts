import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReprocessRequest {
  target_user_id: string;
  start_at?: string; // ISO date
  end_at?: string; // ISO date  
  dry_run?: boolean; // Default true
}

interface ExtractedTransaction {
  description: string;
  amount: number;
  type: "income" | "expense";
  original_message: string;
  message_date: string;
}

// Heuristic to detect if message looks like a financial transaction
function looksLikeTransaction(message: string): { isTransaction: boolean; type: 'income' | 'expense' | null } {
  const lowerMessage = message.toLowerCase();
  
  const incomeKeywords = ['recebi', 'ganhei', 'entrou', 'salário', 'salario', 'freela', 'freelance', 'venda', 'vendi', 'transferência recebida', 'pix recebido', 'depósito', 'deposito', 'rendimento', 'lucro'];
  const expenseKeywords = ['gastei', 'paguei', 'comprei', 'custo', 'despesa', 'conta', 'boleto', 'parcela', 'pix enviado', 'transferi', 'débito', 'debito', 'saiu', 'gastar'];
  
  const hasAmount = /\d+([.,]\d+)?/.test(message) || /r\$\s*\d/i.test(message);
  
  if (!hasAmount) {
    return { isTransaction: false, type: null };
  }
  
  const hasIncomeKeyword = incomeKeywords.some(k => lowerMessage.includes(k));
  const hasExpenseKeyword = expenseKeywords.some(k => lowerMessage.includes(k));
  
  if (hasIncomeKeyword && !hasExpenseKeyword) {
    return { isTransaction: true, type: 'income' };
  }
  
  if (hasExpenseKeyword && !hasIncomeKeyword) {
    return { isTransaction: true, type: 'expense' };
  }
  
  if (hasIncomeKeyword || hasExpenseKeyword) {
    return { isTransaction: true, type: null };
  }
  
  return { isTransaction: false, type: null };
}

// Extract amount from message
function extractAmount(message: string): number | null {
  // Try R$ format first: R$ 35.800, R$ 35800, R$35.800,00
  const rFormat = message.match(/r\$\s*([\d.,]+)/i);
  if (rFormat) {
    return parseAmount(rFormat[1]);
  }
  
  // Try standalone numbers with context
  const numbers = message.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+(?:[.,]\d+)?)/g);
  if (numbers) {
    // Find the largest reasonable number (likely the transaction amount)
    let maxAmount = 0;
    for (const num of numbers) {
      const parsed = parseAmount(num);
      if (parsed && parsed > maxAmount && parsed < 10000000) { // Max 10 million
        maxAmount = parsed;
      }
    }
    if (maxAmount > 0) return maxAmount;
  }
  
  return null;
}

function parseAmount(str: string): number | null {
  if (!str) return null;
  
  // Normalize: 35.800,00 -> 35800.00 or 35,800.00 -> 35800.00
  let normalized = str.replace(/\s/g, '');
  
  // Check if it uses comma as decimal separator (Brazilian format)
  if (/\.\d{3}/.test(normalized) && /,\d{2}$/.test(normalized)) {
    // Format: 35.800,00 -> 35800.00
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (/,\d{3}/.test(normalized)) {
    // Format: 35,800.00 (US format)
    normalized = normalized.replace(/,/g, '');
  } else if (/,\d{2}$/.test(normalized)) {
    // Format: 35800,00 -> 35800.00
    normalized = normalized.replace(',', '.');
  } else if (/,\d{1}$/.test(normalized)) {
    // Format: 35800,5 -> 35800.5
    normalized = normalized.replace(',', '.');
  } else {
    // Just remove all commas and dots except the last one if it's a decimal
    const lastDot = normalized.lastIndexOf('.');
    const lastComma = normalized.lastIndexOf(',');
    
    if (lastComma > lastDot && normalized.length - lastComma <= 3) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma && normalized.length - lastDot <= 3) {
      normalized = normalized.replace(/,/g, '');
    } else {
      normalized = normalized.replace(/[.,]/g, '');
    }
  }
  
  const result = parseFloat(normalized);
  return isNaN(result) ? null : result;
}

// Extract description from message
function extractDescription(message: string): string {
  // Remove amount patterns
  let desc = message
    .replace(/r\$\s*[\d.,]+/gi, '')
    .replace(/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?/g, '')
    .replace(/\d+(?:[.,]\d+)?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Remove common transaction keywords for cleaner description
  const removeWords = ['recebi', 'ganhei', 'gastei', 'paguei', 'comprei', 'de', 'do', 'da', 'no', 'na', 'com', 'em', 'por', 'para'];
  const words = desc.split(' ').filter(w => !removeWords.includes(w.toLowerCase()) && w.length > 2);
  
  desc = words.slice(0, 5).join(' '); // Take first 5 meaningful words
  
  return desc.length > 3 ? desc : message.slice(0, 50);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Auth check: require admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if admin
    const { data: adminCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminCheck) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ReprocessRequest = await req.json();
    const { target_user_id, start_at, end_at, dry_run = true } = body;

    if (!target_user_id) {
      return new Response(JSON.stringify({ error: "target_user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Reprocess] Starting for user ${target_user_id}, dry_run=${dry_run}`);

    // Get user messages from conversation buffer
    let query = supabase
      .from("conversation_buffer")
      .select("*")
      .eq("user_id", target_user_id)
      .eq("role", "user")
      .order("created_at", { ascending: true });

    if (start_at) {
      query = query.gte("created_at", start_at);
    }
    if (end_at) {
      query = query.lte("created_at", end_at);
    }

    const { data: messages, error: messagesError } = await query.limit(500);

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      throw new Error("Failed to fetch conversation buffer");
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "No messages found in the specified period",
        found: 0,
        extracted: [],
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Reprocess] Found ${messages.length} user messages`);

    // Filter messages that look like transactions
    const potentialTransactions: ExtractedTransaction[] = [];

    for (const msg of messages) {
      const check = looksLikeTransaction(msg.content);
      if (!check.isTransaction) continue;

      const amount = extractAmount(msg.content);
      if (!amount || amount <= 0) continue;

      const description = extractDescription(msg.content);
      const type = check.type || "expense";

      potentialTransactions.push({
        description,
        amount,
        type,
        original_message: msg.content,
        message_date: msg.created_at,
      });
    }

    console.log(`[Reprocess] Identified ${potentialTransactions.length} potential transactions`);

    // Check existing transactions to avoid duplicates
    const { data: existingTransactions } = await supabase
      .from("transactions")
      .select("amount, description, date, created_at")
      .eq("user_id", target_user_id)
      .eq("origin", "whatsapp");

    const existingSet = new Set(
      (existingTransactions || []).map(t => `${t.amount}:${t.date}`)
    );

    // Filter out already existing transactions
    const toInsert: ExtractedTransaction[] = [];
    const skipped: Array<{ reason: string; transaction: ExtractedTransaction }> = [];

    for (const tx of potentialTransactions) {
      const txDate = tx.message_date.split("T")[0];
      const key = `${tx.amount}:${txDate}`;
      
      if (existingSet.has(key)) {
        skipped.push({ reason: "Already exists", transaction: tx });
      } else {
        toInsert.push(tx);
        existingSet.add(key); // Prevent duplicates within same batch
      }
    }

    console.log(`[Reprocess] To insert: ${toInsert.length}, Skipped: ${skipped.length}`);

    let inserted: ExtractedTransaction[] = [];
    let errors: Array<{ transaction: ExtractedTransaction; error: string }> = [];

    if (!dry_run && toInsert.length > 0) {
      for (const tx of toInsert) {
        const { error: insertError } = await supabase
          .from("transactions")
          .insert({
            user_id: target_user_id,
            amount: tx.amount,
            type: tx.type,
            description: tx.description,
            date: tx.message_date.split("T")[0],
            origin: "whatsapp",
          });

        if (insertError) {
          console.error("Insert error:", insertError);
          errors.push({ transaction: tx, error: insertError.message });
        } else {
          inserted.push(tx);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      dry_run,
      found: messages.length,
      identified: potentialTransactions.length,
      to_insert: toInsert.length,
      skipped: skipped.length,
      inserted: inserted.length,
      errors: errors.length,
      details: {
        to_insert: toInsert,
        skipped,
        inserted: dry_run ? [] : inserted,
        errors: dry_run ? [] : errors,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Reprocess error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
