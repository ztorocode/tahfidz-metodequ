import {getState} from "../store.js?v=c1d8e4a7";
import {getProgressContext,setProgressContextPatch} from "../utils/progress-context.js?v=c1d8e4a7";
import {scheduleSave,loadWeek} from "../utils/progress-sync.js?v=c1d8e4a7";
import {WEEKDAY,activePondokId,myHalaqah,myHalaqahPid,myHalaqahLoading,clearMyHalaqah,loadMyHalaqah,myProgramStart,programDayDate,todayDayNumber,fridayOf,fmtShort,resolveFocusDate} from "../utils/program-context.js?v=c1d8e4a7";
import {juzEntries} from "../data/quran-juz.js?v=c1d8e4a7";

const weeks=[1,2,3,4,5];
const days=[
 {id:"sabtu",name:"Sabtu"},
 {id:"ahad",name:"Ahad"},
 {id:"senin",name:"Senin"},
 {id:"selasa",name:"Selasa"},
 {id:"rabu",name:"Rabu"},
 {id:"kamis",name:"Kamis"}
];
/** Halaman ini dipakai dua rute: #progress (santri) dan #review-progress (musyrif). */
function progressRoute(){
 const name=location.hash.replace(/^#/,"").split("?")[0];
 return name==="review-progress"?"review-progress":"progress";
}
function onProgressPage(){
 const name=location.hash.replace(/^#/,"").split("?")[0];
 return name==="progress"||name==="review-progress";
}

const fieldIds=["murajaah","rabth-awal","rabth-akhir"];
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

export function dayProgress(data,week,day){
 let done=0;
 fieldIds.forEach(id=>{if(String(fieldValue(data,week,day,id)).trim())done+=1});
 stepIds.forEach(id=>{if(isStepDone(data,week,day,id))done+=1});
 return Math.round(done/(fieldIds.length+stepIds.length)*100);
}

function progressField(data,week,day,label,id,placeholder="",numeric=false,max=null){
 const numericAttr=numeric?' type="number" inputmode="decimal" min="0" step="any" data-progress-numeric="1"'+(max!=null?' max="'+max+'" data-progress-max="'+max+'"':""):'';
 return '<div class="member-progress-field"><label>'+label+'</label><input class="member-progress-input"'+numericAttr+' data-progress-field="'+id+'" data-progress-day="'+day+'" value="'+escapeHtml(fieldValue(data,week,day,id))+'" placeholder="'+placeholder+'"></div>';
}

let rabthTarget=null;

/** Rabth diisi lewat picker surat & ayat, bukan ketik bebas. */
function rabthField(data,week,day,label,id,placeholder){
 const value=String(fieldValue(data,week,day,id)||"");
 return '<div class="member-progress-field"><label>'+label+'</label>'
  +'<button type="button" class="member-progress-input member-progress-pick'+(value?'':' empty')+'" data-rabth-pick="'+id+'" data-progress-day="'+day+'">'
  +(value?escapeHtml(value):placeholder)+'</button></div>';
}

function rabthModal(){
 return '<div class="modal-backdrop hidden" id="rabthModal"><div class="modal-card">'
  +'<div><p class="eyebrow" id="rabthModalEyebrow">Rabth</p><h2 id="rabthModalTitle">Pilih surat &amp; ayat</h2></div>'
  +'<p class="muted" id="rabthModalNote" style="margin:12px 0 0"></p>'
  +'<div id="rabthModalForm" class="rabth-form" style="margin-top:14px">'
  +'<label class="rabth-label">Surat<select class="input" id="rabthSurah"></select></label>'
  +'<label class="rabth-label">Ayat<input class="input" type="number" id="rabthAyah" inputmode="numeric" min="1" step="1" placeholder="ayat"></label>'
  +'</div>'
  +'<small class="muted" id="rabthModalMessage" style="display:block;margin-top:8px"></small>'
  +'<div class="btn-joined" style="margin-top:16px">'
  +'<button class="btn" type="button" data-rabth-close>Tutup</button>'
  +'<button class="btn primary" type="button" data-rabth-save>Simpan</button>'
  +'</div></div></div>';
}

function rabthJuzOf(value){
 const n=Number(String(value||"").replace(",","."));
 if(!Number.isFinite(n)||n<1)return 0;
 return Math.min(30,Math.ceil(n));
}

/** Rabth akhir ikut membuka 1 juz berikutnya (maksimal juz 30). */
function rabthJuzList(){
 const base=rabthTarget?.juz||0;
 if(!base)return [];
 if(rabthTarget.field==="rabth-akhir"&&base<30)return [base,base+1];
 return [base];
}

function rabthEntries(){
 const list=rabthJuzList();
 if(!list.length)return [];
 return list.flatMap(juz=>juzEntries(juz).map(entry=>({...entry,juz})));
}

function fillRabthAyahs(){
 const entries=rabthEntries();
 const surahSel=document.querySelector("#rabthSurah");
 const ayahInput=document.querySelector("#rabthAyah");
 if(!surahSel||!ayahInput)return;
 const entry=entries[Number(surahSel.value||0)];
 if(!entry)return;
 ayahInput.min=String(entry.from);
 ayahInput.max=String(entry.to);
 ayahInput.placeholder=entry.from+"–"+entry.to;
 const current=Number(ayahInput.value);
 if(!current||current<entry.from||current>entry.to)ayahInput.value=String(entry.from);
}

function closeRabthModal(){
 document.querySelector("#rabthModal")?.classList.add("hidden");
 rabthTarget=null;
}

function openRabthModal(field,day){
 const data=getProgressContext(getState());
 const week=stateWeek(data);
 const juz=rabthJuzOf(fieldValue(data,week,day,"murajaah"));
 rabthTarget={field,day,week,juz};
 const modal=document.querySelector("#rabthModal");
 if(!modal)return;
 document.querySelector("#rabthModalEyebrow").textContent=field==="rabth-akhir"?"Rabth akhir":"Rabth awal";
 document.querySelector("#rabthModalMessage").textContent="";
 const form=document.querySelector("#rabthModalForm");
 const note=document.querySelector("#rabthModalNote");
 if(!juz){
  note.textContent="Isi kolom Muraja'ah (1x) juz dulu dengan angka 1–30, lalu pilih rabth.";
  form.classList.add("hidden");
  modal.classList.remove("hidden");
  return;
 }
 form.classList.remove("hidden");
 const juzList=rabthJuzList();
 note.textContent=juzList.length>1
  ?"Pilihan surat & ayat dari Juz "+juzList.join(" dan ")+" — rabth akhir mencakup 1 juz berikutnya."
  :"Pilihan surat & ayat dari Juz "+juz+" sesuai kolom Muraja'ah.";
 const entries=rabthEntries();
 const surahSel=document.querySelector("#rabthSurah");
 surahSel.innerHTML=entries.map((entry,index)=>'<option value="'+index+'">'+escapeHtml(entry.name)+' (ayat '+entry.from+'–'+entry.to+')'+(juzList.length>1?' · Juz '+entry.juz:'')+'</option>').join("");
 const current=String(fieldValue(data,week,day,field)||"");
 const match=current.match(/^(.*)\s+(\d+)$/);
 if(match){
  const ayah=Number(match[2]);
  const index=entries.findIndex(entry=>entry.name===match[1]&&ayah>=entry.from&&ayah<=entry.to);
  if(index>=0)surahSel.value=String(index);
 }
 fillRabthAyahs();
 if(match){
  const ayahInput=document.querySelector("#rabthAyah");
  const entry=entries[Number(surahSel.value||0)];
  const ayah=Number(match[2]);
  if(ayahInput&&entry&&ayah>=entry.from&&ayah<=entry.to)ayahInput.value=String(ayah);
 }
 modal.classList.remove("hidden");
}

function saveRabth(){
 if(!rabthTarget||!rabthTarget.juz){closeRabthModal();return;}
 const entries=rabthEntries();
 const surahSel=document.querySelector("#rabthSurah");
 const ayahInput=document.querySelector("#rabthAyah");
 const entry=entries[Number(surahSel?.value||0)];
 const ayah=Number(ayahInput?.value||0);
 const message=document.querySelector("#rabthModalMessage");
 if(!entry||!ayah){
  if(message)message.textContent="Isi nomor ayat dulu.";
  return;
 }
 if(ayah<entry.from||ayah>entry.to){
  if(message)message.textContent="Ayat harus antara "+entry.from+" dan "+entry.to+" untuk "+entry.name+" (Juz "+entry.juz+").";
  return;
 }
 const value=entry.name+" "+ayah;
 const data=getProgressContext(getState());
 const key=fieldKey(rabthTarget.week,rabthTarget.day,rabthTarget.field);
 setProgressContextPatch({fields:{...(data.fields||{}),[key]:value}});
 const button=document.querySelector('[data-rabth-pick="'+rabthTarget.field+'"][data-progress-day="'+rabthTarget.day+'"]');
 if(button){button.textContent=value;button.classList.remove("empty");}
 const week=rabthTarget.week, day=rabthTarget.day;
 updatePercent(day);
 scheduleSave(week,day,dayProgress(getProgressContext(getState()),week,day));
 closeRabthModal();
}

document.addEventListener("click",event=>{
 if(!onProgressPage())return;
 const kemarin=event.target.closest("[data-kemarin-open]");
 if(kemarin){
  location.hash="rabth-ayat?step="+encodeURIComponent(kemarin.dataset.kemarinOpen)+"&day="+encodeURIComponent(kemarin.dataset.progressDay)+"&from="+progressRoute();
  return;
 }
 const istima=event.target.closest("[data-istima-open]");
 if(istima){
  location.hash="rabth-ayat?step="+encodeURIComponent(istima.dataset.istimaOpen)+"&day="+encodeURIComponent(istima.dataset.progressDay)+"&from="+progressRoute();
  return;
 }
 const tikrar=event.target.closest("[data-tikrar-open]");
 if(tikrar){
  location.hash="rabth-ayat?step="+encodeURIComponent(tikrar.dataset.tikrarOpen)+"&day="+encodeURIComponent(tikrar.dataset.progressDay)+"&from="+progressRoute();
  return;
 }
 const pick=event.target.closest("[data-rabth-pick]");
 if(pick){openRabthModal(pick.dataset.rabthPick,pick.dataset.progressDay);return;}
 const modal=document.querySelector("#rabthModal");
 if(!modal||modal.classList.contains("hidden"))return;
 if(event.target.closest("[data-rabth-close]")||event.target===modal){closeRabthModal();return;}
 if(event.target.closest("[data-rabth-save]"))saveRabth();
});
document.addEventListener("change",event=>{
 if(!onProgressPage())return;
 if(event.target.id==="rabthSurah")fillRabthAyahs();
});

function kemarinButton(data,week,day,label,id){
 const index=Number(id.split("-")[1])||1;
 const active=isStepDone(data,week,day,id);
 const locked=index>1&&!isStepDone(data,week,day,"kemarin-"+(index-1));
 return '<button type="button" class="member-progress-step'+(active?" active":"")+(locked?" locked":"")+'" data-kemarin-open="'+id+'" data-progress-day="'+day+'"'+(locked?" disabled":"")+' aria-pressed="'+String(active)+'" aria-disabled="'+String(locked)+'">'+label+'</button>';
}

function istimaButton(data,week,day,label,id){
 const index=Number(id.split("-")[1])||1;
 const active=isStepDone(data,week,day,id);
 const locked=index>1&&!isStepDone(data,week,day,"istima-"+(index-1));
 return '<button type="button" class="member-progress-step'+(active?" active":"")+(locked?" locked":"")+'" data-istima-open="'+id+'" data-progress-day="'+day+'"'+(locked?" disabled":"")+' aria-pressed="'+String(active)+'" aria-disabled="'+String(locked)+'">'+label+'</button>';
}

function stepButton(data,week,day,label,id){
 const active=isStepDone(data,week,day,id);
 return '<button type="button" class="member-progress-step'+(active?" active":"")+'" data-progress-step="'+id+'" data-progress-day="'+day+'" aria-pressed="'+String(active)+'">'+label+'</button>';
}

function tikrarButton(data,week,day,label,id){
 const index=Number(id.split("-")[1])||1;
 const active=isStepDone(data,week,day,id);
 const locked=index>1&&!isStepDone(data,week,day,"tikrar-"+(index-1));
 return '<button type="button" class="member-progress-step'+(active?" active":"")+(locked?" locked":"")+'" data-tikrar-open="'+id+'" data-progress-day="'+day+'"'+(locked?" disabled":"")+' aria-pressed="'+String(active)+'" aria-disabled="'+String(locked)+'">'+label+'</button>';
}

function dayBody(data,week,day){
 const kemarin=Array.from({length:5},(_,i)=>kemarinButton(data,week,day,(i+1)+"x","kemarin-"+(i+1))).join("");
 const istima=Array.from({length:3},(_,i)=>istimaButton(data,week,day,(i+1)+"x","istima-"+(i+1))).join("");
 const tikrar=Array.from({length:25},(_,i)=>tikrarButton(data,week,day,(i+1)+"x","tikrar-"+(i+1))).join("");
 return '<div class="member-progress-day-body">'+
  '<div class="member-progress-group">'+
   '<div class="member-progress-group-title">Hafalan Lama</div>'+
   '<div class="member-progress-fields cols-3">'+
    progressField(data,week,day,"Muraja\'ah (1x)","murajaah","juz",true,30)+
    rabthField(data,week,day,"Rabth (1x)","rabth-awal","awal")+
    rabthField(data,week,day,"Rabth (1x)","rabth-akhir","akhir")+
   '</div>'+
   '<div class="member-progress-block"><label>Hafalan kemarin</label><div class="member-progress-options cols-5">'+kemarin+'</div></div>'+
  '</div>'+
  '<div class="member-progress-group">'+
   '<div class="member-progress-group-title">Hafalan Baru</div>'+
   '<div class="member-progress-block"><label>Istima\' qari mujawwad</label><div class="member-progress-options cols-3">'+istima+'</div></div>'+
   '<div class="member-progress-block"><label>Menghafal &amp; Merekam</label><div class="member-progress-options cols-2">'+
    stepButton(data,week,day,"Menghafal","menghafal")+
    stepButton(data,week,day,"Merekam","merekam")+
   '</div></div>'+
   '<div class="member-progress-block"><label>Tikrar: ulang langsung hafalan yang didapat</label><div class="member-progress-options cols-7">'+tikrar+'</div></div>'+
  '</div>'+
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
  rabthModal()+
 '</section>';
}

function updatePercent(day){
 const data=getProgressContext(getState());
 const week=stateWeek(data);
 const node=document.querySelector('[data-progress-percent="'+day+'"]');
 if(node)node.textContent=dayProgress(data,week,day)+"%";
}

document.addEventListener("click",event=>{
 if(!onProgressPage())return;

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
  // Merekam → halaman rekam setoran (auto-centang saat kirim).
  if(step.dataset.progressStep==="merekam"){
   location.hash="submission?week="+week+"&day="+encodeURIComponent(day)+"&from="+progressRoute();
   return;
  }
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
 if(!onProgressPage())return;
 const input=event.target.closest("[data-progress-field]");
 if(!input)return;
 // Kolom angka: buang karakter selain digit dan satu pemisah desimal.
 if(input.dataset.progressNumeric){
  const cleaned=input.value.replace(/[^0-9.,]/g,"").replace(/,/g,".");
  if(cleaned!==input.value)input.value=cleaned;
  const max=Number(input.dataset.progressMax)||0;
  if(max&&Number(input.value)>max){
   alert("Maksimal "+max+".");
   input.value=String(max);
  }
 }
 const data=getProgressContext(getState());
 const week=stateWeek(data);
 const day=input.dataset.progressDay;
 const key=fieldKey(week,day,input.dataset.progressField);
 const next={...(data.fields||{}),[key]:input.value};
 setProgressContextPatch({fields:next});
 updatePercent(day);
 scheduleSave(week,day,dayProgress(getProgressContext(getState()),week,day));
});
