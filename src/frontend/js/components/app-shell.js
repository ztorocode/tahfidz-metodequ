import {getState,setState} from "../store.js?v=6b3a0f52";
import {pondokList,canPersonal} from "./context-switcher.js?v=6b3a0f52";

const memberNav=[["dashboard","Dashboard"],["progress","Progress"],["report","Report"]];
const musyrifNav=[["musyrif","Dashboard"],["review","Setoran"],["halaqah","Halaqah"],["notifications","Notifikasi"]];
const adminNav=[["admin","Dashboard"],["kelola-musyrif","Musyrif"],["kelola-santri","Santri"],["halaqah","Halaqah"],["whatsapp","WhatsApp"],["notifications","Notifikasi"]];
const superAdminNav=[["super-admin","Dashboard"],["users","Manajemen User"],["pondoks","Pondok"],["platform-musyrif","Musyrif Platform"],["platform-settings","Pengaturan"]];
const memberMobileNav=memberNav;

const demoAccounts={
 member:{name:"Ahmad Fauzi",role:"Member",email:"member@metodequ.id",phone:"+62 812 3456 7890",initials:"AF"},
 musyrif:{name:"Ust. Rahmat Hidayat",role:"Musyrif Pondok",email:"musyrif@metodequ.id",phone:"+62 813 4567 8901",initials:"RH"},
 musyrif_platform:{name:"Ust. Abdullah",role:"Musyrif Platform",email:"musyrif.platform@metodequ.id",phone:"+62 814 0000 0002",initials:"UA"},
 admin:{name:"Admin Pondok",role:"Admin Pondok",email:"admin@metodequ.id",phone:"+62 811 2345 6789",initials:"AP"},
 super_admin:{name:"Super Admin",role:"Super Admin",email:"superadmin@metodequ.id",phone:"+62 815 0000 0001",initials:"SA"}
};

function navItems(){
 const s=getState();
 if(s.persona==="super_admin")return superAdminNav;
 if(s.persona==="musyrif")return musyrifNav;
 if(s.context==="personal")return memberNav;
 return s.persona==="admin"?adminNav:memberNav;
}

function mobileIcon(route){
 const common='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
 const icons={
  dashboard:`<svg ${common}><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5h5v5"/></svg>`,
  admin:`<svg ${common}><rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M7.5 8h9M7.5 12h4M7.5 16h7"/></svg>`,
  musyrif:`<svg ${common}><path d="M4 19v-1.5A4.5 4.5 0 0 1 8.5 13h2A4.5 4.5 0 0 1 15 17.5V19"/><circle cx="9.5" cy="7.5" r="3.5"/><path d="m16 8 2 2 3-4"/></svg>`,
  program:`<svg ${common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z"/></svg>`,
  activity:`<svg ${common}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>`,
  submission:`<svg ${common}><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h5"/><path d="m14 16 2 2 4-5"/></svg>`,
  review:`<svg ${common}><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h5"/><path d="m14 16 1.5 1.5L18.5 14"/></svg>`,
  murajaah:`<svg ${common}><path d="M20 7v5h-5"/><path d="M19 12a7 7 0 1 0-2 5"/><path d="M12 8v4l2.5 1.5"/></svg>`,
  halaqah:`<svg ${common}><circle cx="12" cy="7" r="3"/><circle cx="5.5" cy="10.5" r="2.5"/><circle cx="18.5" cy="10.5" r="2.5"/><path d="M7.5 20v-1a4.5 4.5 0 0 1 9 0v1M2.5 20v-1a3 3 0 0 1 4-2.8M21.5 20v-1a3 3 0 0 0-4-2.8"/></svg>`,
  whatsapp:`<svg ${common}><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.4-4.1A8 8 0 1 1 20 11.5Z"/><path d="M9 8.5c.5 2.7 2.3 4.5 5 5l1.2-1.2"/></svg>`,
  progress:`<svg ${common}><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/></svg>`,
  report:`<svg ${common}><path d="M5 3h10l4 4v14H5z"/><path d="M14 3v5h5"/><path d="M8 12h8M8 16h8"/></svg>`,
  notifications:`<svg ${common}><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8"/><path d="M10 20h4"/></svg>`,
  users:`<svg ${common}><circle cx="9" cy="8" r="3"/><path d="M3.5 20v-1.5A5.5 5.5 0 0 1 9 13h1a5.5 5.5 0 0 1 5.5 5.5V20"/><path d="M16 7h5M18.5 4.5v5"/></svg>`,
  pondoks:`<svg ${common}><path d="M3 20h18"/><path d="M5 20V9l7-5 7 5v11"/><path d="M9 20v-6h6v6"/></svg>`,
  "platform-musyrif":`<svg ${common}><circle cx="9" cy="7" r="3"/><path d="M3.5 20v-1.5A5.5 5.5 0 0 1 9 13h1a5.5 5.5 0 0 1 5.5 5.5V20"/><path d="m16 10 2 2 3-4"/></svg>`,
  "platform-settings":`<svg ${common}><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7a6 6 0 0 0-.7-1.7l.9-1.9-2.1-2.1-1.9.9a6 6 0 0 0-1.7-.7L10.5 2h-3l-.7 2.3a6 6 0 0 0-1.7.7l-1.9-.9-2.1 2.1.9 1.9a6 6 0 0 0-.7 1.7L0 10.5v3l2.3.7a6 6 0 0 0 .7 1.7l-.9 1.9 2.1 2.1 1.9-.9a6 6 0 0 0 1.7.7l.7 2.3h3l.7-2.3a6 6 0 0 0 1.7-.7l1.9.9 2.1-2.1-.9-1.9a6 6 0 0 0 .7-1.7z"/></svg>`
 };
 return icons[route]||icons.dashboard;
}

