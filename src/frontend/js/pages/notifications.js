import {notifications} from "../data/dummy-data.js?v=81bed469";
import {badge} from "../utils/helpers.js?v=81bed469";
import {getState} from "../store.js?v=81bed469";

const safe=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rupiah=value=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(value)||0);
const statusLabel={reported:"Menunggu verifikasi",verified:"Terverifikasi",rejected:"Ditolak"};

export function notificationsPage(){
 const st=getState();
 const mine=Array.isArray(st.myInvites)?st.myInvites:[];
 const inviteCard=mine.length?`<div class="card" style="margin-bottom:16px"><h3>Undangan Pondok (${mine.length})</h3><div class="list">${mine.map(v=>`<div class="list-item"><span class="avatar">✉</span><div class="grow"><b>${v.role==="musyrif"?"Ustadz":"Santri"} · ${safe(v.pondok_name)}</b><small class="muted" style="display:block">Berlaku s/d ${safe(String(v.expires_at||"").slice(0,10))}</small></div><button class="btn primary" type="button" data-accept-invite="${v.id}">Terima</button></div>`).join("")}</div></div>`:"";
 if(st.persona==="musyrif"){
  return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Pusat Aktivitas</p><h1>Notifikasi</h1></div></div>
   ${inviteCard}
   <div class="card"><h2 style="margin-bottom:6px">Konfirmasi Bukti Transfer</h2>
   <p class="muted" style="margin-bottom:18px">Periksa bukti transfer dan mutasi rekening sebelum menyetujui. Hanya donasi terverifikasi masuk ke total publik.</p>
   <div id="ustadzDonationReports" class="list" aria-live="polite">Memuat konfirmasi donasi...</div></div>`;
 }
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Pusat Aktivitas</p><h1>Notifikasi</h1></div></div>${inviteCard}<div class="card"><div class="list">${notifications.map(n=>`<div class="list-item"><span class="dot" style="background:var(--${n.tone==="success"?"brand":n.tone})"></span><div class="grow"><b>${safe(n.title)}</b><small class="muted" style="display:block">${safe(n.body)}</small></div>${badge(n.time,"")}</div>`).join("")}</div></div>`;
}

export function bindDonationNotifications(){
 const list=document.querySelector("#ustadzDonationReports");
 if(!list||list.dataset.bound)return;
 list.dataset.bound="1";
 const token=getState().authToken;
 if(!token){list.textContent="Login ulang untuk melihat konfirmasi donasi.";return;}
 const headers={Accept:"application/json",Authorization:"Bearer "+token};
 const photoUrls=new Set();
 const clearPhotos=()=>{for(const url of photoUrls)URL.revokeObjectURL(url);photoUrls.clear();};
 async function load(){
  clearPhotos();
  list.textContent="Memuat konfirmasi donasi...";
  try{
   const response=await fetch("/api/ustadz/donations",{headers,cache:"no-store"});
   const body=await response.json().catch(()=>({}));
   if(!response.ok||!body.success)throw new Error(body.message||"Tidak bisa mengambil laporan donasi.");
   if(!list.isConnected)return;
   const rows=Array.isArray(body.data)?body.data:[];
   list.innerHTML=rows.length?rows.map(r=>{
    const id=Number(r.id);
    const status=statusLabel[r.status]||"Tidak diketahui";
    return `<article class="donation-report-item" data-donation-report="${id}">
      <div class="row between" style="gap:12px;flex-wrap:wrap"><div><b>${rupiah(r.amount_idr)}</b>
       <small class="muted" style="display:block">Dari: ${safe(r.donor_name||"Donatur")} · ${safe(r.sent_at)}</small></div>
       <span class="badge">${safe(status)}</span></div>
      <div class="donation-report-actions">
       <button type="button" class="btn" data-donation-proof="${id}">Lihat Bukti</button>
       ${r.status==="reported"?`<button type="button" class="btn primary" data-donation-review="verified" data-donation-id="${id}">Verifikasi</button><button type="button" class="btn" data-donation-review="rejected" data-donation-id="${id}">Tolak</button>`:""}
      </div><div class="donation-report-proof" data-donation-proof-view="${id}" hidden></div>
     </article>`;
   }).join(""):'<div class="muted">Belum ada konfirmasi transfer yang masuk.</div>';
  }catch(error){if(list.isConnected)list.textContent=error.message||"Gagal mengambil laporan.";}
 }
 list.addEventListener("click",async e=>{
  const proof=e.target.closest("[data-donation-proof]");
  if(proof){
   const id=Number(proof.dataset.donationProof);
   const display=list.querySelector('[data-donation-proof-view="'+id+'"]');
   if(!display)return;
   if(!display.hidden){display.hidden=true;return;}
   proof.disabled=true;proof.textContent="Memuat foto...";
   try{
    const response=await fetch("/api/donations/proof?id="+id,{headers,cache:"no-store"});
    if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.message||"Foto tidak bisa dimuat.");}
    const image=await response.blob();
    if(!list.isConnected)return;
    const url=URL.createObjectURL(image);
    photoUrls.add(url);
    display.replaceChildren();
    const img=document.createElement("img");
    img.src=url;img.alt="Bukti transfer donasi";
    display.appendChild(img);
    display.hidden=false;
   }catch(err){alert(err.message||"Gagal memuat foto bukti transfer.");}
   finally{if(proof.isConnected){proof.disabled=false;proof.textContent="Lihat Bukti";}}
   return;
  }
  const review=e.target.closest("[data-donation-review]");
  if(!review)return;
  const decision=review.dataset.donationReview;
  const id=Number(review.dataset.donationId);
  if(!confirm(decision==="verified"?"Sudah cocok dengan mutasi rekening? Verifikasi donasi ini?":"Tolak konfirmasi bukti transfer ini?"))return;
  review.disabled=true;
  try{
   const response=await fetch("/api/ustadz/donations/review",{
    method:"POST",headers:{...headers,"Content-Type":"application/json"},
    body:JSON.stringify({id,status:decision})
   });
   const body=await response.json().catch(()=>({}));
   if(!response.ok||!body.success)throw new Error(body.message||"Status tidak bisa diperbarui.");
   await load();
  }catch(err){alert(err.message||"Gagal memproses laporan.");}
  finally{if(review.isConnected)review.disabled=false;}
 });
 const observer=new MutationObserver(()=>{
  if(!list.isConnected){clearPhotos();observer.disconnect();}
 });
 observer.observe(document.querySelector("#app")||document.body,{childList:true,subtree:false});
 load();
}
