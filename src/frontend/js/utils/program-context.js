import {getState} from "../store.js?v=7b2e4d51";

/**
 * Sumber tunggal info halaqah milik login ini + perhitungan tanggal program.
 * Dipakai halaman Progress (santri) dan Report/Tabel Progress.
 */

export const DAY_MS=86400000;
export const WEEKDAY=["Minggu","Senin","Selasa","Rabu","Kamis","Jum'at","Sabtu"];

export function activePondokId(){
 const st=getState();
 return st.activePondokId??st.authUser?.pondoks?.[0]?.id??st.myPondoks?.[0]?.id??null;
}

/* ---------- halaqah saya (cache per pondok) ---------- */

let info=null;
let infoPid=null;
let loading=false;

export function myHalaqah(){return info}
export function myHalaqahPid(){return infoPid}
export function myHalaqahLoading(){return loading}
export function clearMyHalaqah(){info=null;infoPid=null;loading=false}

// Halaman lain mengubah tanggal mulai program → cache ikut dibersihkan.
window.addEventListener("app:my-halaqah-changed",()=>{clearMyHalaqah();loadMyHalaqah();});

/** Tanggal mulai program milik login ini (null kalau belum diatur/beda pondok). */
export function myProgramStart(){
 return infoPid===String(activePondokId()??"")?(info?.program_start_date||null):null;
}

export function loadMyHalaqah(force=false){
 const st=getState();
 const pid=activePondokId();
 if(!pid||!st.authToken||loading)return;
 if(!force&&infoPid===String(pid)&&info)return;
 loading=true;
 fetch("/api/pondoks/halaqahs/mine?pondok_id="+pid+"&t="+Date.now(),{headers:{Accept:"application/json",Authorization:"Bearer "+st.authToken}})
  .then(r=>r.json().then(b=>({ok:r.ok,b})))
  .then(({ok,b})=>{
   if(ok){info=b.data??null;infoPid=String(pid);window.dispatchEvent(new Event("app:render"));}
  })
  .catch(()=>{})
  .finally(()=>{loading=false;});
}

/* ---------- tanggal program (Jum'at libur, tidak dihitung) ---------- */

/** Tanggal Hari ke-N sejak tanggal mulai. */
export function programDayDate(startDate,n){
 if(!startDate||n<1)return null;
 const d=new Date(startDate+"T00:00:00");
 if(isNaN(d.getTime()))return null;
 let count=1;
 while(count<n){
  d.setTime(d.getTime()+DAY_MS);
  if(d.getDay()!==5)count++;
 }
 return d;
}

export function todayDayNumber(startDate){
 if(!startDate)return null;
 const start=new Date(startDate+"T00:00:00");
 const now=new Date();
 const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 if(isNaN(start.getTime())||today.getTime()<start.getTime())return null;
 let n=1;
 const cur=new Date(start.getTime());
 while(cur.getTime()<today.getTime()){
  cur.setTime(cur.getTime()+DAY_MS);
  if(cur.getDay()!==5)n++;
 }
 return n;
}

/** Jum'at yang jatuh di rentang pekan tsb. */
export function fridayOf(startDate,week){
 if(!startDate)return null;
 const first=programDayDate(startDate,(week-1)*6+1);
 if(!first)return null;
 const d=new Date(first.getTime());
 for(let i=0;i<7;i++){
  if(d.getDay()===5)return d;
  d.setTime(d.getTime()+DAY_MS);
 }
 return null;
}

/** Nama pondok aktif milik login ini (bukan nama pondok dummy). */
export function ownPondokName(state){
 const st=state||getState();
 if(st.context!=="pondok")return "Hafalan pribadi";
 const pid=activePondokId();
 const list=st.myPondoks||st.authUser?.pondoks||[];
 return list.find(p=>Number(p.id)===Number(pid))?.name||"Pondok";
}

export function fmtShort(d){
 return d?d.toLocaleDateString("id-ID",{day:"numeric",month:"short"}):"";
}

export function fmtLong(d){
 return d?d.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}):"";
}

/**
 * Posisi hari ini dalam program.
 * Kunci form (sabtu..kamis) = posisi Hari ke-N dalam pekan; nama hari diturunkan
 * dari tanggal riil program, bukan dari nama hari kalender.
 */
export function todayProgramDay(startDate){
 const now=new Date();
 const isFriday=now.getDay()===5;
 const calendarKey=["sabtu","ahad","senin","selasa","rabu","kamis"][(now.getDay()+1)%7]||null;
 const KEYS=["sabtu","ahad","senin","selasa","rabu","kamis"];

 if(!startDate){
  // Tanpa tanggal mulai → asumsi lama: Pekan 1 dimulai Sabtu, sejajar kalender.
  return {status:isFriday?"friday":"ok",key:isFriday?null:calendarKey,dayName:isFriday?"Jum'at":WEEKDAY[now.getDay()],week:null,dayNum:null,isFriday};
 }

 const dayNum=todayDayNumber(startDate);
 if(dayNum===null){
  // Hari ini masih sebelum tanggal mulai program.
  return {status:"not-started",key:null,dayName:null,week:null,dayNum:null,isFriday,start:startDate};
 }
 const week=Math.ceil(dayNum/6);
 if(week>5)return {status:"past-end",key:null,dayName:null,week:null,dayNum,isFriday};
 const date=programDayDate(startDate,dayNum);
 return {
  status:isFriday?"friday":"ok",
  key:isFriday?null:KEYS[(dayNum-1)%6],
  dayName:date?WEEKDAY[date.getDay()]:null,
  week:Math.max(1,week),
  dayNum,
  isFriday
 };
}

/**
 * Selesaikan tanggal riil (YYYY-MM-DD) → posisi program {week,key,dayNum}.
 * Ini lawan dari programDayDate: dari tanggal, kita cari Hari ke-N lalu pekan & kuncinya.
 * Dipakai Dashboard → Progress supaya tombol "Buka" tidak salah hari walaupun
 * tanggal mulai baru termuat setelah link dirender.
 */
export function resolveFocusDate(startDate,isoDate){
 if(!isoDate)return null;
 const target=new Date(isoDate+"T00:00:00");
 if(isNaN(target.getTime()))return null;
 const KEYS=["sabtu","ahad","senin","selasa","rabu","kamis"];
 const isSameDay=(d)=>d&&d.getFullYear()===target.getFullYear()&&d.getMonth()===target.getMonth()&&d.getDate()===target.getDate();

 if(!startDate){
  // Tanpa tanggal mulai → Pekan 1 sejajar kalender; pekan tetap dari konteks pemakai.
  if(target.getDay()===5)return null; // Jum'at libur
  return {week:null,key:KEYS[(target.getDay()+1)%7],dayNum:null};
 }

 for(let n=1;n<=30;n++){
  const date=programDayDate(startDate,n);
  if(isSameDay(date)){
   const week=Math.ceil(n/6);
   if(week>5)return null;
   return {week,key:KEYS[(n-1)%6],dayNum:n};
  }
 }
 return null;
}

/** Stempel DB (UTC) → tampilan WIB. */
export function fmtWib(value,withTime=true){
 if(!value)return "-";
 const date=new Date(String(value).replace(" ","T")+"Z");
 if(isNaN(date.getTime()))return "-";
 return date.toLocaleString("id-ID",{
  timeZone:"Asia/Jakarta",
  day:"numeric",month:"short",year:"numeric",
  ...(withTime?{hour:"2-digit",minute:"2-digit"}:{})
 });
}
