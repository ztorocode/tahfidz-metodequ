import {getState} from "../store.js?v=81bed469";
import {badge} from "../utils/helpers.js?v=81bed469";
import {cachedStudentProgress,loadStudentProgress,isStudentProgressLoading,studentPercent} from "../utils/student-progress.js?v=81bed469";
import {getProgressContext} from "../utils/progress-context.js?v=81bed469";
import {loadWeek,lastSyncAt} from "../utils/progress-sync.js?v=81bed469";
import {myHalaqah,myProgramStart,loadMyHalaqah,activePondokId,programDayDate,todayDayNumber,fmtLong,fmtWib} from "../utils/program-context.js?v=81bed469";
import {cachedSetoran,loadSetoran,isSetoranLoading,decisionMeta} from "../utils/setoran.js?v=81bed469";

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

/** ============ Kartu hasil penilaian setoran oleh musyrif ============ */

function setoranCounters(rows){
 const counts={mutqin:0,cukup_stabil:0,penguatan:0,ulang:0};
 rows.forEach(row=>{const key=String(row.decision||"");if(key in counts)counts[key]++});
 return counts;
}

function setoranSummaryCard(rows,student,canRate){
 const counts=setoranCounters(rows);
 return `<div class="card" style="margin-bottom:16px">
  <div class="row between" style="gap:12px;flex-wrap:wrap">
   <div><h3>Ringkasan Penilaian Setoran</h3><p class="muted">Dihitung dari penilaian ustadz yang tersimpan.</p></div>
   ${canRate?`<button class="btn primary" type="button" id="addSetoranBtn" data-setoran-user="${Number(student.userId)||0}">+ Tambah Setoran</button>`:""}
  </div>
  <div class="grid-4" style="margin-top:14px">
   <div class="kpi"><b>${counts.mutqin}</b><span class="muted">Mutqin</span></div>
   <div class="kpi"><b>${counts.cukup_stabil}</b><span class="muted">Cukup Stabil</span></div>
   <div class="kpi"><b>${counts.penguatan}</b><span class="muted">Perlu Penguatan</span></div>
   <div class="kpi"><b>${counts.ulang}</b><span class="muted">Perlu Ulang</span></div>
  </div>
 </div>`;
}

function setoranHistoryCard(rows,canRate){
 const head=`<div style="margin-bottom:12px"><h3>Riwayat Setoran</h3><p class="muted">Setoran terakhir beserta penilaian dan catatan ustadz.</p></div>`;
 if(!rows.length){
  return `<div class="card" style="margin-bottom:16px">${head}<p class="muted">Belum ada penilaian setoran untuk santri ini.${canRate?" Tekan \"+ Tambah Setoran\" untuk mencatat penilaian pertama.":""}</p></div>`;
 }
 const mine=Number(getState().authUser?.id)||0;
 const body=rows.map(row=>{
  const meta=decisionMeta(row.decision);
  const canDelete=canRate&&Number(row.created_by)===mine;
  return `<tr>
   <td>${escapeHtml(fmtWib(row.created_at))} WIB</td>
   <td><b>${escapeHtml(row.ref)}</b>${row.page_no?`<small class="muted" style="display:block">Halaman ${escapeHtml(row.page_no)}</small>`:""}</td>
   <td>${badge(meta.label,meta.tone)}</td>
   <td>${row.notes?escapeHtml(row.notes):'<span class="muted">—</span>'}</td>
   <td>${escapeHtml(row.created_by_name||"—")}</td>
   <td>${canDelete?`<button class="btn" type="button" data-del-setoran="${Number(row.id)}">Hapus</button>`:""}</td>
  </tr>`;
 }).join("");
 return `<div class="card" style="margin-bottom:16px">${head}
  <div class="table-wrap"><table class="table"><thead><tr><th>Tanggal</th><th>Setoran</th><th>Status</th><th>Catatan</th><th>Penilai</th><th><span class="muted">Aksi</span></th></tr></thead><tbody>${body}</tbody></table></div>
 </div>`;
}

