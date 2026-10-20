import {getState} from "../store.js?v=d6f20b38";
import {badge} from "../utils/helpers.js?v=d6f20b38";
import {cachedStudentProgress,loadStudentProgress,isStudentProgressLoading,studentPercent} from "../utils/student-progress.js?v=d6f20b38";
import {getProgressContext} from "../utils/progress-context.js?v=d6f20b38";
import {loadWeek,lastSyncAt} from "../utils/progress-sync.js?v=d6f20b38";
import {myHalaqah,myProgramStart,loadMyHalaqah,activePondokId,programDayDate,todayDayNumber,fmtLong,fmtWib} from "../utils/program-context.js?v=d6f20b38";

/**
 * Papan pantau progress seorang santri untuk musyrif/admin (santri melihat
 * miliknya sendiri). Semua angka diturunkan dari member_progress yang disimpan
 * santri lewat #progress — tidak ada data statis.
 */

const PROGRESS_DAYS=["sabtu","ahad","senin","selasa","rabu","kamis"];
const DAY_LABEL={sabtu:"Sabtu",ahad:"Ahad",senin:"Senin",selasa:"Selasa",rabu:"Rabu",kamis:"Kamis"};
const WEEKS=[1,2,3,4,5];
const PROGRAM_DAYS=30; // 5 pekan x 6 hari, Jum'at selalu libur
const FIELD_IDS=["target","murajaah","rabth-awal","rabth-akhir"];
const STEP_IDS=[
 "kemarin-1","kemarin-2","kemarin-3","kemarin-4","kemarin-5",
 "istima-1","istima-2","istima-3",
 "menghafal","merekam"
];
for(let i=1;i<=25;i++)STEP_IDS.push("tikrar-"+i);

