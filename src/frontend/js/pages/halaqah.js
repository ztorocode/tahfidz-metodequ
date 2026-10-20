import {getState,setState} from "../store.js?v=d6f20b38";
import {badge,statusTone,toast} from "../utils/helpers.js?v=d6f20b38";

let selectedHalaqahId=null;

const demoMusyrifOptions=[];

function activePondokId(){
 const st=getState();
 return st.activePondokId??st.authUser?.pondoks?.[0]?.id??st.myPondoks?.[0]?.id??null;
}

function musyrifOptions(){
 const real=getState().realMusyrifs;
 if(Array.isArray(real)&&real.length)return real.map(m=>({id:"user-"+m.id,name:m.name}));
 return demoMusyrifOptions;
}

async function halaqApi(path,options={}){
 const token=getState().authToken;
 const r=await fetch(path,{...options,headers:{Accept:"application/json",...(token?{Authorization:"Bearer "+token}:{}),...(options.body?{"Content-Type":"application/json"}:{})}});
 let b={};try{b=await r.json()}catch{}
 if(!r.ok)throw new Error(b?.message||"Server tidak merespons.");
 return b;
}

function refreshSantris(force,silent){
 const st=getState();
 const pid=activePondokId();
 const token=st.authToken;
 if(!pid||!token||(!force&&st.santriSrc===pid))return Promise.resolve();
 setState({santriSrc:pid});
 return fetch("/api/pondoks/santris?pondok_id="+pid,{headers:{Accept:"application/json",Authorization:"Bearer "+token}})
  .then(r=>r.json().then(b=>({ok:r.ok,b})))
  .then(({ok,b})=>{
   if(ok&&Array.isArray(b.data)){setState({realSantris:b.data});if(!silent)window.dispatchEvent(new Event("app:render"));}
  })
  .catch(()=>{});
}

function realSantriList(){
 const real=getState().realSantris;
 return Array.isArray(real)?real:[];
}

function refreshMusyrifs(force,silent){
 const st=getState();
 const pid=activePondokId();
 const token=st.authToken;
 if(!pid||!token||(!force&&st.musyrifSrc===pid))return Promise.resolve();
 setState({musyrifSrc:pid});
 return fetch("/api/pondoks/musyrifs?pondok_id="+pid,{headers:{Accept:"application/json",Authorization:"Bearer "+token}})
  .then(r=>r.json().then(b=>({ok:r.ok,b})))
  .then(({ok,b})=>{
   if(ok&&Array.isArray(b.data)){setState({realMusyrifs:b.data});if(!silent)window.dispatchEvent(new Event("app:render"));}
  })
  .catch(()=>{});
}

/* ====================== Halaqah (server) ====================== */

function mapServer(h){
 return {
  id:"srv-"+h.id,
  numericId:Number(h.id),
  name:h.name,
  startDate:h.program_start_date||null,
  musyrifId:h.musyrif_user_id?("user-"+h.musyrif_user_id):null,
  musyrifName:h.musyrif_name||null,
  students:(h.students||[]).map(s=>({
   name:s.name,
   santriUserId:String(s.id),
   mutqin:Number(s.mutqin)||0,
   pending:Number(s.pending)||0,
   status:s.status||"Aktif"
  }))
 };
}

const DAY_MS=86400000;
const WEEKDAY=["Minggu","Senin","Selasa","Rabu","Kamis","Jum'at","Sabtu"];

function fmtDate(d){
 return d?d.toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}):"";
}

function todayInfo(startDate){
 if(!startDate)return null;
 const start=new Date(startDate+"T00:00:00");
 const now=new Date();
 const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 if(isNaN(start.getTime())||today.getTime()<start.getTime())return null;
 let n=1;
 const cur=new Date(start.getTime());
 while(cur.getTime()<today.getTime()){
  cur.setTime(cur.getTime()+DAY_MS);
  if(cur.getDay()!==5)n++;
 }
 return {dayNumber:n,weekday:WEEKDAY[today.getDay()],date:fmtDate(today)};
}

/** Daftar di localStorage basi bila sudah lebih lama dari TTL ini. */
const HALAQAH_TTL=20000;
let halaqahFetching=0; // jumlah request aktif

