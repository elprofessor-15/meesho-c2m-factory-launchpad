export type QuotaKind='turns'|'model'|'stt'|'tts';

const messages:Record<QuotaKind,string>={
  turns:'Daily assistant limit reached. You can still use the seller workspace; assistant access resets at the next UTC day.',
  model:'Daily project AI request limit reached. Read-only workspace pages remain available until the next UTC day.',
  stt:'Daily speech time limit reached. You can keep typing questions; speech access resets at the next UTC day.',
  tts:'Daily spoken-reply limit reached. Your text answer is still available; cloud speech resets at the next UTC day.',
};

export function quotaMessage(kind:QuotaKind){return messages[kind];}

export function speechQuotaSeconds(recordedSeconds:number,providerSeconds=0){
  const safeDuration=Math.max(recordedSeconds,providerSeconds);
  if(!Number.isFinite(safeDuration)||safeDuration<=0||safeDuration>46)throw new Error('Recording duration must be between 0 and 45 seconds.');
  return Math.max(1,Math.ceil(safeDuration));
}