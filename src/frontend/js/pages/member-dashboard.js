import {member} from "../data/dummy-data.js?v=d1c4e8a2";
import {getState} from "../store.js?v=d1c4e8a2";
import {getProgressContext,setProgressContextPatch} from "../utils/progress-context.js?v=d1c4e8a2";
import {badge} from "../utils/helpers.js?v=d1c4e8a2";
import {loadWeek} from "../utils/progress-sync.js?v=d1c4e8a2";
import {activePondokId,myHalaqah,loadMyHalaqah,myProgramStart,ownPondokName,todayProgramDay,fmtLong} from "../utils/program-context.js?v=d1c4e8a2";

const days=["sabtu","ahad","senin","selasa","rabu","kamis"];
const DAY_NAME={sabtu:"Sabtu",ahad:"Ahad",senin:"Senin",selasa:"Selasa",rabu:"Rabu",kamis:"Kamis"};
const fieldIds=["target","murajaah","rabth-awal","rabth-akhir"];
const stepIds=[
 ...Array.from({length:5},(_,i)=>"kemarin-"+(i+1)),
 ...Array.from({length:3},(_,i)=>"istima-"+(i+1)),
 "menghafal","merekam",
 ...Array.from({length:25},(_,i)=>"tikrar-"+(i+1))
];

