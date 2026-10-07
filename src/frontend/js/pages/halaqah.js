import {getState,setState} from "../store.js?v=dev-2f08f073";
import {students} from "../data/dummy-data.js?v=dev-2f08f073";
import {badge,statusTone,toast} from "../utils/helpers.js?v=dev-2f08f073";

let selectedHalaqahId=null;

const musyrifOptions=[
 {id:"musyrif-rahmat",name:"Ust. Rahmat Hidayat"},
 {id:"musyrif-abdullah",name:"Ust. Abdullah Karim"},
 {id:"musyrif-yusuf",name:"Ust. Yusuf Maulana"}
];

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

function halaqahs(){
 const saved=getState().halaqahs;
 return Array.isArray(saved)?saved:defaultHalaqahs;
}

function musyrifName(id){
 return musyrifOptions.find(item=>item.id===id)?.name||"Belum ditentukan";
}

function pondokName(){
 return getState().pondokProfile?.name||"Pondok Al-Furqan";
}

function adminList(items){
 return `<div class="row between" style="margin-bottom:18px;gap:12px;flex-wrap:wrap">
  <div><p class="eyebrow">Pondok / Halaqah</p><h1>Halaqah</h1><p class="muted">Kelola halaqah, tentukan musyrif, dan lihat santri di setiap halaqah.</p></div>
  <button class="btn primary" type="button" data-halaqah-add>+ Tambah Halaqah</button>
 </div>
 <div class="grid-3">
  ${items.map(item=>`<div class="card stack">
   <div class="row between"><div><h3>${escapeHtml(item.name)}</h3><small class="muted">${escapeHtml(musyrifName(item.musyrifId))}</small></div>${badge("Aktif","success")}</div>
   <div class="row between"><span class="muted">Jumlah santri</span><b>${item.students.length}</b></div>
   <button class="btn full" type="button" data-halaqah-view="${item.id}">Lihat Detail</button>
  </div>`).join("")}
 </div>
 <div class="modal-backdrop hidden" id="halaqahModal">
  <div class="modal-card">
   <div class="row between"><div><p class="eyebrow">Pondok</p><h2>Tambah Halaqah</h2></div><button class="btn" type="button" data-halaqah-close>Tutup</button></div>
   <form class="stack" id="halaqahForm" style="margin-top:16px">
    <div><label class="label">Nama Halaqah</label><input class="input" id="halaqahName" placeholder="Contoh: Halaqah Ali" required></div>
    <div><label class="label">Musyrif</label><select class="input" id="halaqahMusyrif" required>
     ${musyrifOptions.map(item=>`<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("")}
    </select></div>
    <small class="muted">Satu halaqah memiliki satu musyrif. Santri dapat ditambahkan setelah halaqah dibuat.</small>
    <small class="muted" id="halaqahFormMessage"></small>
    <button class="btn primary full" type="submit">Simpan Halaqah</button>
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
  <button class="btn primary" type="button" data-halaqah-invite="${item.id}">Buat Invite Link</button>
 </div>
 <div class="grid-4" style="margin-bottom:16px">
  <div class="kpi"><b>${item.students.length}</b><span class="muted">Santri</span></div>
  <div class="kpi"><b>${item.students.reduce((sum,s)=>sum+(Number(s.mutqin)||0),0)}</b><span class="muted">Total Mutqin</span></div>
  <div class="kpi"><b>${item.students.reduce((sum,s)=>sum+(Number(s.pending)||0),0)}</b><span class="muted">Setoran Pending</span></div>
  <div class="kpi"><b>${isAdmin?"Admin":"Musyrif"}</b><span class="muted">Akses aktif</span></div>
 </div>
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

 const items=halaqahs();
 const selected=items.find(item=>item.id===selectedHalaqahId);
 if(selected)return detail(selected,state.persona==="admin");

 if(state.persona==="admin")return adminList(items);
 if(state.persona==="musyrif")return musyrifList(items.filter(item=>item.musyrifId==="musyrif-rahmat"));

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
  return;
 }

 if(event.target.closest("[data-halaqah-close]")){
  document.querySelector("#halaqahModal")?.classList.add("hidden");
  return;
 }

 const invite=event.target.closest("[data-halaqah-invite]");
 if(invite){
  const item=halaqahs().find(row=>row.id===invite.dataset.halaqahInvite);
  toast(`Invite link demo untuk ${item?.name||"halaqah"} siap dibagikan`);
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
