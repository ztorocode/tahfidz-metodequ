import {getState,setState} from "../store.js?v=dev-2f08f073";

const memberNav=[["dashboard","Dashboard"],["program","Program"],["activity","Aktivitas Hari Ini"],["submission","Setoran"],["murajaah","Muraja'ah"],["notifications","Notifikasi"]];
const musyrifNav=[["musyrif","Dashboard"],["review","Setoran"],["halaqah","Halaqah"],["notifications","Notifikasi"]];
const adminNav=[["admin","Dashboard"],["halaqah","Halaqah"],["whatsapp","WhatsApp"],["notifications","Notifikasi"]];

const demoAccounts={
 member:{name:"Ahmad Fauzi",role:"Member",email:"member@metodequ.id",phone:"+62 812 3456 7890",initials:"AF"},
 musyrif:{name:"Ust. Rahmat Hidayat",role:"Musyrif",email:"musyrif@metodequ.id",phone:"+62 813 4567 8901",initials:"RH"},
 admin:{name:"Admin Pondok",role:"Admin",email:"admin@metodequ.id",phone:"+62 811 2345 6789",initials:"AP"}
};

function navItems(){
 const s=getState();
 if(s.context==="personal")return memberNav;
 return s.persona==="admin"?adminNav:s.persona==="musyrif"?musyrifNav:memberNav;
}

function currentAccount(){
 const s=getState();
 const base=demoAccounts[s.persona]||demoAccounts.member;
 const overrides=s.profileOverrides?.[s.persona]||{};
 return {...base,...overrides};
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
   <button class="account-action" id="switchAccountBtn" type="button">Switch Akun</button>
   <div class="account-switcher hidden" id="accountSwitcher">
    <small class="muted" style="display:block;padding:4px 2px">Pilih konteks aktif</small>
    <button class="account-choice ${getState().context==="personal"?"active":""}" data-switch-context="personal" type="button"><span class="avatar">P</span><span><b>Personal</b><small class="muted" style="display:block">Hafalan pribadi</small></span></button>
    <button class="account-choice ${getState().context==="pondok"?"active":""}" data-switch-context="pondok" type="button"><span class="avatar">P</span><span><b>${getState().pondokProfile?.name||"Pondok Al-Furqan"}</b><small class="muted" style="display:block">Konteks pondok</small></span></button>
   </div>
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
    <div><label class="label">Email</label><input class="input" id="profileEmail" type="email" value="${account.email}"></div>
    <div><label class="label">Nomor WhatsApp</label><input class="input" id="profilePhone" value="${account.phone}"></div>
    <small class="muted" id="profileMessage"></small>
    <button class="btn primary full" id="saveProfileBtn" type="button">Simpan Profil</button>
   </div>
  </div>
 </div>`;
}

export function shell(content){
 const s=getState(),route=location.hash.replace("#","")||"dashboard";
 const navRoute=route==="santri-progress"?"halaqah":route;
 const nav=navItems().map(([r,l])=>`<a href="#${r}" class="${navRoute===r?"active":""}">${l}</a>`).join("");
 const activeContext=s.context==="personal"?"Personal":(s.pondokProfile?.name||"Pondok Al-Furqan");
 return `<div class="app-shell"><aside class="sidebar"><div class="brand"><img src="./assets/images/icon.svg?v=7f3a91c2">MetodeQu</div><nav class="nav">${nav}</nav>
 <div class="sidebar-footer"><button class="btn danger full" id="logoutBtn">Keluar</button></div></aside>
 <main class="main"><header class="topbar"><div class="muted" style="font-size:12px;min-width:0;max-width:55vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Konteks aktif: <b style="color:var(--text)">${activeContext}</b></div><div class="row"><button class="btn" id="themeBtn">${s.theme==="dark"?"Light":"Dark"}</button>${accountMenu()}</div></header>
 <section class="content"><div id="installSlot"></div>${content}</section>
 <nav class="mobile-nav">${navItems().slice(0,5).map(([r,l])=>`<a href="#${r}" class="${navRoute===r?"active":""}">${l}</a>`).join("")}</nav></main>${profileModal()}</div>`;
}

export function bindShell(){

 document.querySelector("#themeBtn")?.addEventListener("click",()=>{
  const theme=getState().theme==="dark"?"light":"dark";
  setState({theme});
  document.documentElement.dataset.theme=theme;
  window.dispatchEvent(new Event("app:render"));
 });

 const logout=()=>{
  setState({loggedIn:false,persona:"member",context:"personal"});
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
  setState({context});
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

 document.querySelector("#saveProfileBtn")?.addEventListener("click",()=>{
  const s=getState();
  const name=document.querySelector("#profileName")?.value.trim()||"";
  const email=document.querySelector("#profileEmail")?.value.trim()||"";
  const phone=document.querySelector("#profilePhone")?.value.trim()||"";
  const message=document.querySelector("#profileMessage");
  if(!name||!email||!phone){
   if(message){message.textContent="Nama, email, dan nomor WhatsApp wajib diisi.";message.style.color="var(--danger)";}
   return;
  }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
   if(message){message.textContent="Format email belum valid.";message.style.color="var(--danger)";}
   return;
  }
  const profileOverrides={...(s.profileOverrides||{}),[s.persona]:{name,email,phone}};
  setState({profileOverrides});
  modal?.classList.add("hidden");
  window.dispatchEvent(new Event("app:render"));
 });
}
