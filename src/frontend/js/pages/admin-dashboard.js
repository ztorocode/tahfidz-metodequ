import {getState} from "../store.js?v=578e63ba";

let summary=null;
let sumPid=null;
let waInfo=null;
let waPid=null;

function activePondokId(){
 const st=getState();
 const mine=st.myPondoks||[];
 const act=mine.find(x=>x.id===(st.activePondokId??mine[0]?.id))||mine[0];
 return act?.id??st.pondokProfile?.id??null;
}

function pondokName(){
 const st=getState();
 const mine=st.myPondoks||[];
 const act=mine.find(x=>x.id===(st.activePondokId??mine[0]?.id))||mine[0];
 return act?.name||st.pondokProfile?.name||"Pondok";
}

function escapeText(value=""){
 return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function fmtTime(value){
 if(!value)return "–";
 const raw=String(value).replace(" ","T");
 const d=new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(raw)?raw:raw+"Z");
 if(isNaN(d.getTime()))return String(value);
 return d.toLocaleString("id-ID",{timeZone:"Asia/Jakarta",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
}

function localHalaqahCount(){
 const dummy=new Set(["halaqah-abu-bakar","halaqah-umar","halaqah-utsman"]);
 const list=getState().halaqahs;
 return Array.isArray(list)?list.filter(x=>x&&!dummy.has(x.id)).length:0;
}

function waBadge(){
 const pid=String(activePondokId()?? "");
 if(waPid!==pid||!waInfo)return '<span class="badge">WhatsApp …</span>';
 if(!waInfo.has_device)return '<span class="badge danger">WhatsApp Belum Ada Device</span>';
 if(!waInfo.is_connected)return '<span class="badge warning">WhatsApp Belum Discan</span>';
 return '<span class="badge success">WhatsApp Connected</span>';
}

function distCard(){
 const d=Array.isArray(summary?.distribution)?summary.distribution:[];
 const total=d.reduce((a,x)=>a+(Number(x.count)||0),0);
 if(!total)return '<div class="card"><h3>Distribusi Progress</h3><p class="muted" style="margin:8px 0 0">Belum ada setoran yang direview. Progres akan muncul di sini setelah musyrif menilai setoran.</p></div>';
 return `<div class="card"><h3>Distribusi Progress</h3>
  <div class="mini-bars">${d.map(x=>`<span title="${escapeText(x.label)}: ${x.count}" style="height:${Math.max(6,Number(x.percent)||0)}%"></span>`).join("")}</div>
  <div class="row between" style="flex-wrap:wrap;gap:6px">${d.map(x=>`<span class="badge ${x.label==="Mutqin"?"success":x.label==="Perlu Ulang"?"danger":"warning"}">${escapeText(x.label)} ${x.count}</span>`).join("")}</div></div>`;
}

function pendingCard(){
 const pending=Number(summary?.pending_total)||0;
 return `<div class="card"><h3>Setoran Menunggu Review</h3>
  <div class="kpi" style="border:0;padding:10px 0 0"><b>${pending}</b><span class="muted">setoran pending</span></div>
  <p class="muted" style="margin:8px 0 0">Buka tab <b>Review</b> untuk menilai setoran santri.</p></div>`;
}

function activityList(){
 const items=Array.isArray(summary?.last_activity)?summary.last_activity:[];
 if(!items.length)return '<p class="muted" style="margin:8px 0 0">Belum ada aktivitas. Aktivitas terbaru setoran akan muncul di sini.</p>';
 return `<div class="list">${items.map(x=>`<div class="list-item"><div class="avatar">${escapeText((x.who||"?").trim().charAt(0).toUpperCase()||"?")}</div><div class="grow"><b>${escapeText(x.who)}</b><br><small class="muted">${escapeText(x.what)}</small></div><small class="muted">${fmtTime(x.time)}</small></div>`).join("")}</div>`;
}

export function adminDashboard(){
 const pid=activePondokId();
 const ready=summary&&sumPid===String(pid??"");
 const val=n=>ready?(Number(n)||0):null;
 const show=n=>n===null?"…":String(n);
 const halaqah=ready?(summary.halaqah>0?summary.halaqah:localHalaqahCount()):null;
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Dashboard Pondok</p><h1>${escapeText(pondokName())}</h1><p class="muted">Ringkasan operasional tahfidz dan kualitas hafalan.</p></div><div class="row" style="gap:8px">${waBadge()}<button class="btn" type="button" data-dash-refresh style="padding:6px 10px">Muat ulang</button></div></div>
<div class="kpi-row kpi-two" style="margin-bottom:16px"><div class="kpi"><b>${show(halaqah)}</b><span class="muted">Halaqah</span></div><div class="kpi"><b>${show(val(summary?.santri))}</b><span class="muted">Santri</span></div><div class="kpi"><b>${show(val(summary?.musyrif))}</b><span class="muted">Musyrif</span></div><div class="kpi"><b>${show(val(summary?.mutqin_total))}</b><span class="muted">Hafalan Mutqin</span></div></div>
<div class="grid-2">${distCard()}
${pendingCard()}</div>
<div class="card" style="margin-top:16px"><div class="row between"><h3 style="margin:0">Aktivitas Terbaru</h3><small class="muted">Data per ${summary&&sumPid===String(pid??"")?fmtTime(summary.refreshed_at):"—"} WIB</small></div>
 <div style="margin-top:12px">${ready?activityList():'<p class="muted" style="margin:0">Memuat…</p>'}</div></div>`;
}

async function dashApi(path,options={}){
 const token=getState().authToken;
 const r=await fetch(path,{...options,headers:{Accept:"application/json",...(token?{Authorization:"Bearer "+token}:{}),...(options.body?{"Content-Type":"application/json"}:{})}});
 let b={};try{b=await r.json()}catch{}
 if(!r.ok)throw new Error(b?.message||"Server tidak merespons.");
 return b;
}

async function loadSummary(force){
 const pid=activePondokId();
 if(!pid)return;
 if(!force&&sumPid===String(pid)&&summary)return;
 try{
  const b=await dashApi("/api/pondoks/summary?pondok_id="+pid+(force?"&refresh=1":"")+"&t="+Date.now());
  const data=b.data||{};
  const changed=JSON.stringify(data)!==JSON.stringify(summary);
  summary=data;
  sumPid=String(pid);
  if(changed)window.dispatchEvent(new Event("app:render"));
 }catch(err){
  console.warn("dashboard summary:",err?.message);
 }
}

async function loadWa(){
 const pid=activePondokId();
 if(!pid)return;
 if(waPid===String(pid)&&waInfo)return;
 try{
  const b=await dashApi("/api/wa/status?pondok_id="+pid+"&t="+Date.now());
  const data=b.data||{};
  const changed=JSON.stringify(data)!==JSON.stringify(waInfo);
  waInfo=data;
  waPid=String(pid);
  if(changed)window.dispatchEvent(new Event("app:render"));
 }catch(err){console.warn("dashboard wa:",err?.message);waPid=String(pid);}
}

export function bindAdminDashboard(){
 document.querySelector("[data-dash-refresh]")?.addEventListener("click",async ()=>{
  summary=null;
  await loadSummary(true);
  await loadWa();
 });
 loadSummary();
 loadWa();
}
