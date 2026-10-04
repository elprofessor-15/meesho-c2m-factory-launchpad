# Voice Test Plan

## Implemented flow

The client requests microphone permission, selects a browser-supported MediaRecorder MIME type, records up to 45 seconds, releases microphone tracks on stop/cancel/unmount, uploads an audio file under 3 MB, displays the completed transcription for review, and only then sends text to the assistant. Typed input is always available. Responses can be played by cloud TTS; device speech synthesis is only selected when a matching language voice exists.

## Provider checks

- Groq transcription uses `whisper-large-v3-turbo` by default and preserves the input language. `whisper-large-v3` can be configured.
- Gemini speech defaults to `gemini-3.8-flash-lite-tts`. The current official Gemini speech documentation specifies WAV for a unary audio response; the implementation returns the provider MIME type without wrapping an existing WAV header.
- The text assistant defaults to `gemini-2.5-flash`; a configured Groq fallback may be used. Tool schemas are allowlisted and writes remain preview-only until confirmation.

## Repeatable local checks

`npm run test:e2e` covers order packing, stock confirmation, scenario save/recalculation, callback creation and operations resolution, Hindi UI, and denied microphone permission with typed input preserved. The browser suite mocks the assistant and does not prove live model or audio calls.

For live verification, follow [SETUP.md](SETUP.md), then check STT, LLM, and TTS separately. In this workspace, live smoke tests returned a real Gemini WAV response and Groq transcription of generated audio; a Groq tool-using assistant turn and confirmed stock update also succeeded. These checks do not certify provider free-tier eligibility, account quotas, speech quality across languages, or broad browser support.