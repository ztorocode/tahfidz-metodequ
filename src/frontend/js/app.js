import {view,routeName} from "./router.js?v=e456ddf9";
import {getState,setState} from "./store.js?v=e456ddf9";
import {renderLayout,bindLayout} from "./layouts/app-layout.js?v=e456ddf9";
import {bindLogin} from "./pages/login.js?v=e456ddf9";
import {bindInvite} from "./pages/terima-undangan.js?v=e456ddf9";
import {toast} from "./utils/helpers.js?v=e456ddf9";
let deferredPrompt=null;
function render(){
 const s=getState();document.documentElement.dataset.theme=s.theme;
 const app=document.querySelector("#app");
 const rawName=routeName().split("?")[0];
 const name=routeName(),html=view();
 app.innerHTML=(rawName==="login"||rawName==="terima-undangan"||!getState().loggedIn)?html:renderLayout(html);
 if(name==="login")bindLogin();else if(name==="terima-undangan"){bindInvite();}else bindLayout();
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
   box2.innerHTML=rows.length?rows.map(v=>`<div class="list-item"><span class="avatar">✉</span><div class="grow"><b>${v.invited_email}</b><small class="muted" style="display:block">${v.status} · s/d ${String(v.expires_at||"").slice(0,10)}</small></div>${v.status==="pending"?`<button class="btn" type="button" data-revoke-invite="${v.id}">Batal</button>`:""}</div>`).join(""):'<small class="muted">Belum ada undangan.</small>';
  }
 }catch(e){}
}
function bindPageActions(){
 document.querySelectorAll("[data-check]").forEach(b=>b.addEventListener("click",()=>b.classList.toggle("active")));
 loadMusyrifList();
 document.querySelector("#inviteMusyrifBtn")?.addEventListener("click",async e=>{
  const btn=e.currentTarget,msg=document.querySelector("#musyrifMessage");
  const pid=pondokId();
  const payload={pondok_id:pid,role:"musyrif",name:document.querySelector("#musyrifName")?.value.trim()||"",email:(document.querySelector("#musyrifEmail")?.value||"").trim(),phone:document.querySelector("#musyrifPhone")?.value.trim()||""};
  if(!pid||!payload.name||!payload.email||!payload.phone){
   if(msg){msg.textContent="Lengkapi nama, email, dan nomor WA.";msg.style.color="var(--danger)";}
   return;
  }
  btn.disabled=true;btn.textContent="Mengirim...";
  if(msg){msg.textContent="";msg.style.color="";}
  try{
   const b=await api("/api/pondok-invites",{method:"POST",body:JSON.stringify(payload)});
   const via=[b.data.email_sent?"email":null,b.data.wa_sent?"WA":null].filter(Boolean).join(" & ")||" (tapi pengiriman gagal, cek lagi)";
   if(msg){msg.textContent="Undangan terkirim via "+via+".";msg.style.color="var(--brand)";}
   ["#musyrifName","#musyrifEmail","#musyrifPhone"].forEach(sel=>{const el=document.querySelector(sel);if(el)el.value="";});
   loadMusyrifList();
  }catch(err){
   if(msg){msg.textContent=err?.message||"Gagal mengirim.";msg.style.color="var(--danger)";}
  }
  btn.disabled=false;btn.textContent="Kirim Undangan";
 });
 document.querySelectorAll("[data-revoke-invite]").forEach(b=>b.addEventListener("click",async ()=>{
  if(!confirm("Batalkan undangan ini?"))return;
  try{await api("/api/pondok-invites/revoke",{method:"POST",body:JSON.stringify({id:Number(b.dataset.revokeInvite)})});loadMusyrifList();}
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
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js?v=e456ddf9"));
if(!location.hash)location.hash=getState().loggedIn?"dashboard":"login";render();
