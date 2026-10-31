import {getState} from "../store.js?v=81bed469";

// Camera-only activity documentation. No file picker is presented.
let stream=null;
let photoBlob=null;
let photoUrl=null;
let cameraRequest=0;
let saving=false;

const $=selector=>document.querySelector(selector);
const panel=()=>$("#halaqahActivityPanel");
const modal=()=>$("#halaqahCameraModal");
const headers=()=>({Accept:"application/json",Authorization:"Bearer "+(getState().authToken||"")});

function status(message,error=false){
 const el=$("#halaqahPhotoStatus");
 if(el){el.textContent=message;el.style.color=error?"var(--danger)":"var(--brand)";}
}

function stopStream(){
 if(stream){stream.getTracks().forEach(track=>track.stop());stream=null;}
 const video=$("#halaqahCameraVideo");
 if(video)video.srcObject=null;
}
function clearPhoto(){
 photoBlob=null;
 if(photoUrl){URL.revokeObjectURL(photoUrl);photoUrl=null;}
 const preview=$("#halaqahCameraPreview");
 if(preview){preview.removeAttribute("src");preview.hidden=true;}
}
function closeCamera(){
 cameraRequest++;
 stopStream();
 clearPhoto();
 const el=modal();
 if(el)el.classList.add("hidden");
 const video=$("#halaqahCameraVideo");
 if(video)video.hidden=false;
 const actions=$("#halaqahCameraPreviewActions");
 if(actions)actions.hidden=true;
 const shot=$("#halaqahCameraShot");
 if(shot)shot.hidden=false;
 const msg=$("#halaqahCameraStatus");
 if(msg)msg.textContent="";
}
function showCameraMessage(message){
 const msg=$("#halaqahCameraStatus");
 if(msg)msg.textContent=message;
}

async function openCamera(){
 const el=modal();
 if(!el)return;
 closeCamera();
 el.classList.remove("hidden");
 const request=++cameraRequest;
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
  showCameraMessage("Kamera tidak didukung. Gunakan browser dengan HTTPS dan izin kamera.");
  const shot=$("#halaqahCameraShot");if(shot)shot.disabled=true;
  return;
 }
 const shot=$("#halaqahCameraShot");
 if(shot){shot.hidden=false;shot.disabled=true;}
 showCameraMessage("Mengaktifkan kamera…");
 try{
  const granted=await navigator.mediaDevices.getUserMedia({
   audio:false,
   video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080}}
  });
  if(request!==cameraRequest||!el.isConnected||el.classList.contains("hidden")){
   granted.getTracks().forEach(track=>track.stop());
   return;
  }
  stream=granted;
  const video=$("#halaqahCameraVideo");
  if(!video){stopStream();return;}
  video.hidden=false;
  video.srcObject=granted;
  await video.play();
  if(request!==cameraRequest){stopStream();return;}
  showCameraMessage("");
  if(shot)shot.disabled=false;
 }catch(err){
  stopStream();
  showCameraMessage(err?.name==="NotAllowedError"
   ?"Izin kamera ditolak. Aktifkan izin kamera pada pengaturan browser."
   :err?.name==="NotFoundError"
    ?"Tidak ditemukan kamera pada perangkat ini."
    :"Kamera tidak dapat digunakan. Tutup aplikasi lain yang memakai kamera lalu coba lagi.");
 }
}

function jpegBlob(canvas,quality){
 return new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
}
async function takePhoto(){
 const video=$("#halaqahCameraVideo");
 const shot=$("#halaqahCameraShot");
 if(!video||!stream||!video.videoWidth||!video.videoHeight)return;
 if(shot)shot.disabled=true;
 try{
  const ratio=Math.min(1,1400/Math.max(video.videoWidth,video.videoHeight));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(video.videoWidth*ratio));
  canvas.height=Math.max(1,Math.round(video.videoHeight*ratio));
  const ctx=canvas.getContext("2d");
  if(!ctx)throw new Error("Tidak dapat mengambil gambar dari kamera.");
  ctx.drawImage(video,0,0,canvas.width,canvas.height);
  let blob=null;
  for(const quality of [0.85,0.72,0.6,0.45]){
   blob=await jpegBlob(canvas,quality);
   if(blob&&blob.size<=2*1024*1024)break;
  }
  if(!blob||blob.size>2*1024*1024)throw new Error("Foto masih lebih dari 2 MB. Coba ambil foto lagi.");
  clearPhoto();
  photoBlob=blob;
  photoUrl=URL.createObjectURL(blob);
  const preview=$("#halaqahCameraPreview");
  if(preview){preview.src=photoUrl;preview.hidden=false;}
  video.hidden=true;
  stopStream();
  if(shot)shot.hidden=true;
  const actions=$("#halaqahCameraPreviewActions");
  if(actions)actions.hidden=false;
  showCameraMessage("");
 }catch(err){
  showCameraMessage(err.message||"Gagal mengambil foto.");
  if(shot)shot.disabled=false;
 }
}

