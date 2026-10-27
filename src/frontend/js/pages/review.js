import {getState} from "../store.js?v=b2f7d510";
import {toast} from "../utils/helpers.js?v=b2f7d510";
import {fmtWib} from "../utils/program-context.js?v=b2f7d510";

const DAY_NAME={sabtu:"Sabtu",ahad:"Ahad",senin:"Senin",selasa:"Selasa",rabu:"Rabu",kamis:"Kamis"};
const DECISIONS=[
 {key:"mutqin",label:"Mutqin"},
 {key:"cukup_stabil",label:"Cukup Stabil"},
 {key:"penguatan",label:"Perlu Penguatan"},
 {key:"ulang",label:"Perlu Ulang"}
];

let rows=[];
let filterWeek=0;
let filterStatus="pending";
let playingId=0;
let playingUrl=null;
let playingAudio=null;

function esc(value=""){
 return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function token(){return getState().authToken||""}

function pondokId(){
 const state=getState();
 return state.activePondokId??state.authUser?.pondoks?.[0]?.id??state.myPondoks?.[0]?.id??null;
}

function sizeLabel(bytes){
 const n=Number(bytes)||0;
 if(n<1024)return n+" B";
 if(n<1024*1024)return (n/1024).toFixed(0)+" KB";
 return (n/(1024*1024)).toFixed(1)+" MB";
}

function stopPlayback(){
 if(playingAudio){
  try{playingAudio.pause();}catch{}
  playingAudio=null;
 }
 if(playingUrl){
  URL.revokeObjectURL(playingUrl);
  playingUrl=null;
 }
 const btn=document.querySelector('[data-play-submission="'+playingId+'"]');
 if(btn){btn.textContent="▶ Putar";btn.classList.remove("playing");}
 playingId=0;
}

function rowHtml(row){
 const pending=row.status==="pending";
 const day=DAY_NAME[row.day_code]||row.day_code;
 const initial=(row.student_name||"?").slice(0,1).toUpperCase();
 return '<article class="setoran-item'+(pending?"":" done")+'">'
  +'<div class="setoran-who">'
  +'<span class="avatar">'+esc(initial)+'</span>'
  +'<div class="setoran-meta"><b>'+esc(row.student_name)+'</b>'
  +'<small class="muted">'+esc(row.halaqah_name||"Tanpa halaqah")+' · Pekan '+row.week_no+' · '+esc(day)+'</small>'
  +'<small class="muted">'+esc(fmtWib(row.created_at))+' · '+sizeLabel(row.file_size)+'</small></div>'
  +'</div>'
  +'<div class="setoran-actions">'
  +(pending?'<span class="badge">Menunggu</span>':'<span class="badge success">Sudah dinilai</span>')
  +'<button class="btn" type="button" data-play-submission="'+row.id+'">▶ Putar</button>'
  +'<button class="btn primary" type="button" data-rate-submission="'+row.id+'"'+(pending?"":" disabled")+'>'+(pending?"Nilai":"Sudah dinilai")+'</button>'
  +'</div>'
  +'</article>';
}

function listHtml(){
 if(!rows.length){
  return '<div class="card"><b>Belum ada setoran masuk.</b>'
   +'<p class="muted" style="margin-top:8px">'
   +(filterStatus==="pending"?"Semua setoran santri di halaqah Anda sudah dinilai.":"Santri belum mengirim rekaman setoran.")
   +'</p></div>';
 }
 return rows.map(rowHtml).join("");
}

function renderList(){
 const box=document.querySelector("#setoranList");
 if(box)box.innerHTML=listHtml();
}

function setMessage(text){
 const el=document.querySelector("#setoranListMessage");
 if(el)el.textContent=text||"";
}

async function loadRows(){
 const pid=pondokId();
 if(!pid){
  setMessage("Pondok tidak diketahui.");
  rows=[];
  renderList();
  return;
 }
 if(!token()){
  setMessage("Sesi berakhir. Silakan login ulang.");
  rows=[];
  renderList();
  return;
 }
 setMessage("Memuat setoran…");
 const query=new URLSearchParams({pondok_id:String(pid)});
 if(filterWeek)query.set("week_no",String(filterWeek));
 if(filterStatus)query.set("status",filterStatus);
 try{
  const response=await fetch("/api/setoran-submissions?"+query.toString(),{
   headers:{Accept:"application/json",Authorization:"Bearer "+token()},
   cache:"no-store"
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok||!body.success)throw new Error(body?.message||"Gagal memuat setoran.");
  rows=Array.isArray(body.data)?body.data:[];
  setMessage("");
 }catch(error){
  rows=[];
  setMessage(error?.message||"Gagal memuat setoran.");
 }
 renderList();
}

function openModal(row){
 const modal=document.querySelector("#setoranReviewModal");
 if(!modal)return;
 const day=DAY_NAME[row.day_code]||row.day_code;
 modal.dataset.submissionId=String(row.id);
 modal.dataset.userId=String(row.user_id);
 const ref=document.querySelector("#setoranReviewRef");
 const page=document.querySelector("#setoranReviewPage");
 const decision=document.querySelector("#setoranReviewDecision");
 const notes=document.querySelector("#setoranReviewNotes");
 const msg=document.querySelector("#setoranReviewMessage");
 const who=document.querySelector("#setoranReviewWho");
 if(ref)ref.value="Pekan "+row.week_no+" · "+day;
 if(page)page.value="";
 if(decision)decision.value="mutqin";
 if(notes)notes.value="";
 if(msg){msg.textContent="";msg.style.color="";}
 if(who)who.textContent=row.student_name+" · "+(row.halaqah_name||"Tanpa halaqah");
 modal.classList.remove("hidden");
 ref?.focus();
}

function closeModal(){
 document.querySelector("#setoranReviewModal")?.classList.add("hidden");
}

async function play(row,button){
 if(playingId===row.id){stopPlayback();return;}
 stopPlayback();
 button.disabled=true;
 button.textContent="Memuat…";
 try{
  const response=await fetch("/api/setoran-submissions/audio?id="+row.id,{
   headers:{Authorization:"Bearer "+token()},
   cache:"no-store"
  });
  if(!response.ok){
   let message="Gagal memuat rekaman.";
   try{const body=await response.json();message=body?.message||message;}catch{}
   throw new Error(message);
  }
  const blob=await response.blob();
  playingUrl=URL.createObjectURL(blob);
  playingAudio=document.createElement("audio");
  playingAudio.preload="auto";
  playingAudio.src=playingUrl;
  playingAudio.addEventListener("ended",()=>stopPlayback());
  await playingAudio.play();
  playingId=row.id;
  button.textContent="■ Berhenti";
  button.classList.add("playing");
 }catch(error){
  stopPlayback();
  toast(error?.message||"Rekaman tidak bisa diputar.");
 }finally{
  button.disabled=false;
 }
}

async function saveReview(button){
 const modal=document.querySelector("#setoranReviewModal");
 if(!modal)return;
 const pid=pondokId();
 const submissionId=Number(modal.dataset.submissionId||0);
 const userId=Number(modal.dataset.userId||0);
 const ref=(document.querySelector("#setoranReviewRef")?.value||"").trim();
 const pageRaw=(document.querySelector("#setoranReviewPage")?.value||"").trim();
 const decision=document.querySelector("#setoranReviewDecision")?.value||"mutqin";
 const notes=(document.querySelector("#setoranReviewNotes")?.value||"").trim();
 const msg=document.querySelector("#setoranReviewMessage");
 if(msg){msg.textContent="";msg.style.color="";}
 if(!ref){
  if(msg){msg.textContent="Nama setoran wajib diisi.";msg.style.color="var(--danger)";}
  return;
 }
 if(pageRaw&&!/^\d+$/.test(pageRaw)){
  if(msg){msg.textContent="Nomor halaman harus angka.";msg.style.color="var(--danger)";}
  return;
 }
 button.disabled=true;
 const label=button.textContent;
 button.textContent="Menyimpan…";
 try{
  const response=await fetch("/api/setoran-reviews",{
   method:"POST",
   headers:{"Content-Type":"application/json",Accept:"application/json",Authorization:"Bearer "+token()},
   body:JSON.stringify({
    pondok_id:Number(pid||0),
    user_id:userId,
    ref,
    page_no:pageRaw||null,
    decision,
    notes,
    submission_id:submissionId||null
   })
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok||!body.success)throw new Error(body?.message||"Gagal menyimpan penilaian.");
  closeModal();
  toast("Penilaian tersimpan. Setoran ditandai sudah dinilai.");
  await loadRows();
 }catch(error){
  if(msg){msg.textContent=error?.message||"Gagal menyimpan penilaian.";msg.style.color="var(--danger)";}
 }finally{
  button.disabled=false;
  button.textContent=label;
 }
}

export function reviewPage(){
 return '<section class="review-page" data-review-page>'
  +'<div class="row between" style="margin-bottom:14px;gap:12px;flex-wrap:wrap">'
  +'<div><p class="eyebrow">Setoran / Review</p><h1>Setoran Masuk</h1>'
  +'<p class="muted">Dengarkan rekaman hafalan santri halaqah Anda, lalu beri penilaian.</p></div>'
  +'</div>'
  +'<div class="review-toolbar">'
  +'<label class="review-filter">Pekan<select class="input" id="setoranWeekFilter">'
  +'<option value="0">Semua</option>'
  +[1,2,3,4,5].map(n=>'<option value="'+n+'">Pekan '+n+'</option>').join("")
  +'</select></label>'
  +'<label class="review-filter">Status<select class="input" id="setoranStatusFilter">'
  +'<option value="pending">Belum dinilai</option>'
  +'<option value="reviewed">Sudah dinilai</option>'
  +'<option value="">Semua</option>'
  +'</select></label>'
  +'<button class="btn" type="button" id="setoranReload">Muat ulang</button>'
  +'</div>'
  +'<small class="muted" id="setoranListMessage" style="display:block;margin-bottom:10px"></small>'
  +'<div class="setoran-list" id="setoranList"><div class="card"><small class="muted">Memuat setoran…</small></div></div>'
  +'<div class="modal-backdrop hidden" id="setoranReviewModal"><div class="modal-card">'
  +'<div><p class="eyebrow">Penilaian Setoran</p><h2 id="setoranReviewWho">Nilai setoran</h2></div>'
  +'<div class="stack" style="margin-top:14px">'
  +'<div><label class="label">Nama setoran</label><input class="input" id="setoranReviewRef" placeholder="Pekan 1 · Sabtu" autocomplete="off"></div>'
  +'<div><label class="label">Halaman (opsional)</label><input class="input" id="setoranReviewPage" type="number" min="1" max="604" inputmode="numeric" placeholder="mis. 12"></div>'
  +'<div><label class="label">Penilaian</label><select class="input" id="setoranReviewDecision">'
  +DECISIONS.map(item=>'<option value="'+item.key+'">'+item.label+'</option>').join("")
  +'</select></div>'
  +'<div><label class="label">Catatan untuk santri</label><textarea class="input" id="setoranReviewNotes" rows="3" placeholder="Tajwid, kelancaran, bagian yang perlu diulang…"></textarea></div>'
  +'<small class="muted" id="setoranReviewMessage"></small>'
  +'<div class="btn-joined">'
  +'<button class="btn" type="button" id="setoranReviewClose">Tutup</button>'
  +'<button class="btn primary" type="button" id="setoranReviewSave">Simpan</button>'
  +'</div></div></div></div>'
  +'</section>';
}

export function bindReview(){
 const root=document.querySelector("[data-review-page]");
 if(!root)return;

 const weekSelect=document.querySelector("#setoranWeekFilter");
 const statusSelect=document.querySelector("#setoranStatusFilter");
 if(weekSelect)weekSelect.value=String(filterWeek);
 if(statusSelect)statusSelect.value=filterStatus;

 weekSelect?.addEventListener("change",()=>{filterWeek=Number(weekSelect.value)||0;loadRows();});
 statusSelect?.addEventListener("change",()=>{filterStatus=statusSelect.value;loadRows();});
 document.querySelector("#setoranReload")?.addEventListener("click",()=>{stopPlayback();loadRows();});

 document.querySelector("#setoranList")?.addEventListener("click",event=>{
  const playBtn=event.target.closest("[data-play-submission]");
  if(playBtn){
   const row=rows.find(item=>item.id===Number(playBtn.dataset.playSubmission));
   if(row)play(row,playBtn);
   return;
  }
  const rateBtn=event.target.closest("[data-rate-submission]");
  if(rateBtn&&!rateBtn.disabled){
   const row=rows.find(item=>item.id===Number(rateBtn.dataset.rateSubmission));
   if(row)openModal(row);
  }
 });

 document.querySelector("#setoranReviewClose")?.addEventListener("click",closeModal);
 document.querySelector("#setoranReviewModal")?.addEventListener("click",event=>{
  if(event.target.id==="setoranReviewModal")closeModal();
 });
 document.querySelector("#setoranReviewSave")?.addEventListener("click",event=>saveReview(event.currentTarget));

 window.addEventListener("hashchange",()=>{stopPlayback();closeModal();},{once:true});

 loadRows();
}
