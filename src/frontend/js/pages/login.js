import {setState} from "../store.js?v=dev-719a61bf";

const demoAccounts=[
 {role:"Member",persona:"member",phone:"+62 812 3456 7890",email:"member@metodequ.id",password:"member123"},
 {role:"Musyrif",persona:"musyrif",phone:"+62 813 4567 8901",email:"musyrif@metodequ.id",password:"musyrif123"},
 {role:"Admin",persona:"admin",phone:"+62 811 2345 6789",email:"admin@metodequ.id",password:"admin123"}
];

function normalizePhone(value=""){return value.replace(/\D/g,"")}

function demoAccountsInfo(){
 return `<div class="stack" style="margin-top:4px">
  <div><b style="font-size:13px">Akun login demo</b><small class="muted" style="display:block">Gunakan salah satu akun berikut untuk mencoba role berbeda.</small></div>
  ${demoAccounts.map(account=>`<div class="list-item">
   <span class="avatar">${account.role.slice(0,1)}</span>
   <div class="grow">
    <b>${account.role}</b>
    <small class="muted" style="display:block">WA: ${account.phone}</small>
    <small class="muted" style="display:block">Email: ${account.email}</small>
    <small class="muted" style="display:block">Password: ${account.password}</small>
   </div>
  </div>`).join("")}
  <small class="muted">OTP demo WhatsApp: <b>123456</b></small>
 </div>`;
}

function loginForm(method="whatsapp"){
 const whatsapp=method==="whatsapp";
 return `<div class="segmented">
  <button id="authWhatsapp" class="${whatsapp?"active":""}" type="button">Nomor WhatsApp</button>
  <button id="authEmail" class="${whatsapp?"":"active"}" type="button">Email</button>
 </div>
 <div id="authFields" class="stack">
  ${whatsapp
   ? `<div><label class="label">Nomor WhatsApp</label><input class="input" id="loginWhatsapp" inputmode="tel" value="+62 812 3456 7890"></div>`
   : `<div><label class="label">Email</label><input class="input" id="loginEmail" type="email" autocomplete="email" value="member@metodequ.id"></div>
      <div><label class="label">Password</label><input class="input" id="loginPassword" type="password" autocomplete="current-password" value="member123"></div>`}
 </div>
 <small class="muted" id="loginMessage"></small>
 <button class="btn primary full" id="loginBtn">${whatsapp?"Kirim kode OTP":"Masuk"}</button>`;
}

function registerForm(){
 return `<div><h1>Buat Akun MetodeQu</h1><p class="muted">Daftar sebagai member personal. Username dibuat otomatis dari bagian email sebelum tanda @.</p></div>
 <div class="stack">
  <div><label class="label">Nama lengkap</label><input class="input" id="registerName" value="Ahmad Fauzi"></div>
  <div>
   <label class="label">Email</label>
   <input class="input" id="registerEmail" type="email" autocomplete="email" value="ahmad.fauzi@example.com">
   <small class="muted" id="usernamePreview">Username otomatis: <b>ahmad.fauzi</b></small>
  </div>
  <div><label class="label">Nomor WhatsApp</label><input class="input" id="registerWhatsapp" inputmode="tel" value="+62 812 3456 7890"></div>
  <div><label class="label">Password</label><input class="input" id="registerPassword" type="password" autocomplete="new-password" value="metodequ123"></div>
 </div>
 <small class="muted" id="registerMessage"></small>
 <button class="btn primary full" id="registerBtn">Daftar</button>
 <small class="muted" style="text-align:center">Sudah punya akun? <a href="#" id="backToLogin" style="color:var(--brand);font-weight:800">Masuk</a></small>`;
}

function loginCard(){
 return `<div><h1>Masuk ke MetodeQu</h1><p class="muted">Lanjutkan perjalanan hafalan Anda.</p></div>
 <div id="loginForm" class="stack">${loginForm("whatsapp")}</div>
 <small class="muted" style="text-align:center">Belum punya akun? <a href="#" id="registerLink" style="color:var(--brand);font-weight:800">Daftar sekarang</a></small>
 ${demoAccountsInfo()}`;
}

export function loginPage(){return `<section class="auth">
<div class="auth-hero"><div><div class="brand" style="padding:0;color:white"><img src="./assets/images/icon.svg?v=7f3a91c2">MetodeQu</div></div>
<div><p class="eyebrow" style="color:#86e5bd">Teman setia perjalanan tahfidz</p><h1 style="font-size:44px;max-width:520px">Hafalan yang sedikit, tapi mutqin.</h1><p style="max-width:520px;color:#d9f2e7">Aplikasi pendamping tahfidz untuk membantu Anda membangun hafalan Al-Qur'an yang kuat dan terjaga.</p></div>
<div><small>Prototype demo · Personal & Pondok</small></div></div>
<div class="auth-card-wrap"><div class="auth-card stack" id="authCard">${loginCard()}</div></div></section>`}

