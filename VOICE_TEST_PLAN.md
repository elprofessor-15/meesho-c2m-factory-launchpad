# Voice Test Plan

## Implemented flow

The client requests microphone permission, selects a browser-supported MediaRecorder MIME type, records up to 45 seconds, releases microphone tracks on stop/cancel/unmount, uploads an audio file under 3 MB, displays the completed transcription for review, and only then sends text to the assistant. Typed input is always available. Responses can be played by cloud TTS; device speech synthesis is only selected when a matching language voice exists.

## Provider checks

- Groq transcription uses `whisper-large-v3-turbo` by default and preserves the input language. `whisper-large-v3` can be configured.
- Gemini speech defaults to `gemini-3.8-flash-lite-tts`. The current official Gemini speech documentation specifies WAV for a unary audio response; the implementation returns the provider MIME type without wrapping an existing WAV header.
- ElevenLabs Scribe v2 is an optional Free-tier STT fallback. Current official API pricing lists 4.5 hours of included monthly batch STT; the app enables it only with `ENABLE_ELEVENLABS_FREE_TIER=true` and checks Free status with usage-based overage disabled before sending audio. The account's own allowance remains authoritative, including for usage outside this app. ElevenLabs Free API TTS with library voices was live-tested and returned HTTP 402 `paid_plan_required`; no paid TTS request is made. Gemini remains cloud TTS.
- The text assistant defaults to `gemini-3.8-flash`, the current stable Gemini Flash model; a configured Groq fallback may be used. Tool schemas are allowlisted and writes remain preview-only until confirmation.

## Repeatable local checks

`npm run test:e2e` covers order packing, stock confirmation, scenario save/recalculation, callback creation and operations resolution, Hindi UI, and denied microphone permission with typed input preserved. The browser suite mocks the assistant and does not prove live model or audio calls.

For live verification, follow [SETUP.md](SETUP.md), then check STT, LLM, and TTS separately. In this workspace, live smoke tests returned a real Gemini WAV response, Groq transcription of generated audio, and a live Hindi-answer Groq turn. Current ElevenLabs status was Free with overage disabled; a live Free-tier TTS request was refused by ElevenLabs before charging. Automated browser coverage checks Hindi transcript-language routing. These checks do not certify remaining provider quotas, speech quality across languages, or broad browser support.