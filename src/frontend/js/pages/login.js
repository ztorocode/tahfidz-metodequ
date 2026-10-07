import {setState} from "../store.js?v=dev-b74e2c91";

function loginForm(method="whatsapp"){
 const whatsapp=method==="whatsapp";
 return `<div class="segmented">
  <button id="authWhatsapp" class="${whatsapp?"active":""}" type="button">Nomor WhatsApp</button>
  <button id="authUsername" class="${whatsapp?"":"active"}" type="button">Username</button>
 </div>
 <div id="authFields" class="stack">
  ${whatsapp
   ? `<div><label class="label">Nomor WhatsApp</label><input class="input" id="loginWhatsapp" inputmode="tel" value="+62 812 3456 7890"></div>`
   : `<div><label class="label">Username</label><input class="input" id="loginUsername" autocomplete="username" value="ahmad.fauzi"></div>
      <div><label class="label">Password</label><input class="input" id="loginPassword" type="password" autocomplete="current-password" value="metodequ123"></div>`}
 </div>
 <button class="btn primary full" id="loginBtn">${whatsapp?"Kirim kode OTP":"Masuk"}</button>`;
}

function registerForm(){
 return `<div><h1>Buat Akun MetodeQu</h1><p class="muted">Daftar sebagai member personal. Akun yang sama nanti dapat bergabung ke pondok.</p></div>
 <div class="stack">
  <div><label class="label">Nama lengkap</label><input class="input" id="registerName" value="Ahmad Fauzi"></div>
  <div><label class="label">Username</label><input class="input" id="registerUsername" value="ahmad.fauzi"></div>
  <div><label class="label">Nomor WhatsApp</label><input class="input" id="registerWhatsapp" inputmode="tel" value="+62 812 3456 7890"></div>
  <div><label class="label">Password</label><input class="input" id="registerPassword" type="password" value="metodequ123"></div>
 </div>
 <button class="btn primary full" id="registerBtn">Daftar & Masuk Demo</button>
 <small class="muted" style="text-align:center">Sudah punya akun? <a href="#" id="backToLogin" style="color:var(--brand);font-weight:800">Masuk</a></small>`;
}

export function loginPage(){return `<section class="auth">
<div class="auth-hero"><div><div class="brand" style="padding:0;color:white"><img src="./assets/images/icon.svg?v=7f3a91c2">MetodeQu</div></div>
<div><p class="eyebrow" style="color:#86e5bd">Teman setia perjalanan tahfidz</p><h1 style="font-size:44px;max-width:520px">Hafalan yang sedikit, tapi mutqin.</h1><p style="max-width:520px;color:#d9f2e7">Aplikasi pendamping tahfidz untuk membantu Anda membangun hafalan Al-Qur'an yang kuat dan terjaga.</p></div>
<div><small>Prototype demo · Personal & Pondok</small></div></div>
<div class="auth-card-wrap"><div class="auth-card stack" id="authCard">
<div><h1>Masuk ke MetodeQu</h1><p class="muted">Lanjutkan perjalanan hafalan Anda.</p></div>
<div id="loginForm" class="stack">${loginForm("whatsapp")}</div>
<div class="row"><span class="grow" style="height:1px;background:var(--border)"></span><small class="muted">atau</small><span class="grow" style="height:1px;background:var(--border)"></span></div>
<button class="btn full" id="demoLogin">Masuk ke mode demo</button>
<small class="muted" style="text-align:center">Belum punya akun? <a href="#" id="registerLink" style="color:var(--brand);font-weight:800">Daftar sekarang</a></small>
</div></div></section>`}

export function bindLogin(){
 const go=()=>{setState({loggedIn:true,persona:"member"});location.hash="dashboard"};
 const bindLoginActions=(method="whatsapp")=>{
  document.querySelector("#authWhatsapp")?.addEventListener("click",()=>renderMethod("whatsapp"));
  document.querySelector("#authUsername")?.addEventListener("click",()=>renderMethod("username"));
  document.querySelector("#loginBtn")?.addEventListener("click",go);
 };
 const renderMethod=(method)=>{
  const form=document.querySelector("#loginForm");
  if(!form)return;
  form.innerHTML=loginForm(method);
  bindLoginActions(method);
 };
 const showRegister=(event)=>{
  event?.preventDefault();
  const card=document.querySelector("#authCard");
  if(!card)return;
  card.innerHTML=registerForm();
  document.querySelector("#registerBtn")?.addEventListener("click",go);
  document.querySelector("#backToLogin")?.addEventListener("click",showLogin);
 };
 const showLogin=(event)=>{
  event?.preventDefault();
  const card=document.querySelector("#authCard");
  if(!card)return;
  card.innerHTML=`<div><h1>Masuk ke MetodeQu</h1><p class="muted">Lanjutkan perjalanan hafalan Anda.</p></div>
  <div id="loginForm" class="stack">${loginForm("whatsapp")}</div>
  <div class="row"><span class="grow" style="height:1px;background:var(--border)"></span><small class="muted">atau</small><span class="grow" style="height:1px;background:var(--border)"></span></div>
  <button class="btn full" id="demoLogin">Masuk ke mode demo</button>
  <small class="muted" style="text-align:center">Belum punya akun? <a href="#" id="registerLink" style="color:var(--brand);font-weight:800">Daftar sekarang</a></small>`;
  bindLoginActions("whatsapp");
  document.querySelector("#demoLogin")?.addEventListener("click",go);
  document.querySelector("#registerLink")?.addEventListener("click",showRegister);
 };
 bindLoginActions("whatsapp");
 document.querySelector("#demoLogin")?.addEventListener("click",go);
 document.querySelector("#registerLink")?.addEventListener("click",showRegister);
}
