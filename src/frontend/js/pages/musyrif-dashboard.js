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
 return isPlatformMusyrif()?platformSkeleton():pondokSkeleton();
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
}
