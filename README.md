# Workflow E2E

A complete workflow orchestration platform built with microservices architecture, featuring durable timers and HTTP actions.

## Architecture

This project consists of three main services:

- **API Service** (NestJS): Core workflow engine and REST API with integrated timer consumer
- **Web Frontend** (Next.js): User interface for managing workflows
- **Database** (PostgreSQL): Stores workflow definitions and executions
- **RabbitMQ**: Message broker with delayed message exchange for durable timers

## Features

- **Workflow Definition**: Create workflows with visual editor
- **HTTP Actions**: Execute HTTP requests as workflow steps
- **Durable Timers**: Wait for specified durations using RabbitMQ delayed message exchange
- **Event-Driven**: Handle external events via webhooks
- **REST API**: Full REST API for workflow management
- **Microservices**: Scalable architecture with separate concerns

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd workflow-e2e
```

### 2. Start All Services

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- RabbitMQ on ports 5672 (AMQP) and 15672 (Management UI)
- API service on port 3001
- Web frontend on port 3000

### 3. Access the Application

- **Web UI**: http://localhost:3000
- **API**: http://localhost:3001/api
- **Database**: localhost:5432 (postgres/postgres)

### 4. Initialize Database

The database schema will be created automatically via TypeORM when the API service starts.

## Development

### Local Development Setup

1. **Start infrastructure** (database and RabbitMQ):
```bash
docker-compose up -d db rabbit
```

2. **Install dependencies for each service**:
```bash
# API
cd api && npm install

# Web Frontend
cd ../web && npm install
```

3. **Start services individually**:

```bash
# Terminal 1: API Service
cd api && npm run dev

# Terminal 2: Web Frontend
cd web && npm run dev
```

### Environment Variables

#### API Service (.env)
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/workflow
RABBIT_URL=amqp://guest:guest@rabbit:5672
PORT=3001
```

#### Web Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## API Documentation

### Workflows

- `GET /api/workflows` - List all workflows
- `POST /api/workflows` - Create a new workflow
- `GET /api/workflows/:id` - Get workflow by ID
- `POST /api/workflows/:id/execute` - Execute a workflow

### Events

- `POST /api/events/timer` - Handle timer completion events
- `POST /api/events/webhook` - Handle webhook events

### Example Workflow Definition

```json
{
  "name": "Example Workflow",
  "definition": {
    "steps": [
      {
        "id": "http-step",
        "type": "http",
        "config": {
          "url": "https://api.example.com/data",
          "method": "GET"
        }
      },
      {
        "id": "timer-step",
        "type": "timer",
        "config": {
          "waitTime": 5000
        }
      }
    ]
  }
}
```

## Workflow Actions

### HTTP Action

Makes HTTP requests to external APIs.

**Configuration:**
```json
{
  "url": "https://api.example.com/endpoint",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer token"
  },
  "body": {
    "key": "value"
  }
}
```

### Timer Action

Waits for a specified duration. Uses RabbitMQ delayed message exchange for durability.

**Configuration:**
```json
{
  "waitTime": 10000  // milliseconds
}
```

## Testing

### API Tests
```bash
cd api
npm run test
```

### E2E Tests
```bash
cd api
npm run test:e2e
```

## Deployment

### Production Build

```bash
# Build all services
docker-compose build

# Start in production mode
docker-compose up -d
```

### Scaling

- **API Service**: Can be scaled horizontally behind a load balancer
- **Database**: Use connection pooling and read replicas for high load
- **RabbitMQ**: Can be clustered for high availability

## Monitoring

- Add health checks to all services
- Monitor RabbitMQ queue depth for timer events
- Track workflow execution metrics
- Set up logging aggregation
- Access RabbitMQ Management UI at http://localhost:15672 (guest/guest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License
