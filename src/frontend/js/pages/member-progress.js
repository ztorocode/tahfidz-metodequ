import {getState} from "../store.js?v=6b9d0e42";
import {getProgressContext,setProgressContextPatch} from "../utils/progress-context.js?v=6b9d0e42";
import {scheduleSave,loadWeek} from "../utils/progress-sync.js?v=6b9d0e42";
import {WEEKDAY,activePondokId,myHalaqah,myHalaqahPid,myHalaqahLoading,clearMyHalaqah,loadMyHalaqah,myProgramStart,programDayDate,todayDayNumber,fridayOf,fmtShort,resolveFocusDate} from "../utils/program-context.js?v=6b9d0e42";

const weeks=[1,2,3,4,5];
const days=[
 {id:"sabtu",name:"Sabtu"},
 {id:"ahad",name:"Ahad"},
 {id:"senin",name:"Senin"},
 {id:"selasa",name:"Selasa"},
 {id:"rabu",name:"Rabu"},
 {id:"kamis",name:"Kamis"}
];
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

function stateWeek(data=getProgressContext()){
 return Math.min(5,Math.max(1,Number(data.week)||1));
}

function fieldKey(week,day,id){return week+":"+day+":"+id}
function stepKey(week,day,id){return week+":"+day+":"+id}

function fieldValue(data,week,day,id){
 return data.fields?.[fieldKey(week,day,id)]||"";
}

function isStepDone(data,week,day,id){
 return Boolean(data.checks?.[stepKey(week,day,id)]);
}

function dayProgress(data,week,day){
 let done=0;
 fieldIds.forEach(id=>{if(String(fieldValue(data,week,day,id)).trim())done+=1});
 stepIds.forEach(id=>{if(isStepDone(data,week,day,id))done+=1});
 return Math.round(done/(fieldIds.length+stepIds.length)*100);
}

function progressField(data,week,day,label,id,placeholder=""){
 return '<div class="member-progress-field"><label>'+label+'</label><input class="member-progress-input" data-progress-field="'+id+'" data-progress-day="'+day+'" value="'+escapeHtml(fieldValue(data,week,day,id))+'" placeholder="'+placeholder+'"></div>';
}

function stepButton(data,week,day,label,id){
 const active=isStepDone(data,week,day,id);
 return '<button type="button" class="member-progress-step'+(active?" active":"")+'" data-progress-step="'+id+'" data-progress-day="'+day+'" aria-pressed="'+String(active)+'">'+label+'</button>';
}

function dayBody(data,week,day){
 const kemarin=Array.from({length:5},(_,i)=>stepButton(data,week,day,(i+1)+"x","kemarin-"+(i+1))).join("");
 const istima=Array.from({length:3},(_,i)=>stepButton(data,week,day,(i+1)+"x","istima-"+(i+1))).join("");
 const tikrar=Array.from({length:25},(_,i)=>stepButton(data,week,day,(i+1)+"x","tikrar-"+(i+1))).join("");
 return '<div class="member-progress-day-body">'+
  '<div class="member-progress-fields">'+
   progressField(data,week,day,"Target hal/hari","target")+
   progressField(data,week,day,"Muraja\'ah (juz)","murajaah")+
   '<div class="member-progress-rabth">'+
    progressField(data,week,day,"Rabth (1x)","rabth-awal","awal")+
    progressField(data,week,day,"Rabth akhir","rabth-akhir")+
   '</div>'+
  '</div>'+
  '<div class="member-progress-block"><label>Hafalan kemarin</label><div class="member-progress-options cols-5">'+kemarin+'</div></div>'+
  '<div class="member-progress-block"><label>Istima\' qari mujawwad</label><div class="member-progress-options cols-3">'+istima+'</div></div>'+
  '<div class="member-progress-block"><label>Hafalan baru</label><div class="member-progress-options cols-2">'+
   stepButton(data,week,day,"Menghafal","menghafal")+
   stepButton(data,week,day,"Merekam","merekam")+
  '</div></div>'+
  '<div class="member-progress-block"><label>Tikrar: ulang langsung hafalan yang didapat</label><div class="member-progress-options cols-7">'+tikrar+'</div></div>'+
 '</div>';
}

