import {getState} from "../store.js?v=81bed469";
import {loadMemberEnrollment} from "../utils/member-enrollment.js?v=platready1106";

const esc=x=>String(x??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
let searchSession="",searchQuery="",searchSelection=null,pendingHalaqahId=null;
let applicationsToken=null,applications=null,applicationsLoading=false,applicationsError="";

function sessionKey(){
 return getState().authToken||"";
}
async function request(url,options={}){
 const token=sessionKey();
 const r=await fetch(url,{
  ...options,
  headers:{Accept:"application/json",Authorization:"Bearer "+token,...(options.body?{"Content-Type":"application/json"}:{})},
  cache:"no-store"
 });
 const b=await r.json().catch(()=>({}));
 if(!r.ok||!b.success)throw new Error(b.message||"Permintaan gagal.");
 return b.data;
}
const dateText=value=>value
 ?new Date(value+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})
 :"Belum ditentukan";

function sessionSearchReset(){
 const token=sessionKey();
 if(searchSession!==token){
  searchSession=token;searchQuery="";searchSelection=null;pendingHalaqahId=null;
 }
}
function detailHtml(h){
 if(!h)return "";
 const applied=h.application_status;
 const locked=pendingHalaqahId!==null&&pendingHalaqahId!==Number(h.id);
 const disabled=applied==="pending"||applied==="approved"||locked;
 const action=applied==="pending"?"Menunggu persetujuan":applied==="approved"?"Sudah bergabung":
  locked?"Ada pendaftaran lain menunggu":"Mendaftar ke halaqah ini";
 return '<article class="card student-halaqah-detail">'
  +'<div class="student-halaqah-detail-head"><small class="muted">'+esc(h.scope==="platform"?"Platform Mutqeen":h.pondok_name||"Pondok")+'</small>'
  +'<h2>'+esc(h.name)+'</h2><span class="student-halaqah-code">Kode: '+esc(h.code)+'</span></div>'
  +'<div class="student-halaqah-meta"><div><b>Ustadz pembimbing</b><span>'+esc(h.musyrif_name||"Belum ditentukan")+'</span></div>'
  +'<div><b>Jumlah anggota</b><span>'+Number(h.members_count||0)+' santri aktif</span></div>'
  +'<div><b>Mulai program</b><span>'+esc(h.start_date_mode==="individual"?"Diatur per santri":dateText(h.program_start_date))+'</span></div></div>'
  +(applied==="rejected"?'<p class="muted">Pendaftaran sebelumnya ditolak. Anda dapat mendaftar kembali.</p>':"")
  +(locked?'<p class="muted">Anda masih mempunyai pendaftaran lain yang menunggu persetujuan.</p>':"")
  +(h.scope==="platform"?'<p class="muted">Fitur Progress halaqah Platform belum tersedia.</p>':"")
  +'<button class="btn primary full" type="button" data-apply-halaqah="'+Number(h.id)+'"'+
    (disabled?' disabled aria-disabled="true"':"")+'>'+esc(action)+'</button>'
  +'</article>';
}
export function studentHalaqahPage(){
 sessionSearchReset();
 return '<section class="student-halaqah-search-page">'
  +'<div class="student-halaqah-heading"><p class="eyebrow">Santri / Pendaftaran</p><h1>Daftar Halaqah</h1>'
  +'<p class="muted">Cari nama halaqah atau nama ustadz pembimbing. Anda juga bisa memasukkan kode halaqah 6 digit yang diberikan ustadz.</p></div>'
  +'<form id="studentHalaqahSearchForm" role="search" autocomplete="off">'
  +'<label for="studentHalaqahSearch" class="label">Cari halaqah</label>'
  +'<div class="student-halaqah-search-wrap">'
  +'<input class="input student-halaqah-search-input" id="studentHalaqahSearch" name="q" type="search" maxlength="100"'
  +' placeholder="Nama halaqah, ustadz, atau kode 6 karakter" aria-autocomplete="list" aria-controls="studentHalaqahSuggestions"'
  +' aria-expanded="false" value="'+esc(searchQuery)+'" spellcheck="false">'
  +'<div class="student-halaqah-suggestions" id="studentHalaqahSuggestions" role="listbox" aria-label="Hasil pencarian halaqah" hidden></div>'
  +'</div><p class="muted student-halaqah-hint">Ketik minimal 2 huruf. Saran yang muncul maksimal 5 halaqah.</p>'
  +'<p class="student-halaqah-status muted" id="studentHalaqahSearchStatus" role="status" aria-live="polite"></p>'
  +'</form>'
  +'<div id="studentHalaqahSelected" aria-live="polite">'+detailHtml(searchSelection)+'</div>'
  +'</section>';
}
export function bindStudentHalaqah(){
 const input=document.querySelector("#studentHalaqahSearch");
 const list=document.querySelector("#studentHalaqahSuggestions");
 const panel=document.querySelector("#studentHalaqahSelected");
 const status=document.querySelector("#studentHalaqahSearchStatus");
 const form=document.querySelector("#studentHalaqahSearchForm");
 if(!input||!list||!panel||!status||!form)return;
 let timer=null,seq=0,items=[],active=-1,loading=false;
 function updateActive(){
  const options=[...list.querySelectorAll('[role="option"]')];
  options.forEach((item,i)=>item.setAttribute("aria-selected",String(i===active)));
  if(active>=0&&options[active]){
   input.setAttribute("aria-activedescendant",options[active].id);
   options[active].scrollIntoView({block:"nearest"});
  }else input.removeAttribute("aria-activedescendant");
 }
 function suggestions(html){
  list.innerHTML=html;
  list.hidden=!html;
  input.setAttribute("aria-expanded",String(Boolean(html)));
  if(!html){active=-1;input.removeAttribute("aria-activedescendant")}
 }
 function choose(h){
  if(!h)return;
  searchSelection={...h};
  searchQuery=h.name;
  input.value=h.name;
  panel.innerHTML=detailHtml(searchSelection);
  status.textContent="";
  items=[];suggestions("");
  input.blur();
 }
 const suitable=query=>/^[0-9]+$/.test(query)?query.length===6:query.length>=2;
 async function runSearch(query,autoSelectCode=false){
  const run=++seq;
  clearTimeout(timer);
  if(!suitable(query)){
   items=[];loading=false;suggestions("");
   status.textContent=query&&/^[0-9]+$/.test(query)?"Masukkan kode halaqah lengkap (6 karakter).":"";
   return;
  }
  loading=true;status.textContent="Mencari halaqah...";
  suggestions("");
  try{
   const data=await request("/api/students/halaqahs/search?q="+encodeURIComponent(query));
   if(run!==seq||!input.isConnected||input.value.trim()!==query)return;
   pendingHalaqahId=data.pending_halaqah_id??null;
   items=Array.isArray(data.items)?data.items.slice(0,5):[];
   if(!items.length){
    status.textContent="Halaqah tidak ditemukan. Periksa nama ustadz atau kode 6 karakter.";
    return;
   }
   if(autoSelectCode&&items.length===1&&items[0].code===query.toUpperCase()){
    choose(items[0]);return;
   }
   status.textContent=items.length+" hasil ditemukan. Pilih halaqah yang sesuai.";
   active=-1;
   suggestions(items.map((h,i)=>'<button type="button" role="option" class="student-halaqah-suggestion"'
    +' id="studentHalaqahOption'+i+'" data-halaqah-index="'+i+'" aria-selected="false">'
    +'<strong>'+esc(h.name)+'</strong><span>'+esc(h.musyrif_name||"Ustadz belum ditentukan")
    +' · '+esc(h.scope==="platform"?"Platform Mutqeen":h.pondok_name||"Pondok")+'</span>'
    +'<small>Kode '+esc(h.code)+'</small></button>').join(""));
  }catch(error){
   if(run!==seq||!input.isConnected)return;
   items=[];suggestions("");
   status.textContent=error?.message||"Pencarian gagal. Coba lagi.";
  }finally{if(run===seq)loading=false}
 }
 input.addEventListener("input",()=>{
  const query=input.value.trim();
  searchQuery=query;searchSelection=null;panel.innerHTML="";
  clearTimeout(timer);seq++;items=[];active=-1;suggestions("");
  if(!suitable(query)){
   status.textContent=/^[0-9]+$/.test(query)?"Masukkan kode halaqah lengkap (6 karakter).":"";
   return;
  }
  status.textContent="Mencari halaqah...";
  timer=setTimeout(()=>runSearch(query,/^[A-Za-z0-9]{6}$/.test(query)),250);
 });
 input.addEventListener("keydown",e=>{
  if(e.key==="Escape"){suggestions("");status.textContent="";return}
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){
   if(!items.length||list.hidden)return;
   e.preventDefault();
   active=(active+(e.key==="ArrowDown"?1:-1)+items.length)%items.length;
   updateActive();
  }else if(e.key==="Enter"&&active>=0&&items[active]){
   e.preventDefault();choose(items[active]);
  }
 });
 list.addEventListener("click",e=>{
  const option=e.target.closest("[data-halaqah-index]");
  if(!option)return;
  const index=Number(option.dataset.halaqahIndex);
  if(Number.isInteger(index)&&items[index])choose(items[index]);
 });
 form.addEventListener("submit",async e=>{
  e.preventDefault();
  if(active>=0&&items[active]){choose(items[active]);return}
  const query=input.value.trim();
  if(!suitable(query)){status.textContent="Masukkan minimal 2 huruf atau kode 6 karakter.";return}
  if(items.length===1){choose(items[0]);return}
  if(!loading)await runSearch(query,/^[A-Za-z0-9]{6}$/.test(query));
  if(items.length>1)status.textContent="Pilih salah satu saran yang sesuai.";
 });
 panel.addEventListener("click",async event=>{
  const button=event.target.closest("[data-apply-halaqah]:not([disabled])");
  if(!button||!searchSelection)return;
  const chosen={...searchSelection};
  if(Number(button.dataset.applyHalaqah)!==Number(chosen.id))return;
  if(!confirm("Daftar ke halaqah "+chosen.name+"? Pendaftaran akan ditinjau oleh ustadz."))return;
  button.disabled=true;button.textContent="Mengirim pendaftaran...";
  try{
   await request("/api/students/halaqahs/apply",{method:"POST",body:JSON.stringify({halaqah_id:chosen.id})});
   searchSelection={...chosen,application_status:"pending"};
   pendingHalaqahId=Number(chosen.id);
   panel.innerHTML=detailHtml(searchSelection);
   status.textContent="Pendaftaran terkirim. Menunggu persetujuan ustadz.";
   await loadMemberEnrollment(true);
  }catch(error){
   status.textContent=error?.message||"Pendaftaran gagal.";
   if(searchSelection?.id===chosen.id)panel.innerHTML=detailHtml(searchSelection);
  }
 });
}