function setoranNotesCard(rows){
 const notes=rows.filter(row=>row.notes).slice(0,6);
 if(!notes.length){
  return `<div class="card" style="margin-bottom:16px"><h3>Catatan Ustadz</h3><p class="muted" style="margin-top:8px">Belum ada catatan untuk santri ini.</p></div>`;
 }
 return `<div class="card" style="margin-bottom:16px">
  <h3>Catatan Ustadz</h3><p class="muted">Fokus penguatan berikutnya.</p>
  <div class="list">${notes.map(row=>{
   const meta=decisionMeta(row.decision);
   return `<div class="list-item"><div class="grow"><b>${escapeHtml(row.ref)}</b>
    <small class="muted" style="display:block">${escapeHtml(row.created_by_name||"—")} · ${escapeHtml(fmtWib(row.created_at))} WIB</small>
    <p style="margin-top:6px">${escapeHtml(row.notes)}</p></div>${badge(meta.label,meta.tone)}</div>`;
  }).join("")}</div>
 </div>`;
}

function setoranPagesCard(rows){
 const byPage=new Map();
 rows.forEach(row=>{
  const page=Number(row.page_no);
  if(!page||byPage.has(page))return; // daftar sudah urut terbaru -> yang pertama adalah penilaian terakhir
  byPage.set(page,row);
 });
 const pages=[...byPage.entries()].sort((a,b)=>a[0]-b[0]);
 if(!pages.length){
  return `<div class="card" style="margin-bottom:16px"><h3>Progress Hafalan</h3><p class="muted" style="margin-top:8px">Belum ada halaman yang dinilai. Isi kolom "Halaman" saat mencatat setoran supaya kartu ini terisi.</p></div>`;
 }
 return `<div class="card" style="margin-bottom:16px">
  <h3>Progress Hafalan</h3><p class="muted">Status terakhir tiap halaman yang pernah dinilai.</p>
  <div class="grid-3" style="margin-top:14px">${pages.map(([page,row])=>{
   const meta=decisionMeta(row.decision);
   return `<div class="kpi" style="text-align:left">
    <b>Halaman ${escapeHtml(page)}</b>
    <span style="display:block;margin-top:6px">${badge(meta.label,meta.tone)}</span>
    <small class="muted" style="display:block;margin-top:6px">${escapeHtml(row.ref)}</small>
   </div>`;
  }).join("")}</div>
 </div>`;
}

function setoranMurajaahCard(rows){
 const items=rows.filter(row=>["penguatan","ulang"].includes(String(row.decision||"")));
 if(!items.length){
  return `<div class="card" style="margin-bottom:16px"><h3>Muraja'ah &amp; Penguatan</h3><p class="muted" style="margin-top:8px">Belum ada setoran yang menunggu diulang.</p></div>`;
 }
 return `<div class="card" style="margin-bottom:16px">
  <h3>Muraja'ah &amp; Penguatan</h3><p class="muted">Bagian yang perlu diulang atau dikuatkan kembali.</p>
  <div class="list">${items.map(row=>{
   const meta=decisionMeta(row.decision);
   return `<div class="list-item"><div class="grow"><b>${escapeHtml(row.ref)}</b>
    <small class="muted" style="display:block">${escapeHtml(row.created_by_name||"—")} · ${escapeHtml(fmtWib(row.created_at))} WIB</small>
    ${row.notes?`<small class="muted" style="display:block;margin-top:4px">${escapeHtml(row.notes)}</small>`:""}</div>${badge(meta.label,meta.tone)}</div>`;
  }).join("")}</div>
 </div>`;
}

function setoranActivityCard(rows,updatedAt){
 const events=rows.slice(0,10).map(row=>({
  at:String(row.created_at||""),
  text:`${row.created_by_name||"Ustadz"} menilai ${row.ref} — ${decisionMeta(row.decision).label}`
 }));
 if(updatedAt)events.push({at:String(updatedAt),text:"Isian progress diperbarui oleh santri"});
 events.sort((a,b)=>String(b.at).localeCompare(String(a.at)));
 if(!events.length){
  return `<div class="card" style="margin-bottom:16px"><h3>Aktivitas Terakhir</h3><p class="muted" style="margin-top:8px">Belum ada aktivitas untuk santri ini.</p></div>`;
 }
 return `<div class="card" style="margin-bottom:16px">
  <h3>Aktivitas Terakhir</h3>
  <div class="list">${events.slice(0,6).map(event=>`<div class="list-item"><div class="grow"><b>${escapeHtml(event.text)}</b>
   <small class="muted" style="display:block">${escapeHtml(fmtWib(event.at))} WIB</small></div></div>`).join("")}</div>
 </div>`;
}

