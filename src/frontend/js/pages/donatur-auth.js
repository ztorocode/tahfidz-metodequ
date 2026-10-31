import {getState,setState} from "../store.js?v=81bed469";

export function isDonorAuthenticated(){
 const s=getState();
 return Boolean(s.loggedIn&&s.authToken&&Array.isArray(s.authUser?.roles)&&s.authUser.roles.includes("donatur"));
}
function escapeHtml(value){
 return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
export function openDonorModal(ustadzId,halaqahId,trigger=null,options={}){
 document.querySelector("#donorAuthOverlay")?.remove();
 const overlay=document.createElement("div");
 overlay.id="donorAuthOverlay";
 overlay.className="donasi-overlay";
 if(options.purpose==="confirmation")overlay.style.zIndex="1200";
 overlay.innerHTML='<section class="donasi-dialog donor-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="donorAuthTitle">'
  +'<header class="donasi-dialog-head"><h2 id="donorAuthTitle">'+(options.purpose==="confirmation"?"Konfirmasi Bukti Transfer":"Akses Progres Santri")+'</h2><button class="donasi-dialog-close" type="button" id="donorClose" aria-label="Tutup">×</button></header>'
  +'<div class="donasi-dialog-body" id="donorAuthBody"></div></section>';
 document.body.appendChild(overlay);
 document.body.classList.add("donasi-modal-open");
 const body=overlay.querySelector("#donorAuthBody");
 let pending=false;
 function close(){
  overlay.remove();
  if(!document.querySelector(".donasi-overlay:not([hidden])"))document.body.classList.remove("donasi-modal-open");
  document.removeEventListener("keydown",onKey);
  window.removeEventListener("hashchange",close);
  if(trigger?.isConnected)trigger.focus();
 }
 function onKey(e){if(e.key==="Escape"){e.preventDefault();close()}}
 function goToStudents(){
  close();
  if(typeof options.onAuthenticated==="function"){options.onAuthenticated();return;}
  const target="#donasi-santri?ustadz="+ustadzId+"&halaqah="+halaqahId;
  if(location.hash===target)window.dispatchEvent(new Event("app:render"));
  else location.hash=target;
 }
 const render=(mode,error="")=>{
  const errorText=error?'<p class="donor-auth-error" role="alert">'+escapeHtml(error)+'</p>':"";
  if(mode==="choice"){
   body.innerHTML='<p>'+(options.purpose==="confirmation"
    ?"Masuk atau daftar sebagai Donatur agar bukti transfer dapat dikirim dan ditindaklanjuti ustadz."
    :"Untuk melihat nama dan progres santri, masuk atau buat akun Donatur terlebih dahulu.")+'</p>'
    +errorText+'<div class="donor-auth-choices"><button class="btn primary" type="button" data-donor-screen="login">Masuk</button>'
    +'<button class="btn" type="button" data-donor-screen="register">Daftar sebagai Donatur</button></div>';
  }else if(mode==="login"){
   body.innerHTML='<p>Masuk ke akun Mutqeen Anda.</p>'+errorText
    +'<form data-donor-form="login" class="donor-auth-form">'
    +'<label>Email<input type="email" name="email" autocomplete="email" maxlength="190" required placeholder="nama@email.com"></label>'
    +'<label>Password<input type="password" name="password" autocomplete="current-password" required></label>'
    +'<button class="btn primary" type="submit">Masuk</button></form>'
    +'<div class="donor-auth-secondary"><button type="button" data-donor-screen="register">Belum punya akun? Daftar Donatur</button></div>';
  }else if(mode==="register"){
   body.innerHTML='<p>Daftar akun Donatur. Role Member tetap tersedia pada akun ini.</p>'+errorText
    +'<form data-donor-form="register" class="donor-auth-form">'
    +'<label>Nama lengkap<input name="name" autocomplete="name" minlength="2" maxlength="150" required></label>'
    +'<label>Email<input type="email" name="email" autocomplete="email" maxlength="190" required></label>'
    +'<label>Nomor WhatsApp<input name="phone" type="tel" autocomplete="tel" placeholder="08..." required></label>'
    +'<label>Password<input name="password" type="password" autocomplete="new-password" minlength="8" required></label>'
    +'<button class="btn primary" type="submit">Daftar sebagai Donatur</button></form>'
    +'<div class="donor-auth-secondary"><button type="button" data-donor-screen="login">Sudah punya akun? Masuk</button></div>';
  }else if(mode==="activate"){
   body.innerHTML='<p>Akun <strong>'+escapeHtml(getState().authUser?.name||"Mutqeen")+'</strong> sudah login tetapi belum mempunyai role Donatur.</p>'
    +'<p>'+(options.purpose==="confirmation"
     ?"Aktifkan role Donatur agar dapat mengirim bukti transfer."
     :"Aktifkan role Donatur untuk melihat nama dan progres santri. Role akun lainnya tetap tersedia.")+'</p>'
    +errorText+'<form data-donor-form="activate" class="donor-auth-form"><button class="btn primary" type="submit">Aktifkan sebagai Donatur</button></form>';
  }else{
   body.innerHTML='<p>Registrasi diterima. Verifikasi akun melalui link yang dikirim ke email atau WhatsApp. Setelah terverifikasi, masuk untuk melanjutkan.</p>'
    +'<button class="btn primary" type="button" data-donor-screen="login">Masuk setelah verifikasi</button>';
  }
  body.querySelector("input")?.focus();
 };
 overlay.querySelector("#donorClose").addEventListener("click",close);
 overlay.addEventListener("click",e=>{if(e.target===overlay)close()});
 document.addEventListener("keydown",onKey);
 window.addEventListener("hashchange",close);
 body.addEventListener("click",e=>{
  const button=e.target.closest("[data-donor-screen]");
  if(button&&body.contains(button)&&!pending)render(button.dataset.donorScreen);
 });
 body.addEventListener("submit",async e=>{
  const form=e.target.closest("[data-donor-form]");
  if(!form||pending)return;
  e.preventDefault();
  const mode=form.dataset.donorForm;
  const values=new FormData(form);
  const button=form.querySelector('button[type="submit"]');
  const oldLabel=button.textContent;
  button.disabled=true;
  button.textContent="Memproses...";
  pending=true;
  try{
   let path,payload;
   const headers={"Accept":"application/json","Content-Type":"application/json"};
   if(mode==="register"){
    path="/api/auth/register";
    payload={mode:"donatur",name:String(values.get("name")||"").trim(),
     email:String(values.get("email")||"").trim(),phone:String(values.get("phone")||"").trim(),
     password:String(values.get("password")||"")};
   }else if(mode==="login"){
    path="/api/auth/login";
    payload={identifier:String(values.get("email")||"").trim(),password:String(values.get("password")||"")};
   }else{
    path="/api/donatur/activate";
    payload={};
    headers.Authorization="Bearer "+(getState().authToken||"");
   }
   const response=await fetch(path,{method:"POST",headers,body:JSON.stringify(payload),cache:"no-store"});
   const result=await response.json().catch(()=>({}));
   if(!response.ok||!result.success){
    const err=new Error(result.message||"Permintaan gagal.");
    err.status=response.status;
    throw err;
   }
   if(mode==="register"){render("registered");return;}
   if(mode==="login"){
    const session=result.data||{};
    if(!session.token||!session.user)throw new Error("Sesi login tidak tersedia.");
    const user=session.user;
    const roles=Array.isArray(user.roles)?user.roles:[];
    const persona=roles.includes("super_admin")?"super_admin":roles.includes("admin")?"admin":roles.includes("musyrif")?"musyrif":"member";
    const context=persona==="super_admin"?"platform":persona==="musyrif"&&user.musyrif_type==="platform"?"platform":persona==="admin"?"pondok":"personal";
    setState({loggedIn:true,demoSession:false,authToken:session.token,authUser:user,persona,context,
     musyrifType:user.musyrif_type||null,musyrifContexts:user.musyrif_contexts||null,
     myPondoks:user.pondoks||[],activePondokId:user.pondoks?.[0]?.id??null,
     realHalaqahs:[],realMusyrifs:[],realSantris:[],halaqahs:[]});
    if(roles.includes("donatur"))goToStudents();
    else render("activate");
    return;
   }
   const state=getState();
   const roles=Array.isArray(result.data?.roles)?result.data.roles:[...(state.authUser?.roles||[]),"donatur"];
   setState({authUser:{...state.authUser,roles}});
   goToStudents();
  }catch(err){
   if(err.status===401&&mode==="activate"){
    setState({loggedIn:false,demoSession:false,authToken:null,authUser:null});
    render("choice","Sesi login berakhir. Silakan masuk kembali.");
   }else render(mode,err.message||"Permintaan tidak dapat diproses.");
  }finally{
   pending=false;
   if(button.isConnected){button.disabled=false;button.textContent=oldLabel}
  }
 });
 const state=getState();
 render(state.loggedIn&&state.authToken?"activate":"choice");
 overlay.querySelector("#donorClose").focus();
}
