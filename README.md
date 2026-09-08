# Fingest — Gestão Financeira Pessoal

Sistema web de gestão financeira pessoal: contas, cartões, faturas, compras
parceladas, orçamento, metas e dashboard, com foco em correção financeira
(nunca inconsistências de saldo) e experiência premium.

📄 Arquitetura completa, modelo de dados e plano de implementação:
[`docs/ARQUITETURA.md`](docs/ARQUITETURA.md)

**Status: projeto completo — todas as 6 fases do plano de implementação.**

- **Fase 1:** arquitetura, banco de dados completo (todas as tabelas do
  modelo), autenticação JWT, layout responsivo com dark mode, Dashboard
  funcional (saldo real, cards reais, gráfico de fluxo de caixa, gastos por
  categoria) e módulo de Contas bancárias completo (CRUD).
- **Fase 2:** Receitas e Despesas (criar, listar com filtros de status e
  categoria, excluir — sempre sincronizado com o saldo real das contas),
  Categorias com subcategorias, e a experiência rápida de "+ Adicionar"
  (escolha Receita/Despesa) acessível de qualquer tela.
- **Fase 3:** Cartões de crédito (limite disponível sempre calculado, nunca
  armazenado), compras à vista e parceladas (regra de fechamento de fatura,
  divisão exata de centavos entre parcelas), fatura atual e próximas
  faturas por cartão, pagamento de fatura (gera movimentação real na conta
  escolhida) e cancelamento de compra (libera parcelas futuras pendentes).
- **Fase 4:** Transferências entre contas, recorrências (assinaturas,
  aluguel, salário — geradas automaticamente conforme vencem), orçamento
  mensal por categoria (com barra de progresso e alerta de estouro) e
  contas a pagar/receber (vencidas, hoje, próximos 7/30 dias).
- **Fase 5:** Metas financeiras (com aportes e progresso visual),
  calendário financeiro, busca global (atalho de teclado `/`), relatórios
  (evolução mensal, gastos por cartão/conta, exportação CSV) e insights
  calculados a partir de dados reais — nunca inventados.
- **Fase 6:** o sistema inteiro foi testado de ponta a ponta contra um
  banco real a cada fase — migrations, todas as regras de negócio críticas
  (ledger de contas, fechamento de fatura, parcelamento, recorrências,
  metas) e os ~65 endpoints da API. Testes automatizados formais e um
  hardening de segurança dedicado para produção continuam sendo uma boa
  evolução futura, mas o sistema já é funcional de ponta a ponta hoje.

Todos os detalhes de arquitetura, modelo de dados e regras de negócio estão
em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

---

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Recharts + Lucide Icons
- **Backend:** Python + FastAPI + SQLAlchemy + Pydantic + Alembic
- **Banco de dados:** MySQL 8
- **Orquestração:** Docker Compose

---

## Requisitos

- Docker e Docker Compose (recomendado — sobe tudo com um comando)
- Ou, para rodar sem Docker: Python 3.12+, Node.js 20+, MySQL 8 rodando localmente

---

## Como rodar com Docker (recomendado)

1. Copie o arquivo de variáveis de ambiente e edite os valores:

   ```bash
   cp .env.example .env
   ```

   No mínimo, defina `JWT_SECRET_KEY` (o compose recusa subir sem isso):

   ```bash
   python3 -c "import secrets; print(secrets.token_hex(32))"
   ```

   Cole o resultado em `JWT_SECRET_KEY=` no `.env`. Troque também
   `MYSQL_PASSWORD` e `MYSQL_ROOT_PASSWORD` para valores seus.

2. Suba os serviços:

   ```bash
   docker compose up -d --build
   ```

   Isso sobe o MySQL, roda as migrations automaticamente (o backend executa
   `alembic upgrade head` antes de iniciar) e sobe o backend e o frontend.

3. Acesse `http://localhost:8080` (ou a porta definida em `FRONTEND_PORT`).

4. (Opcional) Popule com dados de demonstração:

   ```bash
   docker compose exec backend python -m app.seed.seed_data
   ```

   Login gerado: `demo@fingest.app` / senha `demo12345`. Vem com contas,
   categorias, receita, despesas, um cartão de crédito com uma compra
   parcelada e uma à vista, uma recorrência (assinatura mensal), um
   orçamento definido e uma meta financeira com aporte já registrado —
   para você ver o sistema populado de ponta a ponta.

Para parar tudo: `docker compose down` (os dados do MySQL persistem no volume
`fingest_mysql_data`; use `docker compose down -v` para apagá-los também).

---

## Como rodar localmente sem Docker

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edite .env: aponte DATABASE_URL para seu MySQL local e defina JWT_SECRET_KEY

alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

A API sobe em `http://localhost:8000`, com documentação interativa em
`http://localhost:8000/docs`.

Para popular com dados de demonstração:

```bash
python -m app.seed.seed_data
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_URL deve apontar para http://localhost:8000/api quando rodando fora do Docker

npm run dev
```

O frontend sobe em `http://localhost:5173`.

---

## Variáveis de ambiente

### `backend/.env`

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão SQLAlchemy do MySQL |
| `JWT_SECRET_KEY` | Segredo para assinar tokens JWT — **gere um valor único em produção** |
| `JWT_ALGORITHM` | Algoritmo do JWT (padrão `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Validade do access token |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Validade do refresh token |
| `CORS_ORIGINS` | Origens autorizadas a chamar a API, separadas por vírgula |
| `TIMEZONE` | Fuso horário de referência (`America/Fortaleza`) |

### `frontend/.env`

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL base da API (`/api` quando atrás do Nginx do Docker; `http://localhost:8000/api` em dev local) |

### `.env` raiz (usado só pelo `docker-compose.yml`)

Ver `.env.example` na raiz — controla credenciais do MySQL, o `JWT_SECRET_KEY`
repassado ao backend, `CORS_ORIGINS` e a porta pública do frontend.

---

## Banco de dados e migrations

O schema completo (18 tabelas — contas, cartões, faturas, parcelas,
categorias, orçamento, metas, recorrências, notificações, auditoria etc.) é
criado pela migration inicial `backend/alembic/versions/0001_initial_schema.py`,
mesmo que esta Fase 1 só utilize uma parte dele na interface — isso evita
retrabalho de migration a cada fase futura.

Comandos úteis (dentro de `backend/`, com o ambiente virtual ativo ou dentro
do container):

```bash
alembic upgrade head        # aplica todas as migrations pendentes
alembic downgrade -1        # desfaz a última migration
alembic revision --autogenerate -m "descrição"   # gera uma nova migration a partir de mudanças nos models
```

---

## Criação de usuário

Não há usuário padrão além do seed de demonstração opcional. Crie sua conta
pela própria tela de cadastro em `/register`.

---

## Estrutura do projeto

```
fingest/
├── backend/          # API FastAPI (ver backend/app/ para routers, services, models)
├── frontend/          # SPA React
├── docker-compose.yml
├── docs/
│   └── ARQUITETURA.md # arquitetura completa, modelo de dados, regras de negócio
└── README.md
```

Detalhamento completo da estrutura de pastas, endpoints e fluxos principais
está em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

---

---

## Solução de problemas

### "ports are not available: ... bind: ... permissões de acesso" (Windows) ou "port is already allocated"

Isso significa que alguma porta que o Compose tenta usar já está ocupada por
outro programa na sua máquina — geralmente um MySQL local (XAMPP, WAMP, MySQL
Workbench/serviço do Windows) ocupando a porta **3306**.

O `docker-compose.yml` já **não expõe a porta do MySQL ao host por padrão**
justamente por causa disso — o backend continua falando com o MySQL
normalmente pela rede interna do Docker, então isso não afeta o funcionamento
do sistema, só impede você de conectar nele diretamente com um cliente
externo (DBeaver, Workbench etc.).

Se o erro persistir mencionando outra porta (8000 ou 8080), é a mesma causa:
edite o `.env` e troque `BACKEND_PORT` e/ou `FRONTEND_PORT` por portas livres
na sua máquina, por exemplo:

```
BACKEND_PORT=8001
FRONTEND_PORT=8081
```

Depois rode novamente:

```bash
docker compose up -d --build
```

Se quiser mesmo assim conectar um cliente MySQL externo ao banco do
container, edite `docker-compose.yml` e descomente as linhas de `ports` no
serviço `mysql`, trocando `3307` (ou outra porta livre) conforme necessário.

---

## Deploy em VPS (ex: Locaweb ou similar)

1. Instale Docker e Docker Compose no VPS.
2. Clone o repositório e configure o `.env` (senhas fortes, `JWT_SECRET_KEY`
   único, `CORS_ORIGINS` apontando para o domínio público real).
3. `docker compose up -d --build`.
4. Recomendado: coloque um Nginx (ou Caddy) na frente do container do
   frontend para TLS/HTTPS com Let's Encrypt, apontando para a porta
   `FRONTEND_PORT` exposta pelo compose. O Nginx interno do frontend já faz
   proxy de `/api` para o backend, então só é preciso expor a porta do
   frontend publicamente — a porta do backend (8000) e a do MySQL (3306) ficam
   restritas a `127.0.0.1` no `docker-compose.yml`, ou seja, não acessíveis
   de fora do servidor.
