import {view,routeName} from "./router.js?v=8d268536";
import {getState,setState} from "./store.js?v=8d268536";
import {renderLayout,bindLayout} from "./layouts/app-layout.js?v=8d268536";
import {bindLogin} from "./pages/login.js?v=8d268536";
import {bindInvite} from "./pages/terima-undangan.js?v=8d268536";
import {toast} from "./utils/helpers.js?v=8d268536";
let deferredPrompt=null;
function render(){
 const s=getState();document.documentElement.dataset.theme=s.theme;
 const app=document.querySelector("#app");
 const rawName=routeName().split("?")[0];
 const name=routeName(),html=view();
 app.innerHTML=(rawName==="login"||rawName==="terima-undangan"||!getState().loggedIn)?html:renderLayout(html);
 if(rawName==="login")bindLogin();else if(rawName==="terima-undangan"){bindInvite();}else bindLayout();
 bindPageActions();renderInstall();
}
function pondokId(){
 const s=getState();
 return s.activePondokId??s.authUser?.pondoks?.[0]?.id??null;
}
function authHeaders(){
 const h={"Content-Type":"application/json","Accept":"application/json"};
 const t=getState().authToken;
 if(t)h["Authorization"]="Bearer "+t;
 return h;
}
async function api(path,options={}){
 const r=await fetch(path,{headers:authHeaders(),...options});
 let b={};try{b=await r.json()}catch{}
 if(!r.ok)throw new Error(b?.errors&&Object.values(b.errors)[0]||b?.message||"Gagal.");
 return b;
}
async function loadMusyrifList(){
  const box=document.querySelector("#musyrifList");
  if(!box)return;
  const pid=pondokId();
  if(!pid){box.innerHTML='<small class="muted">Pondok tidak diketahui.</small>';return;}
  try{
   const b=await api("/api/pondoks/musyrifs?pondok_id="+pid);
   box.innerHTML=(b.data|| []).length?b.data.map(m=>`<div class="list-item"><span class="avatar">${(m.name||"?").slice(0,1)}</span><div class="grow"><b>${m.name}</b><small class="muted" style="display:block">${m.email} · ${m.phone}</small></div></div>`).join(""):'<small class="muted">Belum ada musyrif.</small>';
  }catch(e){box.innerHTML=`<small class="muted">${e?.message||"Gagal memuat."}</small>`;}
  try{
   const box2=document.querySelector("#inviteList");
   if(box2){
    const ib=await api("/api/pondok-invites?pondok_id="+pid+"&role=musyrif");
    const rows=(ib.data||[]);
    box2.innerHTML=rows.length?rows.map(v=>`<div class="list-item"><span class="avatar">✉</span><div class="grow"><b>${v.generic?"Link umum":v.invited_email}</b><small class="muted" style="display:block">${v.status} · s/d ${String(v.expires_at||"").slice(0,10)}</small></div>${v.status==="pending"?`<button class="btn" type="button" data-revoke-invite="${v.id}">Batal</button><button class="btn secondary" type="button" data-regen-invite="${v.id}">Salin</button>`:""}</div>`).join(""):'<small class="muted">Belum ada undangan.</small>';
   }
  }catch(e){}
 loadPendingList("musyrif","pendingMusyrifList",()=>loadMusyrifList());
}
async function refreshMyInvites(){
 const s=getState();
 if(!s.authToken||!s.authUser?.email)return;
 try{
  const r=await fetch("/api/pondok-invites/mine",{headers:{Accept:"application/json",Authorization:"Bearer "+s.authToken}});
  const b=await r.json();
  if(r.ok)setState({myInvites:b.data||[]});
 }catch(e){}
}
async function loadInviteBanner(){
 const box=document.querySelector("#inviteBanner");
 if(box){
  await refreshMyInvites();
  const mine=getState().myInvites||[];
  const dot=document.querySelector("#notifDot");
  if(dot){
   if(mine.length){dot.classList.remove("hidden");dot.textContent=mine.length>9?"9+":String(mine.length);}
   else{dot.classList.add("hidden");dot.textContent="";}
  }
  box.innerHTML=mine.length?`<div class="card" style="margin-bottom:16px;border-left:4px solid var(--brand)"><div class="row between"><div><b>Anda punya ${mine.length} undangan pondok</b><small class="muted" style="display:block">${mine.map(v=>v.pondok_name).join(", ")}</small></div><a class="btn primary" href="#notifications">Lihat</a></div></div>`:"";
 }
 document.querySelectorAll("[data-accept-invite]").forEach(btn=>btn.addEventListener("click",async ()=>{
  const s=getState();
  btn.disabled=true;
  try{
   const r=await fetch("/api/pondok-invites/accept-mine",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",Authorization:"Bearer "+s.authToken},body:JSON.stringify({id:Number(btn.dataset.acceptInvite)})});
   let b={};try{b=await r.json()}catch{}
   if(!r.ok)throw new Error(b?.message||"Gagal menerima.");
   const user=b.data.user||{};
   const pondok=(user.pondoks||[])[0];
   const myPondoks=[...(s.myPondoks||[])];
   if(pondok&&!myPondoks.some(p=>p.id===pondok.id))myPondoks.push(pondok);
   setState({authToken:b.data.token,authUser:user,myPondoks,activePondokId:pondok?.id??s.activePondokId,myInvites:(s.myInvites||[]).filter(v=>v.id!==Number(btn.dataset.acceptInvite))});
   window.dispatchEvent(new Event("app:render"));
  }catch(err){
   alert(err?.message||"Gagal menerima.");
   btn.disabled=false;
  }
 }));
}
async function loadPendingList(role,boxId,reload){
 const box=document.querySelector("#"+boxId);
 if(!box)return;
 const pid=pondokId();
 if(!pid){box.innerHTML='<small class="muted">Pondok tidak diketahui.</small>';return;}
 try{
  const b=await api("/api/pondoks/members/pending?pondok_id="+pid+"&role="+role);
  const rows=(b.data||[]);
  box.innerHTML=rows.length?rows.map(v=>`<div class="list-item"><span class="avatar">${(v.name||"?").slice(0,1)}</span><div class="grow"><b>${v.name}</b><small class="muted" style="display:block">${v.email} · ${v.phone||"-"}</small></div><button class="btn primary" type="button" data-approve-member="${v.id}">Setujui</button><button class="btn" type="button" data-reject-member="${v.id}">Tolak</button></div>`).join(""):'<small class="muted">Tidak ada pengajuan.</small>';
  box.querySelectorAll("[data-approve-member]").forEach(btn=>btn.addEventListener("click",async ()=>{
   const who=btn.closest(".list-item")?.querySelector("b")?.textContent||"pengajuan ini";
   if(!confirm("Setujui "+who+"?"))return;
   btn.disabled=true;
   try{await api("/api/pondoks/members/approve",{method:"POST",body:JSON.stringify({id:Number(btn.dataset.approveMember)})});toast("Pengajuan disetujui.");}
   catch(err){alert(err?.message||"Gagal menyetujui.");}
   reload();
  }));
  box.querySelectorAll("[data-reject-member]").forEach(btn=>btn.addEventListener("click",async ()=>{
   if(!confirm("Tolak pengajuan ini?"))return;
   btn.disabled=true;
   try{await api("/api/pondoks/members/reject",{method:"POST",body:JSON.stringify({id:Number(btn.dataset.rejectMember)})});toast("Pengajuan ditolak.");}
   catch(err){alert(err?.message||"Gagal menolak.");}
   reload();
  }));
 }catch(e){box.innerHTML=`<small class="muted">${e?.message||"Gagal memuat."}</small>`;}
}
function bindPageActions(){
 document.querySelectorAll("[data-check]").forEach(b=>b.addEventListener("click",()=>b.classList.toggle("active")));
 loadMusyrifList();
 loadInviteBanner();
 async function loadSantriList(){
  const box=document.querySelector("#santriList");
  if(!box)return;
  const pid=pondokId();
  if(!pid){box.innerHTML='<small class="muted">Pondok tidak diketahui.</small>';return;}
  try{
   const b=await api("/api/pondoks/santris?pondok_id="+pid);
   box.innerHTML=(b.data|| []).length?b.data.map(m=>`<div class="list-item"><span class="avatar">${(m.name||"?").slice(0,1)}</span><div class="grow"><b>${m.name}</b><small class="muted" style="display:block">${m.email} · ${m.phone}</small></div></div>`).join(""):'<small class="muted">Belum ada santri.</small>';
  }catch(e){box.innerHTML=`<small class="muted">${e?.message||"Gagal memuat."}</small>`;}
  try{
   const box2=document.querySelector("#santriInviteList");
   if(box2){
    const ib=await api("/api/pondok-invites?pondok_id="+pid+"&role=santri");
    const rows=(ib.data||[]);
    box2.innerHTML=rows.length?rows.map(v=>`<div class="list-item"><span class="avatar">✉</span><div class="grow"><b>${v.generic?"Link umum":v.invited_email}</b><small class="muted" style="display:block">${v.status} · s/d ${String(v.expires_at||"").slice(0,10)}</small></div>${v.status==="pending"?`<button class="btn" type="button" data-revoke-invite="${v.id}">Batal</button><button class="btn secondary" type="button" data-regen-invite="${v.id}">Salin</button>`:""}</div>`).join(""):'<small class="muted">Belum ada undangan.</small>';
   }
  }catch(e){}
  loadPendingList("santri","pendingSantriList",()=>{loadSantriList();});
 }
 const inviteSantriModal=()=>document.querySelector("#inviteSantriModal");
 document.querySelector("#inviteSantriBtn")?.addEventListener("click",()=>{
  const m=inviteSantriModal();if(!m)return;
  const msg=document.querySelector("#santriMessage");
  if(msg){msg.textContent="";msg.style.color="";}
  m.classList.remove("hidden");
 });
 document.querySelector("#closeInviteSantriBtn")?.addEventListener("click",()=>inviteSantriModal()?.classList.add("hidden"));
 inviteSantriModal()?.addEventListener("click",event=>{if(event.target===inviteSantriModal())inviteSantriModal()?.classList.add("hidden");});
 document.querySelector("#sendSantriInviteBtn")?.addEventListener("click",async e=>{
  const btn=e.currentTarget,msg=document.querySelector("#santriMessage");
  const pid=pondokId();
  const emails=(document.querySelector("#santriEmail")?.value||"").split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean);
  if(!pid||!emails.length){
   if(msg){msg.textContent="Isi minimal satu email.";msg.style.color="var(--danger)";}
   return;
  }
  btn.disabled=true;btn.textContent="Mengirim...";
  if(msg){msg.textContent="";msg.style.color="";}
  try{
   const b=await api("/api/pondok-invites",{method:"POST",body:JSON.stringify({pondok_id:pid,role:"santri",emails})});
   const sent=(b.data?.sent||[]).map(x=>x.email);
   const failed=(b.data?.failed||[]).map(x=>x.email+" ("+x.message+")");
   if(msg){
    msg.textContent=(sent.length?sent.length+" undangan terkirim":"")+((sent.length&&failed.length)?"; ":"")+failed.join("; ");
    msg.style.color=failed.length?"var(--danger)":"var(--brand)";
   }
   document.querySelector("#santriEmail").value="";
   loadSantriList();
   if(!failed.length)setTimeout(()=>inviteSantriModal()?.classList.add("hidden"),900);
  }catch(err){
   if(msg){msg.textContent=err?.message||"Gagal mengirim.";msg.style.color="var(--danger)";}
  }
  btn.disabled=false;btn.textContent="Kirim";
 });
 loadSantriList();
 let suggestTimer=null;
 const emailInput=document.querySelector("#musyrifEmail");
 const suggestBox=document.createElement("div");
 suggestBox.id="emailSuggest";
 suggestBox.className="list";
 suggestBox.style.marginTop="4px";
 emailInput?.after(suggestBox);
 emailInput?.addEventListener("input",()=>{
  suggestBox.innerHTML="";
  clearTimeout(suggestTimer);
  const lines=emailInput.value.split("\n");
  const q=(lines[lines.length-1]||"").trim();
  if(q.length<2)return;
  suggestTimer=setTimeout(async ()=>{
   try{
    const pid=pondokId();
    if(!pid)return;
    const b=await api("/api/users/search?pondok_id="+pid+"&q="+encodeURIComponent(q));
    const rows=b.data||[];
    suggestBox.innerHTML=rows.map(u=>`<button type="button" class="list-item" data-suggest-email="${u.email}" style="width:100%;text-align:left"><span class="avatar">${(u.name||"?").slice(0,1)}</span><div class="grow"><b>${u.name}</b><small class="muted" style="display:block">${u.email} · ${u.phone}${u.pondok_role?(" · sudah "+u.pondok_role+" di pondok ini"):" · sudah terdaftar"}</small></div></button>`).join("");
    suggestBox.querySelectorAll("[data-suggest-email]").forEach(btn=>btn.addEventListener("click",()=>{
     const parts=document.querySelector("#musyrifEmail").value.split("\n");
     parts[parts.length-1]=btn.dataset.suggestEmail;
     document.querySelector("#musyrifEmail").value=parts.join("\n").replace(/\n$/,"")+"\n";
     suggestBox.innerHTML="";
    }));
   }catch(e){}
  },300);
 });
 const inviteMusyrifModal=()=>document.querySelector("#inviteMusyrifModal");
 document.querySelector("#inviteMusyrifBtn")?.addEventListener("click",()=>{
  const m=inviteMusyrifModal();if(!m)return;
  const msg=document.querySelector("#musyrifMessage");
  if(msg){msg.textContent="";msg.style.color="";}
  m.classList.remove("hidden");
 });
 document.querySelector("#closeInviteMusyrifBtn")?.addEventListener("click",()=>inviteMusyrifModal()?.classList.add("hidden"));
 inviteMusyrifModal()?.addEventListener("click",event=>{if(event.target===inviteMusyrifModal())inviteMusyrifModal()?.classList.add("hidden");});
 document.querySelector("#sendMusyrifInviteBtn")?.addEventListener("click",async e=>{
  const btn=e.currentTarget,msg=document.querySelector("#musyrifMessage");
  const pid=pondokId();
  const emails=(document.querySelector("#musyrifEmail")?.value||"").split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean);
  if(!pid||!emails.length){
   if(msg){msg.textContent="Isi minimal satu email.";msg.style.color="var(--danger)";}
   return;
  }
  btn.disabled=true;btn.textContent="Mengirim...";
  if(msg){msg.textContent="";msg.style.color="";}
  try{
   const b=await api("/api/pondok-invites",{method:"POST",body:JSON.stringify({pondok_id:pid,role:"musyrif",emails})});
   const sent=(b.data?.sent||[]).map(x=>x.email);
   const failed=(b.data?.failed||[]).map(x=>x.email+" ("+x.message+")");
   if(msg){
    msg.textContent=(sent.length?sent.length+" undangan terkirim":"")+((sent.length&&failed.length)?"; ":"")+failed.join("; ");
    msg.style.color=failed.length?"var(--danger)":"var(--brand)";
   }
   document.querySelector("#musyrifEmail").value="";
   loadMusyrifList();
   if(!failed.length)setTimeout(()=>inviteMusyrifModal()?.classList.add("hidden"),900);
  }catch(err){
   if(msg){msg.textContent=err?.message||"Gagal mengirim.";msg.style.color="var(--danger)";}
  }
  btn.disabled=false;btn.textContent="Kirim";
 });
  async function copyStandingLink(role,msg){
   const pid=pondokId();
   if(!pid){if(msg){msg.textContent="Pondok tidak diketahui.";msg.style.color="var(--danger)";}return;}
   try{
    const b=await api("/api/pondok-invites/standing-link",{method:"POST",body:JSON.stringify({pondok_id:pid,role})});
    const link=b.data?.link||"";
    if(!link)throw new Error("Link tidak tersedia.");
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(link);
    else{
     const ta=document.createElement("textarea");
     ta.value=link;document.body.appendChild(ta);ta.select();
     document.execCommand("copy");ta.remove();
    }
    if(msg){msg.textContent="Link tersalin. Bagikan ke calon "+role+".";msg.style.color="var(--brand)";}
    toast("Link undangan tersalin ke clipboard.");
   }catch(err){
    if(msg){msg.textContent=err?.message||"Gagal menyalin link.";msg.style.color="var(--danger)";}
   }
  }
  document.querySelector("#copySantriLinkBtn")?.addEventListener("click",async e=>{
   const btn=e.currentTarget;
   btn.disabled=true;
   await copyStandingLink("santri",document.querySelector("#santriMessage"));
   btn.disabled=false;
  });
  const santriModal=()=>document.querySelector("#santriModal");
  document.querySelector("#addSantriBtn")?.addEventListener("click",()=>{
   const m=santriModal();if(!m)return;
   const msg=document.querySelector("#newSantriMessage");
   if(msg){msg.textContent="";msg.style.color="";}
   m.classList.remove("hidden");
   document.querySelector("#newSantriName")?.focus();
  });
  document.querySelector("#closeSantriBtn")?.addEventListener("click",()=>santriModal()?.classList.add("hidden"));
  santriModal()?.addEventListener("click",event=>{if(event.target===santriModal())santriModal()?.classList.add("hidden");});
  document.querySelector("#saveSantriBtn")?.addEventListener("click",async e=>{
   const btn=e.currentTarget,msg=document.querySelector("#newSantriMessage");
   const pid=pondokId();
   const payload={
    pondok_id:pid,
    name:(document.querySelector("#newSantriName")?.value||"").trim(),
    email:(document.querySelector("#newSantriEmail")?.value||"").trim(),
    phone:(document.querySelector("#newSantriPhone")?.value||"").trim(),
    password:document.querySelector("#newSantriPassword")?.value||""
   };
   if(msg){msg.textContent="";msg.style.color="";}
   btn.disabled=true;btn.textContent="Menyimpan...";
   try{
    const b=await api("/api/pondoks/santris",{method:"POST",body:JSON.stringify(payload)});
    if(msg){msg.textContent="Santri "+(b.data?.name||"")+" ditambahkan.";msg.style.color="var(--brand)";}
    ["#newSantriName","#newSantriEmail","#newSantriPhone","#newSantriPassword"].forEach(s=>{const el=document.querySelector(s);if(el)el.value="";});
    if(typeof loadSantriList==="function")loadSantriList();
    else window.dispatchEvent(new Event("app:render"));
    setTimeout(()=>santriModal()?.classList.add("hidden"),800);
   }catch(err){
    if(msg){msg.textContent=err?.message||"Gagal menyimpan.";msg.style.color="var(--danger)";}
   }
   btn.disabled=false;btn.textContent="Simpan Santri";
  });
  document.querySelector("#copyMusyrifLinkBtn")?.addEventListener("click",async e=>{
   const btn=e.currentTarget;
   btn.disabled=true;
   await copyStandingLink("musyrif",document.querySelector("#musyrifMessage"));
   btn.disabled=false;
  });
  const musyrifModal=()=>document.querySelector("#musyrifModal");
  document.querySelector("#addMusyrifBtn")?.addEventListener("click",()=>{
   const m=musyrifModal();if(!m)return;
   const msg=document.querySelector("#newMusyrifMessage");
   if(msg){msg.textContent="";msg.style.color="";}
   m.classList.remove("hidden");
   document.querySelector("#newMusyrifName")?.focus();
  });
  document.querySelector("#closeMusyrifBtn")?.addEventListener("click",()=>musyrifModal()?.classList.add("hidden"));
  musyrifModal()?.addEventListener("click",event=>{if(event.target===musyrifModal())musyrifModal()?.classList.add("hidden");});
  document.querySelector("#saveMusyrifBtn")?.addEventListener("click",async e=>{
   const btn=e.currentTarget,msg=document.querySelector("#newMusyrifMessage");
   const pid=pondokId();
   const payload={
    pondok_id:pid,
    name:(document.querySelector("#newMusyrifName")?.value||"").trim(),
    email:(document.querySelector("#newMusyrifEmail")?.value||"").trim(),
    phone:(document.querySelector("#newMusyrifPhone")?.value||"").trim(),
    password:document.querySelector("#newMusyrifPassword")?.value||""
   };
   if(msg){msg.textContent="";msg.style.color="";}
   btn.disabled=true;btn.textContent="Menyimpan...";
   try{
    const b=await api("/api/pondoks/musyrifs",{method:"POST",body:JSON.stringify(payload)});
    if(msg){msg.textContent="Musyrif "+(b.data?.name||"")+" ditambahkan.";msg.style.color="var(--brand)";}
    ["#newMusyrifName","#newMusyrifEmail","#newMusyrifPhone","#newMusyrifPassword"].forEach(s=>{const el=document.querySelector(s);if(el)el.value="";});
    loadMusyrifList();
    setTimeout(()=>musyrifModal()?.classList.add("hidden"),800);
   }catch(err){
    if(msg){msg.textContent=err?.message||"Gagal menyimpan.";msg.style.color="var(--danger)";}
   }
   btn.disabled=false;btn.textContent="Simpan Musyrif";
  });
  document.querySelectorAll("[data-copy-invite-link]").forEach(btn=>btn.addEventListener("click",async ()=>{
   const link=btn.dataset.copyInviteLink||"";
   if(!link)return;
   try{
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(link);
    else{
     const ta=document.createElement("textarea");
     ta.value=link;document.body.appendChild(ta);ta.select();
     document.execCommand("copy");ta.remove();
    }
    // find a nearby message element to show success
    const msg=btn.closest('.list-item')?.querySelector('.muted')||null;
    if(msg){msg.textContent="Link tersalin.";msg.style.color="var(--brand)";}
    toast("Link undangan tersalin ke clipboard.");
   }catch(err){
    prompt("Salin link berikut:",link);
   }
  }));
 document.querySelectorAll("[data-regen-invite]").forEach(b=>b.addEventListener("click",async ()=>{
 const btn=b,label=btn.textContent;
 btn.disabled=true;btn.textContent="Menyalin...";
 try{
  const r=await api("/api/pondok-invites/regenerate",{method:"POST",body:JSON.stringify({id:Number(btn.dataset.regenInvite)})});
  const link=r.data?.link||"";
  if(!link)throw new Error("Link tidak tersedia.");
  if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(link);
  else{
   const ta=document.createElement("textarea");
   ta.value=link;document.body.appendChild(ta);ta.select();
   document.execCommand("copy");ta.remove();
  }
  btn.textContent="Tersalin!";
  toast("Link undangan tersalin ke clipboard.");
  setTimeout(()=>{btn.disabled=false;btn.textContent=label;},1500);
 }catch(err){
  alert(err?.message||"Gagal menyalin link.");
  btn.disabled=false;btn.textContent=label;
 }
}));
document.querySelectorAll("[data-revoke-invite]").forEach(b=>b.addEventListener("click",async ()=>{
  if(!confirm("Batalkan undangan ini?"))return;
  try{await api("/api/pondok-invites/revoke",{method:"POST",body:JSON.stringify({id:Number(b.dataset.revokeInvite)})});loadMusyrifList();loadSantriList();}
  catch(err){alert(err?.message||"Gagal membatalkan.");}
 }));
 document.querySelector("#recordBtn")?.addEventListener("click",e=>{e.currentTarget.textContent="■ Sedang Merekam";toast("Rekaman demo dimulai")});
 document.querySelector("#submitDemo")?.addEventListener("click",()=>toast("Setoran demo dikirim ke musyrif"));
 document.querySelectorAll("[data-resend]").forEach(b=>b.addEventListener("click",()=>toast("Pesan dimasukkan kembali ke queue")));
}
function renderInstall(){
 const slot=document.querySelector("#installSlot");if(!slot||!deferredPrompt)return;
 slot.innerHTML='<div class="install-banner"><div><b>Install MetodeQu</b><div style="font-size:12px">Buka lebih cepat dan gunakan app shell saat offline.</div></div><button class="btn primary" id="installBtn">Install</button></div>';
 document.querySelector("#installBtn")?.addEventListener("click",async()=>{deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;slot.innerHTML=""});
}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;renderInstall()});
window.addEventListener("hashchange",render);window.addEventListener("app:render",render);
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js?v=8d268536"));
if(!location.hash)location.hash=getState().loggedIn?"dashboard":"login";render();