function dayCard(data,week,item,index){
 const open=data.openDay===item.id;
 const dayNumber=((week-1)*6)+index+1;
 const pct=dayProgress(data,week,item.id);
 const start=myProgramStart();
 const date=programDayDate(start,dayNumber);
 const isToday=date&&todayDayNumber(start)===dayNumber;
 // Nama hari diturunkan dari tanggal asli program; tanpa tanggal mulai, pakai nama bawaan.
 const dayName=date?WEEKDAY[date.getDay()]:item.name;
 const label=date
  ?'<span>Hari ke-'+dayNumber+' · '+fmtShort(date)+(isToday?' · <b style="color:var(--brand)">hari ini</b>':"")+'</span>'
  :'<span>Hari ke-'+dayNumber+'</span>';
 return '<article class="member-progress-day'+(open?" open":"")+'">'+
  '<button type="button" class="member-progress-day-head" data-progress-day-toggle="'+item.id+'" aria-expanded="'+String(open)+'">'+
   '<span class="member-progress-day-title"><b>'+dayName+'</b>'+label+'</span>'+
   '<strong data-progress-percent="'+item.id+'">'+pct+'%</strong>'+
  '</button>'+
  (open?dayBody(data,week,item.id):"")+
 '</article>';
}

function myHalaqahCard(){
 const pid=String(activePondokId()??"");
 if(myHalaqahPid()!==pid)return "";
 if(myHalaqahLoading()&&!myHalaqah())return '<div class="card" style="margin-bottom:14px"><small class="muted">Memuat info halaqah…</small></div>';
 if(!myHalaqah())return '<div class="card" style="margin-bottom:14px;border-color:var(--warning)"><b>Anda belum terdaftar di halaqah mana pun.</b><br><small class="muted">Hubungi admin pondok agar dimasukkan ke halaqah.</small></div>';
 const isMusyrif=myHalaqah().role==="musyrif";
 const start=myHalaqah().program_start_date||null;
 const todayNum=todayDayNumber(start);
 const startLine=start
  ?'<small class="muted">Mulai program: <b style="color:var(--text)">'+new Date(start+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})+'</b>'+(todayNum?' · hari ini <b style="color:var(--text)">Hari ke-'+todayNum+'</b>':"")+'</small>'
  :'<small class="muted">Tanggal mulai belum diatur → diasumsikan Pekan 1 dimulai Sabtu.</small>';
 return '<div class="card" style="margin-bottom:14px"><p class="eyebrow">'+(isMusyrif?"Halaqah yang Anda bina":"Halaqah Anda")+'</p>'
  +'<div class="row between" style="gap:10px;align-items:center"><div><b style="font-size:16px">'+escapeHtml(myHalaqah().name)+'</b>'
  +(myHalaqah().musyrif_name?'<br><small class="muted">Musyrif: '+escapeHtml(myHalaqah().musyrif_name)+'</small>':"")
  +'</div><span class="badge success">'+(isMusyrif?"Musyrif":"Santri")+'</span></div>'
  +'<div style="margin-top:8px">'+startLine+'</div>'
  +(isMusyrif?'<div style="margin-top:10px"><button class="btn soft" type="button" data-start-open>'+(start?"Ubah Tanggal Mulai":"Atur Tanggal Mulai")+'</button></div>':"")
  +'</div>'
  +(isMusyrif?startPopup():"");
}

