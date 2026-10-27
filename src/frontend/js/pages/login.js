import {setState} from "../store.js?v=81bed469";

const demoAccounts=[
 {id:"member",role:"Member",persona:"member",context:"personal",phone:"+62 812 3456 7890",email:"member@metodequ.id",password:"member123"},
 {id:"musyrif-pondok",role:"Musyrif Pondok",persona:"musyrif",context:"pondok",musyrifType:"pondok",phone:"+62 813 4567 8901",email:"musyrif@metodequ.id",password:"musyrif123"},
 {id:"musyrif-platform",role:"Musyrif Platform",persona:"musyrif",context:"platform",musyrifType:"platform",phone:"+62 814 0000 0002",email:"musyrif.platform@metodequ.id",password:"musyrif123"},
 {id:"admin-pondok",role:"Admin Pondok Jamil",persona:"admin",context:"pondok",phone:"+62 819 0011 2255",email:"admin@pondokjamil.com",password:"PondokJamil123!"},
 {id:"super-admin",role:"Super Admin",persona:"super_admin",context:"platform",phone:"+62 815 0000 0001",email:"superadmin@metodequ.id",password:"superadmin123"}
];

function normalizePhone(value=""){return value.replace(/\D/g,"")}
function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]))}

function demoAccountsInfo(){
 return `<div class="stack" style="margin-top:4px">
  <div><b style="font-size:13px">Akun login demo</b><small class="muted" style="display:block">Gunakan salah satu akun berikut untuk mencoba role berbeda.</small></div>
  ${demoAccounts.map(account=>`<button type="button" class="list-item" data-demo-account="${account.id}" style="width:100%;text-align:left;color:inherit">
   <span class="avatar">${account.role.slice(0,1)}</span>
   <div class="grow">
    <b>${account.role}</b>
    <small class="muted" style="display:block">WA: ${account.phone}</small>
    <small class="muted" style="display:block">Email: ${account.email}</small>
    <small class="muted" style="display:block">Password: ${account.password}</small>
   </div>
  </button>`).join("")}
  <small class="muted">Login WhatsApp memakai kode OTP yang dikirim ke nomor Anda.</small>
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

function registerForm(mode="personal"){
 const pondok=mode==="pondok";
 return `<div><h1>Buat Akun MetodeQu</h1><p class="muted">${pondok?"Daftarkan akun pengelola sekaligus pondok atau lembaga tahfidz.":"Daftar untuk menggunakan MetodeQu secara personal."} Username dibuat otomatis dari bagian email sebelum tanda @.</p></div>
 <div class="segmented">
  <button id="registerPersonal" class="${pondok?"":"active"}" type="button">Personal</button>
  <button id="registerPondok" class="${pondok?"active":""}" type="button">Pondok</button>
 </div>
 <div class="stack" id="registerFields">
  <div><label class="label">${pondok?"Nama pengelola":"Nama lengkap"}</label><input class="input" id="registerName" autocomplete="name" placeholder="Nama lengkap"></div>
  <div>
   <label class="label">Email</label>
   <input class="input" id="registerEmail" type="email" autocomplete="email" placeholder="nama@email.com">
   <small class="muted" id="usernamePreview">Username otomatis akan dibuat dari email.</small>
  </div>
  <div><label class="label">Nomor WhatsApp</label><input class="input" id="registerWhatsapp" inputmode="tel" autocomplete="tel" placeholder="+62 ..."></div>
  <div><label class="label">Password</label><input class="input" id="registerPassword" type="password" autocomplete="new-password" placeholder="Minimal 8 karakter"></div>
  ${pondok?`<div><label class="label">Nama Pondok / Lembaga</label><input class="input" id="registerPondokName" placeholder="Nama pondok"></div>
  <div><label class="label">Alamat Pondok</label><input class="input" id="registerPondokAddress" placeholder="Alamat pondok"></div>
  <div><label class="label">Nomor WhatsApp Pondok <span class="muted">(opsional)</span></label><input class="input" id="registerPondokWhatsapp" inputmode="tel" placeholder="+62 ..."></div>`:""}
 </div>
 <small class="muted" id="registerMessage"></small>
 <button class="btn primary full" id="registerBtn">${pondok?"Daftar Pondok":"Daftar Personal"}</button>
 <small class="muted" style="text-align:center">Sudah punya akun? <a href="#" id="backToLogin" style="color:var(--brand);font-weight:800">Masuk</a></small>`;
}

function loginCard(){
 return `<div><h1>Masuk ke MetodeQu</h1><p class="muted">Lanjutkan perjalanan hafalan Anda.</p></div>
 <div id="loginForm" class="stack">${loginForm("whatsapp")}</div>
 <small class="muted" style="text-align:center">Belum punya akun? <a href="#" id="registerLink" style="color:var(--brand);font-weight:800">Daftar sekarang</a></small>
 ${demoAccountsInfo()}`;
}

export function loginPage(){return `<section class="auth">
<div class="auth-hero"><div><div class="brand" style="padding:0;color:white"><img src="./assets/images/icon.svg?v=81bed469">MetodeQu</div></div>
<div><p class="eyebrow" style="color:#86e5bd">Teman setia perjalanan tahfidz</p><h1 style="font-size:44px;max-width:520px">Hafalan yang sedikit, tapi mutqin.</h1><p style="max-width:520px;color:#d9f2e7">Aplikasi pendamping tahfidz untuk membantu Anda membangun hafalan Al-Qur'an yang kuat dan terjaga.</p></div>
<div><small>Prototype demo · Personal & Pondok</small></div></div>
<div class="auth-card-wrap"><div class="auth-card stack" id="authCard">${loginCard()}</div></div></section>`}

async function postRegistration(payload){
 const response=await fetch("/api/auth/register",{
  method:"POST",
  headers:{"Content-Type":"application/json","Accept":"application/json"},
  body:JSON.stringify(payload)
 });

 let body={};
 try{body=await response.json()}catch{}

 if(!response.ok){
  const firstError=body?.errors&&Object.values(body.errors)[0];
  throw new Error(firstError||body?.message||"Registrasi gagal. Silakan coba lagi.");
 }

 return body.data;
}

export function bindLogin(){
 const homeRoute=persona=>persona==="super_admin"?"super-admin":persona==="admin"?"admin":persona==="musyrif"?"musyrif":"dashboard";
  // Cache daftar milik akun sebelumnya: dikosongkan tiap ganti sesi agar tidak bocor
  // (login pun memakai localStorage yang sama antar akun di satu peramban).
  const emptyCache={realHalaqahs:[],halaqahSrc:null,halaqahFetchedAt:0,realMusyrifs:[],musyrifSrc:null,realSantris:[],santriSrc:null,halaqahs:[],halaqahImported:null};
  const go=(persona="member",context="personal",extra={})=>{
   setState({loggedIn:true,persona,context,musyrifType:null,...emptyCache,...extra});
   location.hash=homeRoute(persona);
  };

 const goWithSession=(data)=>{
  const user=data?.user||{};
  const roles=user.roles||[];
  const email=user.email||"";
  const demo=demoAccounts.find(item=>item.email===email);
  const myPondoks=(user.pondoks||[]).map(p=>({id:p.id,name:p.name,slug:p.slug,role:p.role}));
  if(myPondoks.length===0&&demo?.context==="pondok"){
   myPondoks.push({id:0,name:"Pondok Al-Furqan",slug:"",role:demo.persona==="admin"?"admin":"member",demo:true});
  }
  let persona="member", context="personal";
  if(roles.includes("super_admin")){persona="super_admin";context="platform";}
  else if(roles.includes("admin")){persona="admin";context=myPondoks.length?"pondok":"personal";}
  else if(roles.includes("musyrif")){persona="musyrif";}
  const rawMusyrifContexts=user.musyrif_contexts||null;
  const legacyPondoks=myPondoks.filter(p=>p.role==="musyrif");
  const musyrifContexts=roles.includes("musyrif")
   ?{
      platform:rawMusyrifContexts?Boolean(rawMusyrifContexts.platform):user.musyrif_type!=="pondok",
      pondoks:Array.isArray(rawMusyrifContexts?.pondoks)?rawMusyrifContexts.pondoks:legacyPondoks
    }
   :{platform:false,pondoks:[]};
  if(persona==="musyrif"){
   context=musyrifContexts.platform?"platform":"pondok";
  }
  const displayName=user.name||email;
  const initials=displayName.split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const roleLabel=persona==="super_admin"?"Super Admin":persona==="admin"?"Admin Pondok":persona==="musyrif"?"Musyrif":"Member";
  const profile={name:displayName,email,phone:user.phone||"",role:roleLabel,initials};
  const profileOverrides={member:profile,[persona]:profile};
  const musyrifType=user.musyrif_type??(roles.includes("musyrif")
   ?(musyrifContexts.platform&&musyrifContexts.pondoks.length?"dual":musyrifContexts.platform?"platform":"pondok")
   :null);
  const activePondokId=persona==="musyrif"
   ?(context==="pondok"?(musyrifContexts.pondoks[0]?.id??null):null)
   :(myPondoks[0]?.id??null);
  go(persona,context,{authToken:data.token,authUser:user,myPondoks,activePondokId,musyrifType,musyrifContexts,profileOverrides});
 };

 const renderMethod=(method)=>{
  const form=document.querySelector("#loginForm");
  if(!form)return;
  form.innerHTML=loginForm(method);
  bindLoginActions(method);
 };

 const showOtp=(phone)=>{
  const form=document.querySelector("#loginForm");
  if(!form)return;
  form.innerHTML=`<div class="stack">
   <div><h3 style="margin-bottom:6px">Masukkan kode OTP</h3><p class="muted" style="margin-bottom:0">Kode OTP telah dikirim via WhatsApp ke <b>${phone}</b>.</p></div>
   <div><label class="label">Kode OTP</label><input class="input" id="otpCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6 digit kode OTP"></div>
   <small class="muted" id="otpMessage">Kode berlaku 5 menit.</small>
   <button class="btn primary full" id="submitOtpBtn">Verifikasi OTP</button>
   <div class="row between"><button class="btn" id="changePhoneBtn" type="button">Ganti nomor</button><button class="btn soft" id="resendOtpBtn" type="button">Kirim ulang kode</button></div>
  </div>`;
  const otp=document.querySelector("#otpCode");
  otp?.focus();
  document.querySelector("#submitOtpBtn")?.addEventListener("click",async ()=>{
   const message=document.querySelector("#otpMessage");
   const button=document.querySelector("#submitOtpBtn");
   const code=otp?.value.trim()||"";
   if(!/^\d{6}$/.test(code)){
    if(message){message.textContent="Masukkan 6 digit kode OTP.";message.style.color="var(--danger)";}
    return;
   }
   if(button){button.disabled=true;button.textContent="Memverifikasi...";}
   try{
    const response=await fetch("/api/auth/otp/verify",{
     method:"POST",
     headers:{"Content-Type":"application/json","Accept":"application/json"},
     body:JSON.stringify({phone,code})
    });
    let body={};
    try{body=await response.json()}catch{}
    if(response.ok&&body?.data?.token){
     goWithSession(body.data);
     return;
    }
    throw new Error(body?.message||"Verifikasi gagal.");
   }catch(error){
    if(message){message.textContent=error?.message||"Verifikasi gagal.";message.style.color="var(--danger)";}
    if(button){button.disabled=false;button.textContent="Verifikasi OTP";}
   }
  });
  document.querySelector("#changePhoneBtn")?.addEventListener("click",()=>renderMethod("whatsapp"));
  document.querySelector("#resendOtpBtn")?.addEventListener("click",async ()=>{
   const message=document.querySelector("#otpMessage");
   try{
    const response=await fetch("/api/auth/otp/request",{
     method:"POST",
     headers:{"Content-Type":"application/json","Accept":"application/json"},
     body:JSON.stringify({phone})
    });
    let body={};
    try{body=await response.json()}catch{}
    if(!response.ok)throw new Error(body?.message||"Gagal mengirim ulang.");
    if(message){message.textContent="Kode baru dikirim via WhatsApp.";message.style.color="var(--brand)";}
   }catch(error){
    if(message){message.textContent=error?.message||"Gagal mengirim ulang.";message.style.color="var(--danger)";}
   }
   otp?.focus();
  });
 };

 /** Akun ada tapi emailnya belum diverifikasi: tampilkan tombol kirim ulang. */
 const showResendVerification=(email)=>{
  const message=document.querySelector("#loginMessage");
  let box=document.querySelector("#resendVerifyBox");
  if(!box){
   box=document.createElement("div");
   box.id="resendVerifyBox";
   box.className="stack";
   box.style.marginTop="4px";
   box.innerHTML=`<button class="btn soft full" id="resendVerifyBtn" type="button">Kirim ulang email verifikasi</button><small class="muted" id="resendVerifyMessage"></small>`;
   message?.insertAdjacentElement("afterend",box);
  }
  document.querySelector("#resendVerifyBtn")?.addEventListener("click",async event=>{
   const btn=event.currentTarget;
   const info=document.querySelector("#resendVerifyMessage");
   btn.disabled=true;btn.textContent="Mengirim...";
   if(info){info.textContent="";info.style.color="";}
   try{
    const response=await fetch("/api/auth/verify-email/resend",{
     method:"POST",
     headers:{"Content-Type":"application/json","Accept":"application/json"},
     body:JSON.stringify({email})
    });
    let body={};
    try{body=await response.json()}catch{}
    if(!response.ok)throw new Error(body?.message||"Gagal mengirim ulang link verifikasi.");
    if(info){info.textContent=body?.message||"Link verifikasi dikirim ulang.";info.style.color="var(--brand)";}
   }catch(error){
    if(info){info.textContent=error?.message||"Gagal mengirim ulang link verifikasi.";info.style.color="var(--danger)";}
   }
   btn.disabled=false;btn.textContent="Kirim ulang email verifikasi";
  });
 };

 const bindDemoAccounts=()=>{
  document.querySelectorAll("[data-demo-account]").forEach(item=>item.addEventListener("click",()=>{
   const account=demoAccounts.find(entry=>entry.id===item.dataset.demoAccount);
   if(!account)return;
   renderMethod("email");
   const email=document.querySelector("#loginEmail");
   const password=document.querySelector("#loginPassword");
   if(email)email.value=account.email;
   if(password)password.value=account.password;
   email?.focus();
  }));
 };

 const bindLoginActions=(method="whatsapp")=>{
  document.querySelector("#authWhatsapp")?.addEventListener("click",()=>renderMethod("whatsapp"));
  document.querySelector("#authEmail")?.addEventListener("click",()=>renderMethod("email"));
  document.querySelector("#loginBtn")?.addEventListener("click",async ()=>{
   const message=document.querySelector("#loginMessage");
   const button=document.querySelector("#loginBtn");
   if(method==="whatsapp"){
    const phone=document.querySelector("#loginWhatsapp")?.value.trim()||"";
    if(!phone){
     if(message){message.textContent="Nomor WhatsApp wajib diisi.";message.style.color="var(--danger)";}
     return;
    }
    if(button){button.disabled=true;button.textContent="Mengirim...";}
    if(message){message.textContent="";message.style.color="";}
    try{
     const response=await fetch("/api/auth/otp/request",{
      method:"POST",
      headers:{"Content-Type":"application/json","Accept":"application/json"},
      body:JSON.stringify({phone})
     });
     let body={};
     try{body=await response.json()}catch{}
     if(!response.ok)throw new Error(body?.message||"Gagal mengirim kode OTP.");
     showOtp(phone);
    }catch(error){
     if(message){message.textContent=error?.message||"Gagal mengirim kode OTP.";message.style.color="var(--danger)";}
     if(button){button.disabled=false;button.textContent="Kirim kode OTP";}
    }
    return;
   }
   const email=(document.querySelector("#loginEmail")?.value||"").trim().toLowerCase();
   const password=document.querySelector("#loginPassword")?.value||"";
   if(!email||!password){
    if(message){message.textContent="Email dan password wajib diisi.";message.style.color="var(--danger)";}
    return;
   }
   if(button){button.disabled=true;button.textContent="Masuk...";}
   if(message){message.textContent="";message.style.color="";}
   try{
    const response=await fetch("/api/auth/login",{
     method:"POST",
     headers:{"Content-Type":"application/json","Accept":"application/json"},
     body:JSON.stringify({identifier:email,password})
    });
    let body={};
    try{body=await response.json()}catch{}
    if(response.ok&&body?.data?.token){
     goWithSession(body.data);
     return;
    }
    if(body?.code==="email_unverified"){
     if(message){message.textContent=body?.message||"Email Anda belum diverifikasi.";message.style.color="var(--danger)";}
     if(button){button.disabled=false;button.textContent="Masuk";}
     showResendVerification(email);
     return;
    }
    if(response.status!==401&&response.status!==422){
     throw new Error(body?.message||"Login gagal. Silakan coba lagi.");
    }
   }catch(error){
    if(message){message.textContent=error?.message||"Login gagal. Silakan coba lagi.";message.style.color="var(--danger)";}
    if(button){button.disabled=false;button.textContent="Masuk";}
    return;
   }
   const account=demoAccounts.find(item=>item.email===email&&item.password===password);
   if(!account){
    if(message){message.textContent="Email atau password tidak sesuai.";message.style.color="var(--danger)";}
    if(button){button.disabled=false;button.textContent="Masuk";}
    return;
   }
   go(account.persona,account.context,{musyrifType:account.musyrifType||null,demoSession:true});
  });
 };

 const bindRegister=(mode="personal")=>{
  const email=document.querySelector("#registerEmail");
  const preview=document.querySelector("#usernamePreview");
  const updatePreview=()=>{
   const value=(email?.value||"").trim();
   const username=value.includes("@")?value.split("@")[0]:"";
   if(preview)preview.innerHTML=username?`Username otomatis: <b>${username}</b>`:"Username otomatis akan dibuat dari email.";
  };
  email?.addEventListener("input",updatePreview);
  document.querySelector("#registerPersonal")?.addEventListener("click",()=>renderRegister("personal"));
  document.querySelector("#registerPondok")?.addEventListener("click",()=>renderRegister("pondok"));
  document.querySelector("#backToLogin")?.addEventListener("click",showLogin);
  document.querySelector("#registerBtn")?.addEventListener("click",async event=>{
   const button=event.currentTarget;
   const name=document.querySelector("#registerName")?.value.trim()||"";
   const value=(email?.value||"").trim();
   const phone=document.querySelector("#registerWhatsapp")?.value.trim()||"";
   const password=document.querySelector("#registerPassword")?.value||"";
   const message=document.querySelector("#registerMessage");
   if(!name||!phone){
    if(message){message.textContent="Nama dan nomor WhatsApp wajib diisi.";message.style.color="var(--danger)";}
    return;
   }
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)){
    if(message){message.textContent="Masukkan email yang valid.";message.style.color="var(--danger)";}
    return;
   }
   if(password.length<8){
    if(message){message.textContent="Password minimal 8 karakter.";message.style.color="var(--danger)";}
    return;
   }

   const payload={mode,name,email:value,phone,password};
   if(mode==="pondok"){
    const pondokName=document.querySelector("#registerPondokName")?.value.trim()||"";
    const address=document.querySelector("#registerPondokAddress")?.value.trim()||"";
    const pondokPhone=document.querySelector("#registerPondokWhatsapp")?.value.trim()||"";
    if(!pondokName||!address){
     if(message){message.textContent="Nama dan alamat pondok wajib diisi.";message.style.color="var(--danger)";}
     return;
    }
    payload.pondok_name=pondokName;
    payload.pondok_address=address;
    payload.pondok_phone=pondokPhone;
   }

   button.disabled=true;
   const originalText=button.textContent;
   button.textContent="Mendaftarkan...";
   if(message){message.textContent="";message.style.color="";}

   try{
     const result=await postRegistration(payload);
     const user=result.user||{};
     const sent=result?.verification?.email_sent===true;
     const waSent=result?.verification?.whatsapp_sent===true;
     const via=[sent?"email":null,waSent?"WhatsApp":null].filter(Boolean);
     const viaText=via.length?("Kami sudah mengirim link verifikasi lewat "+via.join(" dan ")+". Link berlaku 48 jam — buka sebelum bisa masuk."):"Namun link verifikasi belum berhasil dikirim; gunakan tombol kirim ulang di halaman masuk.";
     const card=document.querySelector("#authCard");
     if(card){
      card.innerHTML=`<div class="stack">
       <div><p class="eyebrow">Pendaftaran berhasil</p><h1>Cek email Anda</h1>
        <p class="muted">Akun <b>${esc(user.email)}</b> sudah dibuat. ${viaText}</p>
        <p class="muted" style="margin-top:8px">Belum menerima email? Cek folder spam, lalu minta kirim ulang dari halaman masuk.</p></div>
       <button class="btn primary full" id="backToLoginAfterRegister" type="button">Ke halaman masuk</button>
      </div>`;
      document.querySelector("#backToLoginAfterRegister")?.addEventListener("click",showLogin);
     }
   }catch(error){
    if(message){message.textContent=error?.message||"Registrasi gagal. Silakan coba lagi.";message.style.color="var(--danger)";}
    button.disabled=false;
    button.textContent=originalText;
   }
  });
 };

 const renderRegister=(mode)=>{
  const card=document.querySelector("#authCard");
  if(!card)return;
  card.innerHTML=registerForm(mode);
  bindRegister(mode);
 };

 const showRegister=(event)=>{
  event?.preventDefault();
  renderRegister("personal");
 };

 const showLogin=(event)=>{
  event?.preventDefault();
  const card=document.querySelector("#authCard");
  if(!card)return;
  card.innerHTML=loginCard();
  bindLoginActions("whatsapp");
  bindDemoAccounts();
  document.querySelector("#registerLink")?.addEventListener("click",showRegister);
 };

 bindLoginActions("whatsapp");
 bindDemoAccounts();
 document.querySelector("#registerLink")?.addEventListener("click",showRegister);
}
