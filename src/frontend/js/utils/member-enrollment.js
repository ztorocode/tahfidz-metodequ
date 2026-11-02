import {getState,setState} from "../store.js?v=81bed469";

// Keputusan akses diambil dari database. Jangan gunakan konteks Personal / localStorage
// sebagai bukti Santri sudah mempunyai halaqah dan Ustadz.
let token=null;
let enrollment=null;
let loading=false;
let error="";
let requestId=0;

function safe(value){
 return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function resetToken(){
 const next=getState().authToken;
 if(token===next)return;
 token=next;
 enrollment=null;
 loading=false;
 error="";
 requestId++;
}

export function memberEnrollment(){
 resetToken();
 return enrollment;
}

export async function loadMemberEnrollment(force=false){
 resetToken();
 const session=token;
 if(!session||getState().persona!=="member")return;
 if(loading&&!force)return;
 if(enrollment&&!force)return;
 const current=++requestId;
 loading=true;
 error="";
 if(force)enrollment=null;
 try{
  const response=await fetch("/api/users/me/enrollment",{headers:{Accept:"application/json",Authorization:"Bearer "+session},cache:"no-store"});
  const body=await response.json().catch(()=>({}));
  if(!response.ok||!body.success)throw new Error(body.message||"Status Santri tidak dapat dimuat.");
  if(current!==requestId||getState().authToken!==session)return;
  enrollment=body.data;
 }catch(e){
  if(current!==requestId)return;
  error=e?.message||"Status Santri gagal dimuat.";
 }finally{
  if(current===requestId){
   loading=false;
   const route=location.hash.replace(/^#/,"").split("?")[0];
   if(["dashboard","progress","report"].includes(route))window.dispatchEvent(new Event("app:render"));
  }
 }
}

function dateLabel(value){
 if(!value)return "Belum ditetapkan";
 const date=new Date(value+"T00:00:00");
 return Number.isNaN(date.getTime())?safe(value):date.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"});
}

function card(title,body){
 return '<div class="card" style="margin-bottom:16px"><h3>'+safe(title)+'</h3><p class="muted" style="margin-top:10px">'+body+'</p></div>';
}

function statusView(route){
 const state=getState(),data=enrollment;
 const name=state.authUser?.name||"Santri";
 const page=route==="progress"?"Progress":route==="report"?"Report":"Dashboard Santri";
 const header='<div style="margin-bottom:20px"><p class="eyebrow">Santri / '+safe(page)+'</p><h1>Assalamu&#39;alaikum, '+safe(name)+'</h1></div>';
 if(!data){
  return header+'<div class="card" role="status">'+(loading
   ?'<h2>Memeriksa keanggotaan halaqah...</h2><p class="muted">Status diambil dari database.</p>'
   :'<h2>Belum bisa memeriksa status Santri</h2><p class="muted">'+safe(error||"Coba muat ulang.")+'</p><button class="btn primary" type="button" id="refreshEnrollment">Coba lagi</button>')+'</div>';
 }

 const h=data.halaqah;
 const status=data.status;
 let title="",description="";
 if(status==="not_enrolled"){
  title="Belum Bergabung dengan Halaqah";
  description="Akun Anda sudah aktif, tetapi belum terdaftar di halaqah dan belum memiliki Ustadz pembimbing. Minta Ustadz atau pengelola pondok mengirim undangan ke email akun Anda.";
 }else if(status==="invited"){
  title="Undangan Halaqah Tersedia";
  description="Anda sudah menerima undangan. Terima undangan tersebut untuk bergabung dengan halaqah dan Ustadz pembimbing.";
 }else if(status==="application_pending"){
  title="Menunggu Persetujuan Pendaftaran";
  description="Pendaftaran ke halaqah "+(data.application?.halaqah_name||"pilihan Anda")+" sudah dikirim. Anda akan bergabung setelah Ustadz atau admin pondok menyetujui.";
 }else if(status==="mentor_pending"){
  title="Menunggu Ustadz Pembimbing";
  description="Anda sudah terdaftar di halaqah, tetapi belum ada Ustadz pembimbing aktif. Hubungi pengelola halaqah untuk menetapkan Ustadz.";
 }else if(status==="schedule_pending"){
  title="Menunggu Jadwal Program";
  description="Halaqah dan Ustadz pembimbing sudah tersedia. Pengisian Progress baru aktif setelah tanggal mulai program ditentukan.";
 }else if(status==="scheduled"){
  title="Program Belum Dimulai";
  description="Anda sudah tergabung dalam halaqah. Progress baru aktif pada tanggal mulai program.";
 }else if(status==="platform_progress_unavailable"){
  title="Progress Halaqah Platform Belum Tersedia";
  description="Halaqah dan Ustadz pembimbing sudah terdaftar. Penyimpanan Progress untuk halaqah Platform belum didukung sistem saat ini. Tidak ada form isian sementara agar data tidak hilang.";
 }else{
  title="Status Program Tidak Dikenal";
  description="Muat ulang untuk memeriksa keanggotaan Anda.";
 }
 let html=header+'<div class="card" role="status" style="margin-bottom:16px">'
  +'<p class="eyebrow">Status Program Tahfidz</p><h2 style="margin:8px 0">'+safe(title)+'</h2>'
  +'<p class="muted">'+safe(description)+'</p>'
  +'<div class="row" style="margin-top:18px;gap:10px;flex-wrap:wrap">'
  +'<a class="btn primary" href="#daftar-halaqah">Lihat list halaqah</a>'
  +(status==="application_pending"?'<button class="btn soft" type="button" id="refreshEnrollment">Cek status</button>':"")
  +(route!=="dashboard"?'<a class="btn" href="#dashboard">Kembali ke Dashboard</a>':"")
  +'</div></div>';
 if(h){
  html+='<div class="grid-2" style="margin-bottom:16px">'
   +'<div class="card"><small class="muted">Halaqah</small><h3>'+safe(h.name)+'</h3><small class="muted">'+safe(h.pondok_name||"Platform Mutqeen")+'</small></div>'
   +'<div class="card"><small class="muted">Ustadz Pembimbing</small><h3>'+safe(h.musyrif_name||"Belum ditetapkan")+'</h3></div>'
   +'<div class="card"><small class="muted">Mulai Program</small><h3>'+safe(dateLabel(h.program_start_date))+'</h3></div>'
   +'<div class="card"><small class="muted">Progress</small><h3>Belum tersedia</h3></div>'
   +'</div>';
 }else{
  html+='<div class="grid-2" style="margin-bottom:16px">'
   +'<div class="card"><small class="muted">Halaqah</small><h3>Belum ada</h3></div>'
   +'<div class="card"><small class="muted">Ustadz Pembimbing</small><h3>Belum ada</h3></div>'
   +'</div>';
 }
 if(status==="invited"){
  const invites=Array.isArray(data.invites)?data.invites:[];
  html+='<div class="card"><h3>Undangan Anda</h3><div class="list" style="margin-top:12px">'
   +invites.map(invite=>'<div class="list-item"><div class="grow"><b>'+safe(invite.name)+'</b>'
    +'<small class="muted" style="display:block">'+(invite.type==="pondok"?"Undangan Pondok":"Undangan Platform")+'</small></div>'
    +(invite.link?'<a class="btn primary" href="'+safe(invite.link)+'">Terima Undangan</a>':'<small class="muted">Minta tautan baru dari Ustadz</small>')
    +'</div>').join("")+'</div></div>';
 }
 return html;
}

/**
 * Kembalikan null hanya jika Santri benar-benar memiliki halaqah Pondok aktif,
 * Ustadz aktif dan tanggal mulai sudah tiba.
 */
export function memberEnrollmentGate(route){
 resetToken();
 if(!enrollment&&!loading&&!error)loadMemberEnrollment();
 if(enrollment?.status==="active"&&enrollment.halaqah?.scope==="pondok"){
  const h=enrollment.halaqah;
  const state=getState(),pid=Number(h.pondok_id);
  if(pid>0&&(state.context!=="pondok"||Number(state.activePondokId)!==pid)){
   const pondoks=Array.isArray(state.myPondoks)?[...state.myPondoks]:[];
   if(!pondoks.some(p=>Number(p.id)===pid))pondoks.push({id:pid,name:h.pondok_name||"Pondok",role:"member"});
   setState({context:"pondok",activePondokId:pid,myPondoks:pondoks});
  }
  return null;
 }
 return statusView(route);
}

export function bindMemberEnrollment(){
 document.querySelector("#refreshEnrollment")?.addEventListener("click",()=>loadMemberEnrollment(true));
}