function startPopup(){
 return '<div class="modal-backdrop hidden" id="startModal"><div class="modal-card">'
  +'<div><p class="eyebrow">Program Tahfidz</p><h2>Tanggal Mulai '+escapeHtml(myHalaqah()?.name||"Halaqah")+'</h2></div>'
  +'<p class="muted" style="margin:12px 0">Hari ke-1 dihitung sejak tanggal ini. Jum\'at libur, tidak dihitung.</p>'
  +'<input class="input" type="date" id="startModalInput" value="'+(myHalaqah()?.program_start_date||"")+'">'
  +'<small class="muted" id="startModalMessage" style="display:block;margin-top:8px"></small>'
  +'<div class="btn-joined" style="margin-top:16px">'
  +'<button class="btn" type="button" data-start-close>Tutup</button>'
  +'<button class="btn primary" type="button" data-start-modal-save>Simpan</button>'
  +'</div></div></div>';
}

function fridayCard(date){
 return '<div class="member-progress-friday"><b>Jum\'at</b><span>· libur hafalan'+(date?' · '+fmtShort(date):'')+'</span></div>';
}

/** Susun hari-hari pekan + kartu Jum'at libur sesuai urutan tanggal. */
function weekDaysHtml(data,week,start,fridayDate){
 const cards=days.map((item,index)=>dayCard(data,week,item,index));
 if(!start||!fridayDate){
  // Tanpa tanggal mulai program → perilaku lama: Jum'at di akhir daftar.
  cards.push(fridayCard(null));
  return cards;
 }
 const firstDay=(week-1)*6+1;
 const out=[];
 let placed=false;
 for(let index=0;index<cards.length;index++){
  const cur=programDayDate(start,firstDay+index);
  const next=index<cards.length-1?programDayDate(start,firstDay+index+1):null;
  out.push(cards[index]);
  // Sisipkan kartu Jum'at bila jatuh di sela hari ini dan hari berikutnya.
  if(!placed&&cur&&next&&cur.getTime()<fridayDate.getTime()&&fridayDate.getTime()<next.getTime()){
   out.push(fridayCard(fridayDate));
   placed=true;
  }
 }
 if(!placed){
  const first=programDayDate(start,firstDay);
  if(first&&fridayDate.getTime()<first.getTime())out.unshift(fridayCard(fridayDate));
  else out.push(fridayCard(fridayDate));
 }
 return out;
}

let syncedWeek=null;
function syncWeek(week){
 if(syncedWeek===week)return;
 syncedWeek=week;
 loadWeek(week).then(changed=>{if(changed&&syncedWeek===week)window.dispatchEvent(new Event("app:render"));}).catch(()=>{});
}

/**
 * Tanggal target dari Dashboard → pekan + kunci hari.
 * Info halaqah mungkin belum termuat saat link diklik; kalau begitu openDate
 * disimpan dulu dan diselesaikan pada render berikutnya (loadMyHalaqah memicu app:render).
 */
function applyOpenDate(data){
 if(!data.openDate)return data;
 const pid=String(activePondokId()??"");
 if(myHalaqahPid()!==pid){
  // Belum ada info halaqah untuk pondok aktif → tarik dulu, jangan nebak.
  loadMyHalaqah();
  return data;
 }
 const focus=resolveFocusDate(myProgramStart(),data.openDate);
 if(!focus)return setProgressContextPatch({openDate:null,openDay:null});
 const next=setProgressContextPatch({openDate:null,week:focus.week||data.week,openDay:focus.key});
 return next;
}

export function memberProgressPage(){
 const data=applyOpenDate(getProgressContext(getState()));
 const week=stateWeek(data);
 loadMyHalaqah();
 syncWeek(week);
 const start=myProgramStart();
 const fridayDate=start?fridayOf(start,week):null;
 return '<section class="member-progress-page">'+
  myHalaqahCard()+
  '<div class="member-progress-weeks" role="tablist" aria-label="Pilih pekan">'+
   weeks.map(item=>'<button type="button" class="member-progress-week'+(item===week?" active":"")+'" data-progress-week="'+item+'" role="tab" aria-selected="'+String(item===week)+'">Pekan '+item+'</button>').join("")+
  '</div>'+
  '<div class="member-progress-days">'+
   weekDaysHtml(data,week,start,fridayDate).join("")+
  '</div>'+
 '</section>';
}