function refreshHalaqahs(force,silent){
 const st=getState();
 const pid=activePondokId();
 if(!pid||!st.authToken)return Promise.resolve();
 const fresh=st.halaqahSrc===String(pid)
  &&Array.isArray(st.realHalaqahs)
  &&(Number(st.halaqahFetchedAt)||0)>(Date.now()-HALAQAH_TTL);
 if(!force&&fresh)return Promise.resolve();
 if(!force&&halaqahFetching)return Promise.resolve();
 halaqahFetching++;
 setState({halaqahSrc:String(pid)});
 return halaqApi("/api/pondoks/halaqahs?pondok_id="+pid+"&t="+Date.now())
  .then(b=>{
   const mapped=Array.isArray(b.data)?b.data.map(mapServer):[];
   const changed=JSON.stringify(mapped)!==JSON.stringify(getState().realHalaqahs);
   setState({realHalaqahs:mapped,halaqahFetchedAt:Date.now()});
   if(!silent&&changed)window.dispatchEvent(new Event("app:render"));
   return importLocalOnce(pid,mapped);
  })
  .catch(err=>{console.warn("halaqah:",err?.message);})
  .finally(()=>{halaqahFetching=Math.max(0,halaqahFetching-1);});
}

// Halaman lain (mis. Progress) menyimpan tanggal mulai → tarik ulang daftar halaqah.
window.addEventListener("app:halaqah-changed",()=>{refreshHalaqahs(true,true);});

/** Satu kali: bila server masih kosong, pindahkan halaqah lama (tersimpan lokal di HP) ke server. */
async function importLocalOnce(pid,serverList){
 const st=getState();
 if(st.halaqahImported===String(pid)||serverList.length)return;
 setState({halaqahImported:String(pid)});
 const local=localList();
 if(!local.length)return;
 for(const item of local){
  try{
   const created=await halaqApi("/api/pondoks/halaqahs",{method:"POST",body:JSON.stringify({
    pondok_id:Number(pid),
    name:item.name,
    musyrif_user_id:parseUserId(item.musyrifId)
   })});
   const hid=Number(created?.data?.id||0);
   const ids=(item.students||[]).map(s=>realSantriList().find(u=>u.name===s.name)?.id).filter(Boolean).map(Number);
   if(hid&&ids.length){
    await halaqApi("/api/pondoks/halaqahs/members",{method:"POST",body:JSON.stringify({pondok_id:Number(pid),halaqah_id:hid,user_ids:ids})});
   }
  }catch(err){console.warn("impor halaqah lokal:",err?.message);}
 }
 await refreshHalaqahs(true,true);
 window.dispatchEvent(new Event("app:render"));
}

function parseUserId(id){
 const match=/^user-(\d+)$/.exec(String(id||""));
 return match?Number(match[1]):null;
}

const dummyHalaqahIds=new Set(["halaqah-abu-bakar","halaqah-umar","halaqah-utsman"]);

/** Halaqah lama yang tersimpan lokal di browser (sebelum pindah ke server). */
function localList(){
 const saved=getState().halaqahs;
 const list=Array.isArray(saved)?saved:[];
 return list.filter(item=>item&&!dummyHalaqahIds.has(item.id));
}

function halaqahs(){
 const st=getState();
 const pid=activePondokId();
 if(st.halaqahSrc===String(pid)&&Array.isArray(st.realHalaqahs))return st.realHalaqahs;
 return localList();
}

