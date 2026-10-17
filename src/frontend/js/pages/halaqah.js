import {getState,setState} from "../store.js?v=0ae8419e";
import {students} from "../data/dummy-data.js?v=0ae8419e";
import {badge,statusTone,toast} from "../utils/helpers.js?v=0ae8419e";

let selectedHalaqahId=null;

const demoMusyrifOptions=[
 {id:"musyrif-rahmat",name:"Ust. Rahmat Hidayat"},
 {id:"musyrif-abdullah",name:"Ust. Abdullah Karim"},
 {id:"musyrif-yusuf",name:"Ust. Yusuf Maulana"}
];

function activePondokId(){
 const st=getState();
 return st.activePondokId??st.authUser?.pondoks?.[0]?.id??st.myPondoks?.[0]?.id??null;
}

function musyrifOptions(){
 const real=getState().realMusyrifs;
 if(Array.isArray(real)&&real.length)return real.map(m=>({id:"user-"+m.id,name:m.name}));
 return demoMusyrifOptions;
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

const defaultHalaqahs=[
 {
  id:"halaqah-abu-bakar",
  name:"Halaqah Abu Bakar",
  musyrifId:"musyrif-rahmat",
  students:students.map(s=>({...s}))
 },
 {
  id:"halaqah-umar",
  name:"Halaqah Umar",
  musyrifId:"musyrif-rahmat",
  students:[
   {name:"Faris Ramadhan",mutqin:8,pending:0,status:"Aktif"},
   {name:"Muhammad Zaid",mutqin:12,pending:1,status:"Aktif"},
   {name:"Abdurrahman",mutqin:6,pending:2,status:"Perlu review"}
  ]
 },
 {
  id:"halaqah-utsman",
  name:"Halaqah Utsman",
  musyrifId:"musyrif-abdullah",
  students:[
   {name:"Ali Akbar",mutqin:10,pending:0,status:"Aktif"},
   {name:"Hasan Basri",mutqin:9,pending:1,status:"Penguatan"}
  ]
 }
];

function escapeHtml(value=""){
 return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

const dummyHalaqahIds=new Set(["halaqah-abu-bakar","halaqah-umar","halaqah-utsman"]);

function halaqahs(){
 const saved=getState().halaqahs;
 const list=Array.isArray(saved)?saved:[];
 // Buang data contoh lama (termasuk yang telanjur tersimpan di HP) — hanya tampilkan halaqah buatan sendiri.
 return list.filter(item=>item&&!dummyHalaqahIds.has(item.id));
}

function musyrifName(id){
 return musyrifOptions().find(item=>item.id===id)?.name||"Belum ditentukan";
}

function pondokName(){
 const st=getState();
 const mine=st.myPondoks||[];
 const active=mine.find(x=>x.id===(st.activePondokId??mine[0]?.id))||mine[0];
 return active?.name||st.pondokProfile?.name||"Pondok";
}

function adminList(items){
 return `<div style="margin-bottom:18px">
  <p class="eyebrow">Pondok / Halaqah</p>
  <div class="row between" style="gap:12px"><h1 style="margin:0">Halaqah</h1><button class="btn primary" type="button" data-halaqah-add>+Halaqah</button></div>
  <p class="muted">Kelola halaqah, tentukan musyrif, dan lihat santri di setiap halaqah.</p></div>
 <div class="grid-3">
  ${items.length?items.map(item=>`<div class="card">
   <div class="row" style="gap:12px">
    <div class="grow" style="min-width:0">
     <div class="row between" style="gap:8px"><b>${escapeHtml(item.name)}</b>${badge("Aktif","success")}</div>
     <div class="row between" style="gap:8px;margin-top:4px"><small class="muted">Musyrif ${escapeHtml(musyrifName(item.musyrifId))}</small><small class="muted"><b style="color:var(--text)">${item.students.length}</b> santri</small></div>
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
    <div><label class="label">Musyrif</label><select class="input" id="halaqahMusyrif" required>
     ${musyrifOptions().map(item=>`<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("")}
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
 <div class="grid-2">
  ${items.length?items.map(item=>`<div class="card stack">
   <div class="row between"><div><h3>${escapeHtml(item.name)}</h3><small class="muted">${item.students.length} santri</small></div>${badge("Musyrif","success")}</div>
   <button class="btn full" type="button" data-halaqah-view="${item.id}">Lihat Santri</button>
  </div>`).join(""):`<div class="card"><h3>Belum ada halaqah</h3><p class="muted">Admin Pondok belum menugaskan halaqah ke akun Musyrif ini.</p></div>`}
 </div>`;
}

function detail(item,isAdmin){
 return `<div class="row between" style="margin-bottom:18px;gap:12px;flex-wrap:wrap">
  <div>
   <button class="btn" type="button" data-halaqah-back style="margin-bottom:12px">← Kembali ke daftar</button>
   <p class="eyebrow">Pondok / Halaqah</p>
   <h1>${escapeHtml(item.name)}</h1>
   <p class="muted">Musyrif: ${escapeHtml(musyrifName(item.musyrifId))} · ${item.students.length} santri</p>
  </div>
  <button class="btn primary" type="button" data-halaqah-santri="${item.id}">+Santri</button>
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
  </div>
 </div>
 <div class="kpi-row" style="margin-bottom:16px">
  <div class="kpi"><b>${item.students.length}</b><span class="muted">Santri</span></div>
  <div class="kpi"><b>${item.students.reduce((sum,s)=>sum+(Number(s.mutqin)||0),0)}</b><span class="muted">Total Mutqin</span></div>
  <div class="kpi"><b>${item.students.reduce((sum,s)=>sum+(Number(s.pending)||0),0)}</b><span class="muted">Setoran Pending</span></div>
 </div>
 <div class="kpi" style="margin-bottom:16px"><b>${isAdmin?"Admin":"Musyrif"}</b><span class="muted">Akses aktif</span></div>
 <div class="card">
  <div class="row between" style="margin-bottom:10px"><div><h3>Daftar Santri</h3><p class="muted">Santri yang terdaftar di halaqah ini.</p></div></div>
  ${item.students.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Santri</th><th>Mutqin</th><th>Setoran pending</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
   ${item.students.map(student=>`<tr><td><b>${escapeHtml(student.name)}</b></td><td>${student.mutqin}</td><td>${student.pending}</td><td>${badge(student.status,statusTone(student.status))}</td><td><button class="btn" type="button" data-student-progress="${escapeHtml(student.name)}" data-halaqah-id="${item.id}">Lihat Progress</button></td></tr>`).join("")}
  </tbody></table></div>`:`<div class="quote">Belum ada santri di halaqah ini. ${isAdmin?"Gunakan invite link untuk mulai menambahkan santri.":""}</div>`}
 </div>`;
}

export function halaqahPage(){
 const state=getState();
 if(state.context!=="pondok"){
  return `<div class="card"><p class="eyebrow">Halaqah</p><h2>Aktifkan konteks Pondok</h2><p class="muted">Menu Halaqah tersedia ketika konteks aktif berada di Pondok. Gunakan menu avatar untuk berpindah konteks.</p></div>`;
 }

 refreshMusyrifs();
 const items=halaqahs();
 const selected=items.find(item=>item.id===selectedHalaqahId);
 if(selected)return detail(selected,state.persona==="admin");

 if(state.persona==="admin")return adminList(items);
 if(state.persona==="musyrif"){
  const myId=state.authUser?("user-"+state.authUser.id):"musyrif-rahmat";
  return musyrifList(items.filter(item=>item.musyrifId===myId));
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
   if(sel)sel.innerHTML=musyrifOptions().map(item=>`<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("");
  });
  return;
 }

 if(event.target.closest("[data-halaqah-close]")){
  document.querySelector("#halaqahModal")?.classList.add("hidden");
  return;
 }

 const santriBtn=event.target.closest("[data-halaqah-santri]");
 if(santriBtn){
  const item=halaqahs().find(row=>row.id===santriBtn.dataset.halaqahSantri);
  if(!item)return;
  document.querySelector("#santriModal")?.classList.remove("hidden");
  const renderList=(list)=>{
   const box=document.querySelector("#santriCheckList");
   if(!box)return;
   const chosen=new Set((item.students||[]).map(x=>x.santriUserId||x.name));
   box.innerHTML=list.length?`<div class="check-group">`+list.map(u=>{
    const key=u.id||u.email;
    const checked=(item.students||[]).some(x=>x.santriUserId===u.id||x.name===u.name);
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
  const item=halaqahs().find(row=>row.id===saveBtn.dataset.saveSantri);
  if(!item)return;
  const picked=[...document.querySelectorAll("[data-santri-check]")].filter(c=>c.checked).map(c=>({id:c.dataset.santriCheck,name:c.dataset.santriName,email:c.dataset.santriEmail}));
  const kept={};
  (item.students||[]).forEach(x=>{kept[x.santriUserId||x.name]=x;});
  item.students=picked.map(p=>{
   const old=kept[p.id||p.name]||kept[p.name];
   return old||{name:p.name,santriUserId:p.id||null,mutqin:0,pending:0,status:"Aktif"};
  });
  setState({halaqahs:halaqahs()});
  document.querySelector("#santriModal")?.classList.add("hidden");
  window.dispatchEvent(new Event("app:render"));
  return;
 }

 const progress=event.target.closest("[data-student-progress]");
 if(progress){
  const item=halaqahs().find(row=>row.id===progress.dataset.halaqahId);
  const student=item?.students.find(row=>row.name===progress.dataset.studentProgress);
  if(!item||!student)return;
  setState({selectedStudentProgress:{
   student:{...student},
   halaqahId:item.id,
   halaqahName:item.name,
   musyrifName:musyrifName(item.musyrifId)
  }});
  location.hash="santri-progress";
 }
});

document.addEventListener("submit",event=>{
 if(event.target.id!=="halaqahForm")return;
 event.preventDefault();
 if(getState().persona!=="admin"||getState().context!=="pondok")return;

 const name=document.querySelector("#halaqahName")?.value.trim()||"";
 const musyrifId=document.querySelector("#halaqahMusyrif")?.value||"";
 const message=document.querySelector("#halaqahFormMessage");

 if(!name||!musyrifId){
  if(message){message.textContent="Nama halaqah dan Musyrif wajib dipilih.";message.style.color="var(--danger)";}
  return;
 }

 const item={id:`halaqah-${Date.now().toString(36)}`,name,musyrifId,students:[]};
 setState({halaqahs:[...halaqahs(),item]});
 selectedHalaqahId=item.id;
 window.dispatchEvent(new Event("app:render"));
});
