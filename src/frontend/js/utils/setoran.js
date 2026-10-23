import {getState} from "../store.js?v=f52d1a07";

/**
 * Penilaian setoran seorang santri oleh musyrif halaqahnya (tabel
 * setoran_reviews). Menopang kartu Riwayat Setoran, Catatan Musyrif,
 * Ringkasan Penguatan, Progress Hafalan, dan Murajaah.
 */

const cache=new Map(); // userId -> {rows, finished}

export const DECISIONS=[
 {key:"mutqin",label:"Mutqin",tone:"success"},
 {key:"cukup_stabil",label:"Cukup Stabil",tone:"warning"},
 {key:"penguatan",label:"Perlu Penguatan",tone:"danger"},
 {key:"ulang",label:"Perlu Ulang",tone:"danger"}
];

export function decisionMeta(key){
 return DECISIONS.find(d=>d.key===String(key||""))||{key:String(key||""),label:String(key||"—"),tone:""};
}

function activePondokId(){
 const state=getState();
 return state.activePondokId??state.authUser?.pondoks?.[0]?.id??state.myPondoks?.[0]?.id??null;
}

function authHeaders(){
 const token=getState().authToken;
 return {Accept:"application/json","Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})};
}

/** Baris tersimpan di memori (sinkron). */
export function cachedSetoran(userId){
 return cache.get(Number(userId))?.rows||null;
}

export function isSetoranLoading(userId){
 const held=cache.get(Number(userId));
 return Boolean(held&&!held.finished);
}

export async function loadSetoran(userId,force=false){
 const id=Number(userId);
 const pondokId=Number(activePondokId());
 if(!id||!pondokId||!getState().authToken)return null;

 const held=cache.get(id);
 if(held&&!force&&!held.finished)return held.rows;
 if(!held)cache.set(id,{rows:null,finished:false});

 try{
  const response=await fetch("/api/setoran-reviews?pondok_id="+pondokId+"&user_id="+id+"&t="+Date.now(),{headers:authHeaders()});
  const body=await response.json().catch(()=>({}));
  if(!response.ok||!body?.success)throw new Error(body?.message||"Riwayat setoran gagal dimuat.");
  const rows=Array.isArray(body.data?.rows)?body.data.rows:[];
  cache.set(id,{rows,finished:true});
  return rows;
 }catch{
  cache.set(id,{rows:held?.rows||null,finished:true});
  return held?.rows||null;
 }

}

export function forgetSetoran(userId){
 cache.delete(Number(userId));
}
