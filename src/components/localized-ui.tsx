'use client';
import {Children,createContext,createElement,useContext,type JSX,type ReactNode,type ReactElement} from 'react';
import {translate} from '@/lib/i18n';

export const LanguageContext=createContext('en');
export function useLanguage(){return useContext(LanguageContext);}

// Translate display text, never input values, record IDs or submitted option values.
// The returned element is the original tag, so layouts and event semantics stay intact.
function displayChildren(children:ReactNode,language:string){
 const result:ReactNode[]=[];let text='';
 const flush=()=>{if(text){result.push(translate(language,text));text='';}};
 for(const child of Children.toArray(children)){
  if(typeof child==='string'||typeof child==='number')text+=String(child);
  else{flush();result.push(child);}
 }
 flush();return result;
}
type TagComponents={[Tag in keyof JSX.IntrinsicElements]:(props:JSX.IntrinsicElements[Tag])=>ReactElement};
const tags=['a','article','aside','b','br','button','code','dd','details','dialog','div','dl','dt','em','fieldset','footer','form','h1','h2','h3','h4','header','i','img','input','label','legend','li','main','nav','ol','option','p','pre','section','select','small','span','strong','summary','table','tbody','td','textarea','th','thead','tr','ul'] as const;
function localized(tag:string){
 function Element(props:Record<string,unknown>){
  const language=useLanguage(),attributes={...props};
  for(const name of ['aria-label','aria-description','title','placeholder','alt'])if(typeof attributes[name]==='string')attributes[name]=translate(language,attributes[name] as string);
  if(tag==='option'&&attributes.value===undefined&&typeof props.children==='string')attributes.value=props.children;
  const children=props.children as ReactNode;
  if(children!==undefined)attributes.children=tag==='pre'||tag==='code'||props['data-no-translate']?children:displayChildren(children,language);
  return createElement(tag,attributes);
 }
 Element.displayName='Localized.'+tag;return Element;
}
export const UI=Object.fromEntries(tags.map(tag=>[tag,localized(tag)])) as unknown as Pick<TagComponents,typeof tags[number]>;