function updatePercent(day){
 const data=getProgressContext(getState());
 const week=stateWeek(data);
 const node=document.querySelector('[data-progress-percent="'+day+'"]');
 if(node)node.textContent=dayProgress(data,week,day)+"%";
}

document.addEventListener("click",event=>{
 if(location.hash!=="#progress")return;

 if(event.target.closest("[data-start-open]")){
  document.querySelector("#startModal")?.classList.remove("hidden");
  document.querySelector("#startModalInput")?.focus();
  return;
 }

 if(event.target.closest("[data-start-close]")){
  document.querySelector("#startModal")?.classList.add("hidden");
  return;
 }

 if(event.target.closest("[data-start-modal-save]")){
  const value=document.querySelector("#startModalInput")?.value||"";
  const msg=document.querySelector("#startModalMessage");
  if(!value){if(msg){msg.textContent="Pilih tanggal mulai dulu.";msg.style.color="var(--danger)";}return;}
  const btn=event.target.closest("[data-start-modal-save]");
  btn.disabled=true;
  fetch("/api/pondoks/halaqahs/start-date",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",Authorization:"Bearer "+(getState().authToken||"")},body:JSON.stringify({
   pondok_id:Number(activePondokId()),
   halaqah_id:Number(myHalaqah()?.id||0),
   program_start_date:value
  })})
   .then(r=>r.json().then(b=>({ok:r.ok,b})))
   .then(({ok,b})=>{
    if(!ok)throw new Error(b?.message||"Gagal menyimpan.");
    document.querySelector("#startModal")?.classList.add("hidden");
    clearMyHalaqah();
    loadMyHalaqah();
    window.dispatchEvent(new Event("app:halaqah-changed"));
   })
   .catch(err=>{if(msg){msg.textContent=err?.message||"Gagal menyimpan.";msg.style.color="var(--danger)";}})
   .finally(()=>{btn.disabled=false;});
  return;
 }

 const weekButton=event.target.closest("[data-progress-week]");
 if(weekButton){
  setProgressContextPatch({week:Number(weekButton.dataset.progressWeek),openDay:null,openDate:null});
  window.dispatchEvent(new Event("app:render"));
  return;
 }

 const dayButton=event.target.closest("[data-progress-day-toggle]");
 if(dayButton){
  const day=dayButton.dataset.progressDayToggle;
  const current=getProgressContext(getState()).openDay;
  setProgressContextPatch({openDay:current===day?null:day,openDate:null});
  window.dispatchEvent(new Event("app:render"));
  return;
 }

 const step=event.target.closest("[data-progress-step]");
 if(step){
  const data=getProgressContext(getState());
  const week=stateWeek(data);
  const day=step.dataset.progressDay;
  const key=stepKey(week,day,step.dataset.progressStep);
  const next={...(data.checks||{}),[key]:!Boolean(data.checks?.[key])};
  setProgressContextPatch({checks:next});
  const active=Boolean(next[key]);
  step.classList.toggle("active",active);
  step.setAttribute("aria-pressed",String(active));
  updatePercent(day);
  scheduleSave(week,day,dayProgress(getProgressContext(getState()),week,day));
 }
});

document.addEventListener("input",event=>{
 if(location.hash!=="#progress")return;
 const input=event.target.closest("[data-progress-field]");
 if(!input)return;
 const data=getProgressContext(getState());
 const week=stateWeek(data);
 const day=input.dataset.progressDay;
 const key=fieldKey(week,day,input.dataset.progressField);
 const next={...(data.fields||{}),[key]:input.value};
 setProgressContextPatch({fields:next});
 updatePercent(day);
 scheduleSave(week,day,dayProgress(getProgressContext(getState()),week,day));
});
