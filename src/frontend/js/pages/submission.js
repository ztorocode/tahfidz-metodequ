import {getState,setState} from "../store.js?v=7a5d9b42";
import {getProgressContext,setProgressContextPatch} from "../utils/progress-context.js?v=7a5d9b42";
import {scheduleSave} from "../utils/progress-sync.js?v=7a5d9b42";
import {dayProgress} from "./member-progress.js?v=7a5d9b42";
import {toast} from "../utils/helpers.js?v=7a5d9b42";
import {activePondokId} from "../utils/program-context.js?v=7a5d9b42";

function resolvePondokId(){
 const st=getState();
 return st.activePondokId??st.authUser?.pondoks?.[0]?.id??st.myPondoks?.[0]?.id??activePondokId()??null;
}

function escapeHtml(value=""){
 return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function query(){
 const raw=location.hash.replace(/^#/,"");
 return new URLSearchParams(raw.split("?")[1]||"");
}

function fieldValue(data,week,day,id){
 return data.fields?.[week+":"+day+":"+id]||"";
}

export function submissionPage(){
 const data=getProgressContext(getState());
 const params=query();
 const week=Math.min(5,Math.max(1,Number(params.get("week"))||Number(data.week)||1));
 const day=params.get("day")||data.openDay||"sabtu";
 const awal=fieldValue(data,week,day,"ayat_hafalan_kemaren-awal")||fieldValue(data,week,day,"rabth-awal");
 const akhir=fieldValue(data,week,day,"ayat_hafalan_kemaren-akhir")||fieldValue(data,week,day,"rabth-akhir");
 const title=awal&&akhir?escapeHtml(awal)+" → "+escapeHtml(akhir):"Rentang ayat belum diisi";
 return `<section class="ayat-page" data-submission-page data-week="${week}" data-day="${escapeHtml(day)}">
  <div class="ayat-head">
   <button class="btn soft" type="button" data-sub-back>← Kembali</button>
   <div class="ayat-title">
    <p class="eyebrow">Setor Hafalan · Pekan ${week} · ${escapeHtml(day)}</p>
    <h1>${title}</h1>
    <small class="muted" id="subMeta">${awal&&akhir?"":"Isi Set Ayat / Rabth dulu di halaman Progress."}</small>
   </div>
  </div>
  <div class="card" style="margin-bottom:14px">
   <h3 style="margin-bottom:10px">Rekam Hafalan</h3>
   <div style="height:120px;display:grid;place-items:center;background:var(--surface-2);border-radius:14px;margin:12px 0;gap:10px">
    <button class="btn danger" id="recordBtn">● Mulai Rekam</button>
    <b id="recordTimer" style="display:none;font-size:22px;font-variant-numeric:tabular-nums">00:00</b>
   </div>
   <audio id="recordPlayback" controls style="display:none;width:100%;margin-bottom:12px"></audio>
   <small class="muted" id="recordMessage" style="display:block;margin-bottom:10px"></small>
   <div class="row">
    <button class="btn grow" id="playbackBtn" disabled>Putar Ulang</button>
    <button class="btn primary grow" id="submitSetoran" disabled>Kirim Setoran</button>
   </div>
  </div>
 </section>`;
}

export function bindSubmission(){
 const root=document.querySelector("[data-submission-page]");
 if(!root)return;
 const week=Number(root.dataset.week)||1;
 const day=root.dataset.day;

 // Kembali ke halaman asal: #progress (santri) atau #review-progress (musyrif).
 const backRoute=query().get("from")==="review-progress"?"review-progress":"progress";
 root.querySelector("[data-sub-back]")?.addEventListener("click",()=>{location.hash=backRoute;});

 const recordBtn=document.querySelector("#recordBtn");
 const timerEl=document.querySelector("#recordTimer");
 const playback=document.querySelector("#recordPlayback");
 const playbackBtn=document.querySelector("#playbackBtn");
 const submitBtn=document.querySelector("#submitSetoran");
 const message=document.querySelector("#recordMessage");

 let mediaRecorder=null;
 let chunks=[];
 let recordedUrl=null;
 let timerId=null;
 let seconds=0;

 const fmt=()=>String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
 const cleanup=()=>{
  if(mediaRecorder&&mediaRecorder.state!=="inactive"){
   mediaRecorder.onstop=null;
   mediaRecorder.stop();
  }
  if(mediaRecorder){
   mediaRecorder.stream.getTracks().forEach(t=>t.stop());
   mediaRecorder=null;
  }
  clearInterval(timerId);timerId=null;
  if(recordedUrl){URL.revokeObjectURL(recordedUrl);recordedUrl=null;}
 };
 window.addEventListener("hashchange",cleanup,{once:true});

 recordBtn?.addEventListener("click",async ()=>{
  if(mediaRecorder&&mediaRecorder.state==="recording"){
   mediaRecorder.stop();
   clearInterval(timerId);timerId=null;
   recordBtn.textContent="● Mulai Rekam";
   recordBtn.classList.remove("soft");recordBtn.classList.add("danger");
   return;
  }
  message.textContent="";
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   chunks=[];
   mediaRecorder=new MediaRecorder(stream);
   const mime=mediaRecorder.mimeType||"audio/webm";
   mediaRecorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
   mediaRecorder.onstop=()=>{
    stream.getTracks().forEach(t=>t.stop());
    if(recordedUrl)URL.revokeObjectURL(recordedUrl);
    recordedUrl=URL.createObjectURL(new Blob(chunks,{type:mime}));
    playback.src=recordedUrl;
    playback.style.display="";
    playbackBtn.disabled=false;
    submitBtn.disabled=false;
    message.textContent="Rekaman siap diputar atau dikirim.";
   };
   mediaRecorder.start();
   seconds=0;timerEl.textContent=fmt();timerEl.style.display="";
   timerId=setInterval(()=>{seconds+=1;timerEl.textContent=fmt();},1000);
   recordBtn.textContent="■ Berhenti";
   message.textContent="Merekam… klik Berhenti bila selesai.";
  }catch(err){
   message.textContent="Mikrofon tidak bisa diakses. Izinkan akses mikrofon lalu coba lagi.";
  }
 });

 playbackBtn?.addEventListener("click",()=>{
  if(!recordedUrl)return;
  if(playback.paused)playback.play();
  else playback.pause();
 });

 submitBtn?.addEventListener("click",async ()=>{
  if(!recordedUrl)return;
  submitBtn.disabled=true;
  submitBtn.textContent="Mengirim…";
  message.textContent="Sedang mengirim setoran ke musyrif…";
  try{
   const st=getState();
   const pid=resolvePondokId();
   if(!st.authToken)throw new Error("Sesi berakhir. Silakan login ulang.");
   const blob=new Blob(chunks,{type:mediaRecorder?.mimeType||"audio/webm"});
   const fd=new FormData();
   fd.append("audio",blob,"setoran.webm");
   if(pid)fd.append("pondok_id",String(pid));
   fd.append("week_no",String(week));
   fd.append("day_code",day);
   const r=await fetch("/api/setoran-submissions",{
    method:"POST",
    headers:{Authorization:"Bearer "+st.authToken},
    body:fd
   });
   const b=await r.json().catch(()=>({}));
    if(!r.ok||!b.success)throw new Error(b?.message||"Gagal mengirim setoran.");
    if(!getState().activePondokId){
     try{
      const me=await fetch("/api/auth/me",{headers:{Authorization:"Bearer "+st.authToken,Accept:"application/json"}});
      const mb=await me.json();
      const user=mb?.data?.user||{};
      const pondoks=user.pondoks||[];
      const pondok=pondoks.find(p=>p.id===(b?.data?.pondok_id||0))||pondoks[0];
      if(pondok)setState({authUser:user,myPondoks:pondoks,activePondokId:pondok.id});
     }catch{}
    }
    const fresh=getProgressContext(getState());
   const key=week+":"+day+":merekam";
   setProgressContextPatch({checks:{...(fresh.checks||{}),[key]:true}});
   scheduleSave(week,day,dayProgress(getProgressContext(getState()),week,day));
   toast("Setoran terkirim ke musyrif.");
   cleanup();
   location.hash=backRoute;
  }catch(err){
   submitBtn.disabled=false;
   submitBtn.textContent="Kirim Setoran";
   message.textContent=err?.message||"Gagal mengirim setoran.";
  }
 });
}
