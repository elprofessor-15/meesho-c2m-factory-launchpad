export type ElevenLabsSubscription={
  tier:string;
  status:string;
  character_count:number;
  character_limit:number;
  max_credit_limit_extension:number|string;
};

export function assertFreeElevenLabsAccount(subscription:ElevenLabsSubscription){
  if(subscription.tier!=='free'||subscription.status!=='free'){
    throw new Error('ElevenLabs fallback requires an active Free account.');
  }
  if(Number(subscription.max_credit_limit_extension)!==0){
    throw new Error('ElevenLabs usage-based overage is enabled. Free-tier fallback is paused to avoid charges.');
  }
}
