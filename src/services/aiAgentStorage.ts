import { AIAgent, EvolutionAPISettings, DEFAULT_AGENTS } from "@/types/aiAgent";

const AGENTS_STORAGE_KEY = 'ai_agents_config';
const EVOLUTION_STORAGE_KEY = 'evolution_api_settings';

export const aiAgentStorage = {
  getAgents: (): AIAgent[] => {
    try {
      const stored = localStorage.getItem(AGENTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all agents exist
        return DEFAULT_AGENTS.map(defaultAgent => {
          const savedAgent = parsed.find((a: AIAgent) => a.slug === defaultAgent.slug);
          return savedAgent ? { ...defaultAgent, ...savedAgent } : defaultAgent;
        });
      }
      return DEFAULT_AGENTS;
    } catch (error) {
      console.error('Error loading agents:', error);
      return DEFAULT_AGENTS;
    }
  },

  getAgentBySlug: (slug: string): AIAgent | undefined => {
    const agents = aiAgentStorage.getAgents();
    return agents.find(agent => agent.slug === slug);
  },

  saveAgent: (agent: AIAgent): void => {
    try {
      const agents = aiAgentStorage.getAgents();
      const index = agents.findIndex(a => a.slug === agent.slug);
      if (index !== -1) {
        agents[index] = { ...agent, updated_at: new Date().toISOString() };
      }
      localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
    } catch (error) {
      console.error('Error saving agent:', error);
      throw error;
    }
  },

  getEvolutionSettings: (): EvolutionAPISettings => {
    try {
      const stored = localStorage.getItem(EVOLUTION_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return {
        active: false,
        api_url: '',
        instance_name: '',
        api_key: '',
        webhook_secret: '',
      };
    } catch (error) {
      console.error('Error loading Evolution settings:', error);
      return {
        active: false,
        api_url: '',
        instance_name: '',
        api_key: '',
        webhook_secret: '',
      };
    }
  },

  saveEvolutionSettings: (settings: EvolutionAPISettings): void => {
    try {
      localStorage.setItem(EVOLUTION_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving Evolution settings:', error);
      throw error;
    }
  },
};
