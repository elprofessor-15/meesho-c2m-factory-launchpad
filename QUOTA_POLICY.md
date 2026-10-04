# Assistant and Voice Quotas

Application caps are separate from provider plans and are not claims about remaining provider allowance.

- 5,000 assistant turns per user per UTC day.
- 10,000 model requests per project per UTC day.
- 14,400 recorded/transcribed speech seconds per user per UTC day.
- 300 cloud speech replies per project per UTC day.

Speech usage is charged using the measured recording duration, rounded up to whole seconds. If the transcription provider reports a longer duration, the difference is charged before returning the transcript. Recordings remain limited to 45 seconds and 3 MB.

Quota errors identify the affected feature and do not imply the rest of the workspace is unavailable. Typed questions remain available when speech time is exhausted; text answers remain available when spoken replies are exhausted. The API returns `Retry-After` until the next UTC day.

Provider free-tier limits remain independently enforced by their providers. In particular, the ElevenLabs Free Scribe fallback checks account status and disabled overage before sending audio. A provider can still exhaust its own allowance through use outside this application.