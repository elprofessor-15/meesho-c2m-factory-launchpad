# Architecture

## Runtime

Next.js App Router renders the application shell and catch-all workspace page. Route handlers live under `src/app/api/[...path]/route.ts` and explicitly use the Node runtime. Client components call the same-origin API; provider keys and Supabase access stay in server modules.

## Boundaries

- `src/components/`: seller, operations, demand, voice, and shared UI.
- `src/lib/services.ts`: seller selectors, filtering, currency formatting, and intervention derivation.
- `src/lib/forecast/engine.ts`: deterministic seeded demand and supply scenarios.
- `src/lib/assistant/tools.ts`: allowlisted tool contracts and tool dispatch.
- `src/lib/assistant/actions.ts`: validated short-lived preview records and confirmed mutations.
- `src/lib/assistant/orchestrator.ts`: bounded model/tool loop and usage recording.
- `src/lib/providers/ai.ts`: Gemini, Groq, and optional provider adapters.
- `src/lib/server/repository.ts`: local preview persistence or authenticated Supabase repository.
- `src/lib/fixtures.ts`: deterministic synthetic demo workspace.

## Persistence and scope

Local preview uses a per-cookie JSON file under `.local-data/`; it is explicitly for local development and is not a Vercel persistence strategy. Supabase mode uses anonymous Auth, RLS-protected per-user workspaces, version-checked updates, and an atomic database quota function. The workspace's business entities are currently serialized as one JSON document. A normalized relational migration and production role/membership model remain future work.

The Seller/Operations switch is deliberately a visitor-facing demonstration affordance, not an authorization boundary. Provider tool access runs against the authenticated user's isolated workspace. The model never receives direct database access, arbitrary SQL execution, or a general JavaScript evaluator.

## Writes

The model may prepare an action. A separate UI confirmation calls the confirmation endpoint. Server-side validation checks the action owner, exact stored arguments, expiry, and entity version. Completed action records make retries idempotent. A packed order remains distinct from shipment.

## Providers

Gemini is the default text and speech provider; Groq is the primary transcription provider. Provider order is configured using server environment variables. The app reports local application caps rather than estimating remaining third-party quota. See [VOICE_TEST_PLAN.md](VOICE_TEST_PLAN.md).