import {whatsappHistory} from "../data/dummy-data.js?v=a2664119";
import {badge,toast} from "../utils/helpers.js?v=a2664119";
import {getState} from "../store.js?v=a2664119";

const TABS=[["device","Device"],["template","Template Pesan"],["history","Riwayat Pengiriman"]];
const HEADLINE={
 device:["Perangkat WhatsApp","Satu device per pondok — nama device dibuat otomatis dari nama pondok."],
 template:["Template Pesan","Isi pesan otomatis yang dikirim ke santri & musyrif."],
 history:["Riwayat Pengiriman","Log pengiriman pesan WhatsApp dari pondok Anda."]
};
const TEMPLATES=[
 ["Reminder Hafalan","Assalamualaikum, jangan lupa setoran hafalan hari ini ya."],
 ["Reminder Muraja'ah","Pengingat muraja'ah pukul 16.00. Siapkan halaman yang akan dibaca."],
 ["Hasil Setoran","Hasil setoran hafalan hari ini sudah tersimpan. Cek di aplikasi."],
 ["Motivasi Harian","Semangat menghafal! Konsisten sedikit setiap hari lebih baik daripada sesekali."],
];
let currentTab="history";
let pollTimer=null;
let countTimer=null;

function tabsBar(){
 return `<div class="tabs" style="margin-bottom:14px">${TABS.map(([id,label])=>`<button class="tab${currentTab===id?" active":""}" type="button" data-wa-tab="${id}">${label}</button>`).join("")}</div>`;
}

function deviceSection(){
 return `<div id="waTab-device" class="stack${currentTab==="device"?"":" hidden"}">
  <div class="card hidden" id="waNoDeviceCard">
   <h3>Belum ada device</h3>
   <p class="muted" style="margin:6px 0 14px">Pondok ini belum punya device WhatsApp. Tekan tombol di bawah untuk membuatnya — nama device dibuat otomatis dari nama pondok, lalu pindai QR dari HP admin.</p>
   <button class="btn primary full" id="waCreateBtn" type="button">+ Device</button>
  </div>
  <div class="card" id="waDeviceCard">
   <div class="row between" style="gap:10px"><h3 style="margin:0">Status koneksi</h3><span class="badge" id="waStatusBadge">Memeriksa…</span></div>
   <p class="muted" id="waStatusText" style="margin:10px 0 0">Menghubungi gateway WhatsApp…</p>
   <div id="waQrBox" class="hidden" style="text-align:center;margin-top:14px">
    <div id="waQrImgWrap"></div>
    <small class="muted" id="waQrNote" style="display:block;margin-top:8px">QR kedaluwarsa dalam <b id="waQrCount">–</b> detik. Pindai dari HP: <b>WhatsApp → Perangkat tertaut → Tautkan perangkat</b>.</small>
   </div>
   <div class="btn-joined" style="margin-top:16px">
    <button class="btn" id="waLogoutBtn" type="button">Putuskan</button>
    <button class="btn primary" id="waScanBtn" type="button">Tampilkan QR</button>
   </div>
  </div>
  <div class="card">
   <h3>Gateway</h3>
   <p class="muted" style="margin:6px 0 0">wa.rubiantoro.com · device <b id="waGatewayDevice">…</b>. Kredensial disimpan di server, tidak dikirim ke browser.</p>
  </div>
 </div>`;
}

function templateSection(){
 return `<div id="waTab-template" class="stack${currentTab==="template"?"":" hidden"}">
  <div class="card">
   <h3>Template Pesan</h3>
   <div class="list" style="margin-top:10px">${TEMPLATES.map(([name,preview])=>`<div class="list-item"><span class="avatar">✎</span><div class="grow"><b>${escapeText(name)}</b><small class="muted" style="display:block">${escapeText(preview)}</small></div></div>`).join("")}</div>
  </div>
 </div>`;
}

function historySection(){
 return `<div id="waTab-history" class="stack${currentTab==="history"?"":" hidden"}">
  <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Waktu</th><th>Tipe pesan</th><th>Penerima</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${whatsappHistory.map(x=>`<tr><td>${x.time}</td><td><b>${x.type}</b></td><td>${x.to}</td><td>${badge(x.status,x.status==="SENT"?"success":"danger")}</td><td>${x.status==="FAILED"?'<button class="btn soft" data-resend>Resend</button>':""}</td></tr>`).join("")}</tbody></table></div></div>
 </div>`;
}

