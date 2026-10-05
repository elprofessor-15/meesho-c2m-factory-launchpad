# C2M Launchpad

**[Open the live prototype](https://meesho-c2m-factory-launchpad.vercel.app/today)**

A manufacturer workspace for daily orders, packing, stock, payouts and the next production decision. Built for the Meesho C2M case competition. Business records are fictional; courier, payment and Meesho seller systems are not connected.

## What you can try

- **Factory Mode:** five daily destinations, with packing batches, labels and a clear work queue.
- **Ask Launchpad:** type or speak in your chosen language. Common order, stock and payout questions use workspace records directly. Longer answers appear progressively, with speech starting at the first complete sentence.
- **Voice updates:** say “I have prepared orders LP 8042 and LP 8047” or “Set SKU-101 stock to 50”. Review the exact update and press **Confirm update**. Packing does not record courier handover.
- **Speech controls:** choose a fast device voice or a cloud voice. Stop playback, replay a reply, or optionally send recordings immediately after transcription. A matching installed voice is needed for device speech.
- **Production decisions:** compare demand evidence, operating readiness, cash exposure and a bounded stock commitment. No minimum orders are promised.
- **Support:** a named activation contact, callback and visit requests, and a first-cycle checklist. The SMS simulator demonstrates constrained reply handling; it does not send messages.

## Run locally

Use Node.js 24 and npm.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000). Paste credentials into `.env.local` only:

- `GROQ_API_KEY`: primary conversation service and transcription.
- `GEMINI_API_KEY`: conversation fallback and cloud speech.
- `ELEVENLABS_API_KEY`: optional transcription and speech fallback. The example uses a premade multilingual voice compatible with the Free account tested here.
- `OPENROUTER_API_KEY`: optional additional conversation fallback using a free model.

Device speech needs no API key. Provider accounts enforce their own quotas. Free ElevenLabs fallback checks Free status, disabled overage and remaining speech characters.

Local mode stores workspaces in `.local-data`. For Vercel, use `APP_DATA_MODE=supabase`, enable anonymous sign-in and apply the migrations in `supabase/migrations` in order. Existing projects need migration `002` to repair the quota function without resetting counters.

`SUPABASE_ACCESS_TOKEN`, if used to administer migrations, stays local. It is excluded from deployment uploads and environment synchronization. The running app does not require it.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Install the browser once with `npx playwright install chromium`. Regression coverage includes streamed text and early speech, provider fallbacks, cancelled playback, ambiguous voice commands, atomic multi-order updates, stale confirmations and responsive layouts. Live provider checks are separate from mocked browser tests.

## Product and implementation notes

- [Setup](SETUP.md)
- [Factory Mode and commitment rules](FACTORY_MODE.md)
- [Voice testing and latency](VOICE_TEST_PLAN.md)
- [Forecast methodology](FORECAST_METHODOLOGY.md)
- [Architecture](ARCHITECTURE.md)
- [Implementation boundaries](IMPLEMENTATION_STATUS.md)

The prototype uses isolated, versioned workspaces. Seller and Operations views demonstrate workflows; they are not production role authorization. Updates require a separate confirmation, expire after five minutes and reject stale records.