function mobileNavItems(){
 const items=getState().persona==="member"?memberMobileNav:navItems();
 return items.filter(([r])=>r!=="notifications");
}

function notifBell(){
 const unread=(getState().myInvites||[]).length;
 const active=(location.hash.replace("#","")||"dashboard")==="notifications";
 return `<a href="#notifications" class="icon-button ${active?"active":""}" id="notifBell" aria-label="Notifikasi" style="position:relative;display:inline-grid;place-items:center;width:38px;height:38px;border-radius:12px;border:1px solid var(--border);background:var(--surface);color:${active?"var(--brand)":"var(--muted)"}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:20px;height:20px"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8"/><path d="M10 20h4"/></svg>${unread?`<span id="notifDot" style="position:absolute;top:6px;right:6px;min-width:16px;height:16px;border-radius:9px;background:var(--danger);color:#fff;font-size:10px;font-weight:800;display:grid;place-items:center;padding:0 4px">${unread>9?"9+":unread}</span>`:`<span id="notifDot" class="hidden" style="position:absolute;top:6px;right:6px;min-width:16px;height:16px;border-radius:9px;background:var(--danger);color:#fff;font-size:10px;font-weight:800;display:grid;place-items:center;padding:0 4px"></span>`}</a>`;
}

function currentAccount(){
 const s=getState();
 const accountKey=s.persona==="musyrif"&&s.musyrifType==="platform"?"musyrif_platform":s.persona;
 const base=demoAccounts[accountKey]||demoAccounts.member;
 const overrides=s.profileOverrides?.[s.persona]||{};
 return {...base,...overrides};
}

function pondokChoices(){
 const list=pondokList();
 const active=list.find(p=>p.id===(getState().activePondokId??list[0]?.id))||list[0];
 return list.map(p=>`<button class="account-choice ${getState().context==="pondok"&&active?.id===p.id?"active":""}" data-switch-context="pondok" data-pondok-id="${p.id}" type="button"><span class="avatar">P</span><span><b>${p.name}</b><small class="muted" style="display:block">Konteks pondok</small></span></button>`).join("");
}

function accountMenu(){
 const account=currentAccount();
 return `<div class="account-wrap">
  <button class="avatar-button" id="accountBtn" type="button" aria-label="Menu akun">
   <span class="avatar">${account.initials}</span>
  </button>
  <div class="account-menu hidden" id="accountMenu">
   <div class="account-summary">
    <span class="avatar">${account.initials}</span>
    <div class="grow"><b>${account.name}</b><small class="muted" style="display:block">${account.role} · ${account.email}</small></div>
   </div>
   <button class="account-action" id="editProfileBtn" type="button">Edit Profil</button>
   ${["super_admin","musyrif"].includes(getState().persona)?"":`<button class="account-action" id="switchAccountBtn" type="button">Switch Akun</button>
   <div class="account-switcher hidden" id="accountSwitcher">
    <small class="muted" style="display:block;padding:4px 2px">Pilih konteks aktif</small>
    ${canPersonal()?`<button class="account-choice ${getState().context==="personal"?"active":""}" data-switch-context="personal" type="button"><span class="avatar">P</span><span><b>Personal</b><small class="muted" style="display:block">Hafalan pribadi</small></span></button>`:""}
    ${pondokChoices()}
   </div>`}
   <button class="account-action danger-text" id="logoutTopBtn" type="button">Logout</button>
  </div>
 </div>`;
}