function escapeHtml(value=""){
 return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function key(week,day,id){return week+":"+day+":"+id}
function fieldOf(data,week,day,id){return String(data?.fields?.[key(week,day,id)]??"").trim()}
function stepOf(data,week,day,id){return Boolean(data?.checks?.[key(week,day,id)])}
function dayFilled(data,week,day){
 return FIELD_IDS.some(id=>fieldOf(data,week,day,id))||STEP_IDS.some(id=>stepOf(data,week,day,id));
}
function checkedCount(data,week,day,prefix,max){
 let n=0;
 for(let i=1;i<=max;i++)if(stepOf(data,week,day,prefix+i))n++;
 return n;
}
/** Tanggal riil satu baris: Hari ke-N sejak tanggal mulai program. */
function dayDate(start,week,day){
 const index=PROGRESS_DAYS.indexOf(day);
 if(!start||index<0)return null;
 return programDayDate(start,(week-1)*6+index+1);
}

/** "YYYY-MM-DD" (dari server) menjadi Date untuk formatter. */
function toDate(value){
 if(value instanceof Date)return value;
 const d=new Date(String(value||"")+"T00:00:00");
 return isNaN(d.getTime())?null:d;
}

function summarize(data){
 let days=0,pctSum=0,steps=0,text=0;
 WEEKS.forEach(week=>PROGRESS_DAYS.forEach(day=>{
  if(!dayFilled(data,week,day))return;
  days++;
  pctSum+=studentPercent(data,week,day);
 }));
 Object.values(data?.checks||{}).forEach(v=>{if(v)steps++});
 Object.values(data?.fields||{}).forEach(v=>{if(String(v).trim())text++});
 const weeks=WEEKS.filter(week=>PROGRESS_DAYS.some(day=>dayFilled(data,week,day))).length;
 return {days,steps,text,weeks,avg:days?Math.round(pctSum/days):0};
}

function programCard(halaqahName,start){
 const dayNo=todayDayNumber(start);
 const day=Number(dayNo)||0;
 const width=Math.max(0,Math.min(100,Math.round(day/PROGRAM_DAYS*100)));
 const endDate=start?programDayDate(start,PROGRAM_DAYS):null;
 return `<div class="card" style="margin-bottom:16px">
  <div class="row between" style="gap:12px;flex-wrap:wrap">
   <div><small class="muted">Program halaqah</small><h2 style="margin-top:4px">${escapeHtml(halaqahName||"—")}</h2>
    <p class="muted">${start?`Mulai ${escapeHtml(fmtLong(toDate(start)))}`:"Tanggal mulai program belum ditetapkan."}</p></div>
   <div>${day>0?badge(`Hari ke-${day} dari ${PROGRAM_DAYS}`,"success"):badge("Belum berjalan")}</div>
  </div>
  <div class="progress" style="margin-top:14px;--value:${width}%"><span></span></div>
  <p class="muted" style="margin-top:8px;font-size:13px">5 pekan × 6 hari · Jum'at libur${endDate?` · hari terakhir ${escapeHtml(fmtLong(endDate))}`:""}</p>
 </div>`;
}

function kpiGrid(sum){
 return `<div class="grid-4" style="margin-bottom:16px">
  <div class="kpi"><b>${sum.days}/${PROGRAM_DAYS}</b><span class="muted">Hari terisi</span></div>
  <div class="kpi"><b>${sum.avg}%</b><span class="muted">Rata-rata isian</span></div>
  <div class="kpi"><b>${sum.steps}</b><span class="muted">Langkah tercentang</span></div>
  <div class="kpi"><b>${sum.text}</b><span class="muted">Isian teks</span></div>
 </div>`;
}

function dailyCard(data,start,tab,updatedAt){
 const blocks=WEEKS.map(week=>{
  const rows=PROGRESS_DAYS.filter(day=>dayFilled(data,week,day)).map(day=>{
   const pct=studentPercent(data,week,day);
   const date=dayDate(start,week,day);
   return `<div class="list-item"><div class="grow"><b>${DAY_LABEL[day]}</b><small class="muted" style="display:block">${date?escapeHtml(fmtLong(date)):`Pekan ${week} · Hari ke-${(week-1)*6+PROGRESS_DAYS.indexOf(day)+1}`}</small></div><span class="badge ${pct>=60?"success":pct>0?"warning":""}">${pct}%</span></div>`;
  }).join("");
  const filled=PROGRESS_DAYS.filter(day=>dayFilled(data,week,day)).length;
  return `<div style="margin-top:14px">
   <small class="muted"><b>Pekan ${week}</b> · ${filled}/6 hari terisi</small>
   <div class="list">${rows||'<div class="list-item"><span class="muted">Belum ada isian.</span></div>'}</div>
  </div>`;
 }).join("");
 const total=WEEKS.reduce((n,week)=>n+PROGRESS_DAYS.filter(day=>dayFilled(data,week,day)).length,0);
 return `<div class="card" style="margin-bottom:16px">
  <div class="row between" style="gap:12px;flex-wrap:wrap"><div><h3>Isian Progress Harian</h3><p class="muted">Data asli yang disimpan santri dari perangkatnya.</p></div><a class="btn" href="${tab.href}">${tab.label}</a></div>
  ${blocks}
  <p class="muted" style="margin-top:12px;font-size:13px">${total} hari terisi · terakhir diperbarui ${escapeHtml(fmtWib(updatedAt))} WIB</p>
 </div>`;
}

function detailCard(data,start){
 const rows=[];
 WEEKS.forEach(week=>PROGRESS_DAYS.forEach(day=>{
  if(!dayFilled(data,week,day))return;
  const date=dayDate(start,week,day);
  const pct=studentPercent(data,week,day);
  rows.push(`<tr>
   <td>${date?escapeHtml(fmtLong(date)):`Pekan ${week}`}</td>
   <td>${DAY_LABEL[day]}</td>
   <td>${escapeHtml(fieldOf(data,week,day,"target")||"—")}</td>
   <td>${escapeHtml(fieldOf(data,week,day,"murajaah")||"—")}</td>
   <td>${escapeHtml([fieldOf(data,week,day,"rabth-awal"),fieldOf(data,week,day,"rabth-akhir")].filter(Boolean).join(" → ")||"—")}</td>
   <td>${checkedCount(data,week,day,"kemarin",5)}/5</td>
   <td>${checkedCount(data,week,day,"istima",3)}/3</td>
   <td>${checkedCount(data,week,day,"tikrar",25)}/25</td>
   <td><b>${pct}%</b></td>
  </tr>`);
 }));
 if(!rows.length){
  return `<div class="card"><h3>Rincian isian</h3><p class="muted" style="margin-top:8px">Belum ada isian dari santri ini.</p></div>`;
 }
 return `<div class="card" style="margin-bottom:16px">
  <div class="row between" style="margin-bottom:12px;gap:12px;flex-wrap:wrap"><div><h3>Rincian isian</h3><p class="muted">Target, muraja'ah, rabth, dan langkah yang tercentang per hari.</p></div></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>Tanggal</th><th>Hari</th><th>Target</th><th>Muraja'ah</th><th>Rabth</th><th>Kemarin</th><th>Istima'</th><th>Tikrar</th><th>Isian</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>
 </div>`;
}

/** Tarik 5 pekan milik sendiri. Santri memakai endpoint miliknya sendiri
 *  (/api/progress); /api/progress/student hanya untuk admin pondok & musyrif
 *  dan menolak santri yang membaca datanya sendiri (403). */
let pulledPid=null,retryTimer=null,pulling=false;
function pullMyWeeks(state){
 const pid=activePondokId();
 if(!pid||!state.authToken)return;
 if(pulledPid===String(pid))return;
 pulledPid=String(pid);
 pulling=true;
 const retry=()=>{clearTimeout(retryTimer);retryTimer=setTimeout(()=>{pulledPid=null;pulling=false;window.dispatchEvent(new Event("app:render"));},15000);};
 Promise.all([1,2,3,4,5].map(week=>loadWeek(week)))
  .then(results=>{
   pulling=false;
   if(results.every(Boolean))window.dispatchEvent(new Event("app:render"));
   else retry();
  })
  .catch(()=>{pulling=false;retry();});
}

/** Identitas diri sendiri. Aturan privasi sama dengan halaman Report:
 *  nama halaqah & musyrif hanya diungkap pada konteks Pondok. */
function memberSelection(state){
 const personal=state.context!=="pondok";
 loadMyHalaqah();
 const me=state.authUser||{};
 const info=personal?null:myHalaqah();
 return {
  student:{name:state.profileOverrides?.member?.name||me.name||"Santri",userId:Number(me.id)||0,status:"Aktif"},
  halaqahName:info?.name||"Hafalan pribadi",
  musyrifName:info?.musyrif_name||"-",
  startDate:myProgramStart()
 };
}

export function studentProgressPage(){
 const state=getState();
 const isMember=state.persona==="member";
 if(isMember&&state.context==="pondok")pullMyWeeks(state);

 const selected=isMember?memberSelection(state):state.selectedStudentProgress;

 if(!isMember&&state.context!=="pondok"){
  return `<div class="card"><p class="eyebrow">Progress Santri</p><h2>Aktifkan konteks Pondok</h2><p class="muted">Detail progress santri hanya tersedia pada konteks Pondok.</p><a class="btn" href="#halaqah">Kembali ke Halaqah</a></div>`;
 }

 if(!selected?.student){
  return `<div class="card"><p class="eyebrow">Progress Santri</p><h2>Santri belum dipilih</h2><p class="muted">Buka menu Halaqah lalu pilih tombol Lihat Progress pada salah satu santri.</p><a class="btn" href="#halaqah">Kembali ke Halaqah</a></div>`;
 }

 const student=selected.student;
 const userId=Number(student.userId)||0;
 let data=null,loading=false,updatedAt=null;
 if(isMember){
  data=getProgressContext(state);
  updatedAt=lastSyncAt()||null;
 }else{
  data=userId?cachedStudentProgress(userId):null;
  loading=userId?isStudentProgressLoading(userId):false;
  if(userId&&!data&&!loading){
   loadStudentProgress(userId).then(()=>window.dispatchEvent(new Event("app:render"))).catch(()=>{});
  }
  updatedAt=data?.updatedAt||null;
 }

 const start=selected.startDate||null;
 const roleLabel=isMember?"Santri":state.persona==="musyrif"?"Musyrif":"Admin Pondok";
 const tab=isMember?{href:"#report",label:"Buka Report"}:{href:"#tabel-progress",label:"Buka Tabel Progress"};
 const summary=data?summarize(data):null;
 const pending=loading||(isMember&&pulling);
 // Kartu hanya muncul bila ada isian nyata; kalau belum ada, tampilkan
 // keterangan memuat/belum ada supaya tidak menampilkan angka nol palsu.
 const showReal=Boolean(summary)&&!pending&&summary.days>0;
 const body=showReal
  ?kpiGrid(summary)+dailyCard(data,start,tab,updatedAt)+detailCard(data,start)
  :`<div class="card" style="margin-bottom:16px"><h3>Isian Progress Harian</h3><p class="muted" style="margin-top:8px">${pending?"Memuat isian dari server…":"Belum ada isian dari santri ini."}</p></div>`;

 return `<div class="row between" style="margin-bottom:18px;gap:12px;flex-wrap:wrap">
  <div>
   ${isMember?"":`<a class="btn" href="#halaqah" style="display:inline-flex;margin-bottom:12px">← Kembali ke Halaqah</a>`}
   <p class="eyebrow">${isMember?"Progress Saya":"Pondok / Halaqah / Progress Santri"}</p>
   <h1>${escapeHtml(student.name)}</h1>
   <p class="muted">${escapeHtml(selected.halaqahName||"—")} · Musyrif: ${escapeHtml(selected.musyrifName||"—")} · ${escapeHtml(student.status||"Aktif")}</p>
  </div>
  <div class="row" style="flex-wrap:wrap;justify-content:flex-end"><a class="btn primary" href="${isMember?"#report":"#tabel-progress"}">${isMember?"Report":"Tabel Progress"}</a><span class="badge success">${roleLabel} · Monitoring</span></div>
 </div>

 ${programCard(selected.halaqahName,start)}

 ${body}`;
}
