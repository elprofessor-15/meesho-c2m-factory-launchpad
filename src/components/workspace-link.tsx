'use client';
import type {ComponentProps,MouseEvent} from 'react';

// Every workspace screen uses the same loaded data and client renderer.
// Next's native history integration updates pathname/search without a server trip.
export function navigate(href:string,{replace=false,scroll=true}:{replace?:boolean;scroll?:boolean}={}){
 const url=new URL(href,window.location.href);
 const workspace=url.origin===window.location.origin&&/^\/(today|orders(?:\/LP-\d{4})?|catalogue|inventory|demand|payments|support|onboarding|commitment|settings|operations)\/?$/.test(url.pathname);
 if(!workspace){window.location.assign(url.href);return;}
 const path=url.pathname+url.search+url.hash;
 if(path===window.location.pathname+window.location.search+window.location.hash)return;
 window.history[replace?'replaceState':'pushState'](null,'',path);
 if(scroll)window.scrollTo({top:0,behavior:'instant'});
}

export default function WorkspaceLink({href,onClick,...props}:ComponentProps<'a'>&{href:string}){
 function open(event:MouseEvent<HTMLAnchorElement>){
  onClick?.(event);
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||props.download||(props.target&&props.target!=='_self'))return;
  const url=new URL(href,window.location.href);
  if(url.origin!==window.location.origin)return;
  event.preventDefault();navigate(href);
 }
 return <a {...props} href={href} onClick={open}/>;
}
