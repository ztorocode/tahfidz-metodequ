import {getState} from "../store.js?v=81bed469";


function esc(value){
 return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function isPlatformMusyrif(){
 const s=getState();
 return s.persona==="musyrif"&&s.context==="platform";
}

function accountName(){
 const s=getState();
 return s.authUser?.name||s.profileOverrides?.musyrif?.name||"Ustadz";
}

function activityTime(value){
 if(!value)return "-";
 const date=new Date(String(value).replace(" ","T")+"Z");
 if(isNaN(date.getTime()))return "-";
 const parts=new Intl.DateTimeFormat("id-ID",{
  timeZone:"Asia/Jakarta",day:"numeric",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false
 }).formatToParts(date);
 const get=type=>parts.find(part=>part.type===type)?.value||"";
 return [get("day"),get("month"),get("year")].filter(Boolean).join(" ")+" "+get("hour")+":"+get("minute");
}

function pondokName(){
 const s=getState();
 const list=s.myPondoks||[];
 return list.find(p=>Number(p.id)===Number(s.activePondokId))?.name||s.pondokProfile?.name||"Pondok";
}

function pondokSkeleton(){
 return `<div class="row between" style="margin-bottom:18px;gap:12px;flex-wrap:wrap">
  <div><p class="eyebrow">Ustadz · ${esc(pondokName())}</p><h1>${esc(accountName())}</h1><p class="muted">Ringkasan halaqah yang Anda ampu di pondok ini.</p></div>
  <a class="btn primary" href="#review">Review setoran</a>
 </div>
 <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:16px" id="pondokDashKpis">
  <div class="kpi"><b>…</b><span class="muted">Halaqah aktif</span></div>
  <div class="kpi"><b>…</b><span class="muted">Santri aktif</span></div>
  <div class="kpi"><b>…</b><span class="muted">Setoran pending</span></div>
  <div class="kpi"><b>…</b><span class="muted">Mutqin total</span></div>
 </div>
 <div class="card">
  <div class="row between"><div><h3>Santri Halaqah</h3><small class="muted" id="pondokDashStatus">Memuat data…</small></div><a href="#halaqah" class="muted">Lihat semua</a></div>
  <div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Santri</th><th>Halaqah</th><th>Mutqin</th><th>Pending</th></tr></thead><tbody id="pondokDashStudents"><tr><td colspan="4"><span class="muted">Memuat santri…</span></td></tr></tbody></table></div>
 </div>`;
}

function platformSkeleton(){
 return `<div style="margin-bottom:18px">
  <p class="eyebrow">Ustadz Platform</p><h1>${esc(accountName())}</h1><p class="muted">Ringkasan real halaqah dan santri yang Anda ampu.</p>
 </div>
 <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:16px" id="platformDashKpis">
  <div class="kpi"><b>…</b><span class="muted">Halaqah aktif</span></div>
  <div class="kpi"><b>…</b><span class="muted">Santri aktif</span></div>
  <div class="kpi"><b>…</b><span class="muted">Setoran pending</span></div>
  <div class="kpi"><b>…</b><span class="muted">Mutqin total</span></div>
 </div>
 <div class="card">
  <div><h3>Aktivitas Santri</h3><small class="muted" id="platformDashStatus">Memuat aktivitas…</small></div>
  <div class="platform-activity-wrap" style="margin-top:12px"><table class="platform-activity-table"><thead><tr><th>Aktivitas</th><th>Waktu</th></tr></thead><tbody id="platformDashActivities"><tr><td colspan="2"><span class="muted">Memuat aktivitas…</span></td></tr></tbody></table></div>
 </div>`;
}

export function musyrifDashboard(){
 return (isPlatformMusyrif()?platformSkeleton():pondokSkeleton())+donationSettingsPanel();
}

async function loadPondokDashboard(){
 if(isPlatformMusyrif())return;
 const s=getState();
 const token=s.authToken;
 const pondokId=Number(s.activePondokId||0);
 const userId=Number(s.authUser?.id||0);
 const status=document.querySelector("#pondokDashStatus");
 const tbody=document.querySelector("#pondokDashStudents");
 const kpis=document.querySelector("#pondokDashKpis");
 if(!token||!pondokId||!tbody||!kpis){
  if(status){status.textContent="Konteks pondok belum tersedia.";status.style.color="var(--danger)";}
  return;
 }
 try{
  const response=await fetch("/api/pondoks/halaqahs?pondok_id="+pondokId+"&t="+Date.now(),{headers:{Accept:"application/json",Authorization:"Bearer "+token},cache:"no-store"});
  let body={};try{body=await response.json()}catch{}
  if(!response.ok)throw new Error(body?.message||"Gagal memuat dashboard.");
  const all=Array.isArray(body.data)?body.data:[];
  const halaqahs=all.filter(h=>Number(h.musyrif_user_id||0)===userId);
  const rows=[];
  const seen=new Set();
  let pending=0,mutqin=0;
  halaqahs.forEach(h=>(h.students||[]).forEach(student=>{
   pending+=Number(student.pending)||0;
   mutqin+=Number(student.mutqin)||0;
   seen.add(String(student.id));
   rows.push({
    name:student.name||"Santri",
    halaqah:h.name||"Halaqah",
    mutqin:Number(student.mutqin)||0,
    pending:Number(student.pending)||0
   });
  }));
  kpis.innerHTML=`<div class="kpi"><b>${halaqahs.length}</b><span class="muted">Halaqah aktif</span></div>
   <div class="kpi"><b>${seen.size}</b><span class="muted">Santri aktif</span></div>
   <div class="kpi"><b>${pending}</b><span class="muted">Setoran pending</span></div>
   <div class="kpi"><b>${mutqin}</b><span class="muted">Mutqin total</span></div>`;
  tbody.innerHTML=rows.length?rows.map(row=>`<tr><td><b>${esc(row.name)}</b></td><td>${esc(row.halaqah)}</td><td>${row.mutqin}</td><td>${row.pending}</td></tr>`).join("")
   :'<tr><td colspan="4"><span class="muted">Belum ada santri pada halaqah yang Anda ampu.</span></td></tr>';
  if(status)status.textContent=halaqahs.length?`${halaqahs.length} halaqah · ${seen.size} santri`:"Belum ada halaqah yang diampu.";
 }catch(error){
  if(status){status.textContent=error?.message||"Gagal memuat dashboard.";status.style.color="var(--danger)";}
  tbody.innerHTML='<tr><td colspan="4"><span class="muted">Data dashboard tidak dapat dimuat.</span></td></tr>';
  kpis.innerHTML='<div class="kpi"><b>—</b><span class="muted">Halaqah aktif</span></div><div class="kpi"><b>—</b><span class="muted">Santri aktif</span></div><div class="kpi"><b>—</b><span class="muted">Setoran pending</span></div><div class="kpi"><b>—</b><span class="muted">Mutqin total</span></div>';
 }
}

async function loadPlatformDashboard(){
 if(!isPlatformMusyrif())return;
 const token=getState().authToken;
 const status=document.querySelector("#platformDashStatus");
 const tbody=document.querySelector("#platformDashActivities");
 const kpis=document.querySelector("#platformDashKpis");
 if(!token||!tbody||!kpis)return;
 if(status){status.textContent="Memuat data…";status.style.color="";}
 try{
  const response=await fetch("/api/pondoks/halaqahs?pondok_id=0",{headers:{Accept:"application/json",Authorization:"Bearer "+token}});
  let body={};try{body=await response.json()}catch{}
  if(!response.ok)throw new Error(body?.message||"Gagal memuat dashboard.");
  const halaqahs=Array.isArray(body.data)?body.data:[];
  const seen=new Set();
  const activities=[];
  let pending=0,mutqin=0;
  halaqahs.forEach(h=>{
   (h.students||[]).forEach(s=>{
    pending+=Number(s.pending)||0;
    mutqin+=Number(s.mutqin)||0;
    seen.add(String(s.id));
   });
   (h.activities||[]).forEach(a=>activities.push({...a,halaqahName:h.name||"Halaqah"}));
  });
  activities.sort((a,b)=>{
   const at=v=>new Date(String(v||"").replace(" ","T")+"Z").getTime()||0;
   return at(b.activity_at)-at(a.activity_at);
  });
  const activityLabel={
   hafalan_kemarin:"hafalan kemarin",
   istima:"istima",
   menghafal:"menghafal",
   merekam:"merekam",
   tikrar:"tikrar"
  };
  const activityText=row=>{
   const action=activityLabel[row.activity_key]||row.activity_key||"beraktivitas";
   const count=row.activity_count?(" "+row.activity_count+"x"):"";
   return "Santri "+(row.student_name||"Santri")+" "+action+count;
  };
  kpis.innerHTML=`<div class="kpi"><b>${halaqahs.length}</b><span class="muted">Halaqah aktif</span></div>
   <div class="kpi"><b>${seen.size}</b><span class="muted">Santri aktif</span></div>
   <div class="kpi"><b>${pending}</b><span class="muted">Setoran pending</span></div>
   <div class="kpi"><b>${mutqin}</b><span class="muted">Mutqin total</span></div>`;
  tbody.innerHTML=activities.length?activities.slice(0,20).map(row=>`<tr>
   <td>${esc(activityText(row))}</td>
   <td style="white-space:nowrap">${esc(activityTime(row.activity_at))}</td>
  </tr>`).join(""):'<tr><td colspan="2"><span class="muted">Belum ada aktivitas hafalan dari santri.</span></td></tr>';
  if(status)status.textContent=activities.length?`${Math.min(20,activities.length)} aktivitas terbaru`:"Belum ada aktivitas.";
 }catch(error){
  if(status){status.textContent=error?.message||"Gagal memuat dashboard.";status.style.color="var(--danger)";}
  tbody.innerHTML='<tr><td colspan="2"><span class="muted">Aktivitas dashboard tidak dapat dimuat.</span></td></tr>';
  kpis.innerHTML='<div class="kpi"><b>—</b><span class="muted">Halaqah aktif</span></div><div class="kpi"><b>—</b><span class="muted">Santri aktif</span></div><div class="kpi"><b>—</b><span class="muted">Setoran pending</span></div><div class="kpi"><b>—</b><span class="muted">Mutqin total</span></div>';
 }
}

export function bindMusyrifDashboard(){
 if(isPlatformMusyrif())loadPlatformDashboard();
 else loadPondokDashboard();
 bindDonationSettings();
}


function donationSettingsPanel(){
 return '<section class="card donor-settings">'
  +'<h2>Foto Aktivitas untuk Donatur</h2>'
  +'<p class="muted">Unggah hanya foto aktivitas halaqah yang memang boleh dipublikasikan. Pengaturan rekening donasi sekarang tersedia di Edit Profil.</p>'
  +'<form id="donorPhotoForm" class="stack" enctype="multipart/form-data">'
  +'<div><label class="label" for="donorPhotoInput">Unggah foto JPG, PNG, atau WebP (maks. 2 MB)</label><input class="input" id="donorPhotoInput" type="file" accept="image/jpeg,image/png,image/webp" required></div>'
  +'<div><label class="label" for="donorPhotoCaption">Keterangan foto</label><input class="input" id="donorPhotoCaption" maxlength="180" placeholder="Contoh: Kegiatan murajaah pekanan" required></div>'
  +'<div><label class="label" for="donorPhotoHalaqah">Halaqah</label><select class="input" id="donorPhotoHalaqah"><option value="">Aktivitas umum</option></select></div>'
  +'<label class="donor-check"><input type="checkbox" id="donorPhotoConsent" required> Saya memiliki izin untuk mempublikasikan foto ini, termasuk persetujuan pihak yang tampak di dalamnya bila diperlukan.</label>'
  +'<button type="submit" class="btn primary" id="donorPhotoSave">Unggah Foto</button><p class="donor-feedback" id="donorPhotoMessage" role="status"></p>'
  +'<div id="donorPhotoList"></div>'
  +'</form></section>';
}

function bindDonationSettings(){
 const photoForm=document.querySelector("#donorPhotoForm");
 if(!photoForm)return;
 const token=getState().authToken;
 const headers={Authorization:"Bearer "+token,Accept:"application/json"};
 const photoStatus=document.querySelector("#donorPhotoMessage");
 const status=(node,message,error=false)=>{
  if(!node)return;
  node.textContent=message;
  node.style.color=error?"var(--danger)":"var(--brand)";
 };
 if(!token){
  status(photoStatus,"Masuk dengan akun ustadz yang terverifikasi untuk mengatur foto publik.",true);
  return;
 }
 async function load(){
  try{
   const response=await fetch("/api/ustadz/donation-profile",{headers,cache:"no-store"});
   const result=await response.json().catch(()=>({}));
   if(!response.ok||!result.success)throw new Error(result.message||"Gagal memuat informasi donasi.");
   if(!photoForm.isConnected)return;
   const data=result.data||{};
   document.querySelector("#donorPhotoHalaqah").innerHTML='<option value="">Aktivitas umum</option>'
     +(Array.isArray(data.halaqahs)?data.halaqahs:[]).map(h=>'<option value="'+Number(h.id)+'">'+esc(h.name)+'</option>').join("");
   const list=document.querySelector("#donorPhotoList");
   const photos=Array.isArray(data.photos)?data.photos:[];
   if(list)list.innerHTML=photos.length?'<h4>Foto yang sudah dipublikasikan</h4>'
    +photos.map(p=>'<div class="donor-photo-row"><span>'+esc(p.caption)+'</span><button type="button" class="btn" data-remove-donor-photo="'+Number(p.id)+'">Hapus</button></div>').join("")
    :'<small class="muted">Belum ada foto yang dipublikasikan.</small>';
  }catch(err){
   status(photoStatus,err.message||"Gagal memuat informasi donasi.",true);
  }
 }
 photoForm.addEventListener("submit",async event=>{
  event.preventDefault();
  const file=document.querySelector("#donorPhotoInput").files?.[0];
  const button=document.querySelector("#donorPhotoSave");
  if(!file||file.size>2*1024*1024){status(photoStatus,"Pilih foto berukuran maksimal 2 MB.",true);return}
  const form=new FormData();
  form.append("photo",file);
  form.append("caption",document.querySelector("#donorPhotoCaption").value.trim());
  form.append("halaqah_id",document.querySelector("#donorPhotoHalaqah").value);
  form.append("consent",document.querySelector("#donorPhotoConsent").checked?"yes":"no");
  button.disabled=true;
  try{
   const response=await fetch("/api/ustadz/donation-profile/photo",{method:"POST",headers,body:form});
   const result=await response.json().catch(()=>({}));
   if(!response.ok||!result.success)throw new Error(result.message||"Gagal mengunggah foto.");
   photoForm.reset();
   status(photoStatus,"Foto berhasil dipublikasikan.");
   await load();
  }catch(err){status(photoStatus,err.message||"Gagal mengunggah foto.",true)}
  finally{button.disabled=false}
 });
 document.querySelector("#donorPhotoList")?.addEventListener("click",async event=>{
  const btn=event.target.closest("[data-remove-donor-photo]");
  if(!btn||!confirm("Hapus foto ini dari halaman publik?"))return;
  btn.disabled=true;
  try{
   const response=await fetch("/api/ustadz/donation-profile/photo/delete",{
    method:"POST",headers:{...headers,"Content-Type":"application/json"},
    body:JSON.stringify({id:Number(btn.dataset.removeDonorPhoto)})
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok||!result.success)throw new Error(result.message||"Gagal menghapus foto.");
   status(photoStatus,"Foto telah dihapus.");
   await load();
  }catch(err){status(photoStatus,err.message||"Gagal menghapus foto.",true);btn.disabled=false}
 });
 load();
}