function profileModal(){
 const account=currentAccount();
 return `<div class="modal-backdrop hidden" id="profileModal">
  <div class="modal-card">
   <div class="row between"><div><p class="eyebrow">Akun</p><h2>Edit Profil</h2></div><button class="btn" id="closeProfileBtn" type="button">Tutup</button></div>
   <div class="stack">
    <div><label class="label">Nama</label><input class="input" id="profileName" value="${account.name}"></div>
    <div><label class="label">Email</label><input class="input" id="profileEmail" type="email" value="${account.email}" disabled><small class="muted">Email tidak dapat diubah.</small></div>
    <div><label class="label">Nomor WhatsApp</label><input class="input" id="profilePhone" value="${account.phone}"></div>
    <small class="muted" id="profileMessage"></small>
    <button class="btn primary full" id="saveProfileBtn" type="button">Simpan Profil</button>
    <div><label class="label">Password lama</label><input class="input" id="profileCurrentPassword" type="password" autocomplete="current-password"></div>
    <div><label class="label">Password baru</label><input class="input" id="profileNewPassword" type="password" autocomplete="new-password" placeholder="Minimal 8 karakter"></div>
    <small class="muted" id="passwordMessage"></small>
    <button class="btn full" id="changePasswordBtn" type="button">Ganti Password</button>
   </div>
  </div>
 </div>`;
}

export function shell(content){
 const s=getState(),route=location.hash.replace("#","")||"dashboard";
 const navRoute=["santri-progress","tabel-progress"].includes(route)?"halaqah":route;
 const nav=navItems().map(([r,l])=>`<a href="#${r}" class="${navRoute===r?"active":""}">${l}</a>`).join("");
 const myPondoks=s.myPondoks||[];
 const activePondok=myPondoks.find(p=>p.id===(s.activePondokId??myPondoks[0]?.id))||myPondoks[0];
 const pondokName=activePondok?.name||s.pondokProfile?.name||"Pondok";
 const activeContext=(s.persona==="super_admin"||(s.persona==="musyrif"&&s.musyrifType==="platform"))?"Platform MetodeQu":s.persona==="musyrif"?pondokName:s.context==="personal"?"Personal":pondokName;
 return `<div class="app-shell"><aside class="sidebar"><div class="brand"><img src="./assets/images/icon.svg?v=6b3a0f52">MetodeQu</div><nav class="nav">${nav}</nav>
 <div class="sidebar-footer"><button class="btn danger full" id="logoutBtn">Keluar</button></div></aside>
 <main class="main"><header class="topbar"><div class="muted" style="font-size:12px;min-width:0;max-width:55vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Konteks aktif: <b style="color:var(--text)">${activeContext}</b></div><div class="row">${notifBell()}<button class="btn" id="themeBtn">${s.theme==="dark"?"Light":"Dark"}</button>${accountMenu()}</div></header>
 <section class="content"><div id="installSlot"></div>${content}</section>
 <nav class="mobile-nav">${mobileNavItems().map(([r,l])=>`<a href="#${r}" data-mobile-route="${r}" class="${navRoute===r?"active":""}"><span class="mobile-nav-icon">${mobileIcon(r)}</span><span class="mobile-nav-label">${l}</span></a>`).join("")}</nav></main>${profileModal()}</div>`;
}

