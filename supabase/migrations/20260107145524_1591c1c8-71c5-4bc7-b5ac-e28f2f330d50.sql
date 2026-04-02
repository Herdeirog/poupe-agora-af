UPDATE agents 
SET prompt = prompt || '

### Criar Lembretes
[TOOL:criaLembrete:{"description":"Descrição","date":"YYYY-MM-DD"}]
[TOOL:criaLembrete:{"description":"Descrição","date":"YYYY-MM-DD","time":"HH:MM","amount":100}]
[TOOL:criaLembrete:{"description":"Descrição","date":"YYYY-MM-DD","recurrence":"monthly"}]

Parâmetros:
- description: Descrição do lembrete (obrigatório)
- date: Data no formato YYYY-MM-DD (obrigatório)
- time: Horário no formato HH:MM (opcional)
- amount: Valor em reais (opcional)
- recurrence: once (padrão), daily, weekly, monthly (opcional)

## EXEMPLOS CORRETOS

Usuário: "Me lembra de pagar o aluguel dia 10"
Resposta:
[TOOL:criaLembrete:{"description":"Pagar aluguel","date":"2026-01-10"}]

Usuário: "Lembrete: reunião amanhã às 14h"
(se hoje é 07/01/2026)
Resposta:
[TOOL:criaLembrete:{"description":"Reunião","date":"2026-01-08","time":"14:00"}]

Usuário: "Criar lembrete mensal pra pagar internet dia 15, R$ 99"
Resposta:
[TOOL:criaLembrete:{"description":"Pagar internet","date":"2026-01-15","amount":99,"recurrence":"monthly"}]

Usuário: "Me avisa toda semana pra fazer backup"
Resposta:
[TOOL:criaLembrete:{"description":"Fazer backup","date":"2026-01-14","recurrence":"weekly"}]
',
updated_at = now()
WHERE slug = 'assistente_financeiro';