import { supabase } from "@/integrations/supabase/client";
import { AIAgent, EvolutionAPISettings } from "@/types/aiAgent";

// Re-export the type for use in other files
export type { EvolutionAPISettings } from "@/types/aiAgent";

// Type for database operations until types are regenerated
type DbAgent = {
  id: string;
  slug: string;
  name: string;
  prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  active: boolean;
  description: string | null;
  routing_keywords: string[] | null;
  created_at: string;
  updated_at: string;
};

type DbEvolutionSettings = {
  id: string;
  api_url: string;
  instance_name: string;
  api_key: string;
  webhook_secret: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export const agentService = {
  // ==================== AGENTS ====================
  
  async getAgents(): Promise<AIAgent[]> {
    const { data, error } = await supabase
      .from('agents' as any)
      .select('*')
      .order('slug');
    
    if (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }
    
    // Map database fields to AIAgent interface
    return ((data as unknown as DbAgent[]) || []).map(agent => ({
      id: agent.id,
      slug: agent.slug,
      name: agent.name,
      prompt: agent.prompt,
      model: agent.model,
      temperature: Number(agent.temperature),
      max_tokens: agent.max_tokens,
      active: agent.active,
      description: agent.description || undefined,
      routing_keywords: agent.routing_keywords || undefined,
      created_at: agent.created_at,
      updated_at: agent.updated_at,
    }));
  },

  async getAgentBySlug(slug: string): Promise<AIAgent | null> {
    const { data, error } = await supabase
      .from('agents' as any)
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching agent:', error);
      throw error;
    }
    
    if (!data) return null;
    
    const agent = data as unknown as DbAgent;
    return {
      id: agent.id,
      slug: agent.slug,
      name: agent.name,
      prompt: agent.prompt,
      model: agent.model,
      temperature: Number(agent.temperature),
      max_tokens: agent.max_tokens,
      active: agent.active,
      description: agent.description || undefined,
      routing_keywords: agent.routing_keywords || undefined,
      created_at: agent.created_at,
      updated_at: agent.updated_at,
    };
  },

  async saveAgent(agent: AIAgent): Promise<void> {
    const { error } = await supabase
      .from('agents' as any)
      .update({
        name: agent.name,
        prompt: agent.prompt,
        model: agent.model,
        temperature: agent.temperature,
        max_tokens: agent.max_tokens,
        active: agent.active,
        description: agent.description,
        routing_keywords: agent.routing_keywords,
      } as any)
      .eq('slug', agent.slug);
    
    if (error) {
      console.error('Error saving agent:', error);
      throw error;
    }
  },

  // ==================== EVOLUTION API ====================

  async getEvolutionSettings(): Promise<EvolutionAPISettings | null> {
    const { data, error } = await supabase
      .from('integration_evolution' as any)
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching Evolution settings:', error);
      throw error;
    }
    
    if (!data) return null;
    
    const settings = data as unknown as DbEvolutionSettings;
    return {
      id: settings.id,
      api_url: settings.api_url,
      instance_name: settings.instance_name,
      api_key: settings.api_key,
      webhook_secret: settings.webhook_secret || undefined,
      active: settings.active,
      created_at: settings.created_at,
      updated_at: settings.updated_at,
    };
  },

  async saveEvolutionSettings(settings: Partial<EvolutionAPISettings>): Promise<void> {
    // First check if there's an existing record
    const { data: existing } = await supabase
      .from('integration_evolution' as any)
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('integration_evolution' as any)
        .update({
          api_url: settings.api_url,
          instance_name: settings.instance_name,
          api_key: settings.api_key,
          webhook_secret: settings.webhook_secret,
          active: settings.active,
        } as any)
        .eq('id', (existing as unknown as { id: string }).id);
      
      if (error) {
        console.error('Error updating Evolution settings:', error);
        throw error;
      }
    } else {
      // Insert new record
      const { error } = await supabase
        .from('integration_evolution' as any)
        .insert({
          api_url: settings.api_url || '',
          instance_name: settings.instance_name || '',
          api_key: settings.api_key || '',
          webhook_secret: settings.webhook_secret || '',
          active: settings.active || false,
        } as any);
      
      if (error) {
        console.error('Error inserting Evolution settings:', error);
        throw error;
      }
    }
  },

  // ==================== CONVERSATION BUFFER ====================

  async getConversationContext(userId: string, agentSlug: string, limit: number = 10): Promise<Array<{ role: string; content: string }>> {
    const { data, error } = await supabase
      .from('conversation_buffer' as any)
      .select('role, content')
      .eq('user_id', userId)
      .eq('agent_slug', agentSlug)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching conversation context:', error);
      return [];
    }
    
    // Reverse to get chronological order
    return ((data as unknown as Array<{ role: string; content: string }>) || []).reverse();
  },

  async saveMessage(params: {
    userId: string;
    agentSlug: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    messageType?: 'text' | 'image' | 'audio';
    rawPayload?: Record<string, unknown>;
  }): Promise<void> {
    const { error } = await supabase
      .from('conversation_buffer' as any)
      .insert({
        user_id: params.userId,
        agent_slug: params.agentSlug,
        role: params.role,
        content: params.content,
        message_type: params.messageType || 'text',
        raw_payload: params.rawPayload,
      } as any);
    
    if (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  },

  // ==================== AGENT RUNS (LOGS) ====================

  async logAgentRun(params: {
    userId: string;
    agentSlug: string;
    inputHash?: string;
    status: 'pending' | 'ok' | 'error';
    latencyMs?: number;
    tokensIn?: number;
    tokensOut?: number;
    errorMessage?: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('agent_runs' as any)
      .insert({
        user_id: params.userId,
        agent_slug: params.agentSlug,
        input_hash: params.inputHash,
        status: params.status,
        latency_ms: params.latencyMs,
        tokens_in: params.tokensIn,
        tokens_out: params.tokensOut,
        error_message: params.errorMessage,
      } as any);
    
    if (error) {
      console.error('Error logging agent run:', error);
      // Don't throw - logging should not break the flow
    }
  },

  async getAgentRunStats(agentSlug?: string): Promise<{
    total: number;
    success: number;
    error: number;
    avgLatency: number;
  }> {
    let query = supabase
      .from('agent_runs' as any)
      .select('status, latency_ms');
    
    if (agentSlug) {
      query = query.eq('agent_slug', agentSlug);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching agent run stats:', error);
      return { total: 0, success: 0, error: 0, avgLatency: 0 };
    }
    
    const runs = (data as unknown as Array<{ status: string; latency_ms: number | null }>) || [];
    const total = runs.length;
    const success = runs.filter(r => r.status === 'ok').length;
    const errors = runs.filter(r => r.status === 'error').length;
    const latencies = runs.filter(r => r.latency_ms != null).map(r => r.latency_ms as number);
    const avgLatency = latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
      : 0;
    
    return { total, success, error: errors, avgLatency: Math.round(avgLatency) };
  },
};
