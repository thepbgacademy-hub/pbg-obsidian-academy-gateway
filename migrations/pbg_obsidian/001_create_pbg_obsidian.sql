CREATE SCHEMA IF NOT EXISTS pbg_obsidian;

CREATE TYPE pbg_obsidian.device_status AS ENUM ('active', 'replaced', 'revoked');
CREATE TYPE pbg_obsidian.session_status AS ENUM ('active', 'expired', 'revoked');
CREATE TYPE pbg_obsidian.workflow_run_status AS ENUM ('queued', 'running', 'completed', 'failed', 'canceled');

CREATE TABLE pbg_obsidian.plugin_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES academy_core.students(id) ON DELETE CASCADE,
  vault_id_hash text NOT NULL,
  device_fingerprint_hash text NOT NULL,
  plugin_version text NOT NULL,
  status pbg_obsidian.device_status NOT NULL DEFAULT 'active',
  registered_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  replaced_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT plugin_devices_hash_check CHECK (length(vault_id_hash) >= 32 AND length(device_fingerprint_hash) >= 32)
);

CREATE UNIQUE INDEX plugin_devices_one_active_student_idx
  ON pbg_obsidian.plugin_devices(student_id)
  WHERE status = 'active';

CREATE TABLE pbg_obsidian.plugin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES academy_core.students(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES pbg_obsidian.plugin_devices(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL UNIQUE,
  status pbg_obsidian.session_status NOT NULL DEFAULT 'active',
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT plugin_sessions_token_hash_check CHECK (length(refresh_token_hash) >= 32),
  CONSTRAINT plugin_sessions_expiry_check CHECK (expires_at > issued_at)
);

CREATE TABLE pbg_obsidian.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES academy_core.students(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES pbg_obsidian.plugin_devices(id) ON DELETE RESTRICT,
  workflow_slug text NOT NULL,
  status pbg_obsidian.workflow_run_status NOT NULL DEFAULT 'queued',
  credit_cost numeric(12, 2) NOT NULL DEFAULT 0,
  assignment_path text,
  context_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  CONSTRAINT workflow_runs_slug_check CHECK (workflow_slug ~ '^[a-z0-9][a-z0-9-]*$'),
  CONSTRAINT workflow_runs_credit_cost_check CHECK (credit_cost >= 0)
);

CREATE INDEX workflow_runs_student_created_idx
  ON pbg_obsidian.workflow_runs(student_id, created_at DESC);

CREATE TABLE pbg_obsidian.workflow_run_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id uuid NOT NULL REFERENCES pbg_obsidian.workflow_runs(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflow_run_events_type_check CHECK (event_type ~ '^[a-z0-9][a-z0-9_.:-]*$')
);

CREATE TABLE pbg_obsidian.saved_result_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES academy_core.students(id) ON DELETE CASCADE,
  workflow_run_id uuid NOT NULL REFERENCES pbg_obsidian.workflow_runs(id) ON DELETE CASCADE,
  local_path text NOT NULL,
  title text NOT NULL,
  content_hash text NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_result_content_hash_check CHECK (length(content_hash) >= 32)
);

ALTER TABLE pbg_obsidian.plugin_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pbg_obsidian.plugin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pbg_obsidian.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pbg_obsidian.workflow_run_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pbg_obsidian.saved_result_index ENABLE ROW LEVEL SECURITY;