function escapeHtml(value=""){
 return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function musyrifName(id){
 if(!id)return "Belum ditentukan";
 return musyrifOptions().find(item=>item.id===id)?.name||"Belum ditentukan";
}

function pondokName(){
 const st=getState();
 const mine=st.myPondoks||[];
 const active=mine.find(x=>x.id===(st.activePondokId??mine[0]?.id))||mine[0];
 return active?.name||st.pondokProfile?.name||"Pondok";
}

/** Maksimal 4 kotak per baris; bila jumlahnya lebih sedikit, kotak melebar
 *  supaya lebarnya simetris dan tidak menyisakan kolom kosong. */
function halaqahCols(items){
 return Math.min(4,Math.max(1,(items||[]).length));
}

function adminList(items){
 return `<div style="margin-bottom:18px">
  <p class="eyebrow">Pondok / Halaqah</p>
  <div class="row between" style="gap:12px"><h1 style="margin:0">Halaqah</h1><button class="btn primary" type="button" data-halaqah-add>+Halaqah</button></div>
  <p class="muted">Kelola halaqah, tentukan musyrif, dan lihat santri di setiap halaqah.</p></div>
 <div class="halaqah-grid" style="--cols:${halaqahCols(items)}">
  ${items.length?items.map(item=>`<div class="card">
   <div class="row" style="gap:12px">
    <div class="grow" style="min-width:0">
     <div class="row between" style="gap:8px"><b>${escapeHtml(item.name)}</b>${badge("Aktif","success")}</div>
     <div class="row between" style="gap:8px;margin-top:4px"><small class="muted">Musyrif ${escapeHtml(item.musyrifName||musyrifName(item.musyrifId))}</small><small class="muted"><b style="color:var(--text)">${item.students.length}</b> santri</small></div>
    </div>
    <button class="btn" type="button" data-halaqah-view="${item.id}" aria-label="Lihat detail" style="font-size:22px;padding:6px 14px">›</button>
   </div>
  </div>`).join(""):`<div class="card"><p class="muted">Belum ada halaqah. Tekan <b>+Halaqah</b> untuk membuat yang pertama.</p></div>`}
 </div>
 <div class="modal-backdrop hidden" id="halaqahModal">
  <div class="modal-card">
   <div><p class="eyebrow">Pondok</p><h2>Tambah Halaqah</h2></div>
   <form class="stack" id="halaqahForm" style="margin-top:16px">
    <div><label class="label">Nama Halaqah</label><input class="input" id="halaqahName" placeholder="Contoh: Halaqah Ali" required></div>
    <div><label class="label">Musyrif</label><select class="input" id="halaqahMusyrif">
     ${musyrifOptions().length?musyrifOptions().map(item=>`<option value="${item.id}">${escapeHtml(item.name)}</option>`).join(""):'<option value="">— belum ada musyrif, bisa dipilih nanti —</option>'}
    </select></div>
    <small class="muted">Satu halaqah memiliki satu musyrif. Santri dapat ditambahkan setelah halaqah dibuat.</small>
    <small class="muted" id="halaqahFormMessage"></small>
    <div class="btn-joined">
     <button class="btn" type="button" data-halaqah-close>Tutup</button>
     <button class="btn primary" type="submit">Simpan Halaqah</button>
    </div>
   </form>
  </div>
 </div>`;
}

function musyrifList(items){
 return `<div style="margin-bottom:18px">
  <p class="eyebrow">Pondok / Halaqah</p>
  <h1>Halaqah Saya</h1>
  <p class="muted">Halaqah yang menjadi tanggung jawab Anda di ${escapeHtml(pondokName())}.</p>
 </div>
 <div class="halaqah-grid" style="--cols:${halaqahCols(items)}">
  ${items.length?items.map(item=>`<div class="card stack">
   <div class="row between"><div><h3>${escapeHtml(item.name)}</h3><small class="muted">${item.students.length} santri</small></div>${badge("Musyrif","success")}</div>
   <button class="btn full" type="button" data-halaqah-view="${item.id}">Lihat Santri</button>
  </div>`).join(""):`<div class="card"><h3>Belum ada halaqah</h3><p class="muted">Admin Pondok belum menugaskan halaqah ke akun Musyrif ini.</p></div>`}
 </div>`;
}

function programCard(item,isAdmin){
 const info=todayInfo(item.startDate);
 return `<div class="card" style="margin-bottom:16px">
  <h3>Program Tahfidz</h3>
  <p class="muted" style="margin:4px 0 10px">Tentukan kapan <b>Hari ke-1</b> program halaqah ini. Jum'at otomatis libur dan tidak dihitung.</p>
  <div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end">
   <div style="flex:1;min-width:170px"><label class="label">Tanggal Mulai Program</label>
    <input class="input" type="date" id="halaqahStartInput" value="${item.startDate||""}"></div>
   <button class="btn primary" type="button" data-start-save="${item.id}" ${isAdmin?"":" "}>Simpan</button>
   ${item.startDate?'<button class="btn danger" type="button" data-start-clear="'+item.id+'">Hapus</button>':""}
  </div>
  ${info
   ?`<p class="muted" style="margin:10px 0 0">Hari ini <b>${info.weekday}, ${info.date}</b> → <b style="color:var(--text)">Hari ke-${info.dayNumber}</b></p>`
   :`<p class="muted" style="margin:10px 0 0">${item.startDate?"Tanggal mulai masih di masa depan.":"Belum diatur → diasumsikan Pekan 1 dimulai Sabtu."}</p>`}
  <p class="muted" id="startFormMessage" style="margin:6px 0 0"></p>
 </div>`;
}

function detail(item,isAdmin){
 return `<div class="row between" style="margin-bottom:18px;gap:12px;flex-wrap:wrap">
  <div>
   <button class="btn" type="button" data-halaqah-back style="margin-bottom:12px">← Kembali ke daftar</button>
   <p class="eyebrow">Pondok / Halaqah</p>
   <h1>${escapeHtml(item.name)}</h1>
   <p class="muted">Musyrif: ${escapeHtml(item.musyrifName||musyrifName(item.musyrifId))} · ${item.students.length} santri</p>
  </div>
  ${isAdmin?`<button class="btn primary" type="button" data-halaqah-santri="${item.id}">+Santri</button>
  <div class="modal-backdrop hidden" id="santriModal">
   <div class="modal-card">
    <div><p class="eyebrow">Halaqah</p><h2>+Santri ke ${escapeHtml(item.name)}</h2></div>
    <div class="stack" id="santriCheckList" style="margin-top:16px"><small class="muted">Memuat santri...</small></div>
    <small class="muted" id="santriFormMessage"></small>
    <div class="btn-joined">
     <button class="btn" type="button" data-santri-close>Tutup</button>
     <button class="btn primary" id="saveSantriBtn" type="button" data-save-santri="${item.id}">Simpan</button>
    </div>
   </div>
  </div>`:""}
 </div>
 <div class="kpi-row" style="margin-bottom:16px">
  <div class="kpi"><b>${item.students.length}</b><span class="muted">Santri</span></div>
  <div class="kpi"><b>${item.students.reduce((sum,s)=>sum+(Number(s.mutqin)||0),0)}</b><span class="muted">Total Mutqin</span></div>
  <div class="kpi"><b>${item.students.reduce((sum,s)=>sum+(Number(s.pending)||0),0)}</b><span class="muted">Setoran Pending</span></div>
 </div>
 <div class="kpi" style="margin-bottom:16px"><b>${isAdmin?"Admin":"Musyrif"}</b><span class="muted">Akses aktif</span></div>
 ${programCard(item,isAdmin)}
 <div class="card">
  <div class="row between" style="margin-bottom:10px"><div><h3>Daftar Santri</h3><p class="muted">Santri yang terdaftar di halaqah ini.</p></div></div>
  ${item.students.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Santri</th><th>Mutqin</th><th>Setoran pending</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
   ${item.students.map(student=>`<tr><td><b>${escapeHtml(student.name)}</b></td><td>${student.mutqin}</td><td>${student.pending}</td><td>${badge(student.status,statusTone(student.status))}</td><td><button class="btn" type="button" data-student-progress="${escapeHtml(student.name)}" data-halaqah-id="${item.id}">Lihat Progress</button></td></tr>`).join("")}
  </tbody></table></div>`:`<div class="quote">Belum ada santri di halaqah ini. ${isAdmin?"Gunakan invite link untuk mulai menambahkan santri.":"Hubungi admin pondok untuk menambahkan santri ke halaqah."}</div>`}
 </div>`;
}

export function halaqahPage(){
 const state=getState();
 if(state.context!=="pondok"){
  return `<div class="card"><p class="eyebrow">Halaqah</p><h2>Aktifkan konteks Pondok</h2><p class="muted">Menu Halaqah tersedia ketika konteks aktif berada di Pondok. Gunakan menu avatar untuk berpindah konteks.</p></div>`;
 }

 refreshMusyrifs();
 refreshHalaqahs();
 const items=halaqahs();
 const selected=items.find(item=>item.id===selectedHalaqahId);
 if(selected)return detail(selected,state.persona==="admin");

 if(state.persona==="admin")return adminList(items);
 if(state.persona==="musyrif"){
  const myId=state.authUser?("user-"+state.authUser.id):null;
  return musyrifList(myId?items.filter(item=>item.musyrifId===myId):[]);
 }

 return `<div class="card"><h2>Halaqah</h2><p class="muted">Akun ini tidak memiliki akses pengelolaan halaqah.</p></div>`;
}

document.addEventListener("click",event=>{
 const view=event.target.closest("[data-halaqah-view]");
 if(view){
  selectedHalaqahId=view.dataset.halaqahView;
  window.dispatchEvent(new Event("app:render"));
  return;
 }

 if(event.target.closest("[data-halaqah-back]")){
  selectedHalaqahId=null;
  window.dispatchEvent(new Event("app:render"));
  return;
 }

 if(event.target.closest("[data-halaqah-add]")){
  if(getState().persona!=="admin"||getState().context!=="pondok")return;
  document.querySelector("#halaqahModal")?.classList.remove("hidden");
  document.querySelector("#halaqahName")?.focus();
  refreshMusyrifs(true,true).then(()=>{
   const sel=document.querySelector("#halaqahMusyrif");
   if(sel)sel.innerHTML=musyrifOptions().length?musyrifOptions().map(item=>`<option value="${item.id}">${escapeHtml(item.name)}</option>`).join(""):'<option value="">— belum ada musyrif, bisa dipilih nanti —</option>';
  });
  return;
 }

 if(event.target.closest("[data-halaqah-close]")){
  document.querySelector("#halaqahModal")?.classList.add("hidden");
  return;
 }

 const santriBtn=event.target.closest("[data-halaqah-santri]");
 if(santriBtn){
  if(getState().persona!=="admin"||getState().context!=="pondok")return;
  const item=halaqahs().find(row=>row.id===santriBtn.dataset.halaqahSantri);
  if(!item)return;
  document.querySelector("#santriModal")?.classList.remove("hidden");
  const renderList=(list)=>{
   const box=document.querySelector("#santriCheckList");
   if(!box)return;
   box.innerHTML=list.length?`<div class="check-group">`+list.map(u=>{
    const checked=(item.students||[]).some(x=>String(x.santriUserId)===String(u.id));
    return `<label class="check-row"><input type="checkbox" data-santri-check="${u.id||""}" data-santri-name="${escapeHtml(u.name)}" data-santri-email="${escapeHtml(u.email||"")}" ${checked?"checked":""}><span class="avatar">${escapeHtml((u.name||"?").slice(0,1))}</span><div class="grow"><b>${escapeHtml(u.name)}</b><small class="muted" style="display:block">${escapeHtml(u.email||"")}</small></div></label>`;
   }).join("")+`</div>`:'<small class="muted">Belum ada santri di pondok ini. Undang dulu via menu Santri.</small>';
  };
  renderList(realSantriList());
  refreshSantris(true,true).then(()=>renderList(realSantriList()));
  return;
 }

 if(event.target.closest("[data-santri-close]")){
  document.querySelector("#santriModal")?.classList.add("hidden");
  return;
 }

 const saveBtn=event.target.closest("[data-save-santri]");
 if(saveBtn){
  if(getState().persona!=="admin"||getState().context!=="pondok")return;
  const item=halaqahs().find(row=>row.id===saveBtn.dataset.saveSantri);
  if(!item)return;
  const picked=[...document.querySelectorAll("[data-santri-check]")].filter(c=>c.checked).map(c=>Number(c.dataset.santriCheck)).filter(n=>n>0);
  const original=saveBtn.textContent;
  saveBtn.disabled=true;
  saveBtn.textContent="Menyimpan…";
  halaqApi("/api/pondoks/halaqahs/members",{method:"POST",body:JSON.stringify({
   pondok_id:Number(activePondokId()),
   halaqah_id:Number(item.numericId||0),
   user_ids:picked
  })})
   .then(()=>{document.querySelector("#santriModal")?.classList.add("hidden");return refreshHalaqahs(true,true);})
   .then(()=>{window.dispatchEvent(new Event("app:render"));})
   .catch(err=>{alert(err?.message||"Gagal menyimpan santri.");})
   .finally(()=>{saveBtn.disabled=false;saveBtn.textContent=original;});
  return;
 }

 const startDateBtn=event.target.closest("[data-start-save]");
 if(startDateBtn){
  const item=halaqahs().find(row=>row.id===startDateBtn.dataset.startSave);
  if(!item)return;
  const value=document.querySelector("#halaqahStartInput")?.value||"";
  const msg=document.querySelector("#startFormMessage");
  if(!value){if(msg){msg.textContent="Pilih tanggal mulai dulu.";msg.style.color="var(--danger)";}return;}
  startDateBtn.disabled=true;
  halaqApi("/api/pondoks/halaqahs/start-date",{method:"POST",body:JSON.stringify({
   pondok_id:Number(activePondokId()),
   halaqah_id:Number(item.numericId||0),
   program_start_date:value
  })})
   .then(()=>{toast("Tanggal mulai program disimpan.");window.dispatchEvent(new Event("app:my-halaqah-changed"));return refreshHalaqahs(true,true);})
   .then(()=>{window.dispatchEvent(new Event("app:render"));})
   .catch(err=>{
    if(msg){msg.textContent=err?.message||"Gagal menyimpan.";msg.style.color="var(--danger)";}
    startDateBtn.disabled=false;
   });
  return;
 }

 const startDateClear=event.target.closest("[data-start-clear]");
 if(startDateClear){
  const item=halaqahs().find(row=>row.id===startDateClear.dataset.startClear);
  if(!item)return;
  if(!confirm("Hapus tanggal mulai? Hari ke-1 kembali ke asumsi Pekan 1 (Sabtu)."))return;
  startDateClear.disabled=true;
  halaqApi("/api/pondoks/halaqahs/start-date",{method:"POST",body:JSON.stringify({
   pondok_id:Number(activePondokId()),
   halaqah_id:Number(item.numericId||0),
   program_start_date:""
  })})
   .then(()=>{toast("Tanggal mulai dihapus.");window.dispatchEvent(new Event("app:my-halaqah-changed"));return refreshHalaqahs(true,true);})
   .then(()=>{window.dispatchEvent(new Event("app:render"));})
   .catch(err=>{alert(err?.message||"Gagal menghapus.");startDateClear.disabled=false;});
  return;
 }

 const progress=event.target.closest("[data-student-progress]");
 if(progress){
  const item=halaqahs().find(row=>row.id===progress.dataset.halaqahId);
  const student=item?.students.find(row=>row.name===progress.dataset.studentProgress);
  if(!item||!student)return;
  setState({selectedStudentProgress:{
   student:{...student,userId:Number(student.santriUserId)||null},
   halaqahId:item.id,
   halaqahName:item.name,
   startDate:item.startDate||null,
   musyrifName:item.musyrifName||musyrifName(item.musyrifId)
  }});
  location.hash="santri-progress";
 }
});

document.addEventListener("submit",event=>{
 if(event.target.id!=="halaqahForm")return;
 event.preventDefault();
 if(getState().persona!=="admin"||getState().context!=="pondok")return;

 const name=document.querySelector("#halaqahName")?.value.trim()||"";
 const musyrifUserId=parseUserId(document.querySelector("#halaqahMusyrif")?.value||"");
 const message=document.querySelector("#halaqahFormMessage");

 if(!name){
  if(message){message.textContent="Nama halaqah wajib diisi.";message.style.color="var(--danger)";}
  return;
 }

 const submit=event.target.querySelector('button[type="submit"]');
 if(submit){submit.disabled=true;submit.textContent="Menyimpan…";}

 halaqApi("/api/pondoks/halaqahs",{method:"POST",body:JSON.stringify({
  pondok_id:Number(activePondokId()),
  name,
  musyrif_user_id:musyrifUserId
 })})
  .then(()=>{
   document.querySelector("#halaqahForm")?.reset();
   document.querySelector("#halaqahModal")?.classList.add("hidden");
   toast("Halaqah dibuat.");
   return refreshHalaqahs(true,true);
  })
  .then(()=>{window.dispatchEvent(new Event("app:render"));})
  .catch(err=>{
   if(message){message.textContent=err?.message||"Gagal menyimpan halaqah.";message.style.color="var(--danger)";}
  })
  .finally(()=>{
   if(submit){submit.disabled=false;submit.textContent="Simpan Halaqah";}
  });
});
