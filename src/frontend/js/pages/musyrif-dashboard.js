import {getState,setState} from "../store.js?v=81bed469";
import {students as demoStudents} from "../data/dummy-data.js?v=81bed469";
import {badge,statusTone} from "../utils/helpers.js?v=81bed469";

function esc(value){
 return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function isPlatformMusyrif(){
 const s=getState();
 return s.persona==="musyrif"&&(s.musyrifType==="platform"||(s.context==="personal"&&(s.myPondoks||[]).length===0));
}

function accountName(){
 const s=getState();
 return s.authUser?.name||s.profileOverrides?.musyrif?.name||"Musyrif";
}

function demoDashboard(){
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Musyrif · Halaqah 1</p><h1>Ust. Rahmat Hidayat</h1><p class="muted">Prioritaskan setoran yang perlu keputusan hari ini.</p></div><a class="btn primary" href="#review">Review setoran</a></div>
<div class="grid-4" style="margin-bottom:16px"><div class="kpi"><b>12</b><span class="muted">Santri aktif</span></div><div class="kpi"><b>4</b><span class="muted">Setoran pending</span></div><div class="kpi"><b>38</b><span class="muted">Mutqin pekan ini</span></div><div class="kpi"><b>6</b><span class="muted">Perlu penguatan</span></div></div>
<div class="card"><div class="row between"><h3>Santri Halaqah</h3><a href="#halaqah" class="muted">Lihat semua</a></div><div class="table-wrap"><table class="table"><thead><tr><th>Santri</th><th>Mutqin</th><th>Pending</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${demoStudents.map(s=>`<tr><td><b>${esc(s.name)}</b></td><td>${Number(s.mutqin)||0} halaman</td><td>${Number(s.pending)||0}</td><td>${badge(s.status,statusTone(s.status))}</td><td><button class="btn" type="button" data-musyrif-table-progress="${esc(s.name)}">Tabel Progress</button></td></tr>`).join("")}</tbody></table></div></div>`;
}

function platformSkeleton(){
 return `<div class="row between" style="margin-bottom:18px;gap:12px;flex-wrap:wrap">
  <div><p class="eyebrow">Musyrif Platform</p><h1>${esc(accountName())}</h1><p class="muted">Ringkasan real halaqah dan santri yang Anda ampu.</p></div>
  <div class="row" style="gap:8px"><button class="btn" type="button" data-platform-dash-refresh>Muat ulang</button><a class="btn primary" href="#review">Review setoran</a></div>
 </div>
 <div class="grid-4" style="margin-bottom:16px" id="platformDashKpis">
  <div class="kpi"><b>…</b><span class="muted">Halaqah aktif</span></div>
  <div class="kpi"><b>…</b><span class="muted">Santri aktif</span></div>
  <div class="kpi"><b>…</b><span class="muted">Setoran pending</span></div>
  <div class="kpi"><b>…</b><span class="muted">Mutqin total</span></div>
 </div>
 <div class="card">
  <div class="row between" style="gap:12px"><div><h3>Santri Halaqah</h3><small class="muted" id="platformDashStatus">Memuat data…</small></div><a href="#halaqah" class="muted">Kelola halaqah</a></div>
  <div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Santri</th><th>Halaqah</th><th>Mutqin</th><th>Pending</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="platformDashStudents"><tr><td colspan="6"><span class="muted">Memuat santri…</span></td></tr></tbody></table></div>
 </div>`;
}

export function musyrifDashboard(){
 return isPlatformMusyrif()?platformSkeleton():demoDashboard();
}

async function loadPlatformDashboard(){
 if(!isPlatformMusyrif())return;
 const token=getState().authToken;
 const status=document.querySelector("#platformDashStatus");
 const tbody=document.querySelector("#platformDashStudents");
 const kpis=document.querySelector("#platformDashKpis");
 if(!token||!tbody||!kpis)return;
 if(status){status.textContent="Memuat data…";status.style.color="";}
 try{
  const response=await fetch("/api/pondoks/halaqahs?pondok_id=0",{headers:{Accept:"application/json",Authorization:"Bearer "+token}});
  let body={};try{body=await response.json()}catch{}
  if(!response.ok)throw new Error(body?.message||"Gagal memuat dashboard.");
  const halaqahs=Array.isArray(body.data)?body.data:[];
  const rows=[];
  const seen=new Set();
  let pending=0,mutqin=0;
  halaqahs.forEach(h=>{
   (h.students||[]).forEach(s=>{
    pending+=Number(s.pending)||0;
    mutqin+=Number(s.mutqin)||0;
    const key=String(s.id);
    if(!seen.has(key)){seen.add(key);}
    rows.push({
     id:s.id,
     name:s.name||"Santri",
     halaqahId:h.id,
     halaqahName:h.name||"Halaqah",
     mutqin:Number(s.mutqin)||0,
     pending:Number(s.pending)||0,
     status:s.status||"Aktif",
     progressDay:s.progress_day??null,
     progressPercent:s.progress_percent??null
    });
   });
  });
  kpis.innerHTML=`<div class="kpi"><b>${halaqahs.length}</b><span class="muted">Halaqah aktif</span></div>
   <div class="kpi"><b>${seen.size}</b><span class="muted">Santri aktif</span></div>
   <div class="kpi"><b>${pending}</b><span class="muted">Setoran pending</span></div>
   <div class="kpi"><b>${mutqin}</b><span class="muted">Mutqin total</span></div>`;
  tbody.innerHTML=rows.length?rows.map(row=>`<tr>
   <td><b>${esc(row.name)}</b></td>
   <td>${esc(row.halaqahName)}</td>
   <td>${row.mutqin}</td>
   <td>${row.pending}</td>
   <td>${badge(row.status,statusTone(row.status))}</td>
   <td><button class="btn" type="button" data-platform-dash-halaqah="${row.halaqahId}">Lihat Halaqah</button></td>
  </tr>`).join(""):'<tr><td colspan="6"><span class="muted">Belum ada santri pada halaqah Anda.</span></td></tr>';
  if(status)status.textContent=halaqahs.length?`${halaqahs.length} halaqah · ${seen.size} santri`:"Belum ada halaqah.";
 }catch(error){
  if(status){status.textContent=error?.message||"Gagal memuat dashboard.";status.style.color="var(--danger)";}
  tbody.innerHTML='<tr><td colspan="6"><span class="muted">Data dashboard tidak dapat dimuat.</span></td></tr>';
  kpis.innerHTML='<div class="kpi"><b>—</b><span class="muted">Halaqah aktif</span></div><div class="kpi"><b>—</b><span class="muted">Santri aktif</span></div><div class="kpi"><b>—</b><span class="muted">Setoran pending</span></div><div class="kpi"><b>—</b><span class="muted">Mutqin total</span></div>';
 }
}

export function bindMusyrifDashboard(){
 if(!isPlatformMusyrif())return;
 loadPlatformDashboard();
 document.querySelector("[data-platform-dash-refresh]")?.addEventListener("click",loadPlatformDashboard);
 document.querySelector("#platformDashStudents")?.addEventListener("click",event=>{
  const button=event.target.closest("[data-platform-dash-halaqah]");
  if(!button)return;
  const id=Number(button.dataset.platformDashHalaqah||0);
  if(id>0)setState({dashboardHalaqahFocusId:id});
  location.hash="halaqah";
 });
}

document.addEventListener("click",event=>{
 if(isPlatformMusyrif())return;
 const button=event.target.closest("[data-musyrif-table-progress]");
 if(!button)return;
 const student=demoStudents.find(item=>item.name===button.dataset.musyrifTableProgress);
 if(!student)return;
 const state=getState();
 setState({selectedStudentProgress:{
  student:{...student},
  halaqahId:"halaqah-1",
  halaqahName:student.halaqah||"Halaqah 1",
  musyrifName:state.profileOverrides?.musyrif?.name||"Ust. Rahmat Hidayat"
 }});
 location.hash="tabel-progress";
});
