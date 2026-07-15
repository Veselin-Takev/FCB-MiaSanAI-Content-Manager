# Security Policy

## Reporting a Vulnerability

Please report suspected security vulnerabilities privately by email to the
maintainer rather than opening a public issue. You will receive an
acknowledgement within a reasonable timeframe, followed by an assessment and,
where applicable, a coordinated fix and disclosure.

## Secrets & Configuration

- Never commit real API keys. Secrets belong in `.env.local` (git-ignored) or
  the Google Cloud Secret Manager.
- Administrative endpoints (`/api/secrets/*`, `/api/usage/reset`) require the
  `ADMIN_API_TOKEN` header (`x-admin-token`) and are **fail-closed** when the
  token is unset.
- All AI provider calls are proxied server-side; provider keys are never sent
  to the browser.

## Hardening in place

- Security headers via Helmet (CSP enabled in production).
- Rate limiting on all `/api/*` routes.
- Strict request-body validation (zod) on API endpoints.
- Request timeouts, centralised error handling (no stack-trace leakage in
  production) and request-id correlation.
- No personal end-user data is transmitted to external LLM APIs.

## Supported Versions

The `main` branch receives security fixes. Older tags are not maintained.
