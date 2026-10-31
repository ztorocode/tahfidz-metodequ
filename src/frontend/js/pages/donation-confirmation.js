import {getState} from "../store.js?v=81bed469";
import {isDonorAuthenticated,openDonorModal} from "./donatur-auth.js?v=donproof31";

function jakartaNow(){
 const parts=new Intl.DateTimeFormat("en-GB",{
  timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit",
  hour:"2-digit",minute:"2-digit",hourCycle:"h23"
 }).formatToParts(new Date());
 const get=type=>parts.find(p=>p.type===type)?.value||"00";
 return get("year")+"-"+get("month")+"-"+get("day")+"T"+get("hour")+":"+get("minute");
}
function htmlEscape(value){
 return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

export function openDonationConfirmation(ustadzId,ustadzName,trigger){
 if(!Number.isSafeInteger(ustadzId)||ustadzId<1)return;
 document.querySelector("#donationConfirmOverlay")?.remove();
 const overlay=document.createElement("div");
 overlay.id="donationConfirmOverlay";
 overlay.className="donasi-overlay";
 overlay.style.zIndex="1100";
 overlay.innerHTML=`<section class="donasi-dialog donation-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="donationConfirmTitle">
  <header class="donasi-dialog-head">
   <h2 id="donationConfirmTitle">Konfirmasi Bukti Transfer</h2>
   <button type="button" class="donasi-dialog-close" data-proof-close aria-label="Tutup">×</button>
  </header>
  <div class="donasi-dialog-body">
   <p>Konfirmasi donasi kepada <strong>${htmlEscape(ustadzName)}</strong>. Foto bukti transfer hanya dapat dilihat donatur dan ustadz penerima, bukan pengunjung publik.</p>
   <div class="donation-proof-actions">
    <button type="button" class="btn" data-proof-camera>Ambil Foto</button>
    <button type="button" class="btn" data-proof-upload>Upload Foto</button>
    <input type="file" data-proof-file accept="image/jpeg,image/png,image/webp" hidden>
   </div>
   <div class="donation-proof-camera" data-proof-camera-panel hidden>
    <video data-proof-video autoplay playsinline muted></video>
    <button type="button" class="btn primary" data-proof-shot>Ambil Gambar</button>
   </div>
   <div class="donation-proof-preview" data-proof-preview hidden>
    <img data-proof-image alt="Pratinjau bukti transfer">
    <button type="button" class="btn" data-proof-remove>Ganti Foto</button>
   </div>
   <form id="donationProofForm" class="donation-proof-form">
    <label>Nominal transfer (Rp)
     <input type="number" name="amount_idr" min="1" max="1000000000000" step="1" inputmode="numeric" placeholder="Contoh: 100000" required>
    </label>
    <label>Tanggal dan waktu transfer (WIB)
     <input type="datetime-local" name="sent_at" value="${jakartaNow()}" required>
    </label>
    <p class="donation-proof-status" data-proof-status role="status" aria-live="polite">Pilih Ambil Foto atau Upload Foto untuk melampirkan bukti transfer.</p>
    <button type="submit" class="btn primary donation-proof-submit" data-proof-submit>Kirim Konfirmasi</button>
   </form>
   <p class="donasi-caution">Bukti transfer belum berarti donasi terverifikasi. Ustadz harus mencocokkannya dengan mutasi rekening terlebih dahulu.</p>
  </div>
 </section>`;
 document.body.appendChild(overlay);
 document.body.classList.add("donasi-modal-open");
 let stream=null,photo=null,url=null,busy=false,requestId=0;
 const $=selector=>overlay.querySelector(selector);
 const message=(value,error=false)=>{
  const el=$("[data-proof-status]");
  if(el){el.textContent=value;el.classList.toggle("error",error);}
 };
 const stopCamera=()=>{
  requestId++;
  if(stream){stream.getTracks().forEach(track=>track.stop());stream=null;}
  const video=$("[data-proof-video]");
  if(video)video.srcObject=null;
  const panel=$("[data-proof-camera-panel]");
  if(panel)panel.hidden=true;
 };
 const releasePhoto=()=>{
  photo=null;
  if(url){URL.revokeObjectURL(url);url=null;}
  $("[data-proof-preview]").hidden=true;
  $("[data-proof-image]").removeAttribute("src");
 };
 const close=()=>{
  if(busy)return;
  stopCamera();
  releasePhoto();
  overlay.remove();
  document.removeEventListener("keydown",onKey);
  window.removeEventListener("hashchange",close);
  if(!document.querySelector(".donasi-overlay:not([hidden])"))document.body.classList.remove("donasi-modal-open");
  if(trigger?.isConnected)trigger.focus();
 };
 const onKey=event=>{if(event.key==="Escape"){event.preventDefault();close();}};
 const usePhoto=file=>{
  if(!file||!["image/jpeg","image/png","image/webp"].includes(file.type)){
   message("Foto harus berupa JPG, PNG, atau WebP.",true);return;
  }
  if(file.size<100||file.size>5*1024*1024){
   message("Ukuran foto maksimal 5 MB.",true);return;
  }
  stopCamera();
  releasePhoto();
  photo=file;
  url=URL.createObjectURL(file);
  $("[data-proof-image]").src=url;
  $("[data-proof-preview]").hidden=false;
  message("Foto terlampir. Isi nominal dan waktu transfer, lalu kirim konfirmasi.");
 };
 async function camera(){
  stopCamera();
  if(!navigator.mediaDevices?.getUserMedia){
   message("Kamera tidak didukung browser ini. Gunakan Upload Foto.",true);return;
  }
  message("Mengaktifkan kamera...");
  const id=++requestId;
  try{
   const granted=await navigator.mediaDevices.getUserMedia({
    audio:false,video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080}}
   });
   if(id!==requestId||!overlay.isConnected){granted.getTracks().forEach(t=>t.stop());return;}
   stream=granted;
   const video=$("[data-proof-video]");
   video.srcObject=granted;
   $("[data-proof-camera-panel]").hidden=false;
   await video.play();
   message("Posisikan bukti transfer agar tulisan terlihat, lalu pilih Ambil Gambar.");
  }catch(e){
   stopCamera();
   message(e?.name==="NotAllowedError"?"Izin kamera ditolak. Aktifkan izin kamera atau pilih Upload Foto."
    :"Kamera tidak dapat digunakan. Pilih Upload Foto.",true);
  }
 }
 function shot(){
  const video=$("[data-proof-video]");
  if(!stream||!video.videoWidth||!video.videoHeight){message("Kamera belum siap.",true);return;}
  const canvas=document.createElement("canvas");
  const ratio=Math.min(1,1800/Math.max(video.videoWidth,video.videoHeight));
  canvas.width=Math.max(1,Math.round(video.videoWidth*ratio));
  canvas.height=Math.max(1,Math.round(video.videoHeight*ratio));
  const ctx=canvas.getContext("2d");
  if(!ctx){message("Foto tidak dapat diambil.",true);return;}
  ctx.drawImage(video,0,0,canvas.width,canvas.height);
  canvas.toBlob(blob=>{
   if(!overlay.isConnected)return;
   if(!blob){message("Foto gagal diambil. Coba lagi.",true);return;}
   usePhoto(new File([blob],"bukti-transfer.jpg",{type:"image/jpeg"}));
  },"image/jpeg",0.85);
 }
 async function submit(){
  if(busy)return;
  const form=$("#donationProofForm");
  if(!form.reportValidity())return;
  if(!photo){message("Ambil foto atau upload bukti transfer terlebih dahulu.",true);return;}
  if(!isDonorAuthenticated()){
   message("Masuk sebagai Donatur untuk mengirim bukti transfer.");
   openDonorModal(ustadzId,0,$("[data-proof-submit]"),{
    purpose:"confirmation",
    onAuthenticated:()=>{if(overlay.isConnected)submit();}
   });
   return;
  }
  busy=true;
  const btn=$("[data-proof-submit]");
  btn.disabled=true;btn.textContent="Mengirim...";
  message("Mengirim bukti transfer...");
  try{
   const body=new FormData(form);
   body.append("ustadz_id",String(ustadzId));
   body.append("proof",photo,"bukti-transfer."+({"image/png":"png","image/webp":"webp"}[photo.type]||"jpg"));
   const response=await fetch("/api/donatur/donation/confirm",{
    method:"POST",headers:{Accept:"application/json",Authorization:"Bearer "+getState().authToken},
    body,cache:"no-store"
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok||!result.success)throw new Error(result.message||"Konfirmasi gagal dikirim (HTTP "+response.status+").");
   stopCamera();
   releasePhoto();
   form.remove();
   $(".donation-proof-actions").remove();
   $(".donation-proof-camera")?.remove();
   $(".donation-proof-preview")?.remove();
   const feedback=document.createElement("p");
   feedback.className="donation-proof-success";
   feedback.textContent="Bukti transfer berhasil dikirim. Ustadz menerima notifikasi untuk memeriksa transfer. Nominal akan masuk ke laporan publik setelah diverifikasi.";
   $(".donasi-dialog-body").prepend(feedback);
   const done=document.createElement("button");
   done.type="button";done.className="btn primary donation-proof-submit";done.textContent="Selesai";
   done.addEventListener("click",()=>{busy=false;close();});
   $(".donasi-dialog-body").appendChild(done);
  }catch(err){message(err?.message||"Konfirmasi gagal dikirim.",true);}
  finally{busy=false;if(btn.isConnected){btn.disabled=false;btn.textContent="Kirim Konfirmasi";}}
 }
 $("[data-proof-close]").addEventListener("click",close);
 overlay.addEventListener("click",event=>{if(event.target===overlay)close();});
 $("[data-proof-camera]").addEventListener("click",camera);
 $("[data-proof-upload]").addEventListener("click",()=>{stopCamera();$("[data-proof-file]").click();});
 $("[data-proof-file]").addEventListener("change",event=>usePhoto(event.target.files?.[0]));
 $("[data-proof-shot]").addEventListener("click",shot);
 $("[data-proof-remove]").addEventListener("click",()=>{
  releasePhoto();
  $("[data-proof-file]").value="";
  message("Pilih Ambil Foto atau Upload Foto.");
 });
 $("#donationProofForm").addEventListener("submit",event=>{event.preventDefault();submit();});
 document.addEventListener("keydown",onKey);
 window.addEventListener("hashchange",close);
 $("[data-proof-close]").focus();
}
