import {view,routeName} from "./router.js?v=dev-2f08f073";
import {getState,setState} from "./store.js?v=dev-2f08f073";
import {renderLayout,bindLayout} from "./layouts/app-layout.js?v=dev-2f08f073";
import {bindLogin} from "./pages/login.js?v=dev-2f08f073";
import {toast} from "./utils/helpers.js?v=dev-2f08f073";
let deferredPrompt=null;
function render(){
 const s=getState();document.documentElement.dataset.theme=s.theme;
 const app=document.querySelector("#app");
 const name=routeName(),html=view();
 app.innerHTML=name==="login"?html:renderLayout(html);
 if(name==="login")bindLogin();else bindLayout();
 bindPageActions();renderInstall();
}
function bindPageActions(){
 document.querySelectorAll("[data-check]").forEach(b=>b.addEventListener("click",()=>b.classList.toggle("active")));
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
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js?v=dev-2f08f073"));
if(!location.hash)location.hash=getState().loggedIn?"dashboard":"login";render();
