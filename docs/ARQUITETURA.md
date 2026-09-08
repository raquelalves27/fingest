# Fingest — Sistema Web de Gestão Financeira Pessoal
## Documento de Arquitetura

---

## 1. Arquitetura Proposta

```
┌─────────────────────┐        HTTPS/JSON        ┌──────────────────────┐
│   Frontend (SPA)     │ ────────────────────────▶│   Backend (API REST) │
│ React + TS + Vite    │◀──────────────────────── │  FastAPI + SQLAlchemy│
│ Tailwind + shadcn/ui  │                          │  Pydantic + Alembic  │
└─────────────────────┘                           └──────────┬───────────┘
                                                               │ SQL
                                                    ┌──────────▼───────────┐
                                                    │      MySQL 8         │
                                                    └───────────────────────┘

           Todos os serviços orquestrados via docker-compose,
           atrás de um Nginx (reverse proxy + TLS) no VPS.
```

**Por que essa divisão:**
- Backend nunca confia no frontend para cálculos financeiros. Saldo, fatura, parcela — tudo é calculado e validado no backend, a partir de transações no banco. O frontend só exibe.
- Camadas no backend (`routers → services → repositories → models`) separam "o que a API expõe" de "a regra de negócio" de "o acesso a dados". Isso é o que te permite, por exemplo, mudar a regra de fechamento de fatura em um lugar só.
- MySQL com FKs e constraints reais — nada de guardar parcelas como JSON dentro de uma coluna. Isso é inegociável dado o requisito de "nunca permitir inconsistências financeiras".

---

## 2. Modelo de Dados

### 2.1 Decisões de modelagem (por que ficou assim)

**Ledger único por trás de tudo.** Em vez de você somar "receitas − despesas − faturas" na hora de calcular saldo (frágil, fácil de esquecer um caso), toda alteração de saldo de conta passa por uma tabela `account_transactions` (um ledger). Receita, despesa paga, pagamento de fatura, transferência — todos geram linhas nesse ledger. O saldo de uma conta é **sempre** `saldo_inicial + soma(ledger)`, nunca um campo editado diretamente. Isso resolve de graça os requisitos da seção 35 (estorno, exclusão, recálculo).

**Compra parcelada é uma entidade própria, com parcelas filhas.** Exatamente como pedido na seção 12: `credit_card_purchases` (a compra) 1:N `credit_card_installments` (cada parcela). Cada parcela aponta pra uma fatura (`credit_card_invoices`). Uma despesa avulsa no cartão (à vista) é tecnicamente uma compra de 1 parcela só — mesmo modelo, sem caso especial.

**Fatura é gerada, não é um cálculo em tempo real.** `credit_card_invoices` tem uma linha por cartão por mês/ano, com status (`aberta`, `fechada`, `paga`). Quando uma parcela ou compra à vista é lançada, o sistema decide (pela data da compra vs. dia de fechamento do cartão) em qual fatura (existente ou nova) ela cai. Isso é o requisito da seção 14.

**Categorias com auto-relacionamento** em vez de duas tabelas (`categories` + `subcategories`): uma subcategoria é só uma `category` com `parent_id` preenchido. Menos duplicação de código de CRUD, mesmo resultado.

**Valores monetários: `DECIMAL(14,2)`, nunca FLOAT.** Em todo o schema.

**Soft delete** (`deleted_at`) em entidades que têm histórico financeiro que não pode simplesmente sumir (despesas, receitas, compras) — excluir "esconde" mas o dado permanece auditável. Entidades de cadastro puro (categoria, conta, cartão) também usam soft delete para não quebrar FKs de lançamentos antigos.

### 2.2 Diagrama de entidades

```
users
 ├─< accounts (contas bancárias/carteiras)
 │    └─< account_transactions (LEDGER — fonte da verdade do saldo)
 ├─< categories (self-referencing: parent_id → subcategoria)
 ├─< credit_cards
 │    └─< credit_card_invoices (uma por mês/cartão)
 │         └─< credit_card_installments ──> credit_card_purchases
 ├─< incomes (receitas)
 ├─< expenses (despesas avulsas, não-cartão)
 ├─< transfers (entre accounts)
 ├─< recurring_transactions (gera incomes/expenses futuros)
 ├─< budgets (mês/ano) ─< budget_categories
 ├─< financial_goals ─< goal_contributions
 ├─< notifications
 └─< audit_logs
```

