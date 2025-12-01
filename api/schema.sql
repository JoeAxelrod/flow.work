CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- enums
DO $$ BEGIN
  CREATE TYPE node_kind AS ENUM ('http','hook','timer','join','workflow');
EXCEPTION WHEN duplicate_object THEN END $$;

-- Add 'workflow' to existing enum if it doesn't exist
DO $$ BEGIN
  ALTER TYPE node_kind ADD VALUE IF NOT EXISTS 'workflow';
EXCEPTION WHEN duplicate_object THEN END $$;

DO $$ BEGIN
  CREATE TYPE edge_kind AS ENUM ('normal','if');
EXCEPTION WHEN duplicate_object THEN END $$;

DO $$ BEGIN
  CREATE TYPE activity_status AS ENUM ('created','running','success','failed','skipped');
EXCEPTION WHEN duplicate_object THEN END $$;

DO $$ BEGIN
  CREATE TYPE instance_status AS ENUM ('running','success','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN END $$;

-- workflows
CREATE TABLE IF NOT EXISTS public._workflow (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- nodes
CREATE TABLE IF NOT EXISTS public._node (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES public._workflow(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,                 -- was "name"
  kind        node_kind NOT NULL,           -- explicit column
  position    JSONB NOT NULL DEFAULT '{}'::jsonb,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- edges (source/target reference _node)
CREATE TABLE IF NOT EXISTS public._edge (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id     UUID NOT NULL REFERENCES public._node(id) ON DELETE CASCADE,
  target_id     UUID NOT NULL REFERENCES public._node(id) ON DELETE CASCADE,
  kind          edge_kind NOT NULL DEFAULT 'normal',
  condition     TEXT NULL,
  source_handle TEXT NULL,
  target_handle TEXT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_edge_source ON public._edge(source_id);
CREATE INDEX IF NOT EXISTS idx_edge_target ON public._edge(target_id);

-- workflow instances
CREATE TABLE IF NOT EXISTS public._instance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES public._workflow(id) ON DELETE CASCADE,
  parent_instance_id UUID NULL REFERENCES public._instance(id) ON DELETE CASCADE,
  status      instance_status NOT NULL DEFAULT 'running',
  input       JSONB NOT NULL DEFAULT '{}'::jsonb,
  output      JSONB NOT NULL DEFAULT '{}'::jsonb,
  error       TEXT,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_instance_workflow ON public._instance(workflow_id);
CREATE INDEX IF NOT EXISTS idx_instance_parent ON public._instance(parent_instance_id);

-- activities (no action_id)
CREATE TABLE IF NOT EXISTS public._activity (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES public._instance(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public._workflow(id) ON DELETE CASCADE,
  node_id     UUID NOT NULL REFERENCES public._node(id),
  status      activity_status NOT NULL DEFAULT 'created',
  input       JSONB NOT NULL DEFAULT '{}'::jsonb,
  output      JSONB NOT NULL DEFAULT '{}'::jsonb,
  error       TEXT,
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_instance ON public._activity(instance_id);

-- replication probe table for health checks
CREATE TABLE IF NOT EXISTS _replication_probe (
  id        text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