/** Formulir penilaian setoran — hanya untuk musyrif halaqah santri itu. */
function setoranModal(){
 return `<div class="modal-backdrop hidden" id="setoranModal">
  <div class="modal-card">
   <div><p class="eyebrow">Setoran</p><h2>Tambah Penilaian Setoran</h2></div>
   <div class="stack">
    <div><label class="label">Setoran</label><input class="input" id="setoranRef" autocomplete="off" placeholder="Juz 30 Hal. 12 · An-Naas"></div>
    <div style="display:flex;gap:12px;flex-wrap:wrap">
     <div style="flex:1 1 160px"><label class="label">Halaman (opsional)</label><input class="input" id="setoranPage" inputmode="numeric" autocomplete="off" placeholder="12"></div>
     <div style="flex:1 1 200px"><label class="label">Penilaian</label><select class="input" id="setoranDecision">
      <option value="mutqin">Mutqin</option>
      <option value="cukup_stabil">Cukup Stabil</option>
      <option value="penguatan">Perlu Penguatan</option>
      <option value="ulang">Perlu Ulang</option>
     </select></div>
    </div>
    <div><label class="label">Catatan untuk santri</label><textarea class="input" id="setoranNotes" rows="4" placeholder="Perhatikan tajwid pada ayat terakhir."></textarea></div>
    <small class="muted" id="setoranMessage">Santri akan melihat penilaian dan catatan ini pada halamannya.</small>
    <div class="btn-joined">
     <button class="btn" id="closeSetoranBtn" type="button">Tutup</button>
     <button class="btn primary" id="saveSetoranBtn" type="button">Simpan</button>
    </div>
   </div>
  </div>
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
 const roleLabel=isMember?"Santri":state.persona==="musyrif"?"Ustadz":"Admin Pondok";
 const tab=isMember?{href:"#report",label:"Buka Report"}:{href:"#tabel-progress",label:"Buka Tabel Progress"};
 const summary=data?summarize(data):null;
 const pending=loading||(isMember&&pulling);
 // Kartu hanya muncul bila ada isian nyata; kalau belum ada, tampilkan
 // keterangan memuat/belum ada supaya tidak menampilkan angka nol palsu.
 const showReal=Boolean(summary)&&!pending&&summary.days>0;
 const isianCard=showReal
  ?kpiGrid(summary)+dailyCard(data,start,tab,updatedAt)+detailCard(data,start)
  :`<div class="card" style="margin-bottom:16px"><h3>Isian Progress Harian</h3><p class="muted" style="margin-top:8px">${pending?"Memuat isian dari server…":"Belum ada isian dari santri ini."}</p></div>`;

 // Penilaian setoran oleh musyrif halaqah (tabel setoran_reviews).
 if(userId&&!cachedSetoran(userId)&&!isSetoranLoading(userId)){
  loadSetoran(userId).then(()=>window.dispatchEvent(new Event("app:render"))).catch(()=>{});
 }
 const setoranRows=cachedSetoran(userId)||[];
 const setoranPending=isSetoranLoading(userId);
 const canRate=state.persona==="musyrif";
 const setoranCards=setoranPending&&!setoranRows.length
  ?`<div class="card" style="margin-bottom:16px"><h3>Riwayat Setoran</h3><p class="muted" style="margin-top:8px">Memuat riwayat setoran…</p></div>`
  :setoranSummaryCard(setoranRows,student,canRate)
   +setoranHistoryCard(setoranRows,canRate)
   +setoranNotesCard(setoranRows)
   +setoranPagesCard(setoranRows)
   +setoranMurajaahCard(setoranRows)
   +setoranActivityCard(setoranRows,updatedAt);

 return `<div class="row between" style="margin-bottom:18px;gap:12px;flex-wrap:wrap">
  <div>
   ${isMember?"":`<a class="btn" href="#halaqah" style="display:inline-flex;margin-bottom:12px">← Kembali ke Halaqah</a>`}
   <p class="eyebrow">${isMember?"Progress Saya":"Pondok / Halaqah / Progress Santri"}</p>
   <h1>${escapeHtml(student.name)}</h1>
   <p class="muted">${escapeHtml(selected.halaqahName||"—")} · Ustadz: ${escapeHtml(selected.musyrifName||"—")} · ${escapeHtml(student.status||"Aktif")}</p>
  </div>
  <div class="row" style="flex-wrap:wrap;justify-content:flex-end"><a class="btn primary" href="${isMember?"#report":"#tabel-progress"}">${isMember?"Report":"Tabel Progress"}</a><span class="badge success">${roleLabel} · Monitoring</span></div>
 </div>

 ${programCard(selected.halaqahName,start)}

 ${setoranCards}

 ${isianCard}

 ${canRate?setoranModal():""}`;
}
