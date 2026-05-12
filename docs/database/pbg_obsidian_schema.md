# pbg_obsidian Schema

`pbg_obsidian` stores metadata for the Obsidian academy gateway only. It references `academy_core.students(id)` and does not store full vault contents, raw note bodies, or raw provider secrets.

## Tables

- `plugin_devices`: one active vault/device registration per student for the POC.
- `plugin_sessions`: hashed refresh-token sessions tied to a registered device.
- `workflow_runs`: one row per server-side workflow attempt.
- `workflow_run_events`: small structured lifecycle events for support and debugging.
- `saved_result_index`: index of workflow results the plugin saved locally in the vault.

## Access Model

The Obsidian plugin does not access these tables directly. The gateway API performs all reads and writes server-side.
