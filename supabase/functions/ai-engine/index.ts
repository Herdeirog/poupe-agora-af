import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeamento de agent_id para slug do banco
const AGENT_SLUG_MAP: Record<string, string> = {
  financeiro: "assistente_financeiro",
  consulta: "agente_consulta",
  compromissos: "assistente_compromissos",
};

interface AIEngineRequest {
  agent_id: string;
  message: string;
  context?: {
    user_id?: string;
    conversation_history?: Array<{ role: string; content: string }>;
    current_time?: string;
  };
}

interface AgentConfig {
  slug: string;
  name: string;
  prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  active: boolean;
}

interface AIMetrics {
  latency_ms: number;
  tokens_in: number;
  tokens_out: number;
  model: string;
  cost_usd: number;
}

// Calculate cost per 1K tokens based on model
function calculateCost(model: string, tokensIn: number, tokensOut: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
    "google/gemini-2.5-flash": { input: 0.00015, output: 0.0006 },
    "google/gemini-2.5-flash-lite": { input: 0.00005, output: 0.0002 },
    "google/gemini-2.5-pro": { input: 0.00125, output: 0.005 },
    "openai/gpt-5": { input: 0.0025, output: 0.01 },
    "openai/gpt-5-mini": { input: 0.00015, output: 0.0006 },
    "openai/gpt-5-nano": { input: 0.00005, output: 0.0002 },
  };
  const price = pricing[model] || { input: 0.0001, output: 0.0002 };
  return (tokensIn * price.input + tokensOut * price.output) / 1000;
}

