import {getState} from "../store.js?v=81bed469";
import {toast} from "../utils/helpers.js?v=81bed469";

function esc(value=""){
 return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

// State #platform-musyrif: null = belum dimuat, object = hasil API, {error} = gagal.
let platformMusyrif=null;
let platformMusyrifState="idle"; // idle | loading | done | error
let platformInvites=null;
let platformInviteState="idle";

export async function loadPlatformMusyrif(force=false){
 const st=getState();
 if(!st.authToken)return;
 if(platformMusyrifState==="loading")return;
 if(platformMusyrifState==="done"&&!force)return;
 platformMusyrifState="loading";
 try{
  const r=await fetch("/api/platform/musyrifs"+(force?"?t="+Date.now():''),{headers:{Accept:"application/json",Authorization:"Bearer "+st.authToken}});
  const b=await r.json().catch(()=>({}));
  if(!r.ok||!b.success)throw new Error(b?.message||"Gagal memuat ustadz platform.");
  platformMusyrif=b.data||{items:[],total:0,platform_active:0,pondok_active:0,dampingan_total:0};
  platformMusyrifState="done";
 }catch(err){
  platformMusyrif={error:err?.message||"Gagal memuat data."};
  platformMusyrifState="error";
 }
 window.dispatchEvent(new Event("app:render"));
}

export async function loadPlatformInviteList(force=false){
 const st=getState();
 if(!st.authToken)return;
 if(platformInviteState==="loading")return;
 if(platformInviteState==="done"&&!force)return;
 platformInviteState="loading";
 try{
  const r=await fetch("/api/platform/musyrif-invites"+(force?"?t="+Date.now():''),{headers:{Accept:"application/json",Authorization:"Bearer "+st.authToken}});
  const b=await r.json().catch(()=>({}));
  if(!r.ok||!b.success)throw new Error(b?.message||"Gagal memuat undangan.");
  platformInvites=b.data||{items:[],total:0,pending:0,accepted:0};
  platformInviteState="done";
 }catch(err){
  platformInvites={error:err?.message||"Gagal memuat data."};
  platformInviteState="error";
 }
 window.dispatchEvent(new Event("app:render"));
}

async function api(path,options={}){
 const st=getState();
 const r=await fetch(path,{...options,headers:{"Content-Type":"application/json",Accept:"application/json",Authorization:"Bearer "+st.authToken,...(options.headers||{})}});
 const b=await r.json().catch(()=>({}));
 if(!r.ok||!b.success)throw new Error(b?.message||"Permintaan gagal.");
 return b;
}

async function copyText(link){
 if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(link);
 else{
  const ta=document.createElement("textarea");
  ta.value=link;document.body.appendChild(ta);ta.select();
  document.execCommand("copy");ta.remove();
 }
}

const users=[
 {name:"Ahmad Fauzi",email:"member@metodequ.id",role:"Member",type:"Personal",scope:"Personal",status:"Aktif"},
 {name:"Siti Aisyah",email:"siti@example.com",role:"Santri",type:"Pondok",scope:"Pondok Tahfidz Al-Furqan",status:"Aktif"},
 {name:"Ust. Rahmat Hidayat",email:"musyrif@metodequ.id",role:"Ustadz",type:"Pondok",scope:"Pondok Tahfidz Al-Furqan",status:"Aktif"},
 {name:"Ust. Abdullah",email:"abdullah@metodequ.id",role:"Ustadz",type:"Platform",scope:"Mutqeen",status:"Aktif"},
 {name:"Admin Pondok",email:"admin@metodequ.id",role:"Admin Pondok",type:"Pondok",scope:"Pondok Tahfidz Al-Furqan",status:"Aktif"},
 {name:"Super Admin",email:"superadmin@metodequ.id",role:"Super Admin",type:"Platform",scope:"Mutqeen",status:"Aktif"}
];

export function superAdminDashboard(){
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Admin Aplikasi</p><h1>Dashboard MetodeQu</h1><p class="muted">Ringkasan platform lintas akun dan pondok.</p></div><span class="badge success">Platform Aktif</span></div>
 <div class="grid-4" style="margin-bottom:16px"><div class="kpi"><b>1.284</b><span class="muted">Total user</span></div><div class="kpi"><b>24</b><span class="muted">Pondok</span></div><div class="kpi"><b>12</b><span class="muted">Ustadz platform</span></div><div class="kpi"><b>740</b><span class="muted">User personal</span></div></div>
 <div class="grid-2"><div class="card"><div class="row between"><h3>Manajemen User</h3><a href="#users" class="muted">Lihat semua</a></div><div class="list"><div class="list-item"><span class="dot"></span><div class="grow"><b>Member / Santri</b><small class="muted" style="display:block">Personal dan anggota pondok</small></div><b>1.126</b></div><div class="list-item"><span class="dot"></span><div class="grow"><b>Ustadz</b><small class="muted" style="display:block">Platform dan pondok</small></div><b>109</b></div><div class="list-item"><span class="dot"></span><div class="grow"><b>Admin Pondok</b><small class="muted" style="display:block">Pengelola tenant pondok</small></div><b>48</b></div><div class="list-item"><span class="dot"></span><div class="grow"><b>Super Admin</b><small class="muted" style="display:block">Pengelola aplikasi MetodeQu</small></div><b>1</b></div></div></div>
 <div class="card"><h3>Aktivitas Platform</h3><div class="list"><div class="list-item"><span class="dot"></span><div class="grow"><b>Pondok Al-Ikhlas bergabung</b><small class="muted" style="display:block">Tenant baru aktif</small></div><small>Hari ini</small></div><div class="list-item"><span class="dot"></span><div class="grow"><b>Ust. Abdullah ditugaskan</b><small class="muted" style="display:block">Ustadz Platform · 8 user personal</small></div><small>Hari ini</small></div></div></div></div>`;
}

export function userManagementPage(){
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Admin Aplikasi</p><h1>Manajemen User</h1><p class="muted">Daftar akun lintas Personal dan Pondok. Data masih prototype/demo.</p></div><span class="badge success">${users.length} sample user</span></div>
 <div class="grid-4" style="margin-bottom:16px"><div class="kpi"><b>1.126</b><span class="muted">Member / Santri</span></div><div class="kpi"><b>109</b><span class="muted">Ustadz</span></div><div class="kpi"><b>48</b><span class="muted">Admin Pondok</span></div><div class="kpi"><b>1</b><span class="muted">Super Admin</span></div></div>
 <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Tipe</th><th>Scope</th><th>Status</th></tr></thead><tbody>${users.map(user=>`<tr><td><b>${user.name}</b></td><td>${user.email}</td><td>${user.role}</td><td>${user.type}</td><td>${user.scope}</td><td><span class="badge success">${user.status}</span></td></tr>`).join("")}</tbody></table></div></div>`;
}

export function platformPondoksPage(){
 const pondoks=[["Pondok Tahfidz Al-Furqan","Admin Pondok",120,8],["Pondok Tahfidz Al-Ikhlas","Ahmad Hasyim",86,6],["Rumah Qur'an An-Nur","Muhammad Fikri",54,4]];
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Admin Aplikasi</p><h1>Pondok</h1><p class="muted">Daftar tenant pondok yang menggunakan MetodeQu.</p></div><span class="badge success">24 pondok aktif</span></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Pondok</th><th>Admin Pondok</th><th>Santri</th><th>Ustadz</th><th>Status</th></tr></thead><tbody>${pondoks.map(item=>`<tr><td><b>${item[0]}</b></td><td>${item[1]}</td><td>${item[2]}</td><td>${item[3]}</td><td><span class="badge success">Aktif</span></td></tr>`).join("")}</tbody></table></div></div>`;
}

function inviteListBody(){
 const inv=platformInvites;
 if(!inv)return '<small class="muted">Memuat…</small>';
 if(inv.error)return `<small class="muted">${esc(inv.error)}</small>`;
 const items=Array.isArray(inv.items)?inv.items:[];
 if(!items.length)return '<small class="muted">Belum ada undangan terkirim.</small>';
 return items.map(row=>{
  const badge=row.status==="pending"
   ?'<span class="badge">Menunggu</span>'
   :row.status==="accepted"
    ?'<span class="badge success">Diterima</span>'
    :`<span class="badge">${row.status==="revoked"?"Dibatalkan":"Kedaluwarsa"}</span>`;
  const title=row.generic?"Link umum (multi-pakai)":esc(row.email||"-");
  const sub=row.generic
   ?"Berlaku 90 hari · siapa pun dengan link bisa menerima"
   :`Berlaku s/d ${esc((row.expires_at||"").slice(0,10))}${row.accepted_name?` · diterima ${esc(row.accepted_name)}`:""}`;
  const actions=row.status==="pending"
   ?`<div class="btn-joined" style="flex:0 0 auto"><button class="btn" data-plat-regen="${row.id}" type="button">Salin</button><button class="btn" data-plat-revoke="${row.id}" type="button">Batal</button></div>`
   :"";
  return `<div class="list-item platform-invite-item"><span class="dot"></span><div class="grow platform-invite-main"><b>${title}</b><small class="muted" style="display:block">${sub}</small></div>${actions?`<div class="platform-invite-actions">${actions}</div>`:""}<div class="platform-invite-status">${badge}</div></div>`;
 }).join("");
}

export function platformMusyrifPage(){
 const d=platformMusyrif;
 const items=Array.isArray(d?.items)?d.items:[];
 const badge=!d
  ?"Memuat…"
  :(d.error?"Gagal memuat":`${d.total??"0"} ustadz (${d.platform_active??0} platform · ${d.pondok_active??0} pondok)`);
 let body;
 if(!d){
  body='<tr class="platform-musyrif-empty"><td colspan="6"><span class="muted">Memuat ustadz…</span></td></tr>';
 }else if(d.error){
  body=`<tr class="platform-musyrif-empty"><td colspan="6"><span class="muted">${esc(d.error)} Muat ulang halaman untuk mencoba lagi.</span></td></tr>`;
 }else if(!items.length){
  body='<tr class="platform-musyrif-empty"><td colspan="6"><span class="muted">Belum ada ustadz terdaftar.</span></td></tr>';
 }else{
  body=items.map(item=>`<tr><td data-label="Ustadz"><b>${esc(item.name)}</b></td><td data-label="Email">${esc(item.email)}</td><td data-label="User dampingan">${item.dampingan}</td><td data-label="Tipe">${item.type==="platform"?"Platform":"Pondok"}</td><td data-label="Scope">${esc(item.scope)}</td><td data-label="Status">${item.status==="active"?'<span class="badge success">Aktif</span>':'<span class="badge">Nonaktif</span>'}</td></tr>`).join("");
 }
 return `<div class="platform-musyrif-page"><div class="row between platform-musyrif-head" style="margin-bottom:18px"><div><p class="eyebrow">Admin Aplikasi</p><h1>Ustadz Platform</h1><p class="muted">Ustadz yang dikelola MetodeQu — dampingan aktif: ${d&&!d.error?(d.dampingan_total??0):"—"} user.</p></div><span class="badge platform-musyrif-summary ${d&&!d.error?"success":""}">${badge}</span></div>
 <div class="grid-2 platform-musyrif-grid"><div class="card platform-musyrif-invite-card"><h3>Undang Ustadz</h3><div class="stack">
 <p class="muted" style="margin:0">Undang ustadz platform lewat email — mereka buat password sendiri.</p>
 <button class="btn primary full" id="platInviteBtn" type="button">Kirim Undangan</button>
 <button class="btn full" id="platCopyLinkBtn" type="button">Salin Link Undangan</button>
 <button class="btn full" id="platAddBtn" type="button">Form +Ustadz</button>
 <h3 style="margin-top:16px">Undangan Terkirim</h3><div class="list" id="platInviteList">${inviteListBody()}</div>
 </div></div>
 <div class="card platform-musyrif-list-card"><h3>Daftar Ustadz</h3><div class="table-wrap platform-musyrif-table-wrap"><table class="table platform-musyrif-table"><thead><tr><th>Ustadz</th><th>Email</th><th>User dampingan</th><th>Tipe</th><th>Scope</th><th>Status</th></tr></thead><tbody>${body}</tbody></table></div></div></div>
 <div class="modal-backdrop hidden" id="platInviteModal">
  <div class="modal-card">
   <div><p class="eyebrow">Undangan</p><h2>Kirim Undangan</h2></div>
   <div class="stack">
    <div><label class="label">Email (bisa banyak, satu per baris)</label><textarea class="input" id="platEmail" rows="4" autocomplete="off" placeholder="nama1@email.com&#10;nama2@email.com"></textarea></div>
    <small class="muted" id="platMsg">Maksimal 20 email per kirim. Nama &amp; WA diisi ustadz saat menerima undangan. Berlaku 7 hari.</small>
    <div class="btn-joined">
     <button class="btn" id="platInviteClose" type="button">Tutup</button>
     <button class="btn primary" id="platInviteSend" type="button">Kirim</button>
    </div>
   </div>
  </div>
 </div>
 <div class="modal-backdrop hidden" id="platAddModal">
  <div class="modal-card">
   <div><p class="eyebrow">Ustadz</p><h2>Tambah Ustadz Platform</h2></div>
   <div class="stack">
    <div><label class="label">Nama lengkap</label><input class="input" id="platMusyrifName" autocomplete="off" placeholder="Nama lengkap"></div>
    <div><label class="label">Email</label><input class="input" id="platMusyrifEmail" type="email" autocomplete="off" placeholder="nama@email.com"></div>
    <div><label class="label">Nomor WhatsApp</label><input class="input" id="platMusyrifPhone" inputmode="tel" placeholder="+62 ..."></div>
    <div><label class="label">Password awal</label><input class="input" id="platMusyrifPassword" type="password" autocomplete="new-password" placeholder="Minimal 8 karakter"></div>
    <small class="muted" id="platAddMsg"></small>
    <div class="btn-joined">
     <button class="btn" id="platAddClose" type="button">Tutup</button>
     <button class="btn primary" id="platAddSave" type="button">Simpan Ustadz</button>
    </div>
   </div>
  </div>
 </div></div>`;
}

export function bindPlatformMusyrif(){
 loadPlatformMusyrif();
 loadPlatformInviteList();
 const inviteModal=()=>document.querySelector("#platInviteModal");
 const addModal=()=>document.querySelector("#platAddModal");
 document.querySelector("#platInviteBtn")?.addEventListener("click",()=>{
  const m=inviteModal();if(!m)return;
  const msg=document.querySelector("#platMsg");
  if(msg){msg.textContent="Maksimal 20 email per kirim. Nama & WA diisi ustadz saat menerima undangan. Berlaku 7 hari.";msg.style.color="";}
  m.classList.remove("hidden");
 });
 document.querySelector("#platInviteClose")?.addEventListener("click",()=>inviteModal()?.classList.add("hidden"));
 inviteModal()?.addEventListener("click",event=>{if(event.target===inviteModal())inviteModal()?.classList.add("hidden");});
 document.querySelector("#platInviteSend")?.addEventListener("click",async e=>{
  const btn=e.currentTarget,msg=document.querySelector("#platMsg");
  const emails=(document.querySelector("#platEmail")?.value||"").split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean);
  if(!emails.length){
   if(msg){msg.textContent="Isi minimal satu email.";msg.style.color="var(--danger)";}
   return;
  }
  btn.disabled=true;btn.textContent="Mengirim...";
  if(msg){msg.textContent="";msg.style.color="";}
  try{
   const b=await api("/api/platform/musyrif-invites",{method:"POST",body:JSON.stringify({emails})});
   const sent=(b.data?.sent||[]).map(x=>x.email);
   const failed=(b.data?.failed||[]).map(x=>x.email+" ("+x.message+")");
   if(sent.length)toast(sent.length+" undangan terkirim.");
   if(failed.length)toast("Gagal: "+failed.join("; "));
   document.querySelector("#platEmail").value="";
   inviteModal()?.classList.add("hidden");
   loadPlatformInviteList(true);
  }catch(err){
   if(msg){msg.textContent=err?.message||"Gagal mengirim.";msg.style.color="var(--danger)";}
  }
  btn.disabled=false;btn.textContent="Kirim";
 });
 document.querySelector("#platCopyLinkBtn")?.addEventListener("click",async e=>{
  const btn=e.currentTarget;
  btn.disabled=true;
  try{
   const b=await api("/api/platform/musyrif-invites/standing-link",{method:"POST",body:JSON.stringify({})});
   const link=b.data?.link||"";
   if(!link)throw new Error("Link tidak tersedia.");
   await copyText(link);
   toast("Link undangan tersalin ke clipboard.");
  }catch(err){
   toast(err?.message||"Gagal menyalin link.");
  }
  btn.disabled=false;
 });
 document.querySelector("#platAddBtn")?.addEventListener("click",()=>{
  const m=addModal();if(!m)return;
  const msg=document.querySelector("#platAddMsg");
  if(msg){msg.textContent="";msg.style.color="";}
  m.classList.remove("hidden");
  document.querySelector("#platMusyrifName")?.focus();
 });
 document.querySelector("#platAddClose")?.addEventListener("click",()=>addModal()?.classList.add("hidden"));
 addModal()?.addEventListener("click",event=>{if(event.target===addModal())addModal()?.classList.add("hidden");});
 document.querySelector("#platAddSave")?.addEventListener("click",async e=>{
  const btn=e.currentTarget,msg=document.querySelector("#platAddMsg");
  const payload={
   name:(document.querySelector("#platMusyrifName")?.value||"").trim(),
   email:(document.querySelector("#platMusyrifEmail")?.value||"").trim(),
   phone:(document.querySelector("#platMusyrifPhone")?.value||"").trim(),
   password:document.querySelector("#platMusyrifPassword")?.value||""
  };
  if(msg){msg.textContent="";msg.style.color="";}
  btn.disabled=true;btn.textContent="Menyimpan...";
  try{
   const b=await api("/api/platform/musyrifs",{method:"POST",body:JSON.stringify(payload)});
   toast("Ustadz "+(b.data?.name||"")+" ditambahkan.");
   ["#platMusyrifName","#platMusyrifEmail","#platMusyrifPhone","#platMusyrifPassword"].forEach(s=>{const el=document.querySelector(s);if(el)el.value="";});
   addModal()?.classList.add("hidden");
   platformMusyrifState="idle";
   loadPlatformMusyrif(true);
  }catch(err){
   if(msg){msg.textContent=err?.message||"Gagal menyimpan.";msg.style.color="var(--danger)";}
  }
  btn.disabled=false;btn.textContent="Simpan Ustadz";
 });
 document.querySelectorAll("[data-plat-regen]").forEach(b=>b.addEventListener("click",async ()=>{
  const btn=b,label=btn.textContent;
  btn.disabled=true;btn.textContent="Menyalin...";
  try{
   const r=await api("/api/platform/musyrif-invites/regenerate",{method:"POST",body:JSON.stringify({id:Number(btn.dataset.platRegen)})});
   const link=r.data?.link||"";
   if(!link)throw new Error("Link tidak tersedia.");
   await copyText(link);
   btn.textContent="Tersalin!";
   toast("Link undangan baru tersalin ke clipboard.");
   setTimeout(()=>{btn.disabled=false;btn.textContent=label;},1500);
  }catch(err){
   alert(err?.message||"Gagal menyalin link.");
   btn.disabled=false;btn.textContent=label;
  }
 }));
 document.querySelectorAll("[data-plat-revoke]").forEach(b=>b.addEventListener("click",async ()=>{
  if(!confirm("Batalkan undangan ini?"))return;
  try{
   await api("/api/platform/musyrif-invites/revoke",{method:"POST",body:JSON.stringify({id:Number(b.dataset.platRevoke)})});
   toast("Undangan dibatalkan.");
   platformInviteState="idle";
   loadPlatformInviteList(true);
  }catch(err){alert(err?.message||"Gagal membatalkan.");}
 }));
}

export function platformSettingsPage(){
 return `<div style="margin-bottom:18px"><p class="eyebrow">Admin Aplikasi</p><h1>Pengaturan Platform</h1><p class="muted">Konfigurasi global MetodeQu. Pada prototype ini pengaturan masih read-only.</p></div><div class="grid-2"><div class="card"><h3>Role & akses</h3><div class="list"><div class="list-item"><div class="grow"><b>Super Admin</b><small class="muted" style="display:block">Akses level platform</small></div></div><div class="list-item"><div class="grow"><b>Admin Pondok</b><small class="muted" style="display:block">Akses tenant pondok</small></div></div><div class="list-item"><div class="grow"><b>Ustadz</b><small class="muted" style="display:block">Tipe Platform atau Pondok</small></div></div></div></div><div class="card"><h3>Scope data</h3><p class="muted">Data Personal, Pondok, dan Platform diperlakukan sebagai scope berbeda. Backend authorization tetap diperlukan sebelum production.</p></div></div>`;
}
