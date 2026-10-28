import {getState,setState} from "./store.js?v=81bed469";
import {loginPage,bindLogin} from "./pages/login.js?v=f1a72c9b";

const PRIVATE_RUNTIME="./private-app.js?v=f1a72c9b";
const INVITE_PAGE="./pages/terima-undangan.js?v=f1a72c9b";
let privateRuntime=null;
let inviteModule=null;
let renderGeneration=0;

function routeName(){return location.hash.replace(/^#/,"")||"dashboard"}
function rawRoute(){return routeName().split("?")[0]}

function clearInvalidSession(){
 const s=getState();
 if(!s.loggedIn||s.authToken||s.demoSession)return false;
 setState({
  loggedIn:false,persona:"member",context:"personal",musyrifType:null,
  authToken:null,authUser:null,myPondoks:[],activePondokId:null,
  realHalaqahs:[],halaqahSrc:null,halaqahFetchedAt:0,
  realMusyrifs:[],musyrifSrc:null,realSantris:[],santriSrc:null,
  halaqahs:[],halaqahImported:null
 });
 return true;
}

async function publicInvite(){
 inviteModule ||= import(INVITE_PAGE);
 return inviteModule;
}

async function authenticatedRuntime(){
 privateRuntime ||= import(PRIVATE_RUNTIME);
 return privateRuntime;
}

async function render(){
 const generation=++renderGeneration;
 const state=getState();
 document.documentElement.dataset.theme=state.theme;
 const app=document.querySelector("#app");
 if(!app)return;

 const route=rawRoute();

 // Halaman undangan tetap public dan tidak memuat bundle private.
 if(route==="terima-undangan"){
  const mod=await publicInvite();
  if(generation!==renderGeneration)return;
  app.innerHTML=mod.acceptInvitePage();
  mod.bindInvite();
  return;
 }

 if(clearInvalidSession()){
  if(rawRoute()!=="login"){location.hash="login";return;}
 }

 if(!getState().loggedIn){
  if(route!=="login"){location.hash="login";return;}
  app.innerHTML=loginPage();
  bindLogin();
  return;
 }

 // Mulai titik ini baru source private (router/layout/dashboard/admin/etc.) diunduh.
 const mod=await authenticatedRuntime();
 if(generation!==renderGeneration)return;
 mod.renderPrivate();
}

window.addEventListener("hashchange",()=>{render();});
window.addEventListener("app:render",()=>{render();});

if("serviceWorker" in navigator){
 window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js?v=f1a72c9b"));
}

if(!location.hash)location.hash=getState().loggedIn?"dashboard":"login";
render();
