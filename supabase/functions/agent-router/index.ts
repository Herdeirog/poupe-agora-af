import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AgentConfig {
  slug: string;
  name: string;
  prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  active: boolean;
  routing_keywords: string[] | null;
}

interface RouterRequest {
  userId: string;
  message: string;
  messageType?: string;
  messageId?: string;
  remoteJid?: string;
  rawPayload?: Record<string, unknown>;
}

// Heuristic to detect if message looks like a financial transaction
function looksLikeTransaction(message: string): { isTransaction: boolean; type: 'income' | 'expense' | null } {
  const lowerMessage = message.toLowerCase();
  
  // Income keywords
  const incomeKeywords = ['recebi', 'ganhei', 'entrou', 'salário', 'salario', 'freela', 'freelance', 'venda', 'vendi', 'transferência recebida', 'pix recebido', 'depósito', 'deposito', 'rendimento', 'lucro'];
  
  // Expense keywords
  const expenseKeywords = ['gastei', 'paguei', 'comprei', 'custo', 'despesa', 'conta', 'boleto', 'parcela', 'pix enviado', 'transferi', 'débito', 'debito', 'saiu', 'gastar'];
  
  // Check for numbers (amounts)
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
  
  // Both or neither - still looks like transaction if has amount + some context
  if (hasIncomeKeyword || hasExpenseKeyword) {
    return { isTransaction: true, type: null };
  }
  
  return { isTransaction: false, type: null };
}

// Check if response contains addTransacao tool call
function hasAddTransacaoToolCall(response: string): boolean {
  // More robust regex that handles multiline JSON and various formats
  const toolPattern = /\[TOOL:addTransacao:\{[\s\S]*?\}\]/i;
  return toolPattern.test(response);
}

