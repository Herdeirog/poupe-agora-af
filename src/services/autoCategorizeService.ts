// Auto-categorization rules based on description keywords
const categoryRules: { categoryId: string; keywords: string[] }[] = [
  {
    categoryId: 'cat-1', // Alimentação
    keywords: ['mercado', 'supermercado', 'feira', 'hortifruti', 'açougue', 'padaria', 'almoço', 'janta', 'lanche', 'restaurante', 'ifood', 'rappi'],
  },
  {
    categoryId: 'cat-2', // Transporte
    keywords: ['uber', '99', 'transporte', 'combustível', 'gasolina', 'álcool', 'etanol', 'estacionamento', 'pedágio', 'ônibus', 'metrô', 'passagem'],
  },
  {
    categoryId: 'cat-3', // Moradia
    keywords: ['aluguel', 'condomínio', 'água', 'luz', 'energia', 'gás', 'internet', 'iptu', 'manutenção', 'reparo'],
  },
  {
    categoryId: 'cat-4', // Saúde
    keywords: ['farmácia', 'médico', 'saúde', 'hospital', 'consulta', 'exame', 'remédio', 'dentista', 'psicólogo', 'academia', 'plano de saúde'],
  },
  {
    categoryId: 'cat-5', // Lazer
    keywords: ['cinema', 'show', 'lazer', 'bar', 'balada', 'festa', 'netflix', 'spotify', 'streaming', 'jogo', 'viagem', 'hotel', 'passeio'],
  },
  {
    categoryId: 'cat-6', // Educação
    keywords: ['curso', 'livro', 'escola', 'faculdade', 'universidade', 'mensalidade', 'material', 'apostila', 'udemy', 'alura'],
  },
  {
    categoryId: 'cat-7', // Salário (income)
    keywords: ['salário', 'holerite', 'pagamento', 'ordenado', 'remuneração'],
  },
  {
    categoryId: 'cat-8', // Freelance (income)
    keywords: ['freelance', 'projeto', 'consultoria', 'serviço prestado', 'comissão'],
  },
  {
    categoryId: 'cat-9', // Investimentos
    keywords: ['investimento', 'rendimento', 'dividendo', 'juros', 'poupança', 'cdb', 'ação', 'fundo'],
  },
];

export function autoCategorize(description: string): string {
  const normalizedDescription = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  for (const rule of categoryRules) {
    for (const keyword of rule.keywords) {
      const normalizedKeyword = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalizedDescription.includes(normalizedKeyword)) {
        return rule.categoryId;
      }
    }
  }
  
  return 'cat-10'; // Outros (default)
}

export function suggestCategoryFromDescription(description: string): { categoryId: string; confidence: 'high' | 'medium' | 'low' } {
  const categoryId = autoCategorize(description);
  
  if (categoryId === 'cat-10') {
    return { categoryId, confidence: 'low' };
  }
  
  // Check if multiple keywords match for higher confidence
  const normalizedDescription = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const rule = categoryRules.find(r => r.categoryId === categoryId);
  
  if (rule) {
    const matchCount = rule.keywords.filter(keyword => {
      const normalizedKeyword = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalizedDescription.includes(normalizedKeyword);
    }).length;
    
    if (matchCount >= 2) {
      return { categoryId, confidence: 'high' };
    }
  }
  
  return { categoryId, confidence: 'medium' };
}
