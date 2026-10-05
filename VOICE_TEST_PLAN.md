# Voice Test Plan

## Implemented flow

The client requests microphone permission, selects a browser-supported MediaRecorder MIME type, records up to 45 seconds, releases microphone tracks on stop/cancel/unmount, uploads an audio file under 3 MB, displays the completed transcription for review, and only then sends text to the assistant. Typed input is always available. Responses can be played by cloud TTS; device speech synthesis is only selected when a matching language voice exists.

## Provider checks

- Groq transcription uses `whisper-large-v3-turbo` by default and preserves the input language. `whisper-large-v3` can be configured.
- Gemini speech defaults to `gemini-3.8-flash-lite-tts`. The current official Gemini speech documentation specifies WAV for a unary audio response; the implementation returns the provider MIME type without wrapping an existing WAV header.
- ElevenLabs Scribe v2 is an optional Free-tier STT fallback. Current official API pricing lists 4.5 hours of included monthly batch STT; the app enables it only with `ENABLE_ELEVENLABS_FREE_TIER=true` and checks Free status with usage-based overage disabled before sending audio. The account's own allowance remains authoritative, including for usage outside this app. ElevenLabs Free API TTS with library voices was live-tested and returned HTTP 402 `paid_plan_required`; Premade Sarah multilingual speech was then tested successfully on the same Free account. With the Free-tier flag, Gemini is primary and eligible ElevenLabs premade speech is the cloud fallback; device speech is the final fallback.
- The text assistant defaults to `gemini-3.8-flash`, the current stable Gemini Flash model; a configured Groq fallback may be used. Tool schemas are allowlisted and writes remain preview-only until confirmation.

## Repeatable local checks

`npm run test:e2e` covers order packing, stock confirmation, scenario save/recalculation, callback creation and operations resolution, Hindi UI, and denied microphone permission with typed input preserved. The browser suite mocks the assistant and does not prove live model or audio calls.

For live verification, follow [SETUP.md](SETUP.md), then check STT, LLM, and TTS separately. In this workspace, live smoke tests returned a real Gemini WAV response, Groq transcription of generated audio, and a live Hindi-answer Groq turn. Current ElevenLabs status was Free with overage disabled; a live Free-tier TTS request was refused by ElevenLabs before charging. Automated browser coverage checks Hindi transcript-language routing. These checks do not certify remaining provider quotas, speech quality across languages, or broad browser support.
Reliability regression checks cover SQL errors versus real quota exhaustion, Gemini-to-Groq LLM fallback, Groq-to-ElevenLabs STT fallback, Gemini-to-ElevenLabs TTS fallback, 429/503 device playback, cloud cooldown, and cancellation while a speech response is pending. Live validation also transcribed a Gemini Hindi WAV through Groq.

## Faster conversational work

Common daily order counts, low stock, stock totals, payouts and exact packing commands use workspace records directly. These answers do not wait for a model. Their history is persisted with the existing version checks. General explanations retrieve records first, then stream the final answer using NDJSON. Only the read-only explanation is streamed; action preparation returns a stored review, and a separate confirmation executes it.

The client starts speech at the first complete sentence. Fast device speech uses a matching installed voice; cloud mode prepares the next segment while the current one plays. At most 600 characters are spoken automatically, in at most two segments. Cloud requests still count against the existing application and provider allowances. Recording auto-send is optional and does not authorize updates.

The interviewer reference starts speech alongside visible text. Launchpad now uses actual streamed provider deltas rather than adding an artificial word-reveal delay. Speech/transcription usage logging runs after the response; quota checks and confirmed changes remain synchronous.

Regression checks also cover Hindi typed in Latin letters, multi-order confirmation, negated commands, unknown references, stale reviews, inline confirmation errors and saved/cancelled feedback. A controlled stream test verifies audible speech before the final answer event. Test real device voices separately, because headless-browser voices are mocked.