### 2.3 Tabelas principais (colunas-chave)

**users**
`id, name, email (unique), password_hash, created_at, updated_at`

**accounts**
`id, user_id, name, bank, type(checking|savings|wallet|investment|cash), initial_balance DECIMAL(14,2), color, icon, is_active, created_at, updated_at, deleted_at`

**account_transactions** (ledger — nunca editado manualmente pelo usuário; sempre gerado pelo backend a partir de um evento)
`id, account_id, amount DECIMAL(14,2) [+ entrada / − saída], type(income|expense|transfer_in|transfer_out|invoice_payment|adjustment), reference_type, reference_id, description, transaction_date, created_at`
- `reference_type/reference_id` apontam de volta pra income/expense/transfer/invoice que originou a linha — rastreabilidade total.

**categories**
`id, user_id, parent_id (nullable, self-FK), name, icon, color, type(income|expense), created_at, updated_at, deleted_at`

**credit_cards**
`id, user_id, name, bank, brand, credit_limit DECIMAL(14,2), closing_day (1-31), due_day (1-31), color, last_four_digits, is_active, created_at, updated_at, deleted_at`

**credit_card_invoices**
`id, credit_card_id, reference_month, reference_year, closing_date, due_date, status(open|closed|paid), total_amount DECIMAL(14,2) [calculado], paid_at, paid_from_account_id (FK accounts, nullable), created_at, updated_at`
- unique(`credit_card_id, reference_month, reference_year`)

**credit_card_purchases**
`id, credit_card_id, description, total_amount DECIMAL(14,2), purchase_date, installments_count, category_id, status(active|cancelled), created_at, updated_at, deleted_at`

**credit_card_installments**
`id, purchase_id, invoice_id, installment_number, total_installments, amount DECIMAL(14,2), status(pending|paid|cancelled), created_at, updated_at`

**incomes**
`id, user_id, account_id, category_id, description, amount DECIMAL(14,2), income_date, status(expected|received|late|cancelled), recurring_transaction_id (nullable), notes, created_at, updated_at, deleted_at`

**expenses**
`id, user_id, account_id (nullable se ainda "pendente" sem conta definida), category_id, description, amount DECIMAL(14,2), expense_date, payment_method, status(pending|paid|late|cancelled), recurring_transaction_id (nullable), notes, created_at, updated_at, deleted_at`

**transfers**
`id, user_id, from_account_id, to_account_id, amount DECIMAL(14,2), transfer_date, description, created_at`

**recurring_transactions**
`id, user_id, type(income|expense), description, amount DECIMAL(14,2), category_id, account_id, frequency(monthly|weekly|yearly|custom), start_date, end_date (nullable), next_occurrence_date, is_active, created_at, updated_at`

**budgets** / **budget_categories**
`budgets: id, user_id, reference_month, reference_year, created_at`
`budget_categories: id, budget_id, category_id, planned_amount DECIMAL(14,2)`

**financial_goals** / **goal_contributions**
`financial_goals: id, user_id, name, target_amount DECIMAL(14,2), target_date, status(active|completed|cancelled), created_at`
`goal_contributions: id, goal_id, amount DECIMAL(14,2), contribution_date, account_id (nullable), created_at`

**notifications**
`id, user_id, type, title, message, is_read, related_entity_type, related_entity_id, created_at`

**audit_logs**
`id, user_id, action(create|update|delete|pay|reverse), entity_type, entity_id, changes JSON, created_at`
(Única tabela onde JSON faz sentido — é log, não relacionamento.)

### 2.4 Regra de fechamento de fatura (a mais delicada)

