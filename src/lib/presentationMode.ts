/**
 * Modo Apresentação
 * 
 * Quando ativo, desabilita funcionalidades de escrita para demonstração segura ao cliente.
 * - Lembretes automáticos são ocultados
 * - Botões de ação são desabilitados
 * - Dados são exibidos apenas para leitura
 */

export const PRESENTATION_MODE = true;

export const isPresentationMode = (): boolean => {
  return PRESENTATION_MODE || import.meta.env.VITE_PRESENTATION_MODE === 'true';
};
