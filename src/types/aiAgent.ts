export interface AIAgent {
  id?: string;
  slug: string;
  name: string;
  prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  active: boolean;
  description?: string;
  routing_keywords?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface EvolutionAPISettings {
  id?: string;
  api_url: string;
  instance_name: string;
  api_key: string;
  webhook_secret?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const AGENT_SLUGS = {
  FINANCIAL: 'assistente_financeiro',
  QUERY: 'agente_consulta',
  COMMITMENT: 'assistente_compromissos',
} as const;

export const DEFAULT_AGENTS: AIAgent[] = [
  {
    slug: 'assistente_financeiro',
    name: 'Assistente Financeiro',
    prompt: '',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 1024,
    active: true,
    description: 'Ajuda os usuários com dúvidas sobre finanças pessoais, orçamento e investimentos.',
    routing_keywords: ['gastei', 'recebi', 'anote', 'lançar', 'despesa', 'receita', 'transação', 'gasto', 'entrada', 'saída'],
  },
  {
    slug: 'agente_consulta',
    name: 'Agente de Consulta',
    prompt: '',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 1024,
    active: true,
    description: 'Responde perguntas gerais sobre o sistema e funcionalidades.',
    routing_keywords: ['como', 'onde', 'qual', 'quando', 'ajuda', 'funciona', 'sistema', 'explicar'],
  },
  {
    slug: 'assistente_compromissos',
    name: 'Assistente de Compromissos',
    prompt: '',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 1024,
    active: true,
    description: 'Auxilia no gerenciamento de compromissos financeiros e lembretes.',
    routing_keywords: ['lembrete', 'lembra', 'agenda', 'pagar', 'vencimento', 'prazo', 'compromisso', 'agendar', 'avisar'],
  },
];
