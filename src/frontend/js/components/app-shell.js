import {getState,setState} from "../store.js?v=dev-7fd29b64";

const memberNav=[["dashboard","Dashboard"],["program","Program"],["activity","Aktivitas Hari Ini"],["submission","Setoran"],["murajaah","Muraja'ah"],["notifications","Notifikasi"]];
const musyrifNav=[["musyrif","Dashboard"],["review","Setoran"],["halaqah","Halaqah"],["notifications","Notifikasi"]];
const adminNav=[["admin","Dashboard"],["halaqah","Halaqah"],["whatsapp","WhatsApp"],["notifications","Notifikasi"]];
const memberMobileNav=[["dashboard","Dashboard"],["progress","Progress"],["report","Report"]];

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
  notifications:`<svg ${common}><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8"/><path d="M10 20h4"/></svg>`
 };
 return icons[route]||icons.dashboard;
}

function mobileNavItems(){
 return getState().persona==="member"?memberMobileNav:navItems().slice(0,5);
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
 const navRoute=["santri-progress","tabel-progress"].includes(route)?"halaqah":route;
 const nav=navItems().map(([r,l])=>`<a href="#${r}" class="${navRoute===r?"active":""}">${l}</a>`).join("");
 const activeContext=s.context==="personal"?"Personal":(s.pondokProfile?.name||"Pondok Al-Furqan");
 return `<div class="app-shell"><aside class="sidebar"><div class="brand"><img src="./assets/images/icon.svg?v=7f3a91c2">MetodeQu</div><nav class="nav">${nav}</nav>
 <div class="sidebar-footer"><button class="btn danger full" id="logoutBtn">Keluar</button></div></aside>
 <main class="main"><header class="topbar"><div class="muted" style="font-size:12px;min-width:0;max-width:55vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Konteks aktif: <b style="color:var(--text)">${activeContext}</b></div><div class="row"><button class="btn" id="themeBtn">${s.theme==="dark"?"Light":"Dark"}</button>${accountMenu()}</div></header>
 <section class="content"><div id="installSlot"></div>${content}</section>
 <nav class="mobile-nav">${mobileNavItems().map(([r,l])=>`<a href="#${r}" data-mobile-route="${r}" class="${navRoute===r?"active":""}"><span class="mobile-nav-icon">${mobileIcon(r)}</span><span class="mobile-nav-label">${l}</span></a>`).join("")}</nav></main>${profileModal()}</div>`;
}

export function bindShell(){
 document.querySelectorAll("[data-mobile-route]").forEach(link=>link.addEventListener("click",event=>{
  const route=link.dataset.mobileRoute;
  if(route!=="progress"&&route!=="report")return;
  event.preventDefault();
  const target="#"+route;
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
