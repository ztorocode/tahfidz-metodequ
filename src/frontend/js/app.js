import {view,routeName} from "./router.js?v=bc1e4f7d";
import {getState,setState} from "./store.js?v=bc1e4f7d";
import {renderLayout,bindLayout} from "./layouts/app-layout.js?v=bc1e4f7d";
import {bindLogin} from "./pages/login.js?v=bc1e4f7d";
import {toast} from "./utils/helpers.js?v=bc1e4f7d";
let deferredPrompt=null;
function render(){
 const s=getState();document.documentElement.dataset.theme=s.theme;
 const app=document.querySelector("#app");
 const name=routeName(),html=view();
 app.innerHTML=name==="login"?html:renderLayout(html);
 if(name==="login")bindLogin();else bindLayout();
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
async function loadMusyrifList(){
 const box=document.querySelector("#musyrifList");
 if(!box)return;
 const pid=pondokId();
 if(!pid){box.innerHTML='<small class="muted">Pondok tidak diketahui.</small>';return;}
 try{
  const r=await fetch("/api/pondoks/musyrifs?pondok_id="+pid,{headers:authHeaders()});
  const b=await r.json();
  if(!r.ok)throw new Error(b?.message||"Gagal memuat.");
  box.innerHTML=(b.data|| []).length?b.data.map(m=>`<div class="list-item"><span class="avatar">${(m.name||"?").slice(0,1)}</span><div class="grow"><b>${m.name}</b><small class="muted" style="display:block">${m.email} · ${m.phone}</small></div></div>`).join(""):'<small class="muted">Belum ada musyrif.</small>';
 }catch(e){box.innerHTML=`<small class="muted">${e?.message||"Gagal memuat."}</small>`;}
}
function bindPageActions(){
 document.querySelectorAll("[data-check]").forEach(b=>b.addEventListener("click",()=>b.classList.toggle("active")));
 loadMusyrifList();
 document.querySelector("#addMusyrifBtn")?.addEventListener("click",async e=>{
  const btn=e.currentTarget,msg=document.querySelector("#musyrifMessage");
  const pid=pondokId();
  const payload={pondok_id:pid,name:document.querySelector("#musyrifName")?.value.trim()||"",email:(document.querySelector("#musyrifEmail")?.value||"").trim(),phone:document.querySelector("#musyrifPhone")?.value.trim()||"",password:document.querySelector("#musyrifPassword")?.value||""};
  if(!pid||!payload.name||!payload.email||!payload.phone||payload.password.length<8){
   if(msg){msg.textContent="Lengkapi nama, email, WA, dan password (min 8).";msg.style.color="var(--danger)";}
   return;
  }
  btn.disabled=true;btn.textContent="Menambahkan...";
  if(msg){msg.textContent="";msg.style.color="";}
  try{
   const r=await fetch("/api/pondoks/musyrifs",{method:"POST",headers:authHeaders(),body:JSON.stringify(payload)});
   let b={};try{b=await r.json()}catch{}
   if(!r.ok)throw new Error(b?.errors&&Object.values(b.errors)[0]||b?.message||"Gagal menambah.");
   if(msg){msg.textContent="Musyrif "+b.data.name+" ditambahkan.";msg.style.color="var(--brand)";}
   ["#musyrifName","#musyrifEmail","#musyrifPhone","#musyrifPassword"].forEach(sel=>{const el=document.querySelector(sel);if(el)el.value="";});
   loadMusyrifList();
  }catch(err){
   if(msg){msg.textContent=err?.message||"Gagal menambah.";msg.style.color="var(--danger)";}
  }
  btn.disabled=false;btn.textContent="Tambah Musyrif";
 });
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
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js?v=bc1e4f7d"));
if(!location.hash)location.hash=getState().loggedIn?"dashboard":"login";render();
