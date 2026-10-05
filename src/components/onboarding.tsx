'use client';
import {UI} from './localized-ui';

import {useState} from 'react';
import {ArrowLeft,ArrowRight,Check,ImagePlus,Mic,Save} from 'lucide-react';
import {State} from '@/lib/types';
import {languages} from '@/lib/i18n';
import {api} from './ui';

const steps=['Business and language','Products','Available capacity','Economics','Packing and pickup','Pilot review'];
const fieldsByStep:Record<number,string[]>={
  0:['business','city','language'],
  1:['product','variant','category','price'],
  2:['readyUnits','weeklyCapacity','leadDays','batchSize'],
  3:['cashLimit','monthlyTarget','minimumContribution'],
  4:['operatingOwner','packingOwner'],
  5:[],
};

export default function Onboarding({state,t,refresh,ask,onError}:{state:State;t:(text:string)=>string;refresh:()=>Promise<void>;ask:(question:string)=>void;onError:(message:string)=>void}){
  const [active,setActive]=useState(Math.min(state.step,5));
  const [values,setValues]=useState<Record<string,string>>({
    business:state.onboarding.business??state.manufacturers.find(m=>m.id===state.manufacturerId)?.name??'',
    city:state.onboarding.city??state.manufacturers.find(m=>m.id===state.manufacturerId)?.city??'',
    language:state.onboarding.language==='Hindi'?'hi':state.onboarding.language==='English'?'en':state.onboarding.language??'hi',
    product:state.onboarding.product??state.products.find(p=>p.manufacturerId===state.manufacturerId)?.name??'',
    variant:state.onboarding.variants??state.products.find(p=>p.manufacturerId===state.manufacturerId)?.variant??'',
    category:state.onboarding.category??state.products.find(p=>p.manufacturerId===state.manufacturerId)?.category??'',
    price:state.onboarding.price??'299',
    readyUnits:state.onboarding.readyUnits??String(state.products.find(p=>p.manufacturerId===state.manufacturerId)?.stock??0),
    weeklyCapacity:state.onboarding.weeklyCapacity??String(state.products.find(p=>p.manufacturerId===state.manufacturerId)?.capacity??0),
    leadDays:state.onboarding.leadDays??String(state.products.find(p=>p.manufacturerId===state.manufacturerId)?.lead??1),
    batchSize:state.onboarding.batchSize??String(state.products.find(p=>p.manufacturerId===state.manufacturerId)?.batch??1),
    cashLimit:state.onboarding.cashLimit??'15000',
    monthlyTarget:state.onboarding.monthlyTarget??'60',
    minimumContribution:state.onboarding.minimumContribution??'40',
    operatingOwner:state.onboarding.operatingOwner??state.manufacturers.find(m=>m.id===state.manufacturerId)?.owner??'',
    packingOwner:state.onboarding.packingOwner??'',
    photo:state.onboarding.photo??'',
  });
  const [saving,setSaving]=useState(false);
  const completed=Math.max(state.step,0);
  const currentFields=fieldsByStep[active]??[];
  const titles=['Business and language','Products','Available capacity','Economics','Packing and pickup','Pilot review'];

  async function save(next:number){
    const missing=currentFields.filter(key=>!values[key]?.trim());
    if(missing.length){onError('Complete the required fields before continuing.');return;}
    if(['readyUnits','weeklyCapacity','leadDays','batchSize','cashLimit','monthlyTarget','minimumContribution','price'].some(key=>values[key]!==undefined&&Number(values[key])<0)){onError('Quantities and amounts must be zero or greater.');return;}
    setSaving(true);
    try{
      await api('onboarding',{step:Math.max(completed,next),fields:values});
      await refresh();
      setActive(Math.min(next,5));
      onError('');
    }catch(error){onError(error instanceof Error?error.message:'Could not save onboarding progress.');}
    finally{setSaving(false);}
  }

  async function uploadPhoto(file?:File){
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>200_000){onError('Choose a JPEG, PNG or WebP image under 200 KB.');return;}
    const reader=new FileReader();
    reader.onload=()=>{if(typeof reader.result==='string')setValues(current=>({...current,photo:reader.result as string}));};
    reader.onerror=()=>onError('That product image could not be read.');
    reader.readAsDataURL(file);
  }

  function field(key:string,label:string,options:{type?:string;min?:number;step?:number;hint?:string}={}){
    const numeric=['readyUnits','weeklyCapacity','leadDays','batchSize','cashLimit','monthlyTarget','minimumContribution','price'].includes(key);
    return <UI.label className="onboarding-field" key={key}>{label}<UI.input name={key} type={options.type??(numeric?'number':'text')} min={options.min??(numeric?0:undefined)} step={options.step??(numeric?'1':undefined)} value={values[key]??''} onChange={event=>setValues(current=>({...current,[key]:event.target.value}))} required={currentFields.includes(key)}/>{options.hint&&<UI.small>{options.hint}</UI.small>}</UI.label>;
  }

  return <>
    <UI.div className="page-heading"><UI.div><UI.span className="eyebrow">A FEW PRACTICAL DETAILS</UI.span><UI.h1>{t('Onboarding')}</UI.h1><UI.p>Start small. Save your answers and come back when you are ready.</UI.p></UI.div><UI.span className="badge">{Math.min(completed,6)} of 6 steps saved</UI.span></UI.div>
    <UI.div className="onboarding-layout">
      <UI.nav className="onboarding-steps" aria-label="Onboarding steps">{steps.map((title,index)=><UI.button key={title} className={active===index?'active':''} onClick={()=>setActive(index)}><UI.span>{index<completed?<Check size={15}/>:index+1}</UI.span>{title}</UI.button>)}</UI.nav>
      <UI.section className="onboarding-form">
        <UI.div className="section-head"><UI.div><UI.span className="eyebrow">STEP {active+1} OF 6</UI.span><UI.h2>{titles[active]}</UI.h2></UI.div><UI.button className="voice-entry" onClick={()=>ask(active===2?'Help me enter my ready stock, weekly capacity and lead time':active===3?'Help me think through a comfortable inventory budget and minimum contribution':'Help me with this onboarding step')}><Mic size={16}/>Ask by voice</UI.button></UI.div>
        {active===0&&<UI.div className="onboarding-fields">{field('business','Business name')}{field('city','City and state')}<UI.label className="onboarding-field">Preferred language<UI.select value={values.language} onChange={event=>setValues(current=>({...current,language:event.target.value}))}>{languages.map(([id,name])=><UI.option key={id} value={id}>{name}</UI.option>)}</UI.select></UI.label></UI.div>}
        {active===1&&<><UI.div className="onboarding-fields">{field('product','What do you make?')}{field('variant','Which variant would you start with?')}{field('category','Product category')}{field('price','Planned selling price (₹)',{step:.01})}</UI.div><UI.label className="photo-upload"><ImagePlus size={22}/><UI.span><UI.strong>Add a product photo</UI.strong><UI.small>JPEG, PNG or WebP · up to 200 KB. Optional.</UI.small></UI.span><UI.input type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>void uploadPhoto(event.target.files?.[0])}/>{values.photo&&<UI.img src={values.photo} alt="Selected product preview"/>}</UI.label><UI.details className="manual-entry"><UI.summary>Continue without a photo</UI.summary><UI.p>Product name, variant and category are enough to save this step.</UI.p></UI.details></>}
        {active===2&&<UI.div className="onboarding-fields">{field('readyUnits','How many saleable units are ready?',{hint:'Count only units that are complete and available to sell.'})}{field('weeklyCapacity','Additional units available each week',{hint:'After B2B commitments and current production needs.'})}{field('leadDays','How many days to make another batch?',{hint:'Enter days, not weeks.'})}{field('batchSize','Smallest practical production batch',{hint:'The minimum batch you would actually run.'})}</UI.div>}
        {active===3&&<><UI.p className="muted">Use amounts that feel manageable for your business. These are planning inputs, not verified financial records.</UI.p><UI.div className="onboarding-fields">{field('cashLimit','Comfortable stock and working-capital exposure (₹)',{step:.01})}{field('monthlyTarget','Monthly retained units that make this worthwhile')}{field('minimumContribution','Minimum contribution per retained unit (₹)',{step:.01})}</UI.div><UI.details className="manual-entry"><UI.summary>What goes into contribution?</UI.summary><UI.p>Expected retained sales value minus production, packing, delivery and selling costs. Unknown charges stay marked for review.</UI.p></UI.details></>}
        {active===4&&<UI.div className="onboarding-fields">{field('operatingOwner','Who manages marketplace orders?')}{field('packingOwner','Who physically packs orders and hands them over?')}<UI.p className="muted span-all">No courier booking is made here. This tells the support team who owns each operating step.</UI.p></UI.div>}
        {active===5&&<UI.div className="pilot-review"><UI.h3>Review your first-step plan</UI.h3><UI.dl>{[['Business',values.business],['Product',values.product],['Variant',values.variant],['Selling price',`₹${values.price}`],['Ready units',`${values.readyUnits} units`],['Weekly availability',`${values.weeklyCapacity} units`],['Lead time',`${values.leadDays} days`],['Minimum batch',`${values.batchSize} units`],['Comfortable exposure',`₹${values.cashLimit}`],['Packing owner',values.packingOwner||'Not provided']].map(([label,value])=><UI.div key={label}><UI.dt>{label}</UI.dt><UI.dd>{value||'Not provided'}</UI.dd></UI.div>)}</UI.dl><UI.p className="notice">This is a saved planning draft, not a launch approval or a demand guarantee.</UI.p></UI.div>}
        <UI.div className="onboarding-actions"><UI.button disabled={active===0||saving} onClick={()=>setActive(value=>Math.max(0,value-1))}><ArrowLeft size={16}/>Back</UI.button><UI.span><Save size={14}/> Progress saves to this workspace</UI.span>{active<5?<UI.button className="primary" disabled={saving} onClick={()=>void save(active+1)}>{saving?'Saving…':'Save and continue'}<ArrowRight size={16}/></UI.button>:<UI.button className="primary" disabled={saving} onClick={()=>void save(6)}>{saving?'Saving…':completed>=6?'Save review':'Save pilot review'}<Check size={16}/></UI.button>}</UI.div>
      </UI.section>
    </UI.div>
  </>;
}