function escapeText(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}

function pondokId(){
 const st=getState();
 return st.activePondokId??st.authUser?.pondoks?.[0]?.id??st.myPondoks?.[0]?.id??null;
}

export function whatsappPage(){
 const [title,subtitle]=HEADLINE[currentTab]||HEADLINE.history;
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">WhatsApp</p><h1 id="waTitle">${title}</h1><p class="muted">${subtitle}</p></div><span class="badge" id="waHeaderBadge">Memeriksa…</span></div>
${tabsBar()}
${deviceSection()}
${templateSection()}
${historySection()}`;
}

async function waApi(path,options={}){
 const token=getState().authToken;
 const r=await fetch(path,{...options,headers:{Accept:"application/json",...(token?{Authorization:"Bearer "+token}:{}),...(options.body?{"Content-Type":"application/json"}:{})}});
 let b={};try{b=await r.json()}catch{}
 if(!r.ok)throw new Error(b?.message||"Gateway tidak merespons.");
 return b;
}

function clearTimers(){clearInterval(pollTimer);clearInterval(countTimer);pollTimer=null;countTimer=null;}

function setBadge(el,label,tone){
 if(!el)return;
 el.textContent=label;
 el.className="badge"+(tone?" "+tone:"");
}

function renderNoDevice(){
 const noDevice=document.querySelector("#waNoDeviceCard");
 const deviceCard=document.querySelector("#waDeviceCard");
 noDevice?.classList.remove("hidden");
 deviceCard?.classList.add("hidden");
 setBadge(document.querySelector("#waStatusBadge"),"Belum ada device","");
 setBadge(document.querySelector("#waHeaderBadge"),"Belum ada device","");
 const gw=document.querySelector("#waGatewayDevice");
 if(gw)gw.textContent="belum dibuat";
}

function renderStatus(data){
 if(data?.has_device===false){
  renderNoDevice();
  return;
 }
 document.querySelector("#waNoDeviceCard")?.classList.add("hidden");
 document.querySelector("#waDeviceCard")?.classList.remove("hidden");

 const connected=Boolean(data?.is_connected);
 const label=connected?"Connected":"Disconnected";
 const tone=connected?"success":"danger";
 setBadge(document.querySelector("#waStatusBadge"),label,tone);
 setBadge(document.querySelector("#waHeaderBadge"),label,tone);

 const gw=document.querySelector("#waGatewayDevice");
 if(gw&&data?.device_id)gw.textContent=data.device_id;

 const text=document.querySelector("#waStatusText");
 if(text){
  const phone=(data?.jid||"").split("@")[0];
  text.innerHTML=connected
   ? `Terhubung${phone?" ke <b>+"+escapeText(phone)+"</b>":""} · device <b>${escapeText(data?.device_id||"")}</b>.`
   : `Belum terhubung · device <b>${escapeText(data?.device_id||"")}</b>. Tekan <b>Tampilkan QR</b> lalu pindai dari HP.`;
 }
}

async function refreshWaStatus(){
 const pid=pondokId();
 if(!pid)return false;
 try{
  const b=await waApi("/api/wa/status?pondok_id="+pid+"&t="+Date.now());
  renderStatus(b.data);
  if(b.data?.has_device!==false&&b.data?.is_connected){
   document.querySelector("#waQrBox")?.classList.add("hidden");
   clearTimers();
   return true;
  }
 }catch(err){
  setBadge(document.querySelector("#waStatusBadge"),"Gagal","danger");
  const text=document.querySelector("#waStatusText");
  if(text)text.textContent=err?.message||"Gagal membaca status.";
 }
 return false;
}

function startStatusPoll(){
 clearTimers();
 refreshWaStatus();
 pollTimer=setInterval(refreshWaStatus,4000);
}

function startQrCountdown(seconds){
 const el=document.querySelector("#waQrCount");
 if(!el)return;
 let left=Math.max(1,seconds);
 el.textContent=String(left);
 countTimer=setInterval(()=>{
  left-=1;
  el.textContent=String(Math.max(0,left));
  if(left<=0){
   clearInterval(countTimer);countTimer=null;
   const note=document.querySelector("#waQrNote");
   if(note)note.innerHTML='QR kedaluwarsa. Tekan <b>Tampilkan QR</b> untuk membuat QR baru.';
  }
 },1000);
}

async function requestQr(){
 const pid=pondokId();
 if(!pid)throw new Error("Pondok tidak diketahui.");
 const b=await waApi("/api/wa/qr",{method:"POST",body:JSON.stringify({pondok_id:Number(pid)})});
 const d=b.data||{};
 const box=document.querySelector("#waQrBox");
 const wrap=document.querySelector("#waQrImgWrap");
 const note=document.querySelector("#waQrNote");
 if(note)note.innerHTML='QR kedaluwarsa dalam <b id="waQrCount">–</b> detik. Pindai dari HP: <b>WhatsApp → Perangkat tertaut → Tautkan perangkat</b>.';
 if(wrap){
  if(d.qr_image){
   wrap.innerHTML=`<img src="${d.qr_image}" alt="QR WhatsApp" style="width:min(68vw,240px);height:auto;border:1px solid var(--border);border-radius:12px">`;
  }else if(d.qr_link){
   wrap.innerHTML=`<a class="btn soft" href="${escapeText(d.qr_link)}" target="_blank" rel="noopener">Buka gambar QR</a>`;
  }else{
   wrap.innerHTML='<small class="muted">QR tidak tersedia. Coba lagi.</small>';
  }
 }
 box?.classList.remove("hidden");
 startQrCountdown(Number(d.qr_duration)||30);
 startStatusPoll();
 return d;
}

async function createDevice(){
 const pid=pondokId();
 if(!pid){alert("Pondok tidak diketahui.");return;}
 const btn=document.querySelector("#waCreateBtn");
 if(btn){btn.disabled=true;btn.textContent="Membuat device…";}
 try{
  const b=await waApi("/api/wa/device",{method:"POST",body:JSON.stringify({pondok_id:Number(pid)})});
  toast("Device "+(b.data?.device_id||"")+" dibuat. Pindai QR sekarang.");
  renderStatus({has_device:true,device_id:b.data?.device_id,is_connected:false});
  await requestQr();
 }catch(err){
  alert(err?.message||"Gagal membuat device.");
 }
 if(btn){btn.disabled=false;btn.textContent="+ Device";}
}

export function bindWaPage(){
 const scan=document.querySelector("#waScanBtn");
 clearTimers();
 if(!scan)return;

 if(!pondokId()){
  setBadge(document.querySelector("#waStatusBadge"),"Pondok tidak diketahui","danger");
  setBadge(document.querySelector("#waHeaderBadge"),"Pondok tidak diketahui","danger");
  return;
 }

 refreshWaStatus();
 pollTimer=setInterval(refreshWaStatus,6000);

 document.querySelectorAll("[data-wa-tab]").forEach(btn=>btn.addEventListener("click",()=>{
  currentTab=btn.dataset.waTab;
  clearTimers();
  window.dispatchEvent(new Event("app:render"));
 }));

 document.querySelector("#waCreateBtn")?.addEventListener("click",createDevice);

 scan.addEventListener("click",async ()=>{
  scan.disabled=true;
  const label=scan.textContent;
  scan.textContent="Meminta QR…";
  try{
   await requestQr();
   toast("QR dibuat — pindai sekarang dari HP.");
  }catch(err){
   const msg=err?.message||"Gagal membuat QR.";
   if(/sudah terhubung/i.test(msg)){
    document.querySelector("#waQrBox")?.classList.add("hidden");
    await refreshWaStatus();
    toast("Perangkat sudah terhubung ke WhatsApp.");
   }else{
    alert(msg);
   }
  }
  scan.disabled=false;
  scan.textContent=label;
 });

 document.querySelector("#waLogoutBtn")?.addEventListener("click",async ()=>{
  if(!confirm("Putuskan koneksi WhatsApp pondok ini?"))return;
  const btn=document.querySelector("#waLogoutBtn");
  btn.disabled=true;
  try{
   await waApi("/api/wa/logout",{method:"POST",body:JSON.stringify({pondok_id:Number(pondokId())})});
   document.querySelector("#waQrBox")?.classList.add("hidden");
   clearTimers();
   await refreshWaStatus();
   pollTimer=setInterval(refreshWaStatus,6000);
   toast("Perangkat diputus.");
  }catch(err){alert(err?.message||"Gagal memutus koneksi.");}
  btn.disabled=false;
 });
}
