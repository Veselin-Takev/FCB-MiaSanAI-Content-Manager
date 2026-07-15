# Contributing

Thanks for your interest in improving MiaSanAI. This guide keeps contributions
consistent and reviewable.

## Development setup

```bash
npm install
cp .env.example .env.local   # add your GEMINI_API_KEY
npm run dev
```

## Before opening a pull request

Run the full local gate — the same checks CI enforces:

```bash
npm run lint        # TypeScript type-check
npm test            # unit tests (Vitest)
npm run build       # production build
npm run format      # Prettier (optional, auto-format)
```

## Conventions

- **Language/stack:** TypeScript throughout; server code under `server.ts` and
  `src/server/`, UI under `src/`.
- **Validation:** every new `/api/*` endpoint must validate its body with a zod
  schema via the `validateBody` middleware.
- **Logging:** use the structured `logger` (never `console`) in server code.
- **Tests:** pure server utilities (`src/server/*`) must have unit tests under
  `tests/`. Keep them side-effect-free or use a temp path.
- **Secrets:** never commit real keys; extend `.env.example` with documented
  placeholders instead.

## Commit messages

Use short, imperative summaries with an optional scope, e.g.
`rag: add cosine top-k retrieval`. Group related changes into a single commit.

## Branching

Branch off `main`; open a PR against `main`. Keep PRs focused and small where
possible; the PR template lists the required checklist.