// Buscar OpenAI API Key do banco (criptografada) ou fallback para env
async function getOpenAIKey(supabaseClient: any): Promise<string | null> {
  try {
    // Tentar buscar do banco (secret customizado pelo admin)
    const { data, error } = await supabaseClient.rpc("get_decrypted_secret", {
      p_key_name: "OPENAI_API_KEY"
    });
    
    if (!error && data) {
      console.log("AIEngine: Using OpenAI key from database");
      return data;
    }
  } catch (e) {
    console.log("AIEngine: No custom OpenAI key in database, using env");
  }
  
  // Fallback: variável de ambiente
  return Deno.env.get("OPENAI_API_KEY") || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const pjCriativoApiKey = Deno.env.get("PJ_CRIATIVO_API_KEY");
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Buscar OpenAI key do banco ou env
  const openaiApiKey = await getOpenAIKey(supabase);

  try {
    const body: AIEngineRequest = await req.json();
    const { agent_id, message, context } = body;

    // 1. Validar entrada
    if (!agent_id || !message) {
      console.log("Missing required parameters: agent_id or message");
      return new Response(JSON.stringify({
        success: false,
        response: "Parâmetros agent_id e message são obrigatórios.",
        agent_used: null,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Mapear agent_id para slug (ou usar diretamente se já for slug)
    const slug = AGENT_SLUG_MAP[agent_id] || agent_id;
    console.log(`AIEngine: Processing request for agent_id=${agent_id}, slug=${slug}`);

    // 3. Buscar configuração do agente no banco
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("slug, name, prompt, model, temperature, max_tokens, active")
      .eq("slug", slug)
      .eq("active", true)
      .single();

    if (agentError || !agent) {
      console.error("Agent not found or inactive:", slug, agentError?.message);
      return new Response(JSON.stringify({
        success: false,
        response: "Este agente não está disponível no momento.",
        agent_used: slug,
      }), {
        status: 200, // Não expor erro interno
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agentConfig = agent as AgentConfig;
    console.log(`AIEngine: Agent found - ${agentConfig.name}, model: ${agentConfig.model}`);

    // 4. Montar prompt final
    const currentTime = context?.current_time || 
      new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    
    const systemPrompt = buildSystemPrompt(agentConfig, currentTime, context?.user_id || "");

    // 5. Preparar mensagens
    const messages = [
      { role: "system", content: systemPrompt },
      ...(context?.conversation_history || []),
      { role: "user", content: message },
    ];

    // 6. Chamar IA (OpenAI ou PJ Criativo Gateway como fallback)
    let aiResponse: string;
    let metrics: AIMetrics | null = null;
    const aiStartTime = Date.now();
    
    if (openaiApiKey) {
      console.log("AIEngine: Using OpenAI API");
      const result = await callOpenAIWithMetrics(openaiApiKey, messages, agentConfig);
      aiResponse = result.response;
      metrics = {
        latency_ms: Date.now() - aiStartTime,
        tokens_in: result.tokens_in,
        tokens_out: result.tokens_out,
        model: agentConfig.model,
        cost_usd: calculateCost(agentConfig.model, result.tokens_in, result.tokens_out),
      };
    } else if (pjCriativoApiKey) {
      console.log("AIEngine: Using PJ Criativo AI Gateway (fallback)");
      const result = await callPJCriativoAIWithMetrics(pjCriativoApiKey, messages, agentConfig);
      aiResponse = result.response;
      const gatewayModel = mapModelToGateway(agentConfig.model);
      metrics = {
        latency_ms: Date.now() - aiStartTime,
        tokens_in: result.tokens_in,
        tokens_out: result.tokens_out,
        model: gatewayModel,
        cost_usd: calculateCost(gatewayModel, result.tokens_in, result.tokens_out),
      };
    } else {
      console.error("AIEngine: No AI API key configured");
      return new Response(JSON.stringify({
        success: false,
        response: `Olá! Sou o ${agentConfig.name}. No momento estou em manutenção. Por favor, tente novamente mais tarde.`,
        agent_used: slug,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log metrics
    if (metrics) {
      console.log(`AIEngine: Metrics - latency=${metrics.latency_ms}ms, tokens_in=${metrics.tokens_in}, tokens_out=${metrics.tokens_out}, cost=$${metrics.cost_usd.toFixed(6)}`);
    }

    console.log(`AIEngine: Response generated successfully for ${slug}`);

    // 7. Retornar resposta com métricas
    return new Response(JSON.stringify({
      success: true,
      response: aiResponse,
      agent_used: slug,
      metrics: metrics ? {
        latency_ms: metrics.latency_ms,
        tokens_in: metrics.tokens_in,
        tokens_out: metrics.tokens_out,
        cost_usd: metrics.cost_usd,
      } : null,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    // NUNCA expor erros da OpenAI para o cliente
    console.error("AIEngine error:", error instanceof Error ? error.message : "Unknown");
    
    return new Response(JSON.stringify({
      success: false,
      response: "Desculpe, não consegui processar sua mensagem. Tente novamente.",
      agent_used: null,
    }), {
      status: 200, // Sempre 200 para não expor erros
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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

// Map model to gateway equivalent
function mapModelToGateway(model: string): string {
  const modelMap: Record<string, string> = {
    "gpt-4o": "openai/gpt-5",
    "gpt-4o-mini": "openai/gpt-5-mini",
    "gpt-4-turbo": "openai/gpt-5",
    "gpt-3.5-turbo": "openai/gpt-5-nano",
  };
  return modelMap[model] || "google/gemini-2.5-flash";
}

interface AICallResult {
  response: string;
  tokens_in: number;
  tokens_out: number;
}

// Chamar OpenAI diretamente com métricas
async function callOpenAIWithMetrics(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  agent: AgentConfig
): Promise<AICallResult> {
  // Determine model parameters based on model type
  const model = agent.model || "gpt-4o-mini";
  const isNewModel = model.includes("gpt-5") || model.includes("o3") || model.includes("o4");
  
  const requestBody: Record<string, unknown> = {
    model,
    messages,
  };
  
  // New models (GPT-5, O3, O4) don't support temperature and use max_completion_tokens
  if (isNewModel) {
    requestBody.max_completion_tokens = agent.max_tokens || 1024;
  } else {
    requestBody.temperature = agent.temperature || 0.7;
    requestBody.max_tokens = agent.max_tokens || 1024;
  }

  console.log(`AIEngine: Calling OpenAI with model=${model}`);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AIEngine OpenAI error:", response.status, errorText);
    throw new Error("OpenAI API error");
  }

  const data = await response.json();
  const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 };
  
  return {
    response: data.choices?.[0]?.message?.content || "Não consegui gerar uma resposta.",
    tokens_in: usage.prompt_tokens,
    tokens_out: usage.completion_tokens,
  };
}

// Fallback: PJ Criativo AI Gateway com métricas
async function callPJCriativoAIWithMetrics(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  agent: AgentConfig
): Promise<AICallResult> {
  const gatewayModel = mapModelToGateway(agent.model);
  console.log(`AIEngine: Calling PJ Criativo AI with model=${gatewayModel}`);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: gatewayModel,
      messages,
      max_completion_tokens: agent.max_tokens || 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AIEngine PJ Criativo AI error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded");
    }
    if (response.status === 402) {
      throw new Error("Payment required");
    }
    throw new Error("PJ Criativo AI error");
  }

  const data = await response.json();
  const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 };
  
  return {
    response: data.choices?.[0]?.message?.content || "Não consegui gerar uma resposta.",
    tokens_in: usage.prompt_tokens,
    tokens_out: usage.completion_tokens,
  };
}
