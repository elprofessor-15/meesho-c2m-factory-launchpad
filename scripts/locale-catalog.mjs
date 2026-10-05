import ts from 'typescript';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
const normalize=text=>text.replace(/\u2014/g,', ').replace(/\s+/g,' ').trim();
export function catalog(){
 const strings=new Set();
 function add(text){text=normalize(text);if(text.length<2||!/[a-zA-Z]{2}/.test(text)||text.length>1600||/^(https?:|\/|\.(?! )|@\/|#|-[A-Z])/.test(text)||text.includes('=>')||text.includes('function ')||text.includes('Content-Type')||/^[a-z][a-zA-Z0-9_-]*$/.test(text)&&!['units','days','minutes','orders','parcels','weeks','stock','expected','actual','fulfilled','retained','production','packing','shipping','fees','adjustments'].includes(text))return;if(text!=='ON'&&!/[a-zA-Z]{3}/.test(text.replace(/\{\d+\}/g,'')))return;strings.add(text);}
 const files=readdirSync('src/components').filter(x=>x.endsWith('.tsx')&&x!=='localized-ui.tsx').map(x=>'src/components/'+x);
 files.push('src/lib/fixtures.ts','src/lib/launch.ts','src/lib/forecast/engine.ts','src/lib/services.ts','src/lib/assistant/actions.ts','src/lib/assistant/quick.ts','src/lib/server/quota-policy.ts','src/lib/server/repository.ts','src/lib/speech-player.ts','src/lib/speech-client.ts','src/lib/i18n.ts','src/app/api/[...path]/route.ts');
 for(const file of files){const ast=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  function walk(node){
   if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))add(node.text);
   if(ts.isTemplateExpression(node))add(node.head.text+node.templateSpans.map((span,i)=>`{${i}}`+span.literal.text).join(''));
   if(ts.isJsxText(node))add(node.text);
   if(ts.isJsxElement(node)||ts.isJsxFragment(node)){let text='',index=0;function flush(){add(text);text='';index=0;}
    for(const child of node.children){if(ts.isJsxText(child))text+=child.text.replace(/\s+/g,' ');else if(ts.isJsxExpression(child)&&child.expression){const e=child.expression;if(ts.isStringLiteral(e)||ts.isNoSubstitutionTemplateLiteral(e))text+=e.text;else if(ts.isJsxElement(e)||ts.isJsxSelfClosingElement(e)||ts.isJsxFragment(e))flush();else text+=`{${index++}}`;}else flush();}flush();
   }
   ts.forEachChild(node,walk);
  }walk(ast);
 }
 for(const text of ['Understanding your request','Writing your answer','Checking your workspace','A reply is already in progress. Please wait or stop it.','The reply was interrupted. Please try again. No update was confirmed.','The connection is busy. Please try again, or use the order, stock and payment pages.','Today’s conversation allowance is used. Orders, stock and payment pages remain available.','The conversation service is unavailable for this request. Try an exact order number, total stock update or payout question.'])add(text);
 return [...strings].sort();
}
if(process.argv[1]?.endsWith('locale-catalog.mjs')){const keys=catalog();writeFileSync('src/lib/locales/en.json',JSON.stringify(Object.fromEntries(keys.map(k=>[k,k])),null,2)+'\n');console.log('Locale catalog:',keys.length,'display phrases');}