export function bindLogin(){
 const go=(persona="member")=>{
  setState({loggedIn:true,persona,context:"personal"});
  location.hash=persona==="admin"?"admin":persona==="musyrif"?"musyrif":"dashboard";
 };

 const renderMethod=(method)=>{
  const form=document.querySelector("#loginForm");
  if(!form)return;
  form.innerHTML=loginForm(method);
  bindLoginActions(method);
 };

 const showOtp=(phone,persona)=>{
  const form=document.querySelector("#loginForm");
  if(!form)return;
  form.innerHTML=`<div class="stack">
   <div><h3 style="margin-bottom:6px">Masukkan kode OTP</h3><p class="muted" style="margin-bottom:0">Kode OTP demo telah dikirim ke <b>${phone}</b>.</p></div>
   <div><label class="label">Kode OTP</label><input class="input" id="otpCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6 digit kode OTP"></div>
   <small class="muted" id="otpMessage">Untuk demo gunakan kode <b>123456</b>.</small>
   <button class="btn primary full" id="submitOtpBtn">Verifikasi OTP</button>
   <div class="row between"><button class="btn" id="changePhoneBtn" type="button">Ganti nomor</button><button class="btn soft" id="resendOtpBtn" type="button">Kirim ulang kode</button></div>
  </div>`;
  const otp=document.querySelector("#otpCode");
  otp?.focus();
  document.querySelector("#submitOtpBtn")?.addEventListener("click",()=>{
   const message=document.querySelector("#otpMessage");
   if(otp?.value.trim()!=="123456"){
    if(message){message.textContent="Kode OTP demo salah. Gunakan 123456.";message.style.color="var(--danger)";}
    return;
   }
   go(persona);
  });
  document.querySelector("#changePhoneBtn")?.addEventListener("click",()=>renderMethod("whatsapp"));
  document.querySelector("#resendOtpBtn")?.addEventListener("click",()=>{
   const message=document.querySelector("#otpMessage");
   if(message){message.innerHTML='Kode OTP demo dikirim ulang. Gunakan <b>123456</b>.';message.style.color="var(--brand)";}
   otp?.focus();
  });
 };

 const bindLoginActions=(method="whatsapp")=>{
  document.querySelector("#authWhatsapp")?.addEventListener("click",()=>renderMethod("whatsapp"));
  document.querySelector("#authEmail")?.addEventListener("click",()=>renderMethod("email"));
  document.querySelector("#loginBtn")?.addEventListener("click",()=>{
   const message=document.querySelector("#loginMessage");
   if(method==="whatsapp"){
    const phone=document.querySelector("#loginWhatsapp")?.value.trim()||"";
    const account=demoAccounts.find(item=>normalizePhone(item.phone)===normalizePhone(phone));
    if(!account){
     if(message){message.textContent="Nomor WhatsApp tidak ditemukan pada akun demo.";message.style.color="var(--danger)";}
     return;
    }
    showOtp(account.phone,account.persona);
    return;
   }
   const email=(document.querySelector("#loginEmail")?.value||"").trim().toLowerCase();
   const password=document.querySelector("#loginPassword")?.value||"";
   const account=demoAccounts.find(item=>item.email===email&&item.password===password);
   if(!account){
    if(message){message.textContent="Email atau password demo tidak sesuai.";message.style.color="var(--danger)";}
    return;
   }
   go(account.persona);
  });
 };

 const showRegister=(event)=>{
  event?.preventDefault();
  const card=document.querySelector("#authCard");
  if(!card)return;
  card.innerHTML=registerForm();
  const email=document.querySelector("#registerEmail");
  const preview=document.querySelector("#usernamePreview");
  const updatePreview=()=>{
   const value=(email?.value||"").trim();
   const username=value.includes("@")?value.split("@")[0]:"";
   if(preview)preview.innerHTML=username?`Username otomatis: <b>${username}</b>`:"Username otomatis akan dibuat dari email.";
  };
  email?.addEventListener("input",updatePreview);
  document.querySelector("#registerBtn")?.addEventListener("click",()=>{
   const value=(email?.value||"").trim();
   const password=document.querySelector("#registerPassword")?.value||"";
   const message=document.querySelector("#registerMessage");
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)){
    if(message){message.textContent="Masukkan email yang valid.";message.style.color="var(--danger)";}
    return;
   }
   if(password.length<6){
    if(message){message.textContent="Password minimal 6 karakter.";message.style.color="var(--danger)";}
    return;
   }
   go("member");
  });
  document.querySelector("#backToLogin")?.addEventListener("click",showLogin);
 };

 const showLogin=(event)=>{
  event?.preventDefault();
  const card=document.querySelector("#authCard");
  if(!card)return;
  card.innerHTML=loginCard();
  bindLoginActions("whatsapp");
  document.querySelector("#registerLink")?.addEventListener("click",showRegister);
 };

 bindLoginActions("whatsapp");
 document.querySelector("#registerLink")?.addEventListener("click",showRegister);
}
