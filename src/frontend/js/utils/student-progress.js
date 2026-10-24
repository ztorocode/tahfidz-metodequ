import {getState} from "../store.js?v=c8f4a2e6";

/**
 * Isian progress harian seorang santri (dibaca musyrif/admin dari server).
 * Hasil dikembalikan dalam format context milik santri (kunci "pekan:hari:id")
 * sehingga tabel report bisa dipakai ulang tanpa cabang khusus.
 */

const cache=new Map(); // userId -> {data, finished}
const WEEKS=[1,2,3,4,5];
const FIELD_IDS=["target","murajaah","rabth-awal","rabth-akhir"];
const STEP_IDS=[
 "kemarin-1","kemarin-2","kemarin-3","kemarin-4","kemarin-5",
 "istima-1","istima-2","istima-3",
 "menghafal","merekam"
];
for(let i=1;i<=25;i++)STEP_IDS.push("tikrar-"+i);

function activePondokId(){
 const state=getState();
 return state.activePondokId??state.authUser?.pondoks?.[0]?.id??state.myPondoks?.[0]?.id??null;
}

function authHeaders(){
 const token=getState().authToken;
 return {Accept:"application/json",...(token?{Authorization:"Bearer "+token}:{})};
}

export function studentPercent(data,week,day){
 if(!data)return 0;
 const prefix=week+":"+day+":";
 let done=0;
 FIELD_IDS.forEach(id=>{if(String(data.fields?.[prefix+id]??"").trim())done+=1});
 STEP_IDS.forEach(id=>{if(data.checks?.[prefix+id])done+=1});
 return Math.round(done/(FIELD_IDS.length+STEP_IDS.length)*100);
}

/** Data tersimpan di memori (sinkron). */
export function cachedStudentProgress(userId){
 return cache.get(Number(userId))?.data||null;
}

export function isStudentProgressLoading(userId){
 return Boolean(cache.get(Number(userId))&&!cache.get(Number(userId)).finished);
}

/** Tarik seluruh pekan milik seorang santri, lalu simpan di cache. */
export async function loadStudentProgress(userId,force=false){
 const id=Number(userId);
 const pondokId=Number(activePondokId());
 if(!id||!pondokId||!getState().authToken)return null;

 const held=cache.get(id);
 if(held&&!force&&!held.finished)return held.data;
 if(!held)cache.set(id,{data:null,finished:false});

 const data={fields:{},checks:{},updatedAt:null,weeks:{}};
 try{
  const rows=await Promise.all(WEEKS.map(async week=>{
   const response=await fetch("/api/progress/student?pondok_id="+pondokId+"&user_id="+id+"&week="+week+"&t="+Date.now(),{headers:authHeaders()});
   if(!response.ok)return null;
   const body=await response.json().catch(()=>({}));
   return body&&body.success?body.data:null;
  }));
  rows.forEach((row,offset)=>{
   if(!row)return;
   const week=WEEKS[offset];
   let filled=0;
   Object.entries(row.days||{}).forEach(([day,entry])=>{
    const prefix=week+":"+day+":";
    Object.entries(entry.fields||{}).forEach(([key,value])=>{data.fields[prefix+key]=value});
    Object.entries(entry.checks||{}).forEach(([key,value])=>{data.checks[prefix+key]=Boolean(value)});
    if(String(entry.updated_at||"")>String(data.updatedAt||""))data.updatedAt=entry.updated_at;
    if(Object.keys(entry.fields||{}).length||Object.keys(entry.checks||{}).length)filled+=1;
   });
   data.weeks[week]=filled;
  });
  cache.set(id,{data,finished:true});
  return data;
 }catch{
  cache.set(id,{data:held?.data||null,finished:true});
  return held?.data||null;
 }
}

export function forgetStudentProgress(userId){
 cache.delete(Number(userId));
}
