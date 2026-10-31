import {getState,setState} from "../store.js?v=81bed469";
import {isDonorAuthenticated,openDonorModal} from "./donatur-auth.js?v=donproof31";
import {openDonationConfirmation} from "./donation-confirmation.js?v=donproof31";

function escapeHtml(value){
 return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
const countFormat=new Intl.NumberFormat("id-ID");
const moneyFormat=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0,minimumFractionDigits:0});
const monthFormat=new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric",timeZone:"Asia/Jakarta"});
function count(value){return countFormat.format(Math.max(0,Number(value)||0))}
function monthLabel(value){
 if(!/^\d{4}-\d{2}$/.test(String(value||"")))return "bulan ini";
 const date=new Date(value+"-01T12:00:00+07:00");
 return Number.isNaN(date.getTime())?"bulan ini":monthFormat.format(date);
}
function ustadzCard(item){
 const name=escapeHtml(item.name);
 const scope=item.type==="pondok"?(item.pondok_name||"Pondok"):"Ustadz Platform";
 const initial=escapeHtml((item.name||"U").trim().charAt(0).toUpperCase());
 const amount=item.donasi_bulan_ini==null?null:Number(item.donasi_bulan_ini);
 const id=Number(item.id)||0;
 return '<article class="donasi-ustadz-card">'
  +'<div class="donasi-ustadz-head"><span class="donasi-avatar" aria-hidden="true">'+initial+'</span><div><h2>'+name+'</h2><p>'+escapeHtml(scope)+'</p></div></div>'
  +'<div class="donasi-ustadz-metrics">'
  +'<div><strong>'+count(item.santri_aktif)+'</strong><span>Santri aktif</span></div>'
  +'<div><strong>'+count(item.setoran_dinilai)+'</strong><span>Setoran dinilai</span></div>'
  +'<div><strong>'+count(item.hafalan_mutqin)+'</strong><span>Penilaian mutqin</span></div>'
  +'</div><div class="donasi-ustadz-total"><span>Donasi terverifikasi bulan ini</span><strong>'
  +(amount!==null&&Number.isFinite(amount)&&amount>=0?moneyFormat.format(amount):"Belum tersedia")
  +'</strong></div>'
  +'<div class="donasi-ustadz-actions"><button type="button" class="btn primary" data-donate-id="'+id+'" data-ustadz-name="'+name+'">Donate</button>'
  +'<button type="button" class="btn" data-activity-id="'+id+'" data-ustadz-name="'+name+'">Aktivitas</button></div>'
  +'</article>';
}
export function donationListPage(){
 return '<main class="landing-page donasi-page">'
  +'<header class="landing-header"><a class="landing-brand" href="#home" aria-label="Kembali ke beranda Mutqeen"><span class="landing-logo">م</span><span>Mutqeen</span></a><a class="btn landing-login" href="#login">Masuk</a></header>'
  +'<section class="donasi-main"><a href="#home" class="donasi-back">Kembali ke beranda</a>'
  +'<div class="donasi-intro"><span class="landing-kicker">Dukung penjaga hafalan Al-Qur\'an</span><h1>Pilih Ustadz yang Ingin Anda Dukung</h1>'
  +'<p>Lihat jumlah santri binaan, catatan penilaian hafalan, dan donasi yang sudah terverifikasi. Semua angka berasal dari catatan Mutqeen.</p></div>'
  +'<div class="donasi-summary"><span id="donasiPeriode">Donasi terverifikasi bulan ini</span><small>Nominal hanya mencakup transfer yang sudah tercatat dan terverifikasi di Mutqeen. Transfer langsung di luar pencatatan mungkin belum termasuk.</small></div>'
  +'<div id="donasiList" class="donasi-list" aria-live="polite" aria-busy="true"><div class="donasi-state">Memuat daftar ustadz...</div></div>'
  +'<p class="donasi-footnote">Pencapaian setoran dan mutqin dihitung dari catatan penilaian sejak mulai tercatat. Jumlah santri menunjukkan binaan aktif saat ini.</p></section>'
  +'<footer class="landing-footer"><b>Mutqeen</b><span>Dukungan langsung untuk ustadz tahfidz.</span></footer>'
  +'<div class="donasi-overlay" id="donasiOverlay" hidden><section class="donasi-dialog" role="dialog" aria-modal="true" aria-labelledby="donasiDialogTitle">'
  +'<header class="donasi-dialog-head"><h2 id="donasiDialogTitle"></h2><button type="button" class="donasi-dialog-close" id="donasiClose" aria-label="Tutup">×</button></header>'
  +'<div id="donasiDialogBody" class="donasi-dialog-body" aria-live="polite"></div></section></div></main>';
}
function bankView(detail){
 const bank=detail.bank;
 if(!bank)return '<div class="donasi-empty">Ustadz belum mempublikasikan nomor rekening untuk donasi.</div>';
 return '<p>Transfer langsung ke rekening yang dicantumkan ustadz berikut.</p>'
   +'<div class="donasi-bank"><span>Bank</span><strong>'+escapeHtml(bank.bank_name)+'</strong>'
   +'<span>Nomor rekening</span><strong class="donasi-account-number">'+escapeHtml(bank.account_number)+'</strong>'
   +'<span>Atas nama</span><strong>'+escapeHtml(bank.account_holder)+'</strong></div>'
   +'<button type="button" class="btn primary donasi-copy" data-copy-account="'+escapeHtml(bank.account_number)+'">Salin Nomor Rekening</button>'
   +'<div class="donasi-confirm-area"><button type="button" class="btn primary donasi-confirm-btn" data-confirm-transfer>Konfirmasi Bukti Transfer</button>'
   +'<p class="donasi-confirm-note">Mohon konfirmasi bukti transfer agar sistem bisa mengirim notifikasi kepada ustadz dan mendukung transparansi laporan kepada publik. Nominal donasi ditampilkan setelah diverifikasi ustadz.</p></div>'
   +'<p class="donasi-caution">Periksa kembali nama penerima di aplikasi bank sebelum transfer. Mutqeen tidak menerima atau meneruskan dana.</p>';
}
function halaqahView(item){
 const progress=item.progres_rata_rata==null?"Belum tersedia":count(item.progres_rata_rata)+"%";
 return '<div class="donasi-halaqah"><h3>'+escapeHtml(item.name)+'</h3><div class="donasi-halaqah-metrics">'
  +'<span><button type="button" class="donasi-halaqah-students" data-students-halaqah="'+(Number(item.id)||0)+'" aria-label="Lihat '+count(item.santri_aktif)+' santri aktif di '+escapeHtml(item.name)+'"><b>'+count(item.santri_aktif)+'</b><span>Santri aktif <span aria-hidden="true">›</span></span></button></span>'
  +'<span><b>'+count(item.aktivitas_bulan_ini)+'</b> Aktivitas bulan ini</span>'
  +'<span><b>'+count(item.setoran_dinilai)+'</b> Setoran dinilai</span>'
  +'<span><b>'+count(item.hafalan_mutqin)+'</b> Mutqin</span>'
  +'<span><b>'+progress+'</b> Rata-rata progres harian terakhir</span></div></div>';
}
function activityView(detail){
 const halaqahs=Array.isArray(detail.halaqahs)?detail.halaqahs:[];
 const photos=Array.isArray(detail.photos)?detail.photos:[];
 const gallery=photos.length?'<div class="donasi-photo-grid">'+photos.map(photo=>
   '<figure><img src="'+escapeHtml(photo.url)+'" alt="'+escapeHtml(photo.caption)+'" loading="lazy">'
   +'<figcaption>'+escapeHtml(photo.caption)+(photo.halaqah_name?'<small>'+escapeHtml(photo.halaqah_name)+'</small>':'')+'</figcaption></figure>'
  ).join("")+'</div>':'<div class="donasi-empty">Belum ada foto aktivitas yang diizinkan untuk ditampilkan.</div>';
 return '<p>Ringkasan kegiatan dan perkembangan halaqah. Tidak memuat identitas atau catatan pribadi santri.</p>'
  +'<h3 class="donasi-dialog-section">Progres Halaqah</h3>'
  +(halaqahs.length?halaqahs.map(halaqahView).join(""):'<div class="donasi-empty">Belum ada halaqah aktif.</div>')
  +'<h3 class="donasi-dialog-section">Foto Aktivitas</h3>'+gallery
  +'<p class="donasi-caution">Foto dipublikasikan oleh ustadz setelah menyatakan memiliki izin. Progres dihitung dari catatan aplikasi.</p>';
}
export function bindDonationList(){
 const page=document.querySelector(".donasi-page");
 const box=page?.querySelector("#donasiList");
 const overlay=page?.querySelector("#donasiOverlay");
 const body=page?.querySelector("#donasiDialogBody");
 const title=page?.querySelector("#donasiDialogTitle");
 if(!box||!overlay||!body||!title)return;
 let openedBy=null,sequence=0;
 const close=()=>{
  sequence++;
  overlay.hidden=true;
  document.body.classList.remove("donasi-modal-open");
  if(openedBy?.isConnected)openedBy.focus();
 };
 const open=async(mode,id,name,button)=>{
  openedBy=button;
  overlay.dataset.ustadzId=String(id);
  overlay.dataset.ustadzName=name;
  const ticket=++sequence;
  title.textContent=mode==="bank"?"Donasi untuk "+name:"Aktivitas "+name;
  body.innerHTML='<div class="donasi-state">Memuat informasi ustadz...</div>';
  overlay.hidden=false;
  document.body.classList.add("donasi-modal-open");
  page.querySelector("#donasiClose")?.focus();
  try{
   const response=await fetch("/api/public/ustadz/detail?id="+id,{headers:{Accept:"application/json"},cache:"no-store"});
   const result=await response.json().catch(()=>({}));
   if(!response.ok||!result.success)throw new Error(result.message||"Informasi belum bisa dimuat.");
   if(ticket!==sequence||!overlay.isConnected)return;
   body.innerHTML=mode==="bank"?bankView(result.data||{}):activityView(result.data||{});
  }catch(error){
   if(ticket===sequence&&overlay.isConnected)body.innerHTML='<div class="donasi-empty">'+escapeHtml(error.message||"Informasi belum bisa dimuat.")+'</div>';
  }
 };
 box.addEventListener("click",event=>{
  const button=event.target.closest("[data-donate-id],[data-activity-id]");
  if(!button||!box.contains(button))return;
  const id=Number(button.dataset.donateId||button.dataset.activityId||0);
  if(!Number.isSafeInteger(id)||id<1)return;
  open(button.hasAttribute("data-donate-id")?"bank":"activity",id,button.dataset.ustadzName||"Ustadz",button);
 });
 page.querySelector("#donasiClose")?.addEventListener("click",close);
 overlay.addEventListener("click",event=>{if(event.target===overlay)close()});
 const onKey=event=>{if(event.key==="Escape"&&!overlay.hidden){event.preventDefault();close()}};
 document.addEventListener("keydown",onKey);
 const observer=new MutationObserver(()=>{if(!page.isConnected){document.removeEventListener("keydown",onKey);document.body.classList.remove("donasi-modal-open");observer.disconnect()}});
 observer.observe(document.querySelector("#app")||document.body,{childList:true});
 body.addEventListener("click",async event=>{
  const confirmButton=event.target.closest("[data-confirm-transfer]");
  if(confirmButton&&body.contains(confirmButton)){
   openDonationConfirmation(Number(overlay.dataset.ustadzId||0),overlay.dataset.ustadzName||"Ustadz",confirmButton);
   return;
  }
  const studentButton=event.target.closest("[data-students-halaqah]");
  if(studentButton&&body.contains(studentButton)){
   const halaqahId=Number(studentButton.dataset.studentsHalaqah||0);
   const ustadzId=Number(overlay.dataset.ustadzId||0);
   if(Number.isSafeInteger(halaqahId)&&halaqahId>0&&Number.isSafeInteger(ustadzId)&&ustadzId>0){
    close();
    if(isDonorAuthenticated())location.hash="donasi-santri?ustadz="+ustadzId+"&halaqah="+halaqahId;
    else openDonorModal(ustadzId,halaqahId,studentButton);
   }
   return;
  }
  const copy=event.target.closest("[data-copy-account]");
  if(!copy)return;
  const value=copy.dataset.copyAccount||"";
  try{await navigator.clipboard.writeText(value);copy.textContent="Nomor rekening tersalin";}
  catch{copy.textContent="Tidak bisa menyalin. Pilih nomor rekening di atas."}
 });
 async function loadList(){
  box.setAttribute("aria-busy","true");
  try{
   const response=await fetch("/api/public/ustadz",{headers:{"Accept":"application/json"},cache:"no-store"});
   const result=await response.json().catch(()=>({}));
   if(!response.ok||!result.success)throw new Error(result.message||"Data ustadz belum dapat dimuat.");
   if(!box.isConnected)return;
   const data=result.data||{};
   const period=page.querySelector("#donasiPeriode");
   if(period)period.textContent="Donasi terverifikasi "+monthLabel(data.month);
   const items=Array.isArray(data.items)?data.items:[];
   box.innerHTML=items.length?items.map(ustadzCard).join(""):'<div class="donasi-state">Belum ada ustadz aktif yang dapat ditampilkan.</div>';
  }catch(error){
   if(!box.isConnected)return;
   box.innerHTML='<div class="donasi-state">Daftar ustadz belum bisa dimuat. <button type="button" class="btn" id="donasiRetry">Coba lagi</button></div>';
   page.querySelector("#donasiRetry")?.addEventListener("click",loadList,{once:true});
  }finally{if(box.isConnected)box.setAttribute("aria-busy","false")}
 }
 loadList();
}

