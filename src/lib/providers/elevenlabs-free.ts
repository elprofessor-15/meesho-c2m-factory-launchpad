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

export function assertFreeElevenLabsCharacters(subscription:ElevenLabsSubscription,characters:number){assertFreeElevenLabsAccount(subscription);if(!Number.isFinite(subscription.character_count)||!Number.isFinite(subscription.character_limit)||subscription.character_count+characters>subscription.character_limit)throw new Error('ElevenLabs free speech allowance is exhausted. Device speech remains available.');}
