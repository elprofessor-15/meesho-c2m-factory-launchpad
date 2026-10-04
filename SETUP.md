# Setup

## Local preview

1. Install Node.js 20.9+ and npm.
2. From the repository root, run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Keep `APP_DATA_MODE="local"` for an isolated local preview. The browser receives a private demo cookie and state is stored under the ignored `.local-data/` directory.
5. Add provider keys locally if you want live assistant and speech tests. Never send keys in chat or commit `.env.local`.
6. Run `npm run dev`, open `http://localhost:3000`, and restart the server after changing environment values.

## Provider keys

- **Groq**: create a key at [console.groq.com/keys](https://console.groq.com/keys), then put it in `GROQ_API_KEY`. Speech-to-text uses `GROQ_STT_MODEL` (`whisper-large-v3-turbo` by default). Read [speech-to-text](https://console.groq.com/docs/speech-to-text) and [rate limits](https://console.groq.com/docs/rate-limits).
- **Gemini**: create a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey), then put it in `GEMINI_API_KEY`. Text uses `GEMINI_TEXT_MODEL`; speech uses `GEMINI_TTS_MODEL`. Review [key safety](https://ai.google.dev/gemini-api/docs/api-key), [pricing](https://ai.google.dev/gemini-api/docs/pricing), [limits](https://ai.google.dev/gemini-api/docs/rate-limits), and [speech generation](https://ai.google.dev/gemini-api/docs/speech-generation) before a presentation.
- **Optional OpenRouter fallback**: a free-model route is configured in `.env.example`. It is only attempted if the provider list includes it and its key exists. Do not use a paid model for the free-tier demo.
- **Optional ElevenLabs fallback**: this integration can consume account credits. It is disabled unless `ELEVENLABS_API_KEY` and a voice ID are configured. Do not enable it unless the account allowance and pricing are understood.

Configured credentials are not proof of live account entitlement. This prototype's model quota caps are local application limits, not provider quota estimates.

## Hosted Supabase mode

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard).
2. In **Project Settings → API**, copy the Project URL into `NEXT_PUBLIC_SUPABASE_URL` and the publishable key into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A legacy `anon` key may be used in that same variable. Do not use a secret/service-role key in a browser variable.
3. In **Authentication → Sign In / Providers**, enable anonymous sign-ins for the demo flow.
4. Apply `supabase/migrations/001_launchpad.sql` in the Supabase SQL Editor, or with the Supabase CLI after linking the project and reviewing the SQL: `supabase db push`.
5. Set `APP_DATA_MODE="supabase"` in `.env.local`, then restart the development server. The first authenticated state request bootstraps fictional data for that user's isolated workspace.
6. Test a write, reload, and verify the data persists. A database failure is surfaced; the app does not silently fall back to local fixtures.

The migration currently persists one versioned JSON document per user and separate atomic usage counters. It does not create the normalized manufacturer/product/order tables from a full production data model.

## Verify each live provider separately

- **LLM**: open Settings → Test text assistant; ask “Aaj kitne orders bhejne hain?” Confirm the response cites sample order data and opens the due-today route.
- **STT**: allow microphone permission, record a short sentence, stop and send, then review the transcript before sending it to the assistant. The endpoint accepts at most 3 MB and 45 seconds.
- **TTS**: enable “Read answers aloud”, ask a short question, and confirm playback. Gemini's current documented unary output is WAV; the endpoint returns the provider's MIME type.
- **Failure handling**: deny microphone permission, disable a key temporarily in local configuration, restart, and verify typed input remains usable. Do not interpret a mocked browser test as live STT/TTS verification.

## Vercel later

1. Create a private GitHub repository and push this source.
2. Import that repository in Vercel and select the Next.js framework preset.
3. Add the required server keys and public Supabase URL/publishable key in Vercel Project Settings → Environment Variables. Set `APP_DATA_MODE=supabase`, `DEMO_MODE=true`, and update `NEXT_PUBLIC_APP_URL` to the production HTTPS URL.
4. Apply database migrations before the first app request.
5. Add the deployed URL and preview URLs to Supabase **Authentication → URL Configuration**. Keep the production redirect URL exact.
6. Redeploy after environment changes.
7. Test microphone access over HTTPS and test STT, LLM, and TTS independently. Confirm provider quota and account data-use settings before presenting.

Do not use `APP_DATA_MODE=local` on Vercel. The local filesystem is not durable there. Audio uploads are capped by this app at 3 MB, below typical function request limits. No background worker or persistent WebSocket is required.

Review current Vercel plan terms for the intended use. A personal prototype and a commercial deployment are not interchangeable plan assumptions.