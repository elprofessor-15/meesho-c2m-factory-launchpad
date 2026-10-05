# C2M Launchpad

An independent case-competition prototype for manufacturer onboarding, seller operations, sample-based demand planning, and shared support workflows. It uses fictional records and does not connect to live Meesho seller, courier, or payment systems.

Persistent notice in the app: **Independent prototype. Sample business data.**

## Run locally

Requirements: Node.js 24 and npm.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The default `APP_DATA_MODE=local` stores each local-preview workspace under `.local-data/`; this mode is for development only and is not durable on Vercel.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Playwright's Chromium browser is installed once with `npx playwright install chromium`. Browser tests use isolated local sessions and mock the assistant endpoint. Live Groq and Gemini checks must be performed separately; see [VOICE_TEST_PLAN.md](VOICE_TEST_PLAN.md).

## Configuration

Provider credentials belong in `.env.local`, never in source control or chat. See [SETUP.md](SETUP.md) for the exact provider setup and hosted-mode steps. The settings page reports configured provider names, not verified account quota or successful credentials.

## Product map

- `/today`: seller work queue and next production decision.
- `/orders`, `/orders/[id]`: due filters, search, demo labels, and confirmed packing state.
- `/catalogue`, `/inventory`, `/payments`: product edits, inventory controls, and sample settlement records.
- `/demand`: deterministic scenario forecast with explicit assumptions.
- `/onboarding`, `/support`: resumable business setup and saved support requests.
- `/operations`: synthetic programme overview, manufacturer details, interventions, and support resolution.
- `/settings`: provider readiness, demo scenarios, local usage events, and reset controls.

## Implementation boundaries

`src/lib/fixtures.ts` contains only fictional data. Business calculations live in `src/lib/services.ts` and `src/lib/forecast/engine.ts`. Provider credentials and calls stay in server-only modules. Writes are previewed and require a separate confirmation request.

Hosted persistence currently stores a versioned JSON state document per authenticated user, plus atomic quota counters. It is not yet a normalized relational business schema, and the Seller/Operations switch remains a demo feature rather than a production role boundary. Review [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) before presenting or deploying.

## Further reading

- [SETUP.md](SETUP.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)
- [FORECAST_METHODOLOGY.md](FORECAST_METHODOLOGY.md)
- [VOICE_TEST_PLAN.md](VOICE_TEST_PLAN.md)
- [DEMO_SCRIPT.md](DEMO_SCRIPT.md)
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)
## Factory operations update

The new `/commitment` workspace separates demand evidence, physical readiness and the next bounded stock decision. Factory Mode reduces seller navigation to five daily destinations. Batch preparation groups exact SKU/variant/deadline work, exports packing lists and labels, and confirms all affected orders atomically. The named activation contact and first-cycle checklist make ownership explicit. Workload records measure owner time, worker time and errors without inventing a time-saving claim.

See [FACTORY_MODE.md](FACTORY_MODE.md) for the decision rules, SMS simulator boundary and remaining validation requirements. The SMS simulator does not send messages; real carrier pickup and minimum orders are never promised.

## Voice reliability repair

Apply `supabase/migrations/002_fix_quota_ambiguity.sql` to existing projects. It repairs the `consume_quota` RPC without resetting counters. The original column/parameter collision produced a database error that was incorrectly reported as a daily limit. Database availability failures now return a separate 503 error; actual application limits return 429 with `Retry-After`.

LLM requests move to the next configured provider on failure or empty responses. STT tries Groq then eligible ElevenLabs Free Scribe. TTS tries Gemini then eligible ElevenLabs Free speech, followed by a matching device voice. Free ElevenLabs API TTS requires a compatible premade voice; the Sarah voice in `.env.example` was tested in Hindi. Cloud speech failures preserve the text answer and introduce a cooldown to avoid repeated failed requests. Turning read-aloud off cancels pending playback. Device speech depends on an installed voice for the requested language.

`SUPABASE_ACCESS_TOKEN` is a local administration credential for migrations. It is excluded from environment synchronization and deployment uploads. It is never required by the running app.