function loadApplications(force=false){
 const token=sessionKey();
 if(!token)return;
 if(applicationsToken!==token){applicationsToken=token;applications=null;applicationsError="";applicationsLoading=false;}
 if(applicationsLoading||(!force&&(applications!==null||applicationsError!=="")))return;
 applicationsLoading=true;applicationsError="";
 request("/api/students/halaqahs/applications")
 .then(data=>{if(sessionKey()===token)applications=Array.isArray(data)?data:[];})
 .catch(e=>{if(sessionKey()===token)applicationsError=e?.message||"Gagal memuat pendaftar.";})
 .finally(()=>{if(sessionKey()===token){applicationsLoading=false;if(location.hash.split("?")[0]==="#pendaftar-halaqah")window.dispatchEvent(new Event("app:render"));}});
}

export function halaqahApplicationsPage(){
 loadApplications();
 let html='<div style="margin-bottom:18px"><p class="eyebrow">Halaqah / Pendaftar</p><h1>Pendaftar Halaqah</h1>'
  +'<p class="muted">Terima atau tolak permohonan Santri pada halaqah yang Anda kelola.</p></div>'
  +'<button class="btn soft" style="margin-bottom:16px" type="button" id="reloadApplications">Muat ulang</button>';
 if(applications===null)return html+'<div class="card" role="status">'+esc(applicationsLoading?"Memuat pendaftaran…":applicationsError||"Tidak bisa mengambil pendaftar.")+'</div>';
 if(!applications.length)return html+'<div class="card"><h3>Belum ada pendaftaran yang menunggu</h3></div>';
 return html+'<div class="card"><div class="list">'+applications.map(row=>'<div class="list-item" style="flex-wrap:wrap;gap:10px">'
  +'<div class="grow"><b>'+esc(row.student_name)+'</b><small class="muted" style="display:block">'+esc(row.student_email)+'</small>'
  +'<small class="muted" style="display:block">Halaqah: '+esc(row.halaqah_name)+'</small></div>'
  +'<div class="row" style="gap:8px"><button class="btn primary" type="button" data-review-application="'+Number(row.id)+'" data-decision="approved">Terima</button>'
  +'<button class="btn" type="button" data-review-application="'+Number(row.id)+'" data-decision="rejected">Tolak</button></div></div>').join("")+'</div></div>';
}

export function bindHalaqahApplications(){
 document.querySelector("#reloadApplications")?.addEventListener("click",()=>{applications=null;loadApplications(true);window.dispatchEvent(new Event("app:render"));});
 document.querySelectorAll("[data-review-application]").forEach(button=>button.addEventListener("click",async()=>{
  const id=Number(button.dataset.reviewApplication),decision=button.dataset.decision;
  const name=applications?.find(x=>Number(x.id)===id)?.student_name||"santri ini";
  if(!confirm((decision==="approved"?"Terima ":"Tolak ")+name+"?"))return;
  button.disabled=true;
  try{
   await request("/api/students/halaqahs/applications/review",{
    method:"POST",body:JSON.stringify({application_id:id,decision})
   });
   applications=null;loadApplications(true);
  }catch(e){alert(e?.message||"Tidak dapat memproses permohonan.");button.disabled=false;}
 }));
}
