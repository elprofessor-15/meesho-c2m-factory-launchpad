'use client';
import {useEffect,useRef} from 'react';
import {X,ArrowUpRight} from 'lucide-react';
import Link from 'next/link';
export function Modal({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);return <dialog ref={ref} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="dialog-title"><h2>{title}</h2><button className="icon" aria-label="Close" onClick={onClose}><X size={20}/></button></div>{children}</dialog>;}
export function Badge({children,tone=''}:{children:React.ReactNode;tone?:string}){return <span className={'badge '+tone}>{children}</span>;}
export function Metric({label,value,note}:{label:string;value:React.ReactNode;note?:string}){return <div className="metric"><span>{label}</span><strong>{value}</strong>{note&&<small>{note}</small>}</div>;}
export function TextLink({href,children}:{href:string;children:React.ReactNode}){return <Link className="text-link" href={href}>{children}<ArrowUpRight size={16}/></Link>;}
export async function api<T=unknown>(endpoint:string,body?:unknown):Promise<T>{const r=await fetch('/api/'+endpoint,body===undefined?{cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error??'Request failed');return data;}
export function csv(name:string,rows:Record<string,unknown>[]){const keys=Object.keys(rows[0]??{});const cell=(v:unknown)=>{let s=String(v??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};const content=[keys.map(cell).join(','),...rows.map(r=>keys.map(k=>cell(r[k])).join(','))].join('\r\n');download(name,content,'text/csv;charset=utf-8');}
export function download(name:string,content:string,type:string){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
