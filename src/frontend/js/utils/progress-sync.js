import {getState} from "../store.js?v=9a4e6d38";
import {getProgressContext,setProgressContextPatch,progressContextKey} from "./progress-context.js?v=9a4e6d38";

/**
 * Sinkronisasi isian progress ke server.
 *
 * - Autosave: setiap kolom/checklist berubah, jadwalkan simpan (debounce).
 * - Offline: kalau gagal kirim, baris masuk antrean di localStorage, tidak hilang.
 * - Flush: dikirim ulang saat kembali online dan saat aplikasi dibuka.
 */

const QUEUE_KEY="metodequ_progress_queue";
const VERSION_KEY="metodequ_progress_versions";
const DEBOUNCE_MS=1200;

let timers={};
let flushing=false;
let listening=false;
let lastSyncAtValue=null;

/** Stempel terakhir isian milik sendiri berhasil ditarik/dikirim (format UTC ala DB). */
export function lastSyncAt(){return lastSyncAtValue}

function readJson(key,fallback){
 try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}
}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}

function queue(){return readJson(QUEUE_KEY,[])}
function saveQueue(list){writeJson(QUEUE_KEY,list)}
function versions(){return readJson(VERSION_KEY,{})}
function saveVersions(value){writeJson(VERSION_KEY,value)}

function versionKey(pondokId,week,day){return pondokId+":"+week+":"+day}

function activePondokId(){
 const st=getState();
 return st.activePondokId??st.authUser?.pondoks?.[0]?.id??st.myPondoks?.[0]?.id??null;
}

/** Stempel waktu format DB (UTC, milidetik). */
function nowStamp(){
 const d=new Date();
 const p=n=>String(n).padStart(2,"0");
 const ms=String(d.getUTCMilliseconds()).padStart(3,"0");
 return d.getUTCFullYear()+"-"+p(d.getUTCMonth()+1)+"-"+p(d.getUTCDate())+" "+p(d.getUTCHours())+":"+p(d.getUTCMinutes())+":"+p(d.getUTCSeconds())+"."+ms;
}

function authHeaders(extra={}){
 const token=getState().authToken;
 return {Accept:"application/json",...(token?{Authorization:"Bearer "+token}:{}),...(extra||{})};
}

export function pendingCount(){
 const pid=activePondokId();
 return queue().filter(e=>e.pondok_id===Number(pid)).length;
}

/** Bangun payload satu hari dari isian yang sedang diedit. */
function buildPayload(week,day,percent,stamp){
 const data=getProgressContext();
 const prefix=week+":"+day+":";
 const fields={},checks={};
 Object.entries(data.fields||{}).forEach(([k,v])=>{if(k.startsWith(prefix))fields[k.slice(prefix.length)]=v});
 Object.entries(data.checks||{}).forEach(([k,v])=>{if(k.startsWith(prefix))checks[k.slice(prefix.length)]=v});
 const meta=versions()[versionKey(activePondokId(),week,day)]||{};
 return {
  pondok_id:Number(activePondokId()),
  week:Number(week),
  day:String(day),
  fields,
  checks,
  completion_percent:Math.max(0,Math.min(100,Number(percent)||0)),
  version:Number(meta.version)||0,
  client_updated_at:stamp
 };
}

/** Jadwalkan simpan satu hari (dipanggil tiap kolom/checklist berubah). */
export function scheduleSave(week,day,percent){
 const pid=activePondokId();
 if(!pid||!getState().authToken)return;
 const key=versionKey(pid,week,day);
 clearTimeout(timers[key]);
 timers[key]=setTimeout(()=>{
  const entry=buildPayload(week,day,percent,nowStamp());
  if(!entry.pondok_id)return;
  const list=queue().filter(x=>!(x.pondok_id===entry.pondok_id&&x.week===entry.week&&x.day===entry.day));
  list.push(entry);
  saveQueue(list);
  flush();
 },DEBOUNCE_MS);
}

function removeFromQueue(entry){
 saveQueue(queue().filter(x=>!(
  x.pondok_id===entry.pondok_id&&x.week===entry.week&&x.day===entry.day
  &&x.client_updated_at===entry.client_updated_at
 )));
}

/** Kirim antrean ke server, satu per satu. Gagal → tetap menunggu di antrean. */
export async function flush(){
 const st=getState();
 if(flushing||!st.authToken)return;
 const list=queue();
 if(!list.length)return;
 flushing=true;
 try{
  for(const entry of list){
   let response;
   try{
    response=await fetch("/api/progress",{method:"POST",headers:authHeaders({"Content-Type":"application/json"}),body:JSON.stringify(entry)});
   }catch{break;} // offline → berhenti, antrean dipertahankan
   if(response.status===401)break;
   let body={};
   try{body=await response.json()}catch{}
   if(!response.ok)continue;
   const meta=versions();
   meta[versionKey(entry.pondok_id,entry.week,entry.day)]={
    version:Number(body.data?.version)||(entry.version+1),
    client_updated_at:body.data?.client_updated_at||entry.client_updated_at
   };
   saveVersions(meta);
   removeFromQueue(entry);
   lastSyncAtValue=body.data?.updated_at||nowStamp();
  }
 }finally{flushing=false}
}

/** Tarik isian satu pekan dari server lalu timpa ke context (antrean lokal menang). */
export async function loadWeek(week){
 const st=getState();
 const pid=activePondokId();
 if(!pid||!st.authToken)return false;
 let body={};
 try{
  const response=await fetch("/api/progress?pondok_id="+pid+"&week="+week+"&t="+Date.now(),{headers:authHeaders()});
  if(!response.ok)return false;
  body=await response.json();
 }catch{return false;}

 const days=(body.data&&body.data.days)||{};
 const ctx=getProgressContext();
 const fields={...(ctx.fields||{})};
 const checks={...(ctx.checks||{})};
 const meta=versions();
 let latest="";

 const clearDay=(prefix)=>{
  Object.keys(fields).forEach(k=>{if(k.startsWith(prefix))delete fields[k]});
  Object.keys(checks).forEach(k=>{if(k.startsWith(prefix))delete checks[k]});
 };

 Object.entries(days).forEach(([day,row])=>{
  const prefix=week+":"+day+":";
  clearDay(prefix);
  Object.entries(row.fields||{}).forEach(([id,value])=>{fields[prefix+id]=value});
  Object.entries(row.checks||{}).forEach(([id,value])=>{checks[prefix+id]=value});
  meta[versionKey(pid,week,day)]={version:Number(row.version)||0,client_updated_at:row.client_updated_at||null};
  if(String(row.updated_at||"")>latest)latest=String(row.updated_at||"");
 });

 // Edit lokal yang belum terkirim harus tetap menang atas data server.
 queue().filter(e=>e.pondok_id===Number(pid)&&e.week===week).forEach(entry=>{
  const prefix=week+":"+entry.day+":";
  clearDay(prefix);
  Object.entries(entry.fields||{}).forEach(([id,value])=>{fields[prefix+id]=value});
  Object.entries(entry.checks||{}).forEach(([id,value])=>{checks[prefix+id]=value});
 });

 saveVersions(meta);
 setProgressContextPatch({fields,checks});
 if(latest)lastSyncAtValue=latest;
 return true;
}

/** Pasang listener sekali: flush saat online & saat aplikasi dibuka. */
export function initProgressSync(){
 if(listening)return;
 listening=true;
 window.addEventListener("online",()=>{flush()});
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")flush()});
 flush();
}
