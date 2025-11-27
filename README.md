# Workflow E2E

Workflow orchestration platform with visual editor, HTTP actions, durable timers, and webhook support.

## Architecture

- **API Service** (NestJS/Fastify): Workflow engine and REST API on port 3001
- **Web Frontend** (Next.js): Visual workflow editor on port 3000
- **PostgreSQL**: Stores workflows, nodes, edges, and activity executions
- **RabbitMQ**: Message queue for durable timer delays using dead-letter exchange pattern

## Components

### Node Types
- `http`: Execute HTTP requests
- `hook`: Webhook entry point (waits for external POST)
- `timer`: Delay execution using RabbitMQ
- `join`: Wait for multiple paths with conditions
- `noop`: No operation

### Edge Types
- `normal`: Unconditional flow
- `if`: Conditional flow (evaluates condition from activity state)
- `loop`: Loop flow

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local development)

### Start Infrastructure

```bash
docker-compose up -d db rabbit
```

This starts:
- PostgreSQL on port 5432 (user: postgres, password: postgres, database: workflow)
- RabbitMQ on ports 5672 (AMQP) and 15672 (Management UI, guest/guest)
- DbGate on port 3003 (database admin UI)

### Initialize Database

```bash
cd api
npm install
npm run db:init
```

Or manually:
```bash
docker compose run --rm api sh -lc "psql -h db -U postgres -d workflow -f ./schema.sql"
```

### Run Services Locally

**API Service:**
```bash
cd api
npm install
npm run start:dev
```

**Web Frontend:**
```bash
cd web
npm install
npm run dev
```

### Environment Variables

**API** (`api/.env`):
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/workflow
RABBIT_URL=amqp://guest:guest@localhost:5672
PORT=3001
```

**Web** (`web/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## API Endpoints

### Workflows
- `GET /api/v1/workflows` - List all workflows
- `POST /api/v1/workflows` - Create workflow (body: `{ name: string }`)
- `GET /api/v1/workflows/:id` - Get workflow definition with nodes and edges
- `POST /api/v1/workflows/:id` - Execute workflow (body: initial payload for first node)
- `POST /api/v1/workflows/import` - Import workflow definition (nodes, edges, actions)

### Webhooks
- `POST /api/v1/hook/workflow/:workflowId/node/:nodeId` - Trigger specific hook node (body: `{ instanceId: string, ...data }`)
- `POST /api/v1/hook/workflow/:workflowId` - General hook endpoint (body: `{ workflow_node: string, instanceId: string, ...data }`)

## Database Schema

- `_workflow`: Workflow definitions (id, name, created_at)
- `_node`: Workflow nodes (id, workflow_id, label, kind, position, data)
- `_edge`: Connections between nodes (source_id, target_id, kind, condition)
- `_activity`: Execution history (instance_id, workflow_id, node_id, status, input, output, error)

## Timer Implementation

Timers use RabbitMQ dead-letter exchange:
1. Timer node publishes message to `timer.delay` queue with TTL expiration
2. After expiration, message dead-letters to `timer.fired` queue
3. Consumer processes fired messages and resumes workflow execution

## Workflow Execution

1. Create workflow instance: `POST /api/v1/workflows/:id` returns `instanceId`
2. Engine executes nodes sequentially based on edges
3. Each node execution creates an `_activity` record
4. Node output becomes input for next node
5. Conditional edges evaluate expressions like `path.to.value = "expected"`
6. Timer nodes pause execution until RabbitMQ message fires
7. Hook nodes pause until external POST to webhook endpoint

## Development

### Database Reset
```bash
.\reset-db.ps1
```

### Run All Services
```bash
.\run-all.ps1
```

## Project Structure

- `api/src/`: NestJS backend
  - `engine/`: Workflow execution engine
  - `workflows/`: Workflow CRUD operations
  - `hooks/`: Webhook endpoints
  - `actions/`: Node action handlers
- `web/app/`: Next.js frontend
  - `workflows/[id]/editor/`: Visual workflow editor (React Flow)
- `schema.sql`: Database schema definition
