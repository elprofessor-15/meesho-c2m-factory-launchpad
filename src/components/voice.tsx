'use client';
import {useEffect,useRef,useState} from 'react';
import {Mic,Send,X,Volume2,Square,ArrowRight,RotateCcw} from 'lucide-react';
import {navigate} from './workspace-link';
import {Action} from '@/lib/types';
import {money} from '@/lib/services';
import {Reply} from '@/lib/assistant/quick';
import {AssistantEvent} from '@/lib/assistant/orchestrator';
import {SpeechPlayer} from '@/lib/speech-player';
import {lines,cleanSpeech,takeSentences} from '@/lib/stream';
import {responseLanguage,translate} from '@/lib/i18n';
type Message={id:string;role:'user'|'assistant';text:string;reply?:Reply;pending?:boolean};
function SourceRecords({records}:{records:unknown[]}){
 const rows=records.flatMap(record=>{if(!record||typeof record!=='object')return[];const r=record as Record<string,unknown>;return Array.isArray(r.rows)?r.rows:r.order?[r.order]:[r];}).slice(0,12);
 const labels:Record<string,string>={id:'Reference',name:'Product',sku:'SKU',quantity:'Units',due:'Dispatch by',status:'Status',stock:'On hand',reserved:'Reserved',available:'Available',total:'Count',units:'Units',date:'Date',asOf:'As of',dueToday:'Due today',overdue:'Overdue',decision:'Decision',reason:'Reason',recommended:'Recommended units',ordered:'Ordered units',fulfilled:'Fulfilled units',retained:'Retained units',unmet:'Unmet units',cashExposure:'Cash exposure',amount:'Payout',expected:'Expected payout',contribution:'Contribution',nmv:'Net merchandise value'};
 return <details className="source-records"><summary>View source records</summary><div>{rows.map((row,i)=><dl key={i}>{Object.entries(row as Record<string,unknown>).filter(([key,value])=>labels[key]&&['string','number'].includes(typeof value)).map(([key,value])=><div key={key}><dt>{key==='due'&&typeof value==='number'?'Due today':labels[key]}</dt><dd>{value==='ready_to_ship'?'Ready to ship':typeof value==='number'&&['amount','expected','cashExposure','contribution','nmv'].includes(key)?money(value):String(value)}</dd></div>)}</dl>)}{!rows.length&&<p>Details are available on the linked page.</p>}<details><summary>Full record details</summary><pre>{JSON.stringify(records,(_key,value)=>_key==='action'?undefined:value,2)}</pre></details></div></details>;
}
export default function Voice({language,onClose,onAction,initial='',actionResult}:{language:string;onClose:()=>void;onAction:(action:Action)=>void;initial?:string;actionResult?:{id:string;message:string;cancelled?:boolean}|null}){
 const t=(text:string)=>translate(language,text);
 const [input,setInput]=useState(initial),[phase,setPhase]=useState('Idle'),[speaking,setSpeaking]=useState(false),[error,setError]=useState(''),[errorKind,setErrorKind]=useState(''),[messages,setMessages]=useState<Message[]>([]),[aloud,setAloud]=useState(false),[speechMode,setSpeechMode]=useState('fast'),[autoSend,setAutoSend]=useState(false),[speechNotice,setSpeechNotice]=useState(''),[timing,setTiming]=useState<{text?:number;audio?:number}>({});
 const seenResult=useRef('');const request=useRef(0),controller=useRef<AbortController|null>(null),recording=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),player=useRef<SpeechPlayer|null>(null),lastAudio=useRef<{blob:Blob;duration:number}|null>(null),lastQuestion=useRef(''),transcriptLanguage=useRef<string|undefined>(undefined),aloudRef=useRef(false),autoRef=useRef(false),modeRef=useRef('fast'),startedAt=useRef(0),firstAudio=useRef(false),body=useRef<HTMLDivElement|null>(null),sendRef=useRef<(text:string,detected?:string,fromRecording?:boolean)=>Promise<void>>(async()=>{});
 const cleanup=()=>{stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;if(timer.current)clearTimeout(timer.current);timer.current=null;};
 useEffect(()=>{
  aloudRef.current=localStorage.getItem('lp-read-aloud')==='true';setAloud(aloudRef.current);modeRef.current=localStorage.getItem('lp-speech-mode')??'fast';setSpeechMode(modeRef.current);autoRef.current=localStorage.getItem('lp-auto-send')==='true';setAutoSend(autoRef.current);
  const speech=new SpeechPlayer({status:setSpeaking,notice:setSpeechNotice,started:()=>{if(!firstAudio.current){firstAudio.current=true;setTiming(value=>({...value,audio:Math.round(performance.now()-startedAt.current)}));}}});player.current=speech;
  const sequence=request;
  return()=>{sequence.current++;controller.current?.abort();if(recording.current?.state==='recording'){recording.current.onstop=null;recording.current.stop();}cleanup();speech.stop();};
 },[]);
 useEffect(()=>{
  if(!actionResult||seenResult.current===actionResult.id)return;
  const source=messages.find(message=>message.reply?.action?.id===actionResult.id);if(!source)return;seenResult.current=actionResult.id;
  const l=source.reply?.language??language;let text=actionResult.message;
  if(l==='hi'){if(actionResult.cancelled)text='अनुरोध रद्द कर दिया गया। कोई बदलाव नहीं हुआ।';else{const count=text.match(/^(\d+) orders marked packed/);if(count)text=`${count[1]} ऑर्डर पैक किए हुए दर्ज हो गए। कूरियर को सौंपना अभी बाकी है।`;}}
  const reply:Reply={text,spoken:text,language:l==='hi'&&/^[\u0900-\u097f0-9]/u.test(text)?'hi':'en',provider:'Workspace'};
  setMessages(rows=>[...rows,{id:crypto.randomUUID(),role:'assistant',text,reply}]);
  if(aloudRef.current){player.current?.start(reply.language,modeRef.current);player.current?.enqueue(text);player.current?.finish();}
  requestAnimationFrame(()=>{if(body.current)body.current.scrollTop=body.current.scrollHeight;});
 },[actionResult,language,messages]);
 function updateReply(id:string,change:Partial<Message>){setMessages(rows=>rows.map(row=>row.id===id?{...row,...change}:row));}
 function scroll(){const pane=body.current;if(pane&&pane.scrollHeight-pane.scrollTop-pane.clientHeight<160)requestAnimationFrame(()=>{pane.scrollTop=pane.scrollHeight;});}
 async function send(text=input,detected=transcriptLanguage.current,fromRecording=false){
  if(!text.trim()||(!fromRecording&&['Transcribing','Listening','Requesting permission'].includes(phase)))return;
  controller.current?.abort();player.current?.stop();const id=++request.current,abort=new AbortController();controller.current=abort;const replyId=crypto.randomUUID();
  const answerLanguage=responseLanguage(text,language,detected);let spokenLength=0,pendingSpeech='',firstSentence=false,streamedText='';
  startedAt.current=performance.now();firstAudio.current=false;setTiming({});setError('');setErrorKind('');setSpeechNotice('');setPhase('Checking your workspace');lastQuestion.current=text;setInput('');transcriptLanguage.current=undefined;
  player.current?.start(answerLanguage,modeRef.current);
  setMessages(rows=>[...rows,{id:crypto.randomUUID(),role:'user',text},{id:replyId,role:'assistant',text:'',pending:true}]);
  requestAnimationFrame(()=>{if(body.current)body.current.scrollTop=body.current.scrollHeight;});
  const current=()=>id===request.current&&!abort.signal.aborted;
  const queueSpeech=(delta:string,flush=false)=>{
   pendingSpeech+=delta;if(!aloudRef.current)return;
   if(!firstSentence){const parsed=takeSentences(pendingSpeech,flush);if(parsed.parts.length){const first=cleanSpeech(parsed.parts.shift()!);const limited=first.slice(0,600);if(limited){player.current?.enqueue(limited);spokenLength+=limited.length;firstSentence=true;}pendingSpeech=[...parsed.parts,parsed.rest].join(' ');}}
   if(flush&&pendingSpeech.trim()&&spokenLength<600){player.current?.enqueue(cleanSpeech(pendingSpeech).slice(0,600-spokenLength));pendingSpeech='';}
  };
  const onText=(delta:string)=>{if(!current())return;if(!streamedText)setTiming(value=>({...value,text:Math.round(performance.now()-startedAt.current)}));streamedText+=delta;updateReply(replyId,{text:streamedText});queueSpeech(delta);scroll();};
  const complete=(reply:Reply)=>{if(!current())return;if(!streamedText){player.current?.start(reply.language||answerLanguage,modeRef.current);onText(reply.text);}queueSpeech('',true);player.current?.finish();updateReply(replyId,{text:reply.text,reply,pending:false});setPhase('Idle');if(reply.action)onAction(reply.action);scroll();};
  try{
   const response=await fetch('/api/assistant',{method:'POST',signal:abort.signal,headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},body:JSON.stringify({message:text,language:answerLanguage})});
   if(!response.ok){const data=await response.json();throw new Error(data.error??'The connection is unavailable. Please try again.');}
   if(!response.headers.get('content-type')?.includes('application/x-ndjson')){complete(await response.json());return;}
   if(!response.body)throw new Error('The reply could not be loaded. Please try again.');let finished=false;
   for await(const line of lines(response.body)){if(!current())return;if(!line.trim())continue;const event=JSON.parse(line) as AssistantEvent;
    if(event.type==='status')setPhase(event.message);
    if(event.type==='text')onText(event.text);
    if(event.type==='done'){complete(event.reply);finished=true;}
    if(event.type==='error')throw new Error(event.error);
   }
   if(!finished)throw new Error('The reply was interrupted. Please try again.');
  }catch(cause){if(current()){player.current?.stop();setMessages(rows=>streamedText?rows.map(row=>row.id===replyId?{...row,pending:false}:row):rows.filter(row=>row.id!==replyId));setPhase('Idle');setError(cause instanceof Error?cause.message:'Please try again.');setErrorKind('reply');setInput(current=>current||text);}}
 }
 sendRef.current=send;
 async function transcribe(blob:Blob,duration:number,id:number){
  setPhase('Transcribing');lastAudio.current={blob,duration};const abort=new AbortController();controller.current=abort;
  try{
   if(!blob.size)throw new Error('No audio was recorded. Please try again.');if(blob.size>3000000)throw new Error('That recording is too large. Try a shorter message.');
   const form=new FormData();form.append('audio',blob,'recording.'+(blob.type.includes('mp4')?'mp4':blob.type.includes('ogg')?'ogg':'webm'));form.append('duration',String(Math.max(.1,Math.min(45,duration))));
   const response=await fetch('/api/stt',{method:'POST',body:form,signal:abort.signal});const data=await response.json();if(id!==request.current||abort.signal.aborted)return;if(!response.ok)throw new Error(data.error);if(!data.text?.trim())throw new Error('No speech was detected. Please try again.');
   transcriptLanguage.current=data.language;setInput(data.text);setPhase('Idle');
   if(autoRef.current)await sendRef.current(data.text,data.language,true);
  }catch(cause){if(id===request.current&&!abort.signal.aborted){setError(cause instanceof Error?cause.message:'Transcription failed.');setErrorKind('transcription');setPhase('Idle');}}
 }
 async function record(){
  controller.current?.abort();player.current?.stop();const id=++request.current;setError('');setErrorKind('');setSpeechNotice('');setPhase('Requesting permission');
  try{
   if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('This browser cannot record audio. Please type your question.');
   const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});if(id!==request.current){media.getTracks().forEach(track=>track.stop());return;}stream.current=media;
   const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/webm'].find(value=>MediaRecorder.isTypeSupported(value));if(!mime)throw new Error('No supported recording format. Please type your question.');
   const recorder=new MediaRecorder(media,{mimeType:mime,audioBitsPerSecond:64000}),chunks:Blob[]=[];recording.current=recorder;const began=Date.now();
   recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
   recorder.onerror=()=>{cleanup();if(id===request.current){setError('Recording failed. Please try again.');setErrorKind('transcription');setPhase('Idle');}};
   recorder.onstop=()=>{cleanup();if(id===request.current)void transcribe(new Blob(chunks,{type:mime}),(Date.now()-began)/1000,id);};
   recorder.start();setPhase('Listening');timer.current=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},45000);
  }catch(cause){cleanup();if(id===request.current){setError(cause instanceof DOMException&&cause.name==='NotAllowedError'?'Microphone permission denied. You can still type below.':cause instanceof Error?cause.message:'No microphone found.');setErrorKind('transcription');setPhase('Idle');}}
 }
 function cancel(){request.current++;controller.current?.abort();if(recording.current?.state==='recording')recording.current.stop();cleanup();player.current?.stop();setMessages(rows=>rows.map(row=>row.pending?{...row,pending:false,text:row.text||'Reply stopped.'}:row));setPhase('Idle');}
 function repeat(reply:Reply){player.current?.start(reply.language||language,speechMode);startedAt.current=performance.now();firstAudio.current=false;player.current?.enqueue(reply.spoken||reply.text);player.current?.finish();}
 const processing=['Checking your workspace','Understanding your request','Writing your answer'].includes(phase);
 return <aside className="assistant" aria-label="Launchpad assistant">
  <div className="assistant-head"><div><span className="eyebrow">YOUR OPERATING ASSISTANT</span><h2>{t('Ask Launchpad')}</h2></div><button className="icon" aria-label="Close assistant" onClick={onClose}><X size={20}/></button></div>
  <div className="assistant-body" ref={body}><p className="muted">Ask about your work, or tell us which orders you have prepared. Review each update before confirming.</p>
   {!messages.length&&<><div className="suggestions">{['Aaj kitne orders bhejne hain?','I have prepared orders LP 8042 and LP 8047','Which products are running low?'].map(question=><button key={question} onClick={()=>{transcriptLanguage.current=undefined;setInput(question);}}>{question}<ArrowRight size={16}/></button>)}</div><details className="voice-guide"><summary>What can I do by voice?</summary><p>Check orders, stock and payouts. Prepare packing updates for one order, several orders or an exact batch. Set the total stock for an exact SKU.</p><p>Say “Mark orders LP 8042 and LP 8047 packed” or “Set SKU-101 stock to 50”. Changes wait for your confirmation. Courier handover remains separate.</p></details></>}
   {messages.map(message=><div className={'message '+(message.role==='assistant'?'assistant-message':'user-message')} key={message.id}><small>{message.role==='user'?'You':'Launchpad'}</small><p>{message.text||'Checking your request…'}{message.pending&&message.text&&<span className="stream-cursor" aria-hidden="true"/>}</p>{message.reply?.choices&&<div className="reply-choices">{message.reply.choices.map(choice=><button key={choice.message} onClick={()=>setInput(choice.message)}>{choice.label}<ArrowRight size={14}/></button>)}</div>}{message.reply?.route&&<button onClick={()=>navigate(message.reply!.route!)}>{t('Open')}<ArrowRight size={16}/></button>}{message.reply&&!message.pending&&<button className="read-reply" aria-label="Read this reply aloud" disabled={processing} onClick={()=>repeat(message.reply!)}><Volume2 size={14}/>Read aloud</button>}{message.reply?.records&&message.reply.records.length>0&&<SourceRecords records={message.reply.records}/>}</div>)}
  </div>
  <div className="voice-controls"><div className="voice-status" role="status"><span className={phase==='Listening'?'listening-dot':'status-dot'}/>{speaking?'Speaking':phase}{phase==='Listening'&&' · maximum 45 seconds'}{(processing||phase==='Transcribing'||phase==='Requesting permission')&&<button className="stop-reply" onClick={cancel}><Square size={13}/>{processing?'Stop reply':'Cancel'}</button>}</div>
   {error&&<p className="error" role="alert">{error}</p>}{speechNotice&&<p className="small-note" role="status">{speechNotice}</p>}
   {errorKind==='transcription'&&lastAudio.current&&<button onClick={()=>{setError('');void transcribe(lastAudio.current!.blob,lastAudio.current!.duration,++request.current);}}><RotateCcw size={14}/>{t('Retry transcription')}</button>}{errorKind==='reply'&&<><button onClick={()=>void send(lastQuestion.current)}><RotateCcw size={14}/>Try again</button><button onClick={()=>navigate('/orders?view=batches&sms=1')}>Open SMS simulator</button></>}
   <div className="voice-preferences"><label className="check"><input type="checkbox" checked={aloud} onChange={event=>{aloudRef.current=event.target.checked;setAloud(event.target.checked);localStorage.setItem('lp-read-aloud',String(event.target.checked));if(!event.target.checked)player.current?.stop();}}/>{t('Read answers aloud')}</label>{aloud&&<select aria-label="Speech voice" value={speechMode} onChange={event=>{setSpeechMode(event.target.value);modeRef.current=event.target.value;localStorage.setItem('lp-speech-mode',event.target.value);player.current?.stop();}}><option value="fast">Fast device voice</option><option value="cloud">Cloud voice</option></select>}<label className="check"><input type="checkbox" checked={autoSend} onChange={event=>{setAutoSend(event.target.checked);autoRef.current=event.target.checked;localStorage.setItem('lp-auto-send',String(event.target.checked));}}/>Send recordings after transcription</label></div>
   <textarea aria-label={t('Type a question')} value={input} onChange={event=>{transcriptLanguage.current=undefined;setInput(event.target.value);}} onKeyDown={event=>{if(event.key==='Enter'&&(event.metaKey||event.ctrlKey)){event.preventDefault();void send();}}} placeholder={t('Type a question')} rows={2}/>
   <div className="button-row">{phase==='Listening'?<><button onClick={()=>recording.current?.stop()}><Square size={16}/>{autoSend?'Stop and send':'Stop and review'}</button><button onClick={cancel}>{t('Cancel recording')}</button></>:<button onClick={record} disabled={phase==='Transcribing'||phase==='Requesting permission'}><Mic size={17}/>Record</button>}<button className="primary" onClick={()=>void send()} disabled={!input.trim()||phase==='Transcribing'||phase==='Listening'||phase==='Requesting permission'||processing}><Send size={16}/>{t('Send')}</button></div>
   {speaking&&<button onClick={()=>player.current?.stop()}><Volume2 size={16}/>{t('Stop speaking')}</button>}
   <small>{autoSend?'Recordings are sent after transcription. Updates still need confirmation.':'Review the transcript before sending. Ctrl or ⌘ + Enter sends.'}</small>{timing.text!==undefined&&<small className="reply-timing">Text in {(timing.text/1000).toFixed(1)}s{timing.audio!==undefined&&` · speech in ${(timing.audio/1000).toFixed(1)}s`}</small>}
  </div>
 </aside>;
}
