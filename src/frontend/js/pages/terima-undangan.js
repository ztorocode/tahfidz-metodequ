import {getState,setState} from "../store.js?v=a83f2c51";
import {toast} from "../utils/helpers.js?v=a83f2c51";

function inviteToken(){
 const hash=(location.hash||"").replace(/^#/,"");
 const q=hash.includes("?")?hash.split("?")[1]:"";
 return new URLSearchParams(q).get("token")||"";
}

function acceptLabel(info){return info?.transfer?"Terima & Pindah Halaqah":"Terima & Buat Akun";}

export function acceptInvitePage(){
 return `<section class="auth">
<div class="auth-hero"><div><div class="brand" style="padding:0;color:white"><img src="./assets/images/icon.svg?v=a83f2c51">MetodeQu</div></div>
<div><p class="eyebrow" style="color:#86e5bd">Undangan Pondok</p><h1 style="font-size:40px;max-width:520px">Satu langkah lagi bergabung.</h1></div></div>
<div class="auth-card-wrap"><div class="auth-card stack" id="inviteCard"><p class="muted">Memuat undangan...</p></div></div></section>`;
}

function inviteForm(info,mode){
 const roleLabel=info.role==="musyrif"?"Musyrif":"Santri";
 const generic=!!info.generic;
 const isMember=mode==="member";
 const emailRow=generic&&!isMember
  ?`<div><label class="label">Email Anda</label><input class="input" id="inviteEmail" type="email" autocomplete="email" placeholder="nama@email.com"></div>`
  :`<div><label class="label">Email undangan</label><input class="input" value="${info.email||""}" disabled></div>`;
 const accountRow=isMember
  ?(generic
    ?`<div class="quote">Email ini sudah terdaftar. Masukkan password akun untuk menerima undangan.</div>
      <div><label class="label">Password akun Anda</label><input class="input" id="inviteLoginPassword" type="password" autocomplete="current-password"></div>`
    :`<div class="quote">Halo <b>${info.registered_name||info.email}</b>, akun Anda sudah terdaftar. Masukkan password akun untuk menerima undangan ini.</div>
      <div><label class="label">Password akun Anda</label><input class="input" id="inviteLoginPassword" type="password" autocomplete="current-password"></div>`)
  :`<div><label class="label">Nama lengkap</label><input class="input" id="inviteName" autocomplete="name" placeholder="Nama lengkap"></div>`;
 const t=info.transfer||null;
 const blocked=!!(t&&t.blocked);
 const escT=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const transferRow=t
  ?`<div class="quote" style="${blocked?"border-color:var(--danger);color:var(--danger)":""}"><b>Pindah halaqah</b><br>Dari halaqah <b>${escT(t.from_halaqah_name||"tanpa halaqah")}</b> ke <b>${escT(t.to_halaqah_name||"halaqah tujuan")}</b>.<br>${blocked?escT(t.blocked):"Isian progress lama akan dikosongkan — Anda memulai ulang dari nol di halaqah baru."}</div>`
  :"";
 return `<div><h1>Terima Undangan</h1><p class="muted">Anda diundang sebagai <b>${roleLabel}</b> di <b>${info.pondok_name}</b>.</p></div>
 <div class="stack">
  ${emailRow}
  ${accountRow}
  ${transferRow}
  <div><label class="label">Nomor WhatsApp</label><input class="input" id="invitePhone" inputmode="tel" placeholder="+62 ..." ${info.phone?`value="${info.phone}" disabled`:""}></div>
  <div><label class="label">Buat password</label><input class="input" id="invitePassword" type="password" autocomplete="new-password" placeholder="Minimal 8 karakter"></div>
  <small class="muted" id="inviteMessage">${blocked?escT(t.blocked):""}</small>
  <button class="btn primary full" id="acceptInviteBtn" type="button"${blocked?" disabled":""}>${acceptLabel(info)}</button>
 </div>`;
}

export function bindInvite(){
 const token=inviteToken();
 const card=document.querySelector("#inviteCard");
 if(!card)return;
 if(!token){
  card.innerHTML='<h1>Undangan tidak valid</h1><p class="muted">Link undangan tidak lengkap.</p>';
  return;
 }
 fetch("/api/pondok-invites/info?token="+encodeURIComponent(token),{headers:{Accept:"application/json"},cache:"no-store",signal:(function(){const c=new AbortController();setTimeout(()=>c.abort(new Error("timeout")),20000);return c.signal;})()})
  .then(r=>r.json().then(b=>({ok:r.ok,b})))
  .then(({ok,b})=>{
   if(!ok)throw new Error(b?.message||"Undangan tidak valid.");
   const info=b.data;
   const roleLabel=info.role==="musyrif"?"Musyrif":"Santri";
   let mode=info.registered?"member":"new";
   card.innerHTML=inviteForm(info,mode);
   document.querySelector("#acceptInviteBtn")?.addEventListener("click",async e=>{
    const btn=e.currentTarget,msg=document.querySelector("#inviteMessage");
    const payload={token};
    if(info.generic&&mode==="new")payload.email=document.querySelector("#inviteEmail")?.value.trim()||"";
    if(mode==="member"){
     payload.login_password=document.querySelector("#inviteLoginPassword")?.value||"";
     if(info.generic)payload.email=document.querySelector("#inviteEmail")?.value.trim()||info.email||"";
     if(!payload.login_password){if(msg){msg.textContent="Masukkan password akun Anda.";}return;}
    }else{
     payload.name=document.querySelector("#inviteName")?.value.trim()||"";
     payload.password=document.querySelector("#invitePassword")?.value||"";
     payload.phone=document.querySelector("#invitePhone")?.value.trim()||"";
     if(info.generic&&!payload.email){if(msg){msg.textContent="Email wajib diisi.";}return;}
     if(payload.name.length<2){if(msg){msg.textContent="Nama minimal 2 karakter.";}return;}
     if(!payload.phone){if(msg){msg.textContent="Nomor WhatsApp wajib diisi.";}return;}
     if(payload.password.length<8){if(msg){msg.textContent="Password minimal 8 karakter.";}return;}
    }
    btn.disabled=true;btn.textContent="Memproses...";
    try{
     const r=await fetch("/api/pondok-invites/accept",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(payload)});
     let rb={};try{rb=await r.json()}catch{}
     if(!r.ok){
      if(r.status===401&&rb?.errors?.login_password&&info.generic){
       mode="member";
       info.registered=true;info.registered_name=payload.email;info.email=payload.email;
       card.innerHTML=inviteForm(info,mode);
       const em=document.querySelector("#inviteEmail");
       if(em){em.value=payload.email;}
       bindInviteSubmit();
       return;
      }
      throw new Error(rb?.message||"Gagal menerima undangan.");
     }
     if(!rb?.data?.token)throw new Error(rb?.message||"Gagal menerima undangan.");
     const user=rb.data.user||{};
     const displayName=user.name||payload.name||info.email||payload.email;
     const profile={name:displayName,email:user.email||info.email||payload.email,phone:user.phone||"",role:roleLabel,initials:displayName.split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase()};
     const persona=info.role==="musyrif"?"musyrif":"member";
     setState({loggedIn:true,persona,context:"pondok",musyrifType:null,authToken:rb.data.token,authUser:{...user,roles:info.role==="musyrif"?["musyrif"]:["member"],pondoks:[{id:info.pondok_id,name:info.pondok_name,role:info.role}]},myPondoks:[{id:info.pondok_id,name:info.pondok_name,role:info.role}],activePondokId:info.pondok_id,profileOverrides:{member:profile,[persona]:profile}});
     if(/Menunggu persetujuan/.test(rb.message||""))toast("Pendaftaran terkirim. Menunggu persetujuan admin pondok.");
     if(info.transfer)toast(`Anda dipindah ke halaqah ${info.transfer.to_halaqah_name||"tujuan"}. Progress dimulai dari nol.`);
     location.hash=persona==="musyrif"?"musyrif":"dashboard";
    }catch(err){
     if(msg)msg.textContent=err?.message||"Gagal menerima undangan.";
     btn.disabled=false;btn.textContent=acceptLabel(info);
    }
   });
   function bindInviteSubmit(){
    document.querySelector("#acceptInviteBtn")?.addEventListener("click",async e=>{
     const btn=e.currentTarget,msg=document.querySelector("#inviteMessage");
     const payload={token,email:info.email,login_password:document.querySelector("#inviteLoginPassword")?.value||""};
     if(!payload.login_password){if(msg){msg.textContent="Masukkan password akun Anda.";}return;}
     btn.disabled=true;btn.textContent="Memproses...";
     try{
      const r=await fetch("/api/pondok-invites/accept",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(payload)});
      let rb={};try{rb=await r.json()}catch{}
      if(!r.ok||!rb?.data?.token)throw new Error(rb?.message||"Gagal menerima undangan.");
      const user=rb.data.user||{};
      const displayName=user.name||info.email;
      const profile={name:displayName,email:user.email||info.email,phone:user.phone||"",role:roleLabel,initials:displayName.split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase()};
      const persona=info.role==="musyrif"?"musyrif":"member";
      setState({loggedIn:true,persona,context:"pondok",musyrifType:null,authToken:rb.data.token,authUser:{...user,roles:info.role==="musyrif"?["musyrif"]:["member"],pondoks:[{id:info.pondok_id,name:info.pondok_name,role:info.role}]},myPondoks:[{id:info.pondok_id,name:info.pondok_name,role:info.role}],activePondokId:info.pondok_id,profileOverrides:{member:profile,[persona]:profile}});
      if(/Menunggu persetujuan/.test(rb.message||""))toast("Pendaftaran terkirim. Menunggu persetujuan admin pondok.");
     if(info.transfer)toast(`Anda dipindah ke halaqah ${info.transfer.to_halaqah_name||"tujuan"}. Progress dimulai dari nol.`);
     location.hash=persona==="musyrif"?"musyrif":"dashboard";
     }catch(err){
      if(msg)msg.textContent=err?.message||"Gagal menerima undangan.";
      btn.disabled=false;btn.textContent=acceptLabel(info);
     }
    });
   }
  })
  .catch(err=>{card.innerHTML='<h1>Undangan bermasalah</h1><p class="muted">'+(err?.message||"Coba lagi.")+'</p><button class="btn primary full" onclick="location.reload()" type="button">Coba Lagi</button>';});
}
