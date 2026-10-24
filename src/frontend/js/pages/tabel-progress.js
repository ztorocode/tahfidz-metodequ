import {getState} from "../store.js?v=b7e3f1d5";
import {member,progress} from "../data/dummy-data.js?v=b7e3f1d5";
import {getProgressContext} from "../utils/progress-context.js?v=b7e3f1d5";
import {cachedStudentProgress,loadStudentProgress} from "../utils/student-progress.js?v=b7e3f1d5";
import {loadWeek,lastSyncAt} from "../utils/progress-sync.js?v=b7e3f1d5";
import {activePondokId,myHalaqah,loadMyHalaqah,myProgramStart,ownPondokName,programDayDate,fridayOf,fmtShort,fmtLong,fmtWib,todayDayNumber} from "../utils/program-context.js?v=b7e3f1d5";

function escapeHtml(value=""){
 return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

const days=["sabtu","ahad","senin","selasa","rabu","kamis"];
const blankCells=count=>Array.from({length:count},()=>"<td></td>").join("");

function memberField(data,week,day,id){
 return data.fields?.[week+":"+day+":"+id]||"";
}

function memberStep(data,week,day,id){
 return Boolean(data.checks?.[week+":"+day+":"+id]);
}

function valueCell(value){ const text=String(value??"").trim();
 return `<td>${text?escapeHtml(text):""}</td>`;
}

function checkCell(done){
 return `<td>${done?"✓":""}</td>`;
}

/** Tanggal riil satu baris: Hari ke-N sejak tanggal mulai program. */
function dayDate(start,week,day){
 const index=days.indexOf(day);
 if(!start||index<0)return null;
 return programDayDate(start,(week-1)*6+index+1);
}

function memberReportCells(data,week,day,start){
 const date=dayDate(start,week,day);
 const cells=[
  date?fmtShort(date):"",
  memberField(data,week,day,"target"),
  memberField(data,week,day,"murajaah"),
  memberField(data,week,day,"rabth-awal"),
  memberField(data,week,day,"rabth-akhir")
 ];
 const html=[
  valueCell(cells[0]),
  valueCell(cells[1]),
  valueCell(cells[2]),
  valueCell(cells[3]),
  valueCell(cells[4])
 ];
 for(let i=1;i<=5;i++)html.push(checkCell(memberStep(data,week,day,"kemarin-"+i)));
 for(let i=1;i<=3;i++)html.push(checkCell(memberStep(data,week,day,"istima-"+i)));
 html.push(checkCell(memberStep(data,week,day,"menghafal")));
 html.push(checkCell(memberStep(data,week,day,"merekam")));
 for(let i=1;i<=25;i++)html.push(checkCell(memberStep(data,week,day,"tikrar-"+i)));
 return html.join("");
}

function weekRows(data,showCells,start){
 return Array.from({length:5},(_,index)=>{
  const week=index+1;
  const rows=days.map(day=>`<tr><td class="progress-day">${day}</td>${showCells?memberReportCells(data,week,day,start):blankCells(40)}</tr>`).join("");
  const friday=fridayOf(start,week);
  const fridayText=friday?`jum'at · ${fmtShort(friday)}`:"jum'at";
  return rows+`<tr class="progress-friday"><td colspan="41">${fridayText}</td></tr>`;
 }).join("");
}

/** Kartu meta report: semua nilai diturunkan dari tanggal mulai program + isian asli. */
function reportMeta(start,halaqahName,data){
 const item=(label,value)=>`<div class="progress-meta-item"><b>${label}</b><span>${escapeHtml(String(value))}</span></div>`;
 const finish=start?programDayDate(start,30):null; // Hari ke-30 = akhir Pekan 5
 const todayNum=todayDayNumber(start);
 let targetToday="";
 if(start&&todayNum){
  const week=Math.min(5,Math.floor((todayNum-1)/6)+1);
  const day=days[(todayNum-1)%6];
  targetToday=memberField(data||{},week,day,"target");
 }
 return [
  item("Halaqah",halaqahName||"-"),
  item("Mulai program",start?fmtLong(new Date(start+"T00:00:00")):"Belum diatur"),
  item("Hari ini",todayNum?("Hari ke-"+todayNum):"-"),
  item("Akhir pekan 5",finish?fmtShort(finish):"-"),
  item("Target hari ini",targetToday||"-"),
  item("Pekan ditampilkan","1 - 5")
 ].join("");
}

/** Data diri sendiri: nama login asli + halaqah asli dari server. */
function memberSelection(state){
 const personal=state.context!=="pondok";
 // Selalu tarik info halaqah (dibutuhkan untuk tanggal program). Nama halaqah &
 // musyrif tetap disembunyikan pada konteks Personal.
 loadMyHalaqah();
 const me=state.authUser||{};
 const info=personal?null:myHalaqah();
 const name=state.profileOverrides?.member?.name||me.name||member.name;
 return {
  student:{name,userId:Number(me.id)||null,mutqin:progress.mutqin,pending:1,status:"Aktif"},
  halaqahName:info?.name||(personal?"Hafalan pribadi":member.halaqah),
  musyrifName:info?.musyrif_name||(personal?"-":member.musyrif)
 };
}

/** Tarik 5 pekan milik sendiri dari server (sekali per pondok; gagal → coba lagi). */
let pulledPid=null;
let retryTimer=null;
function pullMyWeeks(state){
 const pid=activePondokId();
 if(!pid||!state.authToken)return;
 loadMyHalaqah();
 if(pulledPid===String(pid))return;
 pulledPid=String(pid);
 const retry=()=>{
  clearTimeout(retryTimer);
  retryTimer=setTimeout(()=>{pulledPid=null;window.dispatchEvent(new Event("app:render"));},15000);
 };
 Promise.all([1,2,3,4,5].map(week=>loadWeek(week)))
  .then(results=>{
   if(results.every(Boolean))window.dispatchEvent(new Event("app:render"));
   else retry();
  })
  .catch(retry);
}

export function progressTablePage(){
 const state=getState();
 const isMember=state.persona==="member";
 if(isMember&&state.context==="pondok")pullMyWeeks(state);
 const selected=isMember?memberSelection(state):state.selectedStudentProgress;

 if(!isMember&&state.context!=="pondok"){
  return `<div class="card"><p class="eyebrow">Tabel Progress</p><h2>Aktifkan konteks Pondok</h2><p class="muted">Tabel progress santri hanya tersedia pada konteks Pondok.</p><a class="btn" href="#halaqah">Kembali ke Halaqah</a></div>`;
 }

 if(!selected?.student){
  return `<div class="card"><p class="eyebrow">Tabel Progress</p><h2>Santri belum dipilih</h2><p class="muted">Buka Halaqah, pilih santri, lalu buka Tabel Progress dari halaman detail santri.</p><a class="btn" href="#halaqah">Kembali ke Halaqah</a></div>`;
 }

 const student=selected.student;
 const isReport=location.hash.replace(/^#/,"")==="report";
 const pondok=ownPondokName(state)||(!isMember?(state.pondokProfile?.name||"Pondok Al-Furqan"):"Hafalan pribadi");
 const pageTitle=isReport?"Report":"Tabel Progress";
 // Sumber tanggal harus sama dengan halaman Progress (myProgramStart tanpa syarat
 // konteks), supaya kunci hari & tanggal yang ditampilkan tidak meleset.
 const start=isMember?myProgramStart():(selected.startDate||null);

 // Isian: milik sendiri → context (ditarik dari server), santri binaan → server.
 let progressData=isMember?getProgressContext(state):null;
 let loadingServer=false;
 if(!isMember){
  const userId=Number(student.userId||0);
  if(userId){
   progressData=cachedStudentProgress(userId);
   if(!progressData){
    loadingServer=true;
    loadStudentProgress(userId).then(()=>window.dispatchEvent(new Event("app:render"))).catch(()=>{});
   }
  }
 }
 const showCells=Boolean(progressData);
 const lastUpdated=isMember?lastSyncAt():(progressData?.updatedAt||null);

 const personalMember=isMember&&state.context!=="pondok";
 const syncNote=`<div class="quote" style="margin-bottom:12px">${
  loadingServer?"Memuat isian progress dari server…":
  personalMember?"Konteks Personal · isian tersimpan di perangkat ini." :
  isMember?(lastUpdated?("Isian tersinkron · terakhir diperbarui "+fmtWib(lastUpdated)+" WIB"):"Isian diambil dari server begitu tersedia.") :
  showCells?("Isian asli santri · terakhir diperbarui "+fmtWib(lastUpdated)+" WIB"):"Belum ada isian progress dari santri ini."
 }</div>`;

 const metaItems=reportMeta(start,selected.halaqahName,progressData);

 return `<div class="row between" style="margin-bottom:16px;gap:12px;flex-wrap:wrap">
  <div>
   <div class="row" style="gap:10px;flex-wrap:wrap;margin-bottom:12px">
    <a class="btn" href="${isMember?"#progress":"#santri-progress"}" style="display:inline-flex">← Kembali ke ${isMember?"Progress":"Progress Santri"}</a>
    ${isMember?`<a class="btn soft" href="#santri-progress" style="display:inline-flex">Summary</a>`:""}
   </div>
   <p class="eyebrow">${isMember?"Santri / Report":"Pondok / Halaqah / Tabel Progress"}</p>
   <h1>${pageTitle}</h1>
   <p class="muted">${escapeHtml(student.name)} · ${escapeHtml(selected.halaqahName)}${personalMember?"":" · "+escapeHtml(pondok)}</p>
  </div>
  <span class="badge success">${personalMember?"Hafalan pribadi":(start?"Program berjalan":"Program belum dimulai")}</span>
 </div>

 ${syncNote}
 <div class="quote" style="margin-bottom:12px">Geser tabel ke kanan untuk melihat seluruh kolom pada layar mobile.</div>

 <div class="card progress-sheet-card">
  <div class="progress-sheet-scroll">
   <div class="progress-meta">${metaItems}</div>

   <div class="progress-student-row"><b>Nama</b><span>${escapeHtml(student.name)}</span><b>Musyrif</b><span>${escapeHtml(selected.musyrifName)}</span></div>

   <table class="progress-sheet" aria-label="Tabel progress hafalan ${escapeHtml(student.name)}">
    <thead>
     <tr>
      <th colspan="3" rowspan="2">Target Harian</th>
      <th colspan="13" class="progress-group-old">Hafalan lama</th>
      <th colspan="25" class="progress-group-new">Hafalan baru</th>
     </tr>
     <tr>
      <th>Muraja'ah<br>(1x)</th>
      <th colspan="2">Rabth (1x)</th>
      <th colspan="5">Hafalan kemarin</th>
      <th colspan="3">Istima' Qari<br>mujawwad</th>
      <th rowspan="2">Menghafal</th>
      <th rowspan="2">Merekam</th>
      <th colspan="25">Tikrar (Mengulang langsung hafalan yang telah didapat biidznillah)</th>
     </tr>
     <tr>
      <th>Hari</th>
      <th>Tanggal</th>
      <th>Halaman / hari</th>
      <th>Juz</th>
      <th>Awal</th>
      <th>Akhir</th>
      ${Array.from({length:5},(_,i)=>`<th>${i+1}x</th>`).join("")}
      ${Array.from({length:3},(_,i)=>`<th>${i+1}x</th>`).join("")}
      ${Array.from({length:25},(_,i)=>`<th>${i+1}x</th>`).join("")}
     </tr>
    </thead>
    <tbody>${weekRows(progressData,showCells,start)}</tbody>
   </table>
  </div>
 </div>`;
}
