import {getState} from "../store.js?v=81bed469";
import {loadMemberEnrollment} from "../utils/member-enrollment.js?v=studentgateba73";

const esc=x=>String(x??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
let catalogToken=null,catalog=null,catalogLoading=false,catalogError="";
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

function loadCatalog(force=false){
 const token=sessionKey();
 if(!token)return;
 if(catalogToken!==token){catalogToken=token;catalog=null;catalogError="";catalogLoading=false;}
 if(catalogLoading||(!force&&catalog!==null))return;
 catalogLoading=true;catalogError="";
 request("/api/students/halaqahs")
 .then(data=>{if(sessionKey()===token)catalog=Array.isArray(data)?data:[];})
 .catch(e=>{if(sessionKey()===token)catalogError=e?.message||"Gagal memuat daftar halaqah.";})
 .finally(()=>{if(sessionKey()===token){catalogLoading=false;if(location.hash.split("?")[0]==="#daftar-halaqah")window.dispatchEvent(new Event("app:render"));}});
}

export function studentHalaqahPage(){
 loadCatalog();
 const header='<div style="margin-bottom:18px"><p class="eyebrow">Santri / Pendaftaran</p><h1>Daftar Halaqah</h1>'
  +'<p class="muted">Pilih halaqah yang ingin diikuti. Pendaftaran akan ditinjau oleh Ustadz atau admin pondok sebelum Anda menjadi anggota.</p></div>'
  +'<div class="row" style="margin-bottom:18px;gap:10px"><a class="btn" href="#dashboard">Kembali ke Dashboard</a>'
  +'<button class="btn soft" type="button" id="reloadHalaqahCatalog">Muat ulang</button></div>';
 if(catalog===null){
  return header+'<div class="card" role="status">'+esc(catalogLoading?"Memuat daftar halaqah…":catalogError||"Tidak dapat memuat daftar halaqah.")+'</div>';
 }
 if(!catalog.length)return header+'<div class="card"><h3>Belum ada halaqah yang menerima pendaftaran</h3><p class="muted">Hubungi pengelola program untuk informasi lebih lanjut.</p></div>';
 const pending=catalog.some(h=>h.application_status==="pending");
 return header+(pending?'<div class="card" style="margin-bottom:18px"><b>Pendaftaran sedang diproses</b><p class="muted">Anda sudah mengajukan pendaftaran. Tunggu persetujuan Ustadz sebelum mengajukan ke halaqah lain.</p></div>':"")
 +'<div class="grid-2">'+catalog.map(h=>{
   const applied=h.application_status;
   const locked=pending&&applied!=="pending";
   const action=applied==="pending"?"Menunggu persetujuan":applied==="approved"?"Sudah bergabung":"Mendaftar ke halaqah ini";
   const disabled=applied==="pending"||applied==="approved"||locked;
   return '<article class="card" style="display:flex;flex-direction:column;gap:12px">'
     +'<div><small class="muted">'+esc(h.scope==="platform"?"Platform Mutqeen":h.pondok_name||"Pondok")+'</small>'
     +'<h2 style="margin-top:6px">'+esc(h.name)+'</h2></div>'
     +'<div class="list">'
     +'<div class="list-item"><div class="grow"><b>Ustadz pembimbing</b><small class="muted" style="display:block">'+esc(h.musyrif_name)+'</small></div></div>'
     +'<div class="list-item"><div class="grow"><b>Jumlah anggota</b><small class="muted" style="display:block">'+Number(h.members_count)+' santri aktif</small></div></div>'
     +'<div class="list-item"><div class="grow"><b>Mulai program</b><small class="muted" style="display:block">'+esc(dateText(h.program_start_date))+'</small></div></div>'
     +'</div>'
     +(applied==="rejected"?'<small class="muted">Pendaftaran sebelumnya ditolak. Anda dapat mendaftar kembali.</small>':"")
     +(h.scope==="platform"?'<small class="muted">Catatan: fitur Progress untuk halaqah Platform belum tersedia.</small>':"")
     +'<button class="btn primary full" type="button" data-apply-halaqah="'+Number(h.id)+'"'
     +(disabled?' disabled aria-disabled="true"':"")+ '>'+esc(locked?"Ada pendaftaran lain menunggu":action)+'</button>'
     +'</article>';
  }).join("")+'</div>';
}

export function bindStudentHalaqah(){
 document.querySelector("#reloadHalaqahCatalog")?.addEventListener("click",()=>{catalog=null;loadCatalog(true);window.dispatchEvent(new Event("app:render"));});
 document.querySelectorAll("[data-apply-halaqah]:not([disabled])").forEach(button=>button.addEventListener("click",async()=>{
  const id=Number(button.dataset.applyHalaqah);
  const h=catalog?.find(x=>x.id===id);
  if(!h||!confirm("Daftar ke halaqah "+h.name+"? Pendaftaran memerlukan persetujuan Ustadz."))return;
  button.disabled=true;button.textContent="Mengirim pendaftaran...";
  try{
   await request("/api/students/halaqahs/apply",{method:"POST",body:JSON.stringify({halaqah_id:id})});
   await loadMemberEnrollment(true);
   catalog=null;loadCatalog(true);
  }catch(e){
   alert(e?.message||"Pendaftaran gagal.");
   catalog=null;loadCatalog(true);
  }
 }));
}

function loadApplications(force=false){
 const token=sessionKey();
 if(!token)return;
 if(applicationsToken!==token){applicationsToken=token;applications=null;applicationsError="";applicationsLoading=false;}
 if(applicationsLoading||(!force&&applications!==null))return;
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
