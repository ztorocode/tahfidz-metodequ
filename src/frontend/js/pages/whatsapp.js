import {whatsappHistory} from "../data/dummy-data.js?v=578e63ba";
import {badge,toast} from "../utils/helpers.js?v=578e63ba";
import {getState} from "../store.js?v=578e63ba";

const TABS=[["device","Device"],["template","Template Pesan"],["history","Riwayat Pengiriman"]];
const HEADLINE={
 device:["Perangkat WhatsApp","Satu device per pondok — nama device dibuat otomatis dari nama pondok."],
 template:["Template Pesan","Isi pesan otomatis yang dikirim ke santri & musyrif."],
 history:["Riwayat Pengiriman","Log pengiriman pesan WhatsApp dari pondok Anda."]
};
const DEFAULT_TPLS=[
 {code:"reminder_hafalan",name:"Reminder Hafalan",body:"Assalamualaikum, jangan lupa setoran hafalan hari ini ya."},
 {code:"reminder_murajaah",name:"Reminder Muraja'ah",body:"Pengingat muraja'ah pukul 16.00. Siapkan halaman yang akan dibaca."},
 {code:"hasil_setoran",name:"Hasil Setoran",body:"Hasil setoran hafalan hari ini sudah tersimpan. Cek di aplikasi."},
 {code:"motivasi_harian",name:"Motivasi Harian",body:"Semangat menghafal! Konsisten sedikit setiap hari lebih baik daripada sesekali."}
];
const VARS=["{nama}","{halaqah}","{musyrif}","{pondok}"];
let tplItems=null;
let tplPid=null;
let editingCode=null;
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

function tplList(){
 const pid=String(pondokId()??"");
 return tplPid===pid&&Array.isArray(tplItems)?tplItems:DEFAULT_TPLS;
}

function templateSection(){
 const items=tplList();
 return `<div id="waTab-template" class="stack${currentTab==="template"?"":" hidden"}">
  <div class="card">
   <h3>Template Pesan</h3>
   <p class="muted" style="margin:4px 0 10px">Ketik ikon pensil untuk mengedit isi pesan.</p>
   <div class="list" style="margin-top:6px">${items.map(t=>`<div class="list-item">
     <button class="avatar" type="button" data-wa-edit="${t.code}" aria-label="Edit ${escapeText(t.name)}" style="border:0;cursor:pointer">✎</button>
     <div class="grow" style="min-width:0"><b>${escapeText(t.name)}</b><small class="muted" style="display:block">${escapeText(t.body)}</small></div>
     <button class="btn" type="button" data-wa-edit="${t.code}">Edit</button>
   </div>`).join("")}</div>
  </div>
 </div>`;
}

function tplModal(){
 return `<div class="modal-backdrop hidden" id="tplModal">
  <div class="modal-card">
   <div><p class="eyebrow">Template</p><h2 id="tplModalTitle">Edit Template</h2></div>
   <div class="stack" style="margin-top:16px">
    <div><label class="label">Isi pesan</label><textarea class="input" id="tplBody" rows="5"></textarea></div>
    <div><label class="label">Variabel — klik untuk sisipkan</label>
     <div class="row" style="flex-wrap:wrap;gap:6px">${VARS.map(v=>`<button class="btn" type="button" data-tpl-var="${v}" style="padding:6px 10px;font-size:13px">${v}</button>`).join("")}</div>
    </div>
    <small class="muted">Variabel diganti otomatis saat pesan dikirim: nama penerima, halaqah, musyrif, dan nama pondok.</small>
    <div class="btn-joined">
     <button class="btn" id="tplCloseBtn" type="button">Tutup</button>
     <button class="btn primary" id="tplSaveBtn" type="button">Simpan</button>
    </div>
   </div>
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
${historySection()}
${tplModal()}`;
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

async function loadTemplates(){
 const pid=pondokId();
 if(!pid||tplPid===String(pid))return;
 try{
  const b=await waApi("/api/wa/templates?pondok_id="+pid+"&t="+Date.now());
  const items=Array.isArray(b.data?.items)?b.data.items:null;
  if(items){
   tplItems=items;
   tplPid=String(pid);
   if(currentTab==="template")window.dispatchEvent(new Event("app:render"));
  }
 }catch(err){console.warn("templates:",err?.message);}
}

function openTplModal(code){
 const item=tplList().find(t=>t.code===code);
 if(!item)return;
 editingCode=code;
 const title=document.querySelector("#tplModalTitle");
 if(title)title.textContent="Edit: "+item.name;
 const area=document.querySelector("#tplBody");
 if(area)area.value=item.body;
 document.querySelector("#tplModal")?.classList.remove("hidden");
 area?.focus();
}

function closeTplModal(){
 editingCode=null;
 document.querySelector("#tplModal")?.classList.add("hidden");
}

async function saveTplModal(){
 const area=document.querySelector("#tplBody");
 const pid=pondokId();
 if(!editingCode||!area||!pid)return;
 const text=area.value.trim();
 if(!text){alert("Isi template tidak boleh kosong.");return;}
 const btn=document.querySelector("#tplSaveBtn");
 if(btn){btn.disabled=true;btn.textContent="Menyimpan…";}
 try{
  const b=await waApi("/api/wa/templates",{method:"POST",body:JSON.stringify({pondok_id:Number(pid),code:editingCode,body:text})});
  const saved=b.data||{};
  tplItems=tplList().map(t=>t.code===saved.code?{...t,body:saved.body}:t);
  tplPid=String(pid);
  closeTplModal();
  toast("Template disimpan.");
  window.dispatchEvent(new Event("app:render"));
 }catch(err){alert(err?.message||"Gagal menyimpan template.");}
 if(btn){btn.disabled=false;btn.textContent="Simpan";}
}

function bindTplModal(){
 document.querySelectorAll("[data-wa-edit]").forEach(btn=>btn.addEventListener("click",()=>openTplModal(btn.dataset.waEdit)));
 document.querySelector("#tplCloseBtn")?.addEventListener("click",closeTplModal);
 document.querySelector("#tplSaveBtn")?.addEventListener("click",saveTplModal);
 document.querySelectorAll("[data-tpl-var]").forEach(chip=>chip.addEventListener("click",()=>{
  const area=document.querySelector("#tplBody");
  if(!area)return;
  const value=chip.dataset.tplVar;
  const start=area.selectionStart??area.value.length;
  const end=area.selectionEnd??start;
  area.value=area.value.slice(0,start)+value+area.value.slice(end);
  area.focus();
  area.selectionStart=area.selectionEnd=start+value.length;
 }));
 document.querySelector("#tplModal")?.addEventListener("click",e=>{
  if(e.target?.id==="tplModal")closeTplModal();
 });
}

export function bindWaPage(){
 const scan=document.querySelector("#waScanBtn");
 clearTimers();
 if(!scan)return;

 loadTemplates();
 bindTplModal();

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