function escapeHtml(value=""){
 return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function field(data,week,day,id){
 return data.fields?.[week+":"+day+":"+id]||"";
}

function step(data,week,day,id){
 return Boolean(data.checks?.[week+":"+day+":"+id]);
}

function dayStats(data,week,day){
 const fieldsFilled=fieldIds.filter(id=>String(field(data,week,day,id)).trim()).length;
 const stepsDone=stepIds.filter(id=>step(data,week,day,id)).length;
 return {
  filled:fieldsFilled+stepsDone>0,
  done:fieldsFilled+stepsDone,
  total:fieldIds.length+stepIds.length,
  pct:Math.round((fieldsFilled+stepsDone)/(fieldIds.length+stepIds.length)*100)
 };
}

function countSteps(data,week,day,prefix,total){
 let count=0;
 for(let i=1;i<=total;i++)if(step(data,week,day,prefix+"-"+i))count+=1;
 return count;
}

function dayNameOf(key){
 return DAY_NAME[key]||"Hari ini";
}

function statusBadge(label,done,total){
 if(done>=total)return badge(label,"success");
 if(done>0)return badge(label,"warning");
 return badge(label,"");
}

/** Tarik pekan berjalan dari server (sekali per pondok+pekan; gagal → coba lagi). */
let pulledKey=null;
let retryTimer=null;
function pullMyWeek(state,week){
 const pid=activePondokId();
 // Info halaqah (tanggal mulai program) dibutuhkan semua konteks — termasuk Personal —
 // supaya kunci hari di dashboard sama dengan yang dipakai halaman Progress.
 if(!pid||!state.authToken)return;
 loadMyHalaqah();
 if(state.context!=="pondok")return;
 const key=String(pid)+":"+week;
 if(pulledKey===key)return;
 pulledKey=key;
 const retry=()=>{clearTimeout(retryTimer);retryTimer=setTimeout(()=>{pulledKey=null;},15000);};
 loadWeek(week)
  .then(ok=>{if(ok)window.dispatchEvent(new Event("app:render"));else retry();})
  .catch(retry);
}

export function memberDashboard(){
 const state=getState();
 const isPondok=state.context==="pondok";
 const data=getProgressContext(state);

 const name=state.profileOverrides?.member?.name||state.authUser?.name||member.name;
 const contextLabel=isPondok?ownPondokName(state):"Personal";

 // Hari ini diturunkan dari tanggal mulai program (bukan nama hari kalender).
 // Harus sama persis dengan halaman Progress (termasuk konteks Personal),
 // supaya kunci hari (sabtu..kamis) yang dipakai membaca isian tidak meleset.
 const start=myProgramStart();
 const today=todayProgramDay(start);

 const week=today.week||Math.min(5,Math.max(1,Number(data.week)||1));
 const halaqah=isPondok?myHalaqah():null;
 pullMyWeek(state,week);

 const stats=days.map(day=>dayStats(data,week,day));
 const totalDone=stats.reduce((sum,item)=>sum+item.done,0);
 const totalItems=stats.reduce((sum,item)=>sum+item.total,0);
 const weekPct=totalItems?Math.round(totalDone/totalItems*100):0;
 const filledDays=stats.filter(item=>item.filled).length;
 const hafalanDays=days.filter(day=>step(data,week,day,"menghafal")).length;
 const recordedDays=days.filter(day=>step(data,week,day,"merekam")).length;
 const tikrarWeek=days.reduce((sum,day)=>sum+countSteps(data,week,day,"tikrar",25),0);

 const isFriday=today.isFriday;
 const tKey=today.key;
 const idle=!tKey; // Jum'at libur, program belum mulai, atau sudah lewat Pekan 5
 // Tanggal hari ini (YYYY-MM-DD) dikirim ke Progress; di situ dipetakan ke pekan + kunci hari.
 const now=new Date();
 const pad=n=>String(n).padStart(2,"0");
 const focusDate=idle?"":now.getFullYear()+"-"+pad(now.getMonth()+1)+"-"+pad(now.getDate());
 const notice=isFriday?"Jum'at"
  :today.status==="not-started"?("Program mulai "+fmtLong(new Date(start+"T00:00:00")))
  :today.status==="past-end"?"Lewat dari Pekan 5"
  :"";
 const target=idle?"":field(data,week,tKey,"target");
 const murajaahValue=idle?"":field(data,week,tKey,"murajaah");
 const rabthStart=idle?"":field(data,week,tKey,"rabth-awal");
 const rabthEnd=idle?"":field(data,week,tKey,"rabth-akhir");
 const kemarinDone=idle?0:countSteps(data,week,tKey,"kemarin",5);
 const istimaDone=idle?0:countSteps(data,week,tKey,"istima",3);
 const tikrarDone=idle?0:countSteps(data,week,tKey,"tikrar",25);
 const menghafalDone=!idle&&step(data,week,tKey,"menghafal");
 const merekamDone=!idle&&step(data,week,tKey,"merekam");
 const rabthDone=Number(Boolean(rabthStart))+Number(Boolean(rabthEnd));

 const activities=idle?[
  {name:isFriday?"Jum'at":"Program",detail:notice||"Tidak ada isian hari ini",status:isFriday?"Libur":"Menunggu",tone:""}
 ]:[
  {name:"Muraja'ah",detail:murajaahValue?"Juz "+murajaahValue:"Belum diisi",status:murajaahValue?"Selesai":"Belum",tone:murajaahValue?"success":""},
  {name:"Rabth",detail:rabthStart||rabthEnd?((rabthStart||"-")+" → "+(rabthEnd||"-")):"Belum diisi",status:rabthDone===2?"Selesai":rabthDone?"Sebagian":"Belum",tone:rabthDone===2?"success":rabthDone?"warning":""},
  {name:"Hafalan kemarin",detail:kemarinDone+"/5 pengulangan",status:kemarinDone+"/5",tone:kemarinDone===5?"success":kemarinDone?"warning":""},
  {name:"Istima' qari",detail:istimaDone+"/3 pengulangan",status:istimaDone+"/3",tone:istimaDone===3?"success":istimaDone?"warning":""},
  {name:"Menghafal",detail:menghafalDone?"Sudah dikerjakan":"Belum dikerjakan",status:menghafalDone?"Selesai":"Belum",tone:menghafalDone?"success":""},
  {name:"Merekam",detail:merekamDone?"Sudah dikerjakan":"Belum dikerjakan",status:merekamDone?"Selesai":"Belum",tone:merekamDone?"success":""},
  {name:"Tikrar",detail:tikrarDone+"/25 pengulangan",status:tikrarDone+"/25",tone:tikrarDone===25?"success":tikrarDone?"warning":""}
 ];

 const dayLabel=isFriday?"Jum'at":(today.dayName||(tKey?dayNameOf(tKey):"Hari ini"));
 const targetText=idle?(notice||"Libur hafalan"):target?escapeHtml(target)+" halaman":"Belum diisi";
 const startLine=start?("Mulai "+fmtLong(new Date(start+"T00:00:00"))+(today.dayNum?" · hari ini Hari ke-"+today.dayNum:"")):null;
 const programTitle=isPondok?(halaqah?.name||"Belum ada halaqah"):"Hafalan pribadi";


 return `
<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Assalamu'alaikum</p><h1>${escapeHtml(name)}</h1><p class="muted">Konteks aktif: <b>${escapeHtml(contextLabel)}</b> · Fokus hari ini: kuatkan hafalan, bukan sekadar menambah.</p></div></div>

<div id="inviteBanner"></div>
<div class="hero-card card" style="margin-bottom:16px"><div class="row between"><div><p style="opacity:.8;margin-bottom:6px">Program aktif · Pekan ${week}</p><h2 style="margin-bottom:7px">${escapeHtml(programTitle)}</h2><b>Target hari ini: ${targetText}</b>${startLine?`<small style="display:block;margin-top:6px;opacity:.85">${escapeHtml(startLine)}</small>`:""}</div><a class="btn" href="#progress" data-goto-progress="${week}:${focusDate}" style="background:white;color:#14533e;border:0">Buka Progress</a></div></div>

${isPondok?`<div class="card" style="margin-bottom:16px"><div class="row between"><div><h3>Halaqah Anda</h3><small class="muted">Dari data pondok, bukan dari isian.</small></div></div>
<div class="list" style="margin-top:12px">
 <div class="list-item"><div class="grow"><b>Nama halaqah</b><small class="muted" style="display:block">${escapeHtml(halaqah?.name||"Belum terdaftar di halaqah mana pun.")}</small></div></div>
 <div class="list-item"><div class="grow"><b>Musyrif</b><small class="muted" style="display:block">${escapeHtml(halaqah?.musyrif_name||"-")}</small></div></div>
 <div class="list-item"><div class="grow"><b>Tanggal mulai</b><small class="muted" style="display:block">${start?escapeHtml(fmtLong(new Date(start+"T00:00:00"))):"Belum diatur"}</small></div></div>
 <div class="list-item"><div class="grow"><b>Hari ini</b><small class="muted" style="display:block">${today.dayNum?("Hari ke-"+today.dayNum+" · "+(isFriday?"Jum'at":dayLabel)):(idle?(notice||"-"):(dayLabel))}</small></div></div>
 <div class="list-item"><div class="grow"><b>Sinkron</b><small class="muted" style="display:block">Isian tersimpan di perangkat lalu dikirim ke server.</small></div></div>
</div>
</div>`:""}

<div class="card" style="margin-bottom:16px"><div class="row between"><div><h3>Progress Pekan ${week}</h3><small class="muted">Dihitung langsung dari form Progress konteks ${escapeHtml(contextLabel)}.</small></div><a href="#progress" class="muted" data-goto-progress="${week}:">Lihat detail</a></div><div class="progress" style="--value:${weekPct}%;margin-top:14px"><span></span></div>
<div class="grid-4 week-metrics" style="margin-top:16px">
 <div class="wm-1"><b class="metric">${weekPct}%</b><div class="metric-label">Progress pekan</div></div>
 <div class="wm-2"><b class="metric">${filledDays}/6</b><div class="metric-label">Hari terisi</div></div>
 <div class="wm-3"><b class="metric" style="color:var(--brand)">${hafalanDays}/6</b><div class="metric-label">Menghafal selesai</div></div>
 <div class="wm-4"><b class="metric">${tikrarWeek}</b><div class="metric-label">Tikrar tercatat</div></div>
</div></div>

<div class="grid-3">
 <div class="card">
  <div class="row between"><div><h3>Aktivitas Hari Ini</h3><small class="muted">${idle?(notice||"Tidak ada isian"):"Pekan "+week+" · "+dayLabel}</small></div><a href="#progress" class="muted" data-goto-progress="${week}:${focusDate}">Buka</a></div>
  <div class="list" style="margin-top:12px">${activities.map(item=>`<div class="list-item"><span class="check ${item.tone==="success"?"done":""}">${item.tone==="success"?"✓":""}</span><div class="grow"><b>${escapeHtml(item.name)}</b><small class="muted" style="display:block">${escapeHtml(item.detail)}</small></div>${badge(item.status,item.tone)}</div>`).join("")}</div>
 </div>

 <div class="card">
  <div class="row between"><div><h3>Data Hari Ini</h3><small class="muted">Dari form Progress</small></div><a href="#report" class="muted">Report</a></div>
  <div class="list" style="margin-top:12px">
   <div class="list-item"><div class="grow"><b>Target hal/hari</b><small class="muted" style="display:block">${idle?(notice||"Libur hafalan"):target?escapeHtml(target):"Belum diisi"}</small></div></div>
   <div class="list-item"><div class="grow"><b>Muraja'ah</b><small class="muted" style="display:block">${!idle&&murajaahValue?"Juz "+escapeHtml(murajaahValue):(idle?"-":"Belum diisi")}</small></div></div>
   <div class="list-item"><div class="grow"><b>Rabth</b><small class="muted" style="display:block">${!idle&&(rabthStart||rabthEnd)?escapeHtml(rabthStart||"-")+" → "+escapeHtml(rabthEnd||"-"):(idle?"-":"Belum diisi")}</small></div>${idle?"":statusBadge(rabthDone===2?"2/2":rabthDone+"/2",rabthDone,2)}</div>
   <div class="list-item"><div class="grow"><b>Tikrar</b><small class="muted" style="display:block">${idle?"-":tikrarDone+"/25 pengulangan"}</small></div>${idle?"":statusBadge(tikrarDone+"/25",tikrarDone,25)}</div>
  </div>
 </div>

 <div class="card">
  <div class="row between"><div><h3>Ringkasan Pekan ${week}</h3><small class="muted">${escapeHtml(contextLabel)}</small></div></div>
  <div class="list" style="margin-top:12px">
   <div class="list-item"><div class="grow"><b>Hari dengan aktivitas</b><small class="muted" style="display:block">Dari Sabtu sampai Kamis</small></div><b>${filledDays}/6</b></div>
   <div class="list-item"><div class="grow"><b>Menghafal selesai</b><small class="muted" style="display:block">Checklist Menghafal aktif</small></div><b>${hafalanDays}/6</b></div>
   <div class="list-item"><div class="grow"><b>Merekam selesai</b><small class="muted" style="display:block">Checklist Merekam aktif</small></div><b>${recordedDays}/6</b></div>
   <div class="list-item"><div class="grow"><b>Total Tikrar</b><small class="muted" style="display:block">Checklist 1x-25x seluruh pekan</small></div><b>${tikrarWeek}</b></div>
  </div>
 </div>
</div>`;
}

/** Gulir ke kartu hari yang terbuka setelah halaman Progress selesai dirender. */
function scrollToOpenDay(){
 const go=()=>{
  const card=document.querySelector(".member-progress-day.open");
  if(!card)return false;
  card.scrollIntoView({block:"start",behavior:"smooth"});
  return true;
 };
 if(go())return;
 let tries=0;
 const timer=setInterval(()=>{
  if(go()||++tries>10)clearInterval(timer);
 },100);
}

/** "Buka"/"Buka Progress": kirim tanggal hari ini; Progress yang memetakan ke pekan & hari. */
document.addEventListener("click",event=>{
 const link=event.target.closest("[data-goto-progress]");
 if(!link)return;
 event.preventDefault();
 const [week,date]=String(link.dataset.gotoProgress||"").split(":");
 setProgressContextPatch({
  week:Math.min(5,Math.max(1,Number(week)||1)),
  openDay:null,
  // "YYYY-MM-DD" → target tanggal; selain itu (mis. "Lihat detail") hanya buka pekan.
  openDate:/^\d{4}-\d{2}-\d{2}$/.test(date)?date:null
 });
 if(location.hash!=="#progress"){location.hash="progress";}
 else{window.dispatchEvent(new Event("app:render"));}
 scrollToOpenDay();
});