```
Dado: cartão fecha dia D (closing_day)
Dado: compra feita na data C

Se dia(C) <= D:  a compra entra na fatura do mês(C)/ano(C)
Se dia(C) >  D:  a compra entra na fatura do mês seguinte

A fatura correspondente é buscada (unique credit_card_id+mês+ano);
se não existir, é criada nesse momento com status 'open',
closing_date e due_date calculados a partir de closing_day/due_day.
```
Isso roda dentro de uma função de service (`invoice_service.resolve_invoice_for_date`), usada tanto para parcelas quanto compra à vista — um único ponto de verdade.

---

## 3. Estrutura de Pastas

```
fingest/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── dependencies.py          # get_current_user, get_db
│   │   ├── models/                  # SQLAlchemy ORM (1 arquivo por domínio)
│   │   ├── schemas/                 # Pydantic (request/response)
│   │   ├── repositories/            # queries puras, sem regra de negócio
│   │   ├── services/                # regra de negócio (ex: invoice_service, balance_service)
│   │   ├── routers/                 # endpoints HTTP, finos, chamam services
│   │   ├── core/
│   │   │   ├── security.py          # JWT, hash de senha
│   │   │   └── exceptions.py
│   │   └── seed/                    # dados de demonstração
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── modules/                 # 1 pasta por domínio: dashboard, accounts, cards, ...
│   │   │   └── <modulo>/
│   │   │       ├── components/
│   │   │       ├── hooks/
│   │   │       ├── api.ts
│   │   │       └── types.ts
│   │   ├── components/ui/           # shadcn
│   │   ├── components/shared/       # componentes reutilizáveis entre módulos
│   │   ├── lib/                     # axios client, formatters (moeda/data), utils
│   │   ├── contexts/                # auth, theme
│   │   ├── routes/
│   │   └── main.tsx
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
├── docs/
│   └── ARQUITETURA.md
└── README.md
```

---

## 4. Telas (todas as fases concluídas)

**Fase 1:**
1. Login / Cadastro
2. Dashboard (saldo total, cards de receita/despesa/fatura/saldo previsto, gráfico de fluxo básico)
3. Contas bancárias (listar, criar, editar, ver saldo)
4. Layout base (sidebar/nav responsiva, dark mode, topbar)

**Fase 2:**
5. Receitas (listar com filtros de status/categoria, criar, excluir)
6. Despesas (listar com filtros de status/categoria, criar, excluir)
7. Categorias (criar/excluir, com subcategorias, separadas por tipo receita/despesa)
8. "+ Adicionar" rápido (modal com escolha Receita/Despesa) acessível de qualquer tela

**Fase 3:**
9. Cartões (criar, ver limite disponível calculado em tempo real)
10. Compras no cartão — à vista e parceladas (com preview do valor por parcela)
11. Fatura atual em destaque + lista de próximas faturas por cartão
12. Pagamento de fatura (escolhendo a conta de débito)
13. Cancelamento de compra (cancela parcelas futuras pendentes, mantém as já pagas)

**Fase 4:**
14. Transferências entre contas
15. Recorrências (assinaturas, aluguel, salário — geração automática de ocorrências vencidas)
16. Orçamento mensal por categoria (com barra de progresso e alerta de estouro)
17. Contas a pagar/receber (vencidas, hoje, próximos 7/30 dias)

**Fase 5:**
18. Metas financeiras (com aportes e progresso visual)
19. Calendário financeiro (visão mensal com indicadores por dia)
20. Busca global (atalho de teclado `/`)
21. Relatórios (evolução mensal, gastos por cartão/conta, exportação CSV)
22. Insights (calculados a partir de dados reais, nunca inventados) — integrados ao Dashboard

---

## 5. Fluxos Principais

**Cadastro de despesa paga →** cria `expenses` com status `paid` → gera 1 linha em `account_transactions` (saída) → saldo da conta reflete automaticamente (é soma, não campo editado).

**Compra parcelada no cartão →** cria `credit_card_purchases` → gera N `credit_card_installments` com valores (tratando resto de divisão na última parcela para não perder centavos) → cada parcela resolve sua fatura via `resolve_invoice_for_date` → total da fatura é sempre derivado (soma das parcelas não canceladas), nunca armazenado.

**Pagamento de fatura →** status da invoice → `paid` → gera `account_transactions` (saída na conta escolhida) → gera `paid_from_account_id` + `paid_at` → limite disponível do cartão é recalculado (soma de parcelas pendentes de faturas não pagas).