export function bindShell(){
 document.querySelectorAll("[data-mobile-route]").forEach(link=>link.addEventListener("click",event=>{
  event.preventDefault();
  const target="#"+link.dataset.mobileRoute;
  if(location.hash!==target)location.hash=target;
  window.dispatchEvent(new Event("app:render"));
 }));

 document.querySelector("#themeBtn")?.addEventListener("click",()=>{
  const theme=getState().theme==="dark"?"light":"dark";
  setState({theme});
  document.documentElement.dataset.theme=theme;
  window.dispatchEvent(new Event("app:render"));
 });

 const logout=()=>{
  const token=getState().authToken;
  if(token){
   fetch("/api/auth/logout",{method:"POST",headers:{"Authorization":"Bearer "+token}}).catch(()=>{});
  }
  setState({loggedIn:false,persona:"member",context:"personal",musyrifType:null,authToken:null,authUser:null,myPondoks:[],activePondokId:null,myInvites:[]});
  location.hash="login";
 };
 document.querySelector("#logoutBtn")?.addEventListener("click",logout);
 document.querySelector("#logoutTopBtn")?.addEventListener("click",logout);

 const menu=document.querySelector("#accountMenu");
 document.querySelector("#accountBtn")?.addEventListener("click",()=>menu?.classList.toggle("hidden"));

 document.querySelector("#switchAccountBtn")?.addEventListener("click",()=>{
  document.querySelector("#accountSwitcher")?.classList.toggle("hidden");
 });

 document.querySelectorAll("[data-switch-context]").forEach(button=>button.addEventListener("click",()=>{
  const context=button.dataset.switchContext;
  const persona=getState().persona;
  const patch={context};
  if(context==="pondok"&&button.dataset.pondokId!==undefined){
   patch.activePondokId=isNaN(Number(button.dataset.pondokId))?button.dataset.pondokId:Number(button.dataset.pondokId);
  }
  setState(patch);
  menu?.classList.add("hidden");
  if(context==="personal")location.hash="dashboard";
  else location.hash=persona==="admin"?"admin":persona==="musyrif"?"musyrif":"dashboard";
  window.dispatchEvent(new Event("app:render"));
 }));

 const modal=document.querySelector("#profileModal");
 document.querySelector("#editProfileBtn")?.addEventListener("click",()=>{
  menu?.classList.add("hidden");
  modal?.classList.remove("hidden");
  document.querySelector("#profileName")?.focus();
 });
 document.querySelector("#closeProfileBtn")?.addEventListener("click",()=>modal?.classList.add("hidden"));
 modal?.addEventListener("click",event=>{if(event.target===modal)modal.classList.add("hidden")});

 document.querySelector("#saveProfileBtn")?.addEventListener("click",async ()=>{
  const s=getState();
  const btn=document.querySelector("#saveProfileBtn");
  const name=document.querySelector("#profileName")?.value.trim()||"";
  const phone=document.querySelector("#profilePhone")?.value.trim()||"";
  const message=document.querySelector("#profileMessage");
  if(!name||!phone){
   if(message){message.textContent="Nama dan nomor WhatsApp wajib diisi.";message.style.color="var(--danger)";}
   return;
  }
  const applyLocal=(email)=>{
   const profile={...(currentAccount()),name,email:email||currentAccount().email,phone};
   const profileOverrides={...(s.profileOverrides||{}),[s.persona]:profile};
   const authUser=s.authUser?{...s.authUser,name,phone}:s.authUser;
   setState({profileOverrides,authUser});
   modal?.classList.add("hidden");
   window.dispatchEvent(new Event("app:render"));
  };
  if(!s.authToken){
   applyLocal();
   return;
  }
  btn.disabled=true;
  if(message){message.textContent="";message.style.color="";}
  try{
   const r=await fetch("/api/users/me",{method:"PUT",headers:{"Content-Type":"application/json",Accept:"application/json",Authorization:"Bearer "+s.authToken},body:JSON.stringify({name,phone})});
   let b={};try{b=await r.json()}catch{}
   if(!r.ok)throw new Error(b?.errors&&Object.values(b.errors)[0]||b?.message||"Gagal menyimpan.");
   applyLocal(b.data.user.email);
   if(message){message.textContent="Profil diperbarui.";message.style.color="var(--brand)";}
  }catch(err){
   if(message){message.textContent=err?.message||"Gagal menyimpan.";message.style.color="var(--danger)";}
  }
  btn.disabled=false;
 });
 document.querySelector("#changePasswordBtn")?.addEventListener("click",async (e)=>{
  const btn=e.currentTarget,msg=document.querySelector("#passwordMessage");
  const s=getState();
  const current=document.querySelector("#profileCurrentPassword")?.value||"";
  const next=document.querySelector("#profileNewPassword")?.value||"";
  if(!s.authToken){
   if(msg){msg.textContent="Login ulang untuk ganti password.";msg.style.color="var(--danger)";}
   return;
  }
  if(next.length<8){
   if(msg){msg.textContent="Password baru minimal 8 karakter.";msg.style.color="var(--danger)";}
   return;
  }
  btn.disabled=true;
  if(msg){msg.textContent="";msg.style.color="";}
  try{
   const r=await fetch("/api/users/me/password",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",Authorization:"Bearer "+s.authToken},body:JSON.stringify({current_password:current,password:next})});
   let b={};try{b=await r.json()}catch{}
   if(!r.ok)throw new Error(b?.errors&&Object.values(b.errors)[0]||b?.message||"Gagal mengganti.");
   if(msg){msg.textContent="Password diganti. Silakan login ulang.";msg.style.color="var(--brand)";}
   document.querySelector("#profileCurrentPassword").value="";
   document.querySelector("#profileNewPassword").value="";
  }catch(err){
   if(msg){msg.textContent=err?.message||"Gagal mengganti.";msg.style.color="var(--danger)";}
  }
  btn.disabled=false;
 });
}
