'use client';
import {UI} from './localized-ui';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,Compass,X} from 'lucide-react';
import {usePathname} from 'next/navigation';
import {navigate} from './workspace-link';
import {useLanguage} from './localized-ui';
import {translate} from '@/lib/i18n';

const steps=[
 {title:'Your daily workspace',copy:'Start with Today to see dispatch deadlines, packing labels, low stock and the next payment. Your data stays in place when you change tabs.',route:'/today',target:'.sidebar nav'},
 {title:'Factory Mode',copy:'Use the factory button to open packing batches. Five daily screens keep orders, stock, payments and help close at hand. Each parcel keeps its own label.',route:'/orders?view=batches',target:'.factory-toggle'},
 {title:'Speak in your language',copy:'Choose your language next to Voice mode. Read the workspace in that language, record a question or type it, and hear the reply aloud.',route:'/today',target:'.language-control'},
 {title:'Voice notes that lead to action',copy:'Try saying: I have prepared orders LP 8042 and LP 8047. Launchpad prepares the exact update. You still review it and press Confirm update before records change.',route:'/orders?view=batches',target:'.voice-mode'},
 {title:'A bounded production decision',copy:'Review demand evidence, packing ownership and your cash ceiling before committing stock. A recommendation does not start production or promise orders.',route:'/commitment',target:'.commitment-decision'},
 {title:'Support and low-data fallback',copy:'Help shows your named activation contact and callback or visit requests. The SMS simulator demonstrates exact batch replies. It does not send a real message.',route:'/support',target:'.contact-panel'},
] as const;

export default function ProductTour({factory,previewFactory}:{factory:boolean;previewFactory:(enabled:boolean)=>void}){
 const language=useLanguage(),pathname=usePathname(),t=(text:string)=>translate(language,text);
 const [step,setStep]=useState<number|null>(null);const trigger=useRef<HTMLButtonElement|null>(null),panel=useRef<HTMLDivElement|null>(null),previous=useRef(''),previousFactory=useRef(false);
 function start(){previousFactory.current=factory;previous.current=window.location.pathname+window.location.search;setStep(0);navigate(steps[0].route);}
 function finish(){setStep(null);previewFactory(previousFactory.current);if(previous.current)navigate(previous.current);requestAnimationFrame(()=>trigger.current?.focus());}
 function move(next:number){setStep(next);if(next===1)previewFactory(true);navigate(steps[next].route);}
 useEffect(()=>{
  if(step===null)return;const target=document.querySelector(steps[step].target);target?.classList.add('tour-highlight');panel.current?.focus();
  const keyboard=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();finish();}if(event.key==='Tab'&&panel.current){const controls=Array.from(panel.current.querySelectorAll<HTMLElement>('button:not(:disabled),a'));const first=controls[0],last=controls.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===panel.current)){event.preventDefault();first?.focus();}}};
  document.addEventListener('keydown',keyboard);return()=>{target?.classList.remove('tour-highlight');document.removeEventListener('keydown',keyboard);};
 // Route updates attach the highlight to the newly visible workflow.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[step,pathname]);
 return <><UI.button ref={trigger} className="tour-trigger" onClick={start} aria-label={t('Product tour')} title={t('Product tour')}><Compass size={18}/><UI.span>{t('Product tour')}</UI.span></UI.button>{step!==null&&<><UI.div className="tour-scrim" onClick={finish} aria-hidden="true"/><UI.div className="tour-panel" ref={panel} role="dialog" aria-modal="true" aria-label={t('Product tour')} tabIndex={-1}>
 <UI.div className="section-head"><UI.span className="eyebrow">Product tour · {step+1} of {steps.length}</UI.span><UI.button className="icon" aria-label={t('Close tour')} onClick={finish}><X size={18}/></UI.button></UI.div>
 <UI.small>Preview only. No business records are changed.</UI.small><UI.h2>{steps[step].title}</UI.h2><UI.p>{steps[step].copy}</UI.p><UI.div className="button-row"><UI.button disabled={step===0} onClick={()=>move(step-1)}><ArrowLeft size={15}/>Back</UI.button><UI.button onClick={finish}>Skip tour</UI.button><UI.button className="primary" onClick={()=>step===steps.length-1?finish():move(step+1)}>{step===steps.length-1?<><Check size={15}/>Finish tour</>:<>Next<ArrowRight size={15}/></>}</UI.button></UI.div>
 </UI.div></>}</>;
}
