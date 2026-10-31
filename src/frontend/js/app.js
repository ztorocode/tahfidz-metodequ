import {getState,setState} from "./store.js?v=81bed469";
import {loginPage,bindLogin} from "./pages/login.js?v=6e2da185";
import {landingPage,bindLanding} from "./pages/landing.js?v=d2f91a63";
import {donationListPage,bindDonationList,donationStudentsPage,bindDonationStudents} from "./pages/donasi.js?v=proofauthfix31";

const PRIVATE_RUNTIME="./private-app.js?v=donproof31";
const INVITE_PAGE="./pages/terima-undangan.js?v=b8c14e72";
let privateRuntime=null;
let inviteModule=null;
let renderGeneration=0;

function routeName(){return location.hash.replace(/^#/,"")||"home"}
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

 // Kompatibilitas tautan CTA lama yang sudah tersebar.
 if(route==="login"&&new URLSearchParams(routeName().split("?")[1]||"").get("intent")==="donasi"){
  location.hash="donasi";
  return;
 }

 // Daftar ustadz untuk donatur tetap publik, termasuk saat pengguna telah login.
 if(route==="donasi"){
  app.innerHTML=donationListPage();
  bindDonationList();
  return;
 }

 // Daftar santri anonim milik halaqah bisa dibuka tanpa login.
 if(route==="donasi-santri"){
  app.innerHTML=donationStudentsPage();
  bindDonationStudents();
  return;
 }

 // Halaman undangan tetap public dan tidak memuat bundle private.
 if(route==="terima-undangan"){
  const mod=await publicInvite();
  if(generation!==renderGeneration)return;
  app.innerHTML=mod.acceptInvitePage();
  mod.bindInvite();
  return;
 }

 if(clearInvalidSession()){
  if(!["login","home"].includes(rawRoute())){location.hash="home";return;}
 }

 if(!getState().loggedIn){
  if(route==="home"){
   app.innerHTML=landingPage();
   bindLanding();
   return;
  }
  if(route==="login"){
   app.innerHTML=loginPage();
   bindLogin();
   return;
  }
  location.hash="home";
  return;
 }

 // Mulai titik ini baru source private (router/layout/dashboard/admin/etc.) diunduh.
 const mod=await authenticatedRuntime();
 if(generation!==renderGeneration)return;
 mod.renderPrivate();
}

function guardedRender(){
 render().catch(error=>{
  console.error("Render gagal",error);
  const app=document.querySelector("#app");
  if(app)app.innerHTML='<div class="auth-shell"><div class="auth-card"><div class="card"><h2>Halaman gagal dimuat</h2><p class="muted">Muat ulang halaman untuk mengambil versi aplikasi terbaru.</p><button class="btn primary full" type="button" onclick="location.reload()">Muat ulang</button></div></div></div>';
 });
}

window.addEventListener("hashchange",guardedRender);
window.addEventListener("app:render",guardedRender);

if("serviceWorker" in navigator){
 window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js?v=proofauthfix31"));
}

if(!location.hash&&getState().loggedIn)location.hash="dashboard";
guardedRender();