// Generate SHA-256 hash for deduplication
async function generateInputHash(userId: string, messageId: string | undefined, message: string): Promise<string> {
  const input = `${userId}:${messageId || ''}:${message}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const pjCriativoApiKey = Deno.env.get("PJ_CRIATIVO_API_KEY");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const startTime = Date.now();
  let selectedAgentSlug = "agente_consulta"; // Default fallback

  try {
    const body: RouterRequest = await req.json();
    const { userId, message, messageType = "text", messageId, rawPayload } = body;

    if (!userId || !message) {
      return new Response(JSON.stringify({ error: "userId and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing message for user ${userId}: "${message}"`);

    // DEDUPLICATION: Check if we've already processed this exact message
    const inputHash = await generateInputHash(userId, messageId, message);
    console.log(`Input hash: ${inputHash}`);

    const { data: existingRun } = await supabase
      .from("agent_runs")
      .select("id, agent_slug, response_content")
      .eq("input_hash", inputHash)
      .eq("status", "ok")
      .maybeSingle();

    if (existingRun) {
      console.log(`Duplicate message detected (hash: ${inputHash}), returning cached response`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        agentSlug: existingRun.agent_slug,
        response: existingRun.response_content || "Mensagem já processada.",
        cached: true,
        latencyMs: Date.now() - startTime,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get all active agents
    const { data: agents, error: agentsError } = await supabase
      .from("agents")
      .select("*")
      .eq("active", true);

    if (agentsError) {
      console.error("Error fetching agents:", agentsError);
      throw new Error("Failed to fetch agents");
    }

    if (!agents || agents.length === 0) {
      throw new Error("No active agents found");
    }

    const agentConfigs = agents as AgentConfig[];
    console.log(`Found ${agentConfigs.length} active agents`);

    // 2. Route to appropriate agent based on keywords
    selectedAgentSlug = routeMessage(message, agentConfigs);
    console.log(`Routed to agent: ${selectedAgentSlug}`);

    const selectedAgent = agentConfigs.find(a => a.slug === selectedAgentSlug);
    if (!selectedAgent) {
      throw new Error(`Agent ${selectedAgentSlug} not found`);
    }

    // 3. Save user message to buffer
    await supabase.from("conversation_buffer").insert({
      user_id: userId,
      agent_slug: selectedAgentSlug,
      role: "user",
      content: message,
      message_type: messageType,
      raw_payload: rawPayload,
    });

    // 4. Get conversation context (last 10 messages)
    const { data: contextMessages } = await supabase
      .from("conversation_buffer")
      .select("role, content")
      .eq("user_id", userId)
      .eq("agent_slug", selectedAgentSlug)
      .order("created_at", { ascending: false })
      .limit(10);

    const conversationHistory = (contextMessages || [])
      .reverse()
      .map(msg => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      }));

    // 5. Build current time for context
    const currentTime = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    // 6. Call AIEngine (centralized AI service)
    let aiResponse: string;
    let aiMetrics: { tokens_in: number | null; tokens_out: number | null } = {
      tokens_in: null,
      tokens_out: null,
    };
    
    try {
      const engineResponse = await fetch(`${supabaseUrl}/functions/v1/ai-engine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          agent_id: selectedAgentSlug,
          message: message,
          context: {
            user_id: userId,
            conversation_history: conversationHistory.slice(0, -1), // Exclude current message
            current_time: currentTime,
          },
        }),
      });

      const engineResult = await engineResponse.json();
      
      if (engineResult.success) {
        aiResponse = engineResult.response;
        console.log(`AIEngine returned response from agent: ${engineResult.agent_used}`);
        
        // Extract metrics from AIEngine response
        if (engineResult.metrics) {
          aiMetrics = {
            tokens_in: engineResult.metrics.tokens_in || null,
            tokens_out: engineResult.metrics.tokens_out || null,
          };
          console.log(`AIEngine metrics: tokens_in=${aiMetrics.tokens_in}, tokens_out=${aiMetrics.tokens_out}, cost=$${engineResult.metrics.cost_usd?.toFixed(6) || 'N/A'}`);
        }
      } else {
        console.error("AIEngine returned error:", engineResult.response);
        aiResponse = engineResult.response || `Olá! Sou o ${selectedAgent.name}. No momento não consigo processar sua mensagem. Tente novamente mais tarde.`;
      }
    } catch (engineError) {
      console.error("Error calling AIEngine:", engineError);
      aiResponse = `Olá! Sou o ${selectedAgent.name}. No momento não consigo processar sua mensagem. Tente novamente mais tarde.`;
    }

    // 6.5 VERIFICATION LAYER: Check if response should have tool call but doesn't
    const transactionCheck = looksLikeTransaction(message);
    if (transactionCheck.isTransaction && !hasAddTransacaoToolCall(aiResponse)) {
      console.log(`[VERIFICATION] Message looks like ${transactionCheck.type || 'transaction'} but no addTransacao tool call found. Attempting retry...`);
      
      try {
        // Retry with strict instruction
        const retryResponse = await fetch(`${supabaseUrl}/functions/v1/ai-engine`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            agent_id: selectedAgentSlug,
            message: `INSTRUÇÃO CRÍTICA: A mensagem anterior do usuário "${message}" é um registro financeiro. Você DEVE usar a ferramenta addTransacao. Responda APENAS com [TOOL:addTransacao:{"description":"descrição","amount":VALOR_NUMERO,"type":"${transactionCheck.type || 'expense'}"}] seguido de uma confirmação curta. Não explique, apenas registre.`,
            context: {
              user_id: userId,
              conversation_history: [],
              current_time: currentTime,
            },
          }),
        });

        const retryResult = await retryResponse.json();
        
        if (retryResult.success && hasAddTransacaoToolCall(retryResult.response)) {
          console.log(`[VERIFICATION] Retry succeeded, got tool call`);
          aiResponse = retryResult.response;
        } else {
          console.log(`[VERIFICATION] Retry failed, keeping original response but adding warning`);
          // Don't claim registration happened - ask for clarification
          aiResponse = `📝 Entendi que você quer registrar uma ${transactionCheck.type === 'income' ? 'receita' : 'despesa'}. Pode confirmar o valor e uma descrição breve? Por exemplo: "Gastei 100 no mercado" ou "Recebi 5000 de salário"`;
        }
      } catch (retryError) {
        console.error("[VERIFICATION] Retry error:", retryError);
      }
    }

    // 7. Process tool calls if needed (with auto-categorization support)
    const processedResponse = await processToolCalls(supabase, aiResponse, userId, selectedAgentSlug, pjCriativoApiKey);

    // 8. Save assistant response to buffer
    await supabase.from("conversation_buffer").insert({
      user_id: userId,
      agent_slug: selectedAgentSlug,
      role: "assistant",
      content: processedResponse,
      message_type: "text",
    });

    // 9. Log the agent run with input_hash for deduplication AND metrics
    // Also save response_content for proper cache retrieval
    const latencyMs = Date.now() - startTime;
    await supabase.from("agent_runs").insert({
      user_id: userId,
      agent_slug: selectedAgentSlug,
      input_hash: inputHash,
      status: "ok",
      latency_ms: latencyMs,
      tokens_in: aiMetrics.tokens_in,
      tokens_out: aiMetrics.tokens_out,
      response_content: processedResponse,
    });

    console.log(`Response generated in ${latencyMs}ms`);

    return new Response(JSON.stringify({ 
      success: true, 
      agentSlug: selectedAgentSlug,
      response: processedResponse,
      latencyMs,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Agent router error:", error);
    
    // Log error
    const latencyMs = Date.now() - startTime;
    try {
      const body = await req.clone().json().catch(() => ({}));
      await supabase.from("agent_runs").insert({
        user_id: (body as RouterRequest).userId || null,
        agent_slug: selectedAgentSlug,
        status: "error",
        latency_ms: latencyMs,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
    } catch (logError) {
      console.error("Error logging agent run:", logError);
    }

    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Route message to appropriate agent based on keywords
function routeMessage(message: string, agents: AgentConfig[]): string {
  const lowerMessage = message.toLowerCase();
  
  console.log(`[ROUTING] Analyzing message: "${message}"`);
  console.log(`[ROUTING] Message lowercase: "${lowerMessage}"`);
  
  // Priority order: assistente_financeiro first (for transactions)
  const priorityOrder = ['assistente_financeiro', 'assistente_compromissos', 'agente_consulta'];
  const sortedAgents = [...agents].sort((a, b) => {
    const aIndex = priorityOrder.indexOf(a.slug);
    const bIndex = priorityOrder.indexOf(b.slug);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
  
  console.log(`[ROUTING] Checking agents in order: ${sortedAgents.map(a => a.slug).join(', ')}`);
  
  // Check each agent's routing keywords
  for (const agent of sortedAgents) {
    if (agent.routing_keywords && agent.routing_keywords.length > 0) {
      const matchedKeywords: string[] = [];
      for (const keyword of agent.routing_keywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          matchedKeywords.push(keyword);
        }
      }
      
      if (matchedKeywords.length > 0) {
        console.log(`[ROUTING] ✅ Agent "${agent.slug}" matched keywords: [${matchedKeywords.join(', ')}]`);
        console.log(`[ROUTING] Agent "${agent.slug}" all keywords: [${agent.routing_keywords.join(', ')}]`);
        return agent.slug;
      } else {
        console.log(`[ROUTING] ❌ Agent "${agent.slug}" no match (keywords: ${agent.routing_keywords.length})`);
      }
    } else {
      console.log(`[ROUTING] ⚠️ Agent "${agent.slug}" has no routing keywords`);
    }
  }
  
  console.log(`[ROUTING] No keywords matched, defaulting to "agente_consulta"`);
  return "agente_consulta";
}

// Build system prompt with context
function buildSystemPrompt(agent: AgentConfig, currentTime: string, userId: string): string {
  const basePrompt = agent.prompt || getDefaultPrompt(agent.slug);
  
  // Replace placeholders
  let prompt = basePrompt
    .replace(/\{\{\s*\$now\s*\}\}/g, currentTime)
    .replace(/\{\{\s*\$userId\s*\}\}/g, userId);
  
  // Add tool instructions if not present
  if (!prompt.includes("Ferramentas disponíveis")) {
    prompt += `\n\n## Ferramentas disponíveis
Você pode usar as seguintes ferramentas para ajudar o usuário:
- salvaLembrete: Salvar um novo lembrete
- consultaLembretes: Consultar lembretes do usuário
- transacoes: Consultar transações do usuário
- categorias: Listar categorias disponíveis
- addTransacao: Adicionar uma nova transação

Para usar uma ferramenta, inclua no formato: [TOOL:nome_da_ferramenta:{parametros_json}]`;
  }
  
  return prompt;
}

// Get default prompt for agent if not configured
function getDefaultPrompt(slug: string): string {
  const prompts: Record<string, string> = {
    assistente_financeiro: `Hora atual: {{ $now }}

Você é um assistente financeiro especializado em ajudar usuários a gerenciar suas finanças pessoais.

Suas capacidades incluem:
- Registrar transações (despesas e receitas)
- Categorizar gastos
- Fornecer insights sobre padrões de gastos
- Responder dúvidas sobre finanças pessoais

Sempre seja educado, claro e objetivo. Confirme as informações antes de registrar transações.`,
    
    agente_consulta: `Hora atual: {{ $now }}

Você é um assistente virtual do sistema de gestão financeira.

Suas capacidades incluem:
- Responder perguntas sobre o sistema
- Explicar funcionalidades
- Ajudar com dúvidas gerais
- Direcionar para o agente correto quando necessário

Seja sempre prestativo e forneça informações claras e úteis.`,
    
    assistente_compromissos: `Hora atual: {{ $now }}

Você é um assistente de compromissos financeiros.

Suas capacidades incluem:
- Criar lembretes de pagamento
- Agendar alertas de vencimento
- Gerenciar compromissos recorrentes
- Notificar sobre prazos importantes

Sempre confirme data, hora e valor quando criar um lembrete. Seja preciso e organizado.`,
  };
  
  return prompts[slug] || prompts.agente_consulta;
}

// Call PJ Criativo AI Gateway
async function callPJCriativoAI(
  apiKey: string,
  systemPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  agent: AgentConfig
): Promise<string> {
  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
  ];

  console.log(`Calling PJ Criativo AI with model: ${agent.model}, temp: ${agent.temperature}`);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: mapModelToGateway(agent.model),
      messages,
      temperature: agent.temperature,
      max_completion_tokens: agent.max_tokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("PJ Criativo AI error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("Payment required. Please add credits to your workspace.");
    }
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";
}

// Map user-facing model names to gateway model names
function mapModelToGateway(model: string): string {
  const modelMap: Record<string, string> = {
    "gpt-4o": "openai/gpt-5",
    "gpt-4o-mini": "openai/gpt-5-mini",
    "gpt-4-turbo": "openai/gpt-5",
    "gpt-3.5-turbo": "openai/gpt-5-nano",
  };
  return modelMap[model] || "google/gemini-2.5-flash";
}

// Process tool calls in the response (with auto-categorization support)
async function processToolCalls(
  supabase: any,
  response: string,
  userId: string,
  _agentSlug: string,
  pjCriativoApiKey?: string
): Promise<string> {
  // Look for tool calls in format: [TOOL:name:{params}]
  // Robust regex that handles multiline JSON, whitespace, and nested objects
  const toolPattern = /\[TOOL:(\w+):(\{[\s\S]*?\})\]/g;
  let processedResponse = response;
  let match;

  while ((match = toolPattern.exec(response)) !== null) {
    const [fullMatch, toolName, paramsJson] = match;
    console.log(`Processing tool call: ${toolName}`);

    try {
      const params = JSON.parse(paramsJson);
      let result = "";

      switch (toolName) {
        case "salvaLembrete":
          result = await handleSalvaLembrete(supabase, userId, params);
          break;
        case "consultaLembretes":
          result = await handleConsultaLembretes(supabase, userId);
          break;
        case "transacoes":
          result = await handleConsultaTransacoes(supabase, userId, params);
          break;
        case "categorias":
          result = await handleConsultaCategorias(supabase, userId);
          break;
        case "addTransacao":
          result = await handleAddTransacao(supabase, userId, params, pjCriativoApiKey);
          break;
        case "addCategoria":
          result = await handleAddCategoria(supabase, userId, params);
          break;
        case "addMeta":
          result = await handleAddMeta(supabase, userId, params);
          break;
        case "consultaMetas":
          result = await handleConsultaMetas(supabase, userId);
          break;
        case "atualizaMeta":
          result = await handleAtualizaMeta(supabase, userId, params);
          break;
        case "deletaMeta":
          result = await handleDeleteMeta(supabase, userId, params);
          break;
        case "resumoFinanceiro":
          result = await handleResumoFinanceiro(supabase, userId, params);
          break;
        case "saldoPorCategoria":
          result = await handleSaldoPorCategoria(supabase, userId, params);
          break;
        case "consultaLembretesHoje":
          result = await handleConsultaLembretesHoje(supabase, userId);
          break;
        case "criaLembrete":
          result = await handleCriaLembrete(supabase, userId, params);
          break;
        case "editTransacao":
          result = await handleEditTransacao(supabase, userId, params);
          break;
        case "deleteTransacao":
          result = await handleDeleteTransacao(supabase, userId, params);
          break;
        default:
          result = `[Ferramenta ${toolName} não reconhecida]`;
      }

      processedResponse = processedResponse.replace(fullMatch, result);
    } catch (error) {
      console.error(`Error processing tool ${toolName}:`, error);
      processedResponse = processedResponse.replace(fullMatch, `[Erro ao executar ${toolName}]`);
    }
  }

  return processedResponse;
}

// Tool handlers
async function handleSalvaLembrete(
  supabase: any,
  userId: string,
  params: { description: string; date?: string; time?: string; amount?: number }
): Promise<string> {
  const { error } = await supabase.from("reminders").insert({
    user_id: userId,
    description: params.description,
    reminder_date: params.date || null,
    reminder_time: params.time || null,
    amount: params.amount || null,
    status: "pending",
    origin: "whatsapp",
  });

  if (error) {
    console.error("Error saving reminder:", error);
    return "❌ Não foi possível salvar o lembrete.";
  }

  return "✅ Lembrete salvo com sucesso!";
}

async function handleConsultaLembretes(
  supabase: any,
  userId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("reminder_date", { ascending: true })
    .limit(10);

  if (error) {
    console.error("Error fetching reminders:", error);
    return "❌ Erro ao consultar lembretes.";
  }

  if (!data || data.length === 0) {
    return "📝 Você não tem lembretes pendentes.";
  }

  const list = data.map((r: { description: string; reminder_date: string | null; amount: number | null }, i: number) => {
    const date = r.reminder_date ? new Date(r.reminder_date).toLocaleDateString("pt-BR") : "Sem data";
    const amount = r.amount ? ` - R$ ${r.amount.toFixed(2)}` : "";
    return `${i + 1}. ${r.description} (${date}${amount})`;
  }).join("\n");

  return `📝 Seus lembretes pendentes:\n${list}`;
}

async function handleConsultaTransacoes(
  supabase: any,
  userId: string,
  params: { limit?: number; type?: string }
): Promise<string> {
  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(params.limit || 5);

  if (params.type) {
    query = query.eq("type", params.type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching transactions:", error);
    return "❌ Erro ao consultar transações.";
  }

  if (!data || data.length === 0) {
    return "💰 Nenhuma transação encontrada.";
  }

  const list = data.map((t: { description: string | null; date: string; amount: number; type: string | null }, i: number) => {
    const date = new Date(t.date).toLocaleDateString("pt-BR");
    const emoji = t.type === "income" ? "💵" : "💸";
    return `${i + 1}. ${emoji} ${t.description || "Sem descrição"} - R$ ${t.amount.toFixed(2)} (${date})`;
  }).join("\n");

  return `💰 Suas últimas transações:\n${list}`;
}

async function handleConsultaCategorias(
  supabase: any,
  userId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order("name");

  if (error) {
    console.error("Error fetching categories:", error);
    return "❌ Erro ao consultar categorias.";
  }

  if (!data || data.length === 0) {
    return "📂 Nenhuma categoria encontrada.";
  }

  const list = data.map((c: { name: string; icon: string | null }) => `• ${c.icon || "📁"} ${c.name}`).join("\n");
  return `📂 Categorias disponíveis:\n${list}`;
}

// Auto-categorize transaction using AI
async function handleAutoCategorizaTransacao(
  supabase: any,
  userId: string,
  description: string,
  type: string,
  pjCriativoApiKey: string
): Promise<{ categoryId: string | null; categoryName: string | null; confidence: "high" | "medium" | "low" }> {
  try {
    // Fetch available categories for the user
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id, name, type")
      .or(`user_id.eq.${userId},user_id.is.null`);

    if (catError || !categories || categories.length === 0) {
      console.log("No categories found for auto-categorization");
      return { categoryId: null, categoryName: null, confidence: "low" };
    }

    // Filter categories by type (expense/income)
    const filteredCategories = categories.filter((c: { type: string }) => 
      c.type === type || c.type === "both" || !c.type
    );

    if (filteredCategories.length === 0) {
      return { categoryId: null, categoryName: null, confidence: "low" };
    }

    // Build prompt for AI
    const categoryList = filteredCategories
      .map((c: { id: string; name: string }) => `- "${c.name}" (ID: ${c.id})`)
      .join("\n");

    const prompt = `Categorize esta transação financeira:

Descrição: "${description}"
Tipo: ${type === "income" ? "receita" : "despesa"}

Categorias disponíveis:
${categoryList}

Responda APENAS com o ID da categoria mais adequada (o UUID). 
Se nenhuma categoria se encaixar bem, responda "null".
Não explique, apenas retorne o ID ou "null".`;

    console.log(`Auto-categorizing: "${description}" with ${filteredCategories.length} categories`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${pjCriativoApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite", // Fast and cheap model
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 100,
      }),
    });

    if (!response.ok) {
      console.error("Auto-categorization AI error:", response.status);
      return { categoryId: null, categoryName: null, confidence: "low" };
    }

    const data = await response.json();
    const rawResponse = data.choices?.[0]?.message?.content?.trim() || "";
    
    // Extract UUID from response (handle various formats)
    const uuidMatch = rawResponse.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    const categoryId = uuidMatch ? uuidMatch[0] : null;
    
    if (!categoryId || categoryId === "null") {
      return { categoryId: null, categoryName: null, confidence: "low" };
    }

    // Verify the category exists
    const matchedCategory = filteredCategories.find((c: { id: string }) => c.id === categoryId);
    if (!matchedCategory) {
      console.log(`Category ID ${categoryId} not found in available categories`);
      return { categoryId: null, categoryName: null, confidence: "low" };
    }

    console.log(`Auto-categorized "${description}" as "${matchedCategory.name}" (${categoryId})`);
    return { 
      categoryId, 
      categoryName: matchedCategory.name, 
      confidence: "high" 
    };

  } catch (error) {
    console.error("Auto-categorization failed:", error);
    return { categoryId: null, categoryName: null, confidence: "low" };
  }
}

async function handleAddTransacao(
  supabase: any,
  userId: string,
  params: { description: string; amount: number; type: string; category_id?: string; date?: string },
  pjCriativoApiKey?: string
): Promise<string> {
  // ========== DETAILED LOGGING FOR DEBUGGING ==========
  console.log(`[ADD_TRANSACAO] ========== INÍCIO ==========`);
  console.log(`[ADD_TRANSACAO] userId: ${userId}`);
  console.log(`[ADD_TRANSACAO] Params recebidos:`, JSON.stringify(params, null, 2));
  console.log(`[ADD_TRANSACAO] Type recebido: "${params.type}" (${typeof params.type})`);
  console.log(`[ADD_TRANSACAO] É income? ${params.type === 'income'}`);
  console.log(`[ADD_TRANSACAO] É expense? ${params.type === 'expense'}`);
  
  // Validate and normalize type
  const validTypes = ['income', 'expense'];
  let normalizedType = params.type?.toLowerCase()?.trim() || 'expense';
  
  if (!validTypes.includes(normalizedType)) {
    console.log(`[ADD_TRANSACAO] ⚠️ Type inválido "${params.type}", usando "expense" como padrão`);
    normalizedType = 'expense';
  }
  
  console.log(`[ADD_TRANSACAO] Type normalizado: "${normalizedType}"`);
  // ========== FIM DO LOGGING DETALHADO ==========
  
  let categoryId = params.category_id || null;
  let categoryName: string | null = null;

  // Auto-categorize if no category provided and API key available
  if (!categoryId && pjCriativoApiKey) {
    const catResult = await handleAutoCategorizaTransacao(
      supabase, 
      userId, 
      params.description, 
      normalizedType,
      pjCriativoApiKey
    );
    
    if (catResult.categoryId && catResult.confidence === "high") {
      categoryId = catResult.categoryId;
      categoryName = catResult.categoryName;
      console.log(`[ADD_TRANSACAO] Auto-categorized: ${catResult.categoryName}`);
    }
  }

  // Get category name if we have an ID but no name
  if (categoryId && !categoryName) {
    const { data: cat } = await supabase
      .from("categories")
      .select("name")
      .eq("id", categoryId)
      .maybeSingle();
    categoryName = cat?.name || null;
  }

  // Determine transaction date
  const transactionDate = params.date || new Date().toISOString().split("T")[0];

  // Prepare the insert data
  const insertData = {
    user_id: userId,
    description: params.description,
    amount: params.amount,
    type: normalizedType, // Use normalized type
    category_id: categoryId,
    date: transactionDate,
    origin: "whatsapp",
  };
  
  console.log(`[ADD_TRANSACAO] Dados a inserir:`, JSON.stringify(insertData, null, 2));

  const { data: insertedData, error } = await supabase
    .from("transactions")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error(`[ADD_TRANSACAO] ❌ ERRO ao inserir:`, error);
    return "❌ Não foi possível registrar a transação.";
  }

  console.log(`[ADD_TRANSACAO] ✅ Transação inserida com sucesso:`, JSON.stringify(insertedData, null, 2));
  console.log(`[ADD_TRANSACAO] Type final no banco: "${insertedData?.type}"`);
  console.log(`[ADD_TRANSACAO] ========== FIM ==========`);

  // Format date in Brazilian format (DD/MM/YYYY)
  const [year, month, day] = transactionDate.split("-");
  const formattedDate = `${day}/${month}/${year}`;

  // Format amount in Brazilian currency
  const formattedAmount = params.amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Determine transaction type label and emoji
  const tipoLabel = normalizedType === "income" ? "Receita" : "Despesa";
  const tipoEmoji = normalizedType === "income" ? "💵" : "💸";

  // Build formatted response matching the old agent format
  const response = `✅ Pronto! Sua ${tipoLabel.toLowerCase()} de R$ ${formattedAmount} foi registrada com sucesso. Aqui estão os detalhes:

${tipoEmoji} Tipo: ${tipoLabel}
📝 Descrição: ${params.description}
💰 Valor: R$ ${formattedAmount}
🏷️ Categoria: ${categoryName || "Não definida"}
📅 Data: ${formattedDate}

Se precisar de mais alguma coisa, estou à disposição!`;

  return response;
}

async function handleAddCategoria(
  supabase: any,
  userId: string,
  params: { name: string; type?: string }
): Promise<string> {
  // Check if category already exists
  const { data: existing } = await supabase
    .from("categories")
    .select("id, name")
    .eq("name", params.name)
    .or(`user_id.eq.${userId},user_id.is.null`)
    .maybeSingle();

  if (existing) {
    return `📁 Categoria "${existing.name}" já existe (ID: ${existing.id})`;
  }

  // Create new category
  const { data: newCat, error } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: params.name,
      type: params.type || "expense",
    })
    .select("id, name")
    .single();

  if (error) {
    console.error("Error adding category:", error);
    return "❌ Não foi possível criar a categoria.";
  }

  return `✅ Categoria "${newCat.name}" criada com sucesso!`;
}

async function handleAddMeta(
  supabase: any,
  userId: string,
  params: { title: string; target_amount: number; deadline?: string }
): Promise<string> {
  // Check if goal with same title already exists
  const { data: existing } = await supabase
    .from("goals")
    .select("id, title")
    .eq("user_id", userId)
    .eq("title", params.title)
    .eq("status", "in_progress")
    .maybeSingle();

  if (existing) {
    return `🎯 Meta "${existing.title}" já existe! Use "progresso meta ${existing.title}" para atualizar.`;
  }

  // Create new goal
  const { data: newGoal, error } = await supabase
    .from("goals")
    .insert({
      user_id: userId,
      title: params.title,
      target_amount: params.target_amount,
      current_amount: 0,
      deadline: params.deadline || null,
      status: "in_progress",
    })
    .select("id, title, target_amount, deadline")
    .single();

  if (error) {
    console.error("Error adding goal:", error);
    return "❌ Não foi possível criar a meta.";
  }

  const deadlineText = newGoal.deadline 
    ? ` (prazo: ${new Date(newGoal.deadline).toLocaleDateString("pt-BR")})`
    : "";
    
  return `🎯 Meta criada: "${newGoal.title}" - R$ ${newGoal.target_amount.toFixed(2)}${deadlineText}`;
}

async function handleConsultaMetas(
  supabase: any,
  userId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("goals")
    .select("id, title, target_amount, current_amount, deadline, status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching goals:", error);
    return "❌ Erro ao consultar metas.";
  }

  if (!data || data.length === 0) {
    return "🎯 Você não tem metas cadastradas. Diga algo como 'Quero juntar 5000 para viajar' para criar uma!";
  }

  const list = data.map((g: { title: string; target_amount: number; current_amount: number; deadline: string | null; status: string }, i: number) => {
    const progress = ((g.current_amount / g.target_amount) * 100).toFixed(0);
    const remaining = g.target_amount - g.current_amount;
    const deadline = g.deadline 
      ? ` (prazo: ${new Date(g.deadline).toLocaleDateString("pt-BR")})`
      : "";
    const statusIcon = g.status === "completed" ? "✅" : "🎯";
    
    return `${i + 1}. ${statusIcon} ${g.title}: R$ ${g.current_amount.toFixed(2)} / R$ ${g.target_amount.toFixed(2)} (${progress}%)${deadline}`;
  }).join("\n");

  return `📊 Suas metas:\n\n${list}`;
}

async function handleAtualizaMeta(
  supabase: any,
  userId: string,
  params: { title: string; amount: number }
): Promise<string> {
  // Find the goal by title (partial match)
  const { data: goal, error: fetchError } = await supabase
    .from("goals")
    .select("id, title, target_amount, current_amount")
    .eq("user_id", userId)
    .ilike("title", `%${params.title}%`)
    .eq("status", "in_progress")
    .limit(1)
    .maybeSingle();

  if (fetchError || !goal) {
    return `❌ Meta "${params.title}" não encontrada. Use "minhas metas" para ver suas metas.`;
  }

  const newAmount = goal.current_amount + params.amount;
  const isCompleted = newAmount >= goal.target_amount;

  // Update the goal
  const { error: updateError } = await supabase
    .from("goals")
    .update({
      current_amount: newAmount,
      status: isCompleted ? "completed" : "in_progress",
    })
    .eq("id", goal.id);

  if (updateError) {
    console.error("Error updating goal:", updateError);
    return "❌ Não foi possível atualizar a meta.";
  }

  const progress = ((newAmount / goal.target_amount) * 100).toFixed(0);
  const remaining = goal.target_amount - newAmount;

  if (isCompleted) {
    return `🎉 PARABÉNS! Você completou a meta "${goal.title}"!\n\nTotal alcançado: R$ ${newAmount.toFixed(2)}`;
  }

  return `💰 Progresso registrado!\n\n🎯 ${goal.title}: R$ ${newAmount.toFixed(2)} / R$ ${goal.target_amount.toFixed(2)} (${progress}%)\n💵 Faltam: R$ ${remaining.toFixed(2)}`;
}

async function handleDeleteMeta(
  supabase: any,
  userId: string,
  params: { title: string }
): Promise<string> {
  // Find the goal by title (partial match)
  const { data: goal, error: fetchError } = await supabase
    .from("goals")
    .select("id, title, target_amount, current_amount, status")
    .eq("user_id", userId)
    .ilike("title", `%${params.title}%`)
    .limit(1)
    .maybeSingle();

  if (fetchError || !goal) {
    return `❌ Meta "${params.title}" não encontrada. Use "minhas metas" para ver suas metas.`;
  }

  // Delete the goal
  const { error: deleteError } = await supabase
    .from("goals")
    .delete()
    .eq("id", goal.id);

  if (deleteError) {
    console.error("Error deleting goal:", deleteError);
    return "❌ Não foi possível excluir a meta.";
  }

  const progress = goal.current_amount > 0 
    ? ` (tinha R$ ${goal.current_amount.toFixed(2)} guardados)`
    : "";

  return `🗑️ Meta "${goal.title}" excluída com sucesso${progress}`;
}

async function handleResumoFinanceiro(
  supabase: any,
  userId: string,
  params: { month?: number; year?: number }
): Promise<string> {
  const now = new Date();
  const month = params.month || (now.getMonth() + 1);
  const year = params.year || now.getFullYear();
  
  // Calculate first and last day of the month
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  console.log(`Fetching transactions for ${startDate} to ${endDate}`);

  // Fetch transactions for the month
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, type")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) {
    console.error("Error fetching transactions:", error);
    return "❌ Erro ao consultar transações.";
  }

  const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", 
                      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const monthName = monthNames[month - 1];

  if (!data || data.length === 0) {
    return `📊 Resumo de ${monthName}/${year}:\n\nNenhuma transação registrada neste mês.`;
  }

  // Calculate totals
  let totalIncome = 0;
  let totalExpense = 0;
  
  data.forEach((t: { amount: number; type: string }) => {
    if (t.type === "income") {
      totalIncome += Number(t.amount);
    } else {
      totalExpense += Number(t.amount);
    }
  });

  const balance = totalIncome - totalExpense;
  const balanceIcon = balance >= 0 ? "💚" : "🔴";

  return `📊 Resumo de ${monthName}/${year}:

💰 Receitas: R$ ${totalIncome.toFixed(2)}
💸 Despesas: R$ ${totalExpense.toFixed(2)}
${balanceIcon} Saldo: R$ ${balance.toFixed(2)}

📈 Total de transações: ${data.length}`;
}

async function handleSaldoPorCategoria(
  supabase: any,
  userId: string,
  params: { month?: number; year?: number }
): Promise<string> {
  const now = new Date();
  const month = params.month || (now.getMonth() + 1);
  const year = params.year || now.getFullYear();
  
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  console.log(`Fetching transactions by category for ${startDate} to ${endDate}`);

  // Fetch transactions with categories
  const { data, error } = await supabase
    .from("transactions")
    .select(`
      amount,
      type,
      category_id,
      categories!left(id, name, type, icon)
    `)
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) {
    console.error("Error fetching transactions by category:", error);
    return "❌ Erro ao consultar gastos por categoria.";
  }

  const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", 
                      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const monthName = monthNames[month - 1];

  if (!data || data.length === 0) {
    return `📊 Gastos por categoria - ${monthName}/${year}:\n\nNenhuma transação registrada neste mês.`;
  }

  // Group by category (expenses only)
  const byCategory = new Map<string, { name: string; icon: string; total: number; count: number }>();
  let uncategorized = 0;
  let uncategorizedCount = 0;

  data.forEach((t: any) => {
    if (t.type === "expense") {
      if (t.categories?.name) {
        const key = t.category_id;
        if (!byCategory.has(key)) {
          byCategory.set(key, { 
            name: t.categories.name, 
            icon: t.categories.icon || "📁",
            total: 0, 
            count: 0 
          });
        }
        const cat = byCategory.get(key)!;
        cat.total += Number(t.amount);
        cat.count++;
      } else {
        uncategorized += Number(t.amount);
        uncategorizedCount++;
      }
    }
  });

  // Sort by value (highest first)
  const sorted = Array.from(byCategory.values())
    .sort((a, b) => b.total - a.total);

  if (sorted.length === 0 && uncategorized === 0) {
    return `📊 Gastos por categoria - ${monthName}/${year}:\n\nNenhuma despesa registrada neste mês.`;
  }

  let response = `📊 Gastos por categoria - ${monthName}/${year}:\n\n`;

  sorted.forEach((cat, i) => {
    response += `${i + 1}. ${cat.icon} ${cat.name}: R$ ${cat.total.toFixed(2)} (${cat.count}x)\n`;
  });

  if (uncategorized > 0) {
    response += `\n⚠️ Sem categoria: R$ ${uncategorized.toFixed(2)} (${uncategorizedCount}x)`;
  }

  const total = sorted.reduce((acc, c) => acc + c.total, 0) + uncategorized;
  response += `\n\n💸 Total despesas: R$ ${total.toFixed(2)}`;

  return response;
}

async function handleConsultaLembretesHoje(
  supabase: any,
  userId: string
): Promise<string> {
  const today = new Date().toISOString().split("T")[0];

  console.log(`Fetching reminders for today: ${today}`);

  const { data, error } = await supabase
    .from("reminders")
    .select("id, description, reminder_time, amount, status")
    .eq("user_id", userId)
    .eq("reminder_date", today)
    .order("reminder_time", { ascending: true });

  if (error) {
    console.error("Error fetching today reminders:", error);
    return "❌ Erro ao consultar lembretes do dia.";
  }

  if (!data || data.length === 0) {
    return "📅 Você não tem lembretes para hoje! 🎉";
  }

  const todayFormatted = new Date().toLocaleDateString("pt-BR");
  let response = `📅 Lembretes para hoje (${todayFormatted}):\n\n`;

  data.forEach((r: any, i: number) => {
    const time = r.reminder_time ? ` às ${r.reminder_time.slice(0, 5)}` : "";
    const amount = r.amount ? ` - R$ ${Number(r.amount).toFixed(2)}` : "";
    const statusIcon = r.status === "completed" ? " ✅" : "";
    response += `${i + 1}. ${r.description}${time}${amount}${statusIcon}\n`;
  });

  const pending = data.filter((r: any) => r.status === "pending").length;
  const completed = data.filter((r: any) => r.status === "completed").length;
  
  if (pending > 0) {
    response += `\n⏰ ${pending} pendente(s)`;
  }
  if (completed > 0) {
    response += ` | ✅ ${completed} concluído(s)`;
  }

  return response;
}

async function handleCriaLembrete(
  supabase: any,
  userId: string,
  params: {
    description: string;
    date: string;
    time?: string;
    amount?: number;
    recurrence?: string;
  }
): Promise<string> {
  // Validate date
  const reminderDate = new Date(params.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(reminderDate.getTime())) {
    return "❌ Data inválida. Use o formato YYYY-MM-DD (ex: 2026-01-20).";
  }

  if (reminderDate < today) {
    return "❌ A data do lembrete deve ser hoje ou uma data futura.";
  }

  // Calculate next_execution for recurring reminders
  let nextExecution = null;
  if (params.recurrence && params.recurrence !== "once") {
    nextExecution = params.date + (params.time ? `T${params.time}:00` : "T08:00:00");
  }

  const { error } = await supabase.from("reminders").insert({
    user_id: userId,
    description: params.description,
    reminder_date: params.date,
    reminder_time: params.time || null,
    amount: params.amount || null,
    recurrence: params.recurrence || "once",
    status: "pending",
    origin: "whatsapp",
    next_execution: nextExecution,
  });

  if (error) {
    console.error("Error creating reminder:", error);
    return "❌ Não foi possível criar o lembrete.";
  }

  // Format response
  const formattedDate = new Date(params.date).toLocaleDateString("pt-BR");
  const timeStr = params.time ? ` às ${params.time}` : "";
  const amountStr = params.amount ? `\n💰 Valor: R$ ${params.amount.toFixed(2)}` : "";
  
  const recurrenceLabels: Record<string, string> = {
    once: "única vez",
    daily: "diário",
    weekly: "semanal",
    monthly: "mensal",
  };
  const recurrenceStr = params.recurrence && params.recurrence !== "once"
    ? `\n🔄 Recorrência: ${recurrenceLabels[params.recurrence] || params.recurrence}`
    : "";

  return `✅ Lembrete criado!\n\n📝 ${params.description}\n📅 ${formattedDate}${timeStr}${amountStr}${recurrenceStr}`;
}

// Edit an existing transaction by ID or description
async function handleEditTransacao(
  supabase: any,
  userId: string,
  params: { 
    id?: string;
    description?: string;
    new_description?: string;
    new_amount?: number;
    new_type?: string;
    new_category_id?: string;
    new_date?: string;
  }
): Promise<string> {
  // Find transaction by ID or description
  let query = supabase
    .from("transactions")
    .select("id, description, amount, type, category_id, date")
    .eq("user_id", userId);

  if (params.id) {
    query = query.eq("id", params.id);
  } else if (params.description) {
    query = query.ilike("description", `%${params.description}%`);
  } else {
    return "❌ Preciso do ID ou descrição da transação para editar.";
  }

  const { data: transaction, error: fetchError } = await query.limit(1).maybeSingle();

  if (fetchError || !transaction) {
    return `❌ Transação não encontrada. Use "minhas transações" para ver suas transações recentes.`;
  }

  // Build update object
  const updates: Record<string, any> = {};
  if (params.new_description) updates.description = params.new_description;
  if (params.new_amount) updates.amount = params.new_amount;
  if (params.new_type) updates.type = params.new_type;
  if (params.new_category_id) updates.category_id = params.new_category_id;
  if (params.new_date) updates.date = params.new_date;

  if (Object.keys(updates).length === 0) {
    return "❌ Nenhum campo para atualizar foi informado.";
  }

  const { error: updateError } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", transaction.id);

  if (updateError) {
    console.error("Error updating transaction:", updateError);
    return "❌ Não foi possível atualizar a transação.";
  }

  // Get updated values
  const finalDescription = params.new_description || transaction.description;
  const finalAmount = params.new_amount || transaction.amount;
  const finalType = params.new_type || transaction.type;
  const finalDate = params.new_date || transaction.date;

  // Get category name
  let categoryName = "Não definida";
  const finalCategoryId = params.new_category_id || transaction.category_id;
  if (finalCategoryId) {
    const { data: cat } = await supabase
      .from("categories")
      .select("name")
      .eq("id", finalCategoryId)
      .maybeSingle();
    categoryName = cat?.name || "Não definida";
  }

  // Format response
  const [year, month, day] = finalDate.split("-");
  const formattedDate = `${day}/${month}/${year}`;
  const formattedAmount = finalAmount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const tipoLabel = finalType === "income" ? "Receita" : "Despesa";
  const tipoEmoji = finalType === "income" ? "💵" : "💸";

  return `✏️ Transação atualizada com sucesso! Aqui estão os novos detalhes:

${tipoEmoji} Tipo: ${tipoLabel}
📝 Descrição: ${finalDescription}
💰 Valor: R$ ${formattedAmount}
🏷️ Categoria: ${categoryName}
📅 Data: ${formattedDate}

Se precisar de mais alguma coisa, estou à disposição!`;
}

// Delete a transaction by ID or description
async function handleDeleteTransacao(
  supabase: any,
  userId: string,
  params: { id?: string; description?: string }
): Promise<string> {
  // Find transaction by ID or description
  let query = supabase
    .from("transactions")
    .select("id, description, amount, type, date")
    .eq("user_id", userId);

  if (params.id) {
    query = query.eq("id", params.id);
  } else if (params.description) {
    query = query.ilike("description", `%${params.description}%`);
  } else {
    return "❌ Preciso do ID ou descrição da transação para excluir.";
  }

  const { data: transaction, error: fetchError } = await query.limit(1).maybeSingle();

  if (fetchError || !transaction) {
    return `❌ Transação não encontrada. Use "minhas transações" para ver suas transações recentes.`;
  }

  // Delete the transaction
  const { error: deleteError } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transaction.id);

  if (deleteError) {
    console.error("Error deleting transaction:", deleteError);
    return "❌ Não foi possível excluir a transação.";
  }

  // Format response
  const [year, month, day] = transaction.date.split("-");
  const formattedDate = `${day}/${month}/${year}`;
  const formattedAmount = transaction.amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const tipoLabel = transaction.type === "income" ? "Receita" : "Despesa";
  const tipoEmoji = transaction.type === "income" ? "💵" : "💸";

  return `🗑️ Transação removida com sucesso!

${tipoEmoji} Tipo: ${tipoLabel}
📝 Descrição: ${transaction.description || "Sem descrição"}
💰 Valor: R$ ${formattedAmount}
📅 Data: ${formattedDate}

Se precisar registrar novamente, é só me avisar!`;
}
