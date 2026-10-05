# C2M Launchpad

**[Open the live prototype](https://meesho-c2m-factory-launchpad.vercel.app/today)**

A manufacturer workspace for daily orders, packing, stock, payouts and the next production decision. Built for Endgame, IIT (BHU), around our Meesho C2M manufacturer solution. Business records are fictional; courier, payment and Meesho seller systems are not connected.

## Features ideated and built for our solution

We ideated and built every feature listed below as part of simplifying the seller panel for manufacturers. Our design addresses the pain points we derived from our user interviews: a seller workflow that does not match factory operations, fragmented daily tasks, language and typing friction, uncertain packing ownership, connectivity interruptions, and the risk of committing production before demand and economics are clear. The deck foregrounds Factory Mode; the prototype brings the complete set of supporting features into one workspace.

### Daily work and Factory Mode

- **Factory Mode:** an explicit factory icon and ON/OFF switch open product batches immediately. Five daily destinations keep Today, Orders, Stock, Payments and Help close at hand.
- **Instant navigation:** tabs and filters update without reloading business data. Mode, language, active route and conversation stay in sync; preferences persist between visits and across browser tabs.
- **Today work queue:** dispatch deadlines, overdue orders, missing packing labels, low stock, onboarding progress and expected payouts appear together.
- **Batch preparation:** group orders by product, variant and deadline. Review parcel counts, units and a planning estimate of packing time while preserving each order's own label.
- **Order control:** individual details, search, status and deadline filters, sorting, sample labels, packing-list downloads and CSV exports. Packing remains separate from courier handover.
- **Stock and catalogue:** on-hand, reserved, available and inbound stock; capacity and lead times; product details, listing completeness and reviewed stock or price updates.
- **Payments:** expected and settled sample payouts, adjustments, date/status filters and exports.

### Voice notes, language and assistance

- **Voice notes:** record a question or update request, transcribe it, review the text, then send. Optional automatic sending is available after transcription. Audio is not stored as a reusable voice-note file.
- **Two-way Ask Launchpad:** ask about orders, stock, payouts, packing or the next production decision. Common questions use workspace records directly; replies link back to their source records.
- **Voice-led updates:** say “I have prepared orders LP 8042 and LP 8047” or “Set SKU-101 stock to 50”. Launchpad prepares the exact change for review. **Confirm update** is always required before records change.
- **Vernacular interface:** English, Hindi, Bengali, Marathi, Tamil, Telugu, Gujarati, Kannada, Malayalam and Punjabi. Navigation, page copy, forms, statuses, confirmations and help use bundled translations. Names, record IDs and user-entered values remain intact.
- **Spoken replies:** choose a fast installed device voice or a cloud voice. Text streams progressively, and speech starts at the first complete sentence. Stop, replay, transcription retry and microphone-denial recovery keep typing available.
- **Provider fallback:** conversation, transcription and speech can use configured fallback providers. Genuine provider limits are distinguished from storage errors; speech cooldowns avoid repeated failing requests.
- **SMS fallback demonstration:** an exact batch ID and constrained READY reply prepare a review when data-based interaction is difficult. This is a simulator, not a connected SMS or IVR service.
- **Product tour:** a short, translated walkthrough explains daily work, Factory Mode, voice notes, languages, bounded production decisions and support. It previews screens without changing business records.

### Production readiness and activation

- **Demand planning:** inspect sample demand, actuals, daily or cumulative forecasts and P10 to P90 scenario ranges. Compare and save scenarios for stock, price, exposure, capacity, lead time and minimum batch size.
- **Explainable commitments:** demand evidence, cash exposure, contribution thresholds, stock availability and operating readiness determine whether to test, replenish, hold or pause. A forecast alone does not approve production.
- **Physical ownership:** identify who packs parcels, the daily parcel capacity, catalogue checks, packing/label routines and pickup readiness before increasing commitments.
- **Staged activation:** start with existing saleable stock, a bounded commitment and an observed first cycle. No minimum orders or profitability are promised.
- **Guided onboarding:** six saved steps cover the business, language, product/photo, available capacity, economics, packing ownership and pilot review.
- **Named support:** an activation contact, callback and cluster-visit requests, a first-cycle checklist and a 90-day activation context make human ownership visible. Requests do not place calls or book visits.
- **Operations view:** manufacturer worklists, support assignments, interventions and cohort metrics share the same sample workspace. Support time and workload observations can be recorded without claiming unmeasured time savings.
- **Reliable changes:** confirmations expire, stale records are rejected, multi-order updates validate the entire selection before changing anything, and repeated confirmations are idempotent. Changes are reflected in activity and relevant screens.
- **Persistence:** isolated Supabase workspaces on Vercel and local file persistence for development. Credentials stay server-side and out of the repository.

These features form our implemented response to the interview pain points. Field validation is part of taking the prototype into production. Business records are fictional. Meesho seller systems, courier bookings, tracking events, payments, real phone calls and SMS are not integrated. Translations have automated coverage checks; native-speaker review and field validation remain necessary before a production rollout.

## Quick walkthrough for reviewers

1. Open the live link and choose your language in the header.
2. Open **Product tour** from the navigation panel, or enable **Factory Mode** to see packing batches directly.
3. Open **Voice mode**, record or type a question, then try an exact order update. Review the confirmation before applying it.
4. Review **Launch commitment** to see how physical readiness and business economics constrain production.
5. Open **Help** for named support, and the batch view for the SMS simulator.

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
