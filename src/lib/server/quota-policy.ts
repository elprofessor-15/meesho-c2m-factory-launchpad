export type QuotaKind='turns'|'model'|'stt'|'tts';
const messages:Record<QuotaKind,string>={
 turns:'Daily assistant limit reached. You can still use the seller workspace; assistant access resets at the next UTC day.',
 model:'Daily conversation request limit reached. Read-only workspace pages remain available until the next UTC day.',
 stt:'Daily speech time limit reached. You can keep typing questions; speech access resets at the next UTC day.',
 tts:'Daily spoken-reply limit reached. Your text answer is still available; cloud speech resets at the next UTC day.',
};
export class AppQuotaError extends Error {readonly code='APP_QUOTA_EXHAUSTED';constructor(public kind:QuotaKind){super(messages[kind]);}}
export class QuotaStorageError extends Error {readonly code='QUOTA_STORAGE_UNAVAILABLE';constructor(){super('Usage tracking is temporarily unavailable. Please try again later; text and device speech remain available.');}}
export function quotaMessage(kind:QuotaKind){return messages[kind];}
export function validateQuotaResult(kind:QuotaKind,result:{data:unknown;error:unknown}){if(result.error||typeof result.data!=='boolean')throw new QuotaStorageError();if(!result.data)throw new AppQuotaError(kind);}
export function speechQuotaSeconds(recordedSeconds:number,providerSeconds=0){const duration=Math.max(recordedSeconds,providerSeconds);if(!Number.isFinite(duration)||duration<=0||duration>46)throw new Error('Recording duration must be between 0 and 45 seconds.');return Math.max(1,Math.ceil(duration));}