/** Nama dan progres santri hanya dimuat setelah verifikasi sesi backend. */
export function donationStudentsPage(){
 return '<main class="landing-page donasi-page">'
  +'<header class="landing-header"><a class="landing-brand" href="#home"><span class="landing-logo">م</span><span>Mutqeen</span></a><a class="btn landing-login" href="#login">Masuk</a></header>'
  +'<section class="donasi-main donasi-students-main"><a href="#donasi" class="donasi-back">Kembali ke daftar ustadz</a>'
  +'<div class="donasi-intro"><span class="landing-kicker">Aktivitas halaqah</span><h1 id="donasiStudentsTitle">Daftar Santri</h1><p id="donasiStudentsContext">Memuat informasi halaqah...</p></div>'
  +'<div id="donasiStudentsList" class="donasi-students-list" aria-live="polite" aria-busy="true"><div class="donasi-state">Memuat daftar santri...</div></div>'
  +'<p class="donasi-footnote">Nama dan progres santri hanya tersedia untuk akun Donatur yang sudah login. Persentase menunjukkan kelengkapan isian harian terakhir, bukan total hafalan.</p>'
  +'</section><footer class="landing-footer"><b>Mutqeen</b><span>Dukungan langsung untuk ustadz tahfidz.</span></footer></main>';
}
export async function bindDonationStudents(){
 const params=new URLSearchParams(location.hash.split("?")[1]||"");
 const ustadzId=Number(params.get("ustadz"));
 const halaqahId=Number(params.get("halaqah"));
 const list=document.querySelector("#donasiStudentsList");
 const title=document.querySelector("#donasiStudentsTitle");
 const context=document.querySelector("#donasiStudentsContext");
 if(!list||!title||!context)return;
 if(!Number.isSafeInteger(ustadzId)||ustadzId<1||!Number.isSafeInteger(halaqahId)||halaqahId<1){
  context.textContent="Tautan daftar santri tidak valid.";
  list.innerHTML='<div class="donasi-empty">Halaqah tidak ditemukan.</div>';
  list.setAttribute("aria-busy","false");
  return;
 }
 function promptDonorAccess(openImmediately=false){
  context.textContent="Masuk sebagai Donatur untuk melihat nama dan progres santri.";
  list.innerHTML='<div class="donasi-state">Halaman ini hanya tersedia untuk akun Donatur.<div style="margin-top:16px"><button type="button" class="btn primary" id="donasiStudentsLogin">Masuk atau Daftar Donatur</button></div></div>';
  list.setAttribute("aria-busy","false");
  const button=list.querySelector("#donasiStudentsLogin");
  button?.addEventListener("click",()=>openDonorModal(ustadzId,halaqahId,button));
  if(openImmediately)openDonorModal(ustadzId,halaqahId,button);
 }
 const state=getState();
 if(!isDonorAuthenticated()){promptDonorAccess(true);return;}
 try{
  const response=await fetch("/api/ustadz/santri?ustadz_id="+ustadzId+"&halaqah_id="+halaqahId,{
   headers:{Accept:"application/json",Authorization:"Bearer "+state.authToken},cache:"no-store"
  });
  const result=await response.json().catch(()=>({}));
  if(response.status===401){
   setState({loggedIn:false,demoSession:false,authToken:null,authUser:null});
   if(list.isConnected)promptDonorAccess(true);
   return;
  }
  if(response.status===403){
   const session=getState();
   setState({authUser:{...session.authUser,roles:(session.authUser?.roles||[]).filter(role=>role!=="donatur")}});
   if(list.isConnected)promptDonorAccess(true);
   return;
  }
  if(!response.ok||!result.success)throw new Error(result.message||"Daftar santri belum dapat dimuat.");
  if(!list.isConnected)return;
  const data=result.data||{};
  const students=Array.isArray(data.students)?data.students:[];
  title.textContent="Santri "+(data.halaqah_name||"Halaqah");
  context.textContent=count(students.length)+" santri aktif dibimbing oleh "+(data.ustadz_name||"Ustadz")+".";
  list.innerHTML=students.length?students.map(student=>{
   const pct=student.progress_percent==null?null:Math.max(0,Math.min(100,Number(student.progress_percent)||0));
   const detail=pct===null?"Belum ada catatan progres harian":
    "Minggu "+count(student.progress_week)+" · "+escapeHtml(student.progress_day||"")+" · "+count(pct)+"% isian harian";
   const updated=student.progress_updated_at?"Diperbarui "+escapeHtml(student.progress_updated_at):"";
   return '<article class="donasi-student-card"><span class="donasi-student-avatar" aria-hidden="true">م</span>'
    +'<div class="donasi-student-info"><h2>'+escapeHtml(student.name||"Nama belum tersedia")+'</h2><span>'+detail+'</span>'
    +(pct===null?'':'<div class="donasi-student-progress" role="progressbar" aria-label="Progres harian terakhir '+escapeHtml(student.name)+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><span style="width:'+pct+'%"></span></div>')
    +(updated?'<small>'+updated+'</small>':'')+'</div></article>';
  }).join(""):'<div class="donasi-empty">Belum ada santri aktif dalam halaqah ini.</div>';
 }catch(error){
  if(!list.isConnected)return;
  context.textContent="Daftar santri belum dapat ditampilkan.";
  list.innerHTML='<div class="donasi-empty">'+escapeHtml(error.message||"Gagal memuat daftar santri.")+'</div>';
 }finally{if(list.isConnected)list.setAttribute("aria-busy","false")}
}
