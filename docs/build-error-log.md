# Build Error Log

## 2026-05-12

- `npm install` completed, but npm reported 5 moderate dependency audit findings in the current dev toolchain. No fix applied because the assignment pins the Phase 0 dependency set and `npm audit fix --force` would make breaking dependency changes.
- Phase 0 red test: `npm test -- packages/shared/tests/contracts.test.ts` failed because `packages/shared/src/contracts.ts` did not exist. This was the expected TDD failure before adding the shared contract implementation.
- Phase 0 typecheck: `npm run typecheck` failed with TS2835 because `moduleResolution: "NodeNext"` requires explicit `.js` extensions for relative ESM imports. Fixed by changing test imports to use `.js` specifiers, which TypeScript maps back to the `.ts` source.
- Phase 1 database verification: live migration execution could not be run because `DATABASE_URL` is not set and `psql` is not available on PATH in this environment. Per assignment instructions, performed SQL structure review instead: migration includes the `pbg_obsidian` schema, all five blueprint tables, references to `academy_core.students(id)`, the one-active-device partial unique index, and RLS enables for each table.
