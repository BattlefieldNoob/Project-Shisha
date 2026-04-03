## Brief overview – Communication style
- Be concise but explicit.
- Use plain language; avoid unnecessary jargon.
- When asking for clarification, phrase as a direct question.
- Provide context and expected outcome.

## Brief overview – Development workflow
- Explore the repository structure first (list files, read README).
- Identify the relevant application and its entry point.
- Check package.json scripts for dev/build/test commands.
- Run the app with `bun run --cwd <app> dev` to verify it starts.
- Use `bun build` to produce a production bundle.
- Run tests with `bun test`.
- Iterate quickly using the REPL to experiment.

## Brief overview – Coding best practices
- Follow existing naming conventions (e.g., `lowercase-with-dashes` for files).
- Keep functions small and single‑purpose.
- Add TypeScript types for public APIs.
- Use `console.error` for failures, `console.log` for debug (but prefer structured logging).
- Prefer immutability and pure functions where possible.
- Write unit tests for new logic; aim for >80% coverage on new code.

## Brief overview – Project context
- Monorepo managed by Bun, TypeScript, Yarn‑compatible workspaces.
- Two main apps: `fuel-advisor-bot` (Telegram bot) and `tablo-crawler` (scraper).
- Shared configs live under `packages/`.
- Infrastructure is defined in `infra/` (Docker, Ansible, Watchtower).
- All apps must ship `Dockerfile`, `Dockerfile.optimized`, `compose.yml`, `.env.example`, `deploy.vars.yml`.

## Brief overview – Additional guidelines
- When in doubt, read the relevant source file rather than assuming behavior.
- If a command fails, inspect the error output before proceeding.
- Keep the task‑progress checklist updated after each step.