**Exclusão/estorno de despesa, receita ou transferência →** soft delete (ou hard delete no caso de transferência) + gera `account_transactions` inversa (nunca edita a linha original) → saldo recalcula automaticamente por ser soma.

**Recorrência →** ao criar, materializa a primeira ocorrência e calcula `next_occurrence_date`. Em toda consulta à lista de recorrências (e ao abrir o Dashboard), `generate_due_occurrences` materializa qualquer ocorrência vencida desde a última visita — sem necessidade de um scheduler em background.

**Meta financeira →** `saved_amount` é sempre a soma das `goal_contributions` — nunca um campo editado. Um aporte pode opcionalmente debitar de uma conta real (gera saída no ledger) ou ser apenas informativo. A meta muda para `completed` automaticamente ao atingir o valor alvo.

---

## 6. Regras de Negócio Críticas

1. Saldo de conta = `initial_balance + SUM(account_transactions.amount)`. Nunca um campo mutável direto.
2. Toda operação que mexe em mais de uma tabela (pagar fatura, transferência, cancelar parcelado, aporte em meta) roda dentro de uma transação de banco (commit único; rollback automático em qualquer exceção não tratada).
3. Limite disponível do cartão = `credit_limit − SUM(installments pendentes de faturas não pagas)` — sempre derivado, nunca armazenado.
4. Isolamento por usuário: toda query de service filtra por `user_id` — nunca confiar em vir do frontend; sempre do JWT.
5. Parcelas: última parcela absorve o resto da divisão (ex: R$100 em 3x = 33,33 + 33,33 + 33,34).
6. Nada de FLOAT em dinheiro: `DECIMAL(14,2)` do banco até o Pydantic (`condecimal`).
7. Insights nunca inventam dado: todo texto vem de um número calculado a partir do banco; se não há dado suficiente para uma comparação, o insight é omitido.

---

## 7. Plano de Implementação

- **Fase 1 (concluída):** arquitetura, banco (todas as tabelas via Alembic, pensando no modelo completo — não só o que a Fase 1 usa na tela, para não ter que migrar tudo de novo), autenticação JWT completa, layout responsivo com dark mode, Dashboard funcional (saldo real, cards reais, gráfico real), módulo de Contas completo (CRUD).
- **Fase 2 (concluída):** Receitas, Despesas, Categorias (com subcategorias), filtros por status/categoria, experiência rápida de "+ Adicionar" com escolha de tipo.
- **Fase 3 (concluída):** Cartões de crédito, compras à vista e parceladas (regra de fechamento de fatura, divisão exata de centavos), faturas (fatura atual, próximas faturas, pagamento gerando movimentação real no ledger), limite disponível sempre derivado (nunca armazenado), cancelamento de compra com liberação de parcelas futuras.
- **Fase 4 (concluída):** Transferências entre contas, recorrências (geração automática de ocorrências vencidas), orçamento mensal por categoria (gasto sempre derivado das despesas reais), contas a pagar/receber (visão agrupada por urgência sobre despesas/receitas pendentes).
- **Fase 5 (concluída):** Metas financeiras (progresso sempre derivado das contribuições), calendário financeiro, busca global (receitas, despesas, compras, contas, cartões), relatórios (evolução mensal, gastos por cartão/conta, exportação CSV), insights calculados a partir de dados reais.
- **Fase 6 (parcialmente coberta):** todo o sistema foi testado ponta a ponta contra um banco real a cada fase (migrations, regras de negócio críticas — ledger, fechamento de fatura, parcelamento, recorrência, metas — e todos os ~65 endpoints da API). Testes automatizados formais (pytest), otimizações de performance para milhares de lançamentos e um hardening de segurança dedicado para produção ficam como próximo passo natural, mas não bloqueiam o uso do sistema hoje.

Vou implementar o schema completo do banco já na Fase 1 (todas as tabelas do modelo acima), mesmo que a tela só use uma parte — isso evita retrabalho de migration a cada fase nova, e é mais barato fazer agora do que depois.
