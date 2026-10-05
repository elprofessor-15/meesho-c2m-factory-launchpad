import hi from './locales/hi.json';
import bn from './locales/bn.json';
import mr from './locales/mr.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import gu from './locales/gu.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import pa from './locales/pa.json';

export const dictionaries:Record<string,Record<string,string>>={hi,bn,mr,ta,te,gu,kn,ml,pa};
const normalize=(text:string)=>text.replace(/\u2014/g,', ').replace(/\s+/g,' ').trim();
const escape=(text:string)=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const templates:Record<string,{expression:RegExp;target:string;slots:string[]}[]>={};
const phrases:Record<string,RegExp>={};

export function localize(language:string,text:string,depth=0):string{
 const clean=text.replace(/\u2014/g,', '),dictionary=dictionaries[language];
 if(!dictionary||!text)return clean;
 const key=normalize(clean),prefix=clean.match(/^\s*/)?.[0]??'',suffix=clean.match(/\s*$/)?.[0]??'';
 if(dictionary[key])return prefix+dictionary[key]+suffix;
 templates[language]??=Object.entries(dictionary).filter(([source])=>/\{\d+\}/.test(source)).sort(([a],[b])=>b.replace(/\{\d+\}/g,'').length-a.replace(/\{\d+\}/g,'').length).map(([source,target])=>({expression:new RegExp('^'+source.split(/(\{\d+\})/).map(piece=>/^\{\d+\}$/.test(piece)?'(.*?)':escape(piece)).join('')+'$'),target,slots:source.match(/\{\d+\}/g)??[]}));
 for(const template of templates[language]){const match=template.expression.exec(key);if(match){const values=new Map(template.slots.map((slot,i)=>[slot,depth<2?localize(language,match[i+1],depth+1):match[i+1]]));return prefix+template.target.replace(/\{\d+\}/g,slot=>values.get(slot)??slot)+suffix;}}
 // Composed labels, dates and record values can share one rendered text node.
 // Replace only known phrases; names, IDs, user-entered text and numbers stay intact.
 phrases[language]??=new RegExp('(?<![A-Za-z])(?:'+Object.keys(dictionary).filter(source=>!source.includes('{')&&/[A-Za-z]{3}/.test(source)).sort((a,b)=>b.length-a.length).map(escape).join('|')+')(?![A-Za-z])','g');
 return clean.replace(phrases[language],source=>dictionary[source]??source);
}