async function loadPhotos(halaqahId){
 const current=panel();
 if(!current||Number(current.dataset.halaqahId)!==Number(halaqahId))return;
 const list=$("#halaqahActivityList");
 if(!list)return;
 list.textContent="Memuat foto aktivitas…";
 try{
  const response=await fetch("/api/ustadz/donation-profile",{headers:headers(),cache:"no-store"});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.success)throw new Error(result.message||"Gagal memuat foto.");
  if(!current.isConnected||panel()!==current)return;
  const photos=(Array.isArray(result.data?.photos)?result.data.photos:[])
   .filter(photo=>Number(photo.halaqah_id)===Number(halaqahId));
  list.replaceChildren();
  if(!photos.length){list.textContent="Belum ada foto aktivitas pada halaqah ini.";return;}
  const grid=document.createElement("div");
  grid.className="halaqah-photo-grid";
  for(const photo of photos){
   const card=document.createElement("div");
   card.className="halaqah-photo-card";
   const img=document.createElement("img");
   img.src=photo.url||"/api/public/ustadz/photo?id="+Number(photo.id);
   img.alt="Aktivitas "+String(photo.caption||"halaqah");
   img.loading="lazy";
   card.appendChild(img);
   const footer=document.createElement("div");
   footer.className="halaqah-photo-footer";
   const date=document.createElement("small");
   date.textContent=String(photo.created_at||"").slice(0,16).replace("T"," ");
   const remove=document.createElement("button");
   remove.type="button";
   remove.className="btn danger";
   remove.dataset.halaqahPhotoDelete=String(photo.id);
   remove.textContent="Hapus";
   footer.append(date,remove);
   card.appendChild(footer);
   grid.appendChild(card);
  }
  list.appendChild(grid);
 }catch(err){
  if(current.isConnected&&panel()===current)list.textContent=err.message||"Gagal memuat foto aktivitas.";
 }
}

async function savePhoto(){
 if(saving||!photoBlob)return;
 const current=panel();
 const hid=Number(current?.dataset.halaqahId);
 if(!Number.isSafeInteger(hid)||hid<=0)return;
 const button=$("#halaqahCameraSave");
 const file=photoBlob;
 saving=true;
 if(button){button.disabled=true;button.textContent="Menyimpan…";}
 showCameraMessage("Menyimpan foto…");
 try{
  const form=new FormData();
  form.append("photo",file,"aktivitas-halaqah.jpg");
  form.append("halaqah_id",String(hid));
  // The preview explains that Simpan confirms permission to publish this picture.
  form.append("consent","yes");
  const response=await fetch("/api/ustadz/donation-profile/photo",{
   method:"POST",headers:headers(),body:form
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.success)throw new Error(result.message||"Foto gagal disimpan.");
  closeCamera();
  status("Foto aktivitas berhasil disimpan.");
  await loadPhotos(hid);
 }catch(err){showCameraMessage(err.message||"Foto gagal disimpan.");}
 finally{saving=false;if(button){button.disabled=false;button.textContent="Simpan";}}
}

document.addEventListener("click",event=>{
 const open=event.target.closest("[data-halaqah-camera-open]");
 if(open){
  if(Number(open.dataset.halaqahCameraOpen)!==Number(panel()?.dataset.halaqahId))return;
  openCamera();return;
 }
 if(event.target.closest("[data-halaqah-camera-close]")){if(!saving)closeCamera();return;}
 if(event.target.closest("[data-halaqah-camera-shot]")){takePhoto();return;}
 if(event.target.closest("[data-halaqah-camera-retake]")){openCamera();return;}
 if(event.target.closest("[data-halaqah-camera-save]")){savePhoto();return;}
 const remove=event.target.closest("[data-halaqah-photo-delete]");
 if(!remove||!panel()||!confirm("Hapus foto aktivitas ini?"))return;
 const hid=Number(panel().dataset.halaqahId);
 remove.disabled=true;
 fetch("/api/ustadz/donation-profile/photo/delete",{
  method:"POST",headers:{...headers(),"Content-Type":"application/json"},
  body:JSON.stringify({id:Number(remove.dataset.halaqahPhotoDelete)})
 }).then(async response=>{
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.success)throw new Error(result.message||"Foto gagal dihapus.");
  status("Foto aktivitas dihapus.");
  await loadPhotos(hid);
 }).catch(err=>{status(err.message||"Foto gagal dihapus.",true);remove.disabled=false;});
});
document.addEventListener("keydown",event=>{
 if(event.key==="Escape"&&!modal()?.classList.contains("hidden")&&!saving)closeCamera();
});
window.addEventListener("hashchange",()=>{if(!saving)closeCamera();});
window.addEventListener("app:render",()=>{if(!saving)closeCamera();});

export function bindHalaqahCamera(halaqahId){
 const current=panel();
 if(!current||Number(current.dataset.halaqahId)!==Number(halaqahId)||current.dataset.photoLoaded)return;
 current.dataset.photoLoaded="1";
 loadPhotos(halaqahId);
}
