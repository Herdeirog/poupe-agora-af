UPDATE agents 
SET prompt = prompt || '

### Categorias e Gastos
[TOOL:saldoPorCategoria:{}] - Gastos do mês atual por categoria
[TOOL:saldoPorCategoria:{"month":12,"year":2025}] - Gastos de um mês específico

### Lembretes do Dia
[TOOL:consultaLembretesHoje:{}] - Lista lembretes do dia atual

## EXEMPLOS CORRETOS

Usuário: "Quanto gastei por categoria"
Resposta:
[TOOL:saldoPorCategoria:{}]

Usuário: "Gastos de dezembro"
Resposta:
[TOOL:saldoPorCategoria:{"month":12,"year":2025}]

Usuário: "Quais lembretes tenho hoje?"
Resposta:
[TOOL:consultaLembretesHoje:{}]

Usuário: "O que tenho pra fazer hoje?"
Resposta:
[TOOL:consultaLembretesHoje:{}]
',
updated_at = now()
WHERE slug = 'assistente_financeiro';