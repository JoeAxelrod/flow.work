# Project Structure

```
workflow-e2e/
│
├── api/                          # NestJS Backend API
│   ├── src/
│   │   ├── actions/              # Action handlers
│   │   │   ├── http.exec.ts      # HTTP execution action
│   │   │   └── time.producer.ts  # Timer producer action
│   │   │
│   │   ├── common/               # Shared utilities
│   │   │   ├── http.ts           # HTTP client utilities
│   │   │   ├── logging.interceptor.ts  # Global request logging
│   │   │   └── validation.ts     # Validation utilities
│   │   │
│   │   ├── engine/               # Workflow engine
│   │   │   ├── engine.controller.ts
│   │   │   ├── engine.module.ts
│   │   │   └── engine.service.ts  # Core workflow execution logic
│   │   │
│   │   ├── events/                # Event handling
│   │   │   ├── events.controller.ts
│   │   │   ├── events.module.ts
│   │   │   └── events.service.ts
│   │   │
│   │   ├── hooks/                 # Webhook endpoints
│   │   │   └── hooks.controller.ts
│   │   │
│   │   ├── workflows/             # Workflow management
│   │   │   ├── workflow.entity.ts
│   │   │   ├── workflows.controller.ts
│   │   │   ├── workflows.module.ts
│   │   │   └── workflows.service.ts
│   │   │
│   │   ├── app.module.ts         # Root module
│   │   ├── db.module.ts          # Database module
│   │   ├── db.ts                 # Database connection
│   │   └── main.ts               # Application entry point
│   │
│   ├── dist/                      # Compiled JavaScript (generated)
│   ├── Dockerfile
│   ├── env.example
│   ├── nest-cli.json
│   ├── package.json
│   ├── schema.sql                 # Database schema
│   └── tsconfig.json
│
├── web/                           # Next.js Frontend
│   ├── app/                       # Next.js App Router
│   │   ├── api-client.ts         # API client utilities
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── mui-theme-provider.tsx  # Material-UI theme provider
│   │   ├── page.tsx              # Home page
│   │   └── workflows/            # Workflow pages
│   │       ├── [id]/             # Dynamic route
│   │       │   └── editor/
│   │       │       ├── EdgeModal.tsx      # Edge configuration modal
│   │       │       ├── helpers.ts         # Editor helper functions
│   │       │       ├── NodeModal.tsx      # Node configuration modal
│   │       │       ├── page.tsx           # Workflow editor page
│   │       │       ├── StationNode.tsx    # Station node component
│   │       │       ├── types.ts           # TypeScript type definitions
│   │       │       └── WorkflowEditorContext.tsx  # Editor context provider
│   │       └── page.tsx          # Workflows list
│   │
│   ├── Dockerfile
│   ├── next.config.js
│   ├── next-env.d.ts             # Next.js environment types
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml             # Docker orchestration
├── postgresql.conf                # PostgreSQL configuration
├── Cargo.toml                     # Rust project config (for test script)
│
├── README.md                      # Main project documentation
├── PROJECT_STRUCTURE.md           # This file
├── JS_TEST_HOOK_README.md         # JavaScript test hook documentation
├── RUST_TEST_HOOK_README.md       # Rust test hook documentation
│
├── test-hook.js                   # Node.js test script
├── test-hook.ps1                  # PowerShell test script
├── test-hook.rs                   # Rust test script
├── reset-db.ps1                   # Database reset script
├── run-all.ps1                    # Run all services script
└── prompt                         # Prompt file
```

## Key Components

### Backend (API)
- **Engine Service**: Core workflow execution engine with RabbitMQ integration
- **Workflows Service**: Workflow CRUD operations and station management
- **Hooks Controller**: Webhook endpoints for external triggers
- **Events Service**: Event handling system
- **Actions**: HTTP execution and timer producers

### Frontend (Web)
- **Next.js App Router**: Modern React framework
- **Workflow Editor**: Visual workflow editor interface
- **API Client**: Frontend API communication utilities

### Infrastructure
- **Docker Compose**: Multi-container setup (API, Web, Database, RabbitMQ)
- **PostgreSQL**: Database for workflows, stations, edges, activities
- **RabbitMQ**: Message queue for timer-based workflow delays

