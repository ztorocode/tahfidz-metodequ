import {getState,setState} from "../store.js?v=0fd13399";

function inviteToken(){
 const hash=(location.hash||"").replace(/^#/,"");
 const q=hash.includes("?")?hash.split("?")[1]:"";
 return new URLSearchParams(q).get("token")||"";
}

export function acceptInvitePage(){
 return `<section class="auth">
<div class="auth-hero"><div><div class="brand" style="padding:0;color:white"><img src="./assets/images/icon.svg?v=0fd13399">MetodeQu</div></div>
<div><p class="eyebrow" style="color:#86e5bd">Undangan Pondok</p><h1 style="font-size:40px;max-width:520px">Satu langkah lagi bergabung.</h1></div></div>
<div class="auth-card-wrap"><div class="auth-card stack" id="inviteCard"><p class="muted">Memuat undangan...</p></div></div></section>`;
}

export function bindInvite(){
 const token=inviteToken();
 const card=document.querySelector("#inviteCard");
 if(!card)return;
 if(!token){
  card.innerHTML='<h1>Undangan tidak valid</h1><p class="muted">Link undangan tidak lengkap.</p>';
  return;
 }
 fetch("/api/pondok-invites/info?token="+encodeURIComponent(token),{headers:{Accept:"application/json"}})
  .then(r=>r.json().then(b=>({ok:r.ok,b})))
  .then(({ok,b})=>{
   if(!ok)throw new Error(b?.message||"Undangan tidak valid.");
   const info=b.data;
   const roleLabel=info.role==="musyrif"?"Musyrif":"Santri";
   const isMember=!!info.registered;
   card.innerHTML=`<div><h1>Terima Undangan</h1><p class="muted">Anda diundang sebagai <b>${roleLabel}</b> di <b>${info.pondok_name}</b>.</p></div>
   <div class="stack">
    <div><label class="label">Email undangan</label><input class="input" value="${info.email}" disabled></div>
    ${isMember?`<div class="quote">Halo <b>${info.registered_name||info.email}</b>, akun Anda sudah terdaftar. Masukkan password akun untuk menerima undangan ini.</div>
    <div><label class="label">Password akun Anda</label><input class="input" id="inviteLoginPassword" type="password" autocomplete="current-password"></div>`:`<div><label class="label">Nama lengkap</label><input class="input" id="inviteName" autocomplete="name" placeholder="Nama lengkap"></div>`}
   <div><label class="label">Nomor WhatsApp</label><input class="input" id="invitePhone" inputmode="tel" placeholder="+62 ..."></div>
    <div><label class="label">Buat password</label><input class="input" id="invitePassword" type="password" autocomplete="new-password" placeholder="Minimal 8 karakter"></div>
    <small class="muted" id="inviteMessage"></small>
    <button class="btn primary full" id="acceptInviteBtn" type="button">Terima & Buat Akun</button>
   </div>`;
   const phoneInput=document.querySelector("#invitePhone");
   if(info.phone){phoneInput.value=info.phone;phoneInput.disabled=true;}
   document.querySelector("#acceptInviteBtn")?.addEventListener("click",async e=>{
    const btn=e.currentTarget,msg=document.querySelector("#inviteMessage");
    const payload={token};
    if(isMember){
     payload.login_password=document.querySelector("#inviteLoginPassword")?.value||"";
     if(!payload.login_password){if(msg){msg.textContent="Masukkan password akun Anda.";}return;}
    }else{
     payload.name=document.querySelector("#inviteName")?.value.trim()||"";
     payload.password=document.querySelector("#invitePassword")?.value||"";
     payload.phone=document.querySelector("#invitePhone")?.value.trim()||"";
     if(payload.name.length<2){if(msg){msg.textContent="Nama minimal 2 karakter.";}return;}
     if(!payload.phone){if(msg){msg.textContent="Nomor WhatsApp wajib diisi.";}return;}
     if(payload.password.length<8){if(msg){msg.textContent="Password minimal 8 karakter.";}return;}
    }
    btn.disabled=true;btn.textContent="Memproses...";
    try{
     const r=await fetch("/api/pondok-invites/accept",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(payload)});
     let rb={};try{rb=await r.json()}catch{}
     if(!r.ok||!rb?.data?.token)throw new Error(rb?.message||"Gagal menerima undangan.");
     const user=rb.data.user||{};
     const displayName=user.name||payload.name||info.email;
     const profile={name:displayName,email:user.email||info.email,phone:user.phone||"",role:roleLabel,initials:displayName.split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase()};
     const persona=info.role==="musyrif"?"musyrif":"member";
     setState({loggedIn:true,persona,context:"pondok",musyrifType:null,authToken:rb.data.token,authUser:{...user,roles:info.role==="musyrif"?["musyrif"]:["member"],pondoks:[{id:info.pondok_id,name:info.pondok_name,role:info.role}]},myPondoks:[{id:info.pondok_id,name:info.pondok_name,role:info.role}],activePondokId:info.pondok_id,profileOverrides:{member:profile,[persona]:profile}});
     location.hash=persona==="musyrif"?"musyrif":"dashboard";
    }catch(err){
     if(msg)msg.textContent=err?.message||"Gagal menerima undangan.";
     btn.disabled=false;btn.textContent="Terima & Buat Akun";
    }
   });
  })
  .catch(err=>{card.innerHTML='<h1>Undangan bermasalah</h1><p class="muted">'+(err?.message||"Coba lagi.")+'</p>';});
}
