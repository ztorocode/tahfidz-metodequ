import {getState,setState} from "../store.js?v=81bed469";
import {badge,statusTone,toast} from "../utils/helpers.js?v=81bed469";

let selectedHalaqahId=null;
/** Halaqah yang sedang diedit lewat modal edit admin pondok. */
let editingHalaqahId=null;
/** Halaqah platform yang sedang diedit namanya lewat musyrif platform. */
let editingPlatformHalaqahId=null;
/** Halaqah yang sedang dibuka pada daftar milik musyrif (undefined = belum dipilih). */
let expandedHalaqahId;

const demoMusyrifOptions=[];

function activePondokId(){
 const st=getState();
 return st.activePondokId??st.authUser?.pondoks?.[0]?.id??st.myPondoks?.[0]?.id??null;
}

/** Konteks platform dipilih eksplisit; akun musyrif dapat sekaligus punya konteks pondok. */
function isPlatformMusyrif(){
 const st=getState();
 return st.persona==="musyrif"&&st.context==="platform";
}

function musyrifOptions(){
 const real=getState().realMusyrifs;
 if(Array.isArray(real)&&real.length)return real.map(m=>({id:"user-"+m.id,name:m.name}));
 return demoMusyrifOptions;
}

async function halaqApi(path,options={}){
 const token=getState().authToken;
 const r=await fetch(path,{...options,headers:{Accept:"application/json",...(token?{Authorization:"Bearer "+token}:{}),...(options.body?{"Content-Type":"application/json"}:{})}});
 let b={};try{b=await r.json()}catch{}
 if(!r.ok)throw new Error(b?.message||"Server tidak merespons.");
 return b;
}

function refreshSantris(force,silent){
 const st=getState();
 const pid=activePondokId();
 const token=st.authToken;
 if(!pid||!token||(!force&&st.santriSrc===pid)||santriFetching)return Promise.resolve();
 santriFetching=true;
 return fetch("/api/pondoks/santris?pondok_id="+pid,{headers:{Accept:"application/json",Authorization:"Bearer "+token}})
  .then(r=>r.json().then(b=>({ok:r.ok,b})))
  .then(({ok,b})=>{
   if(ok&&Array.isArray(b.data)){setState({realSantris:b.data,santriSrc:pid});if(!silent)window.dispatchEvent(new Event("app:render"));}
  })
  .catch(()=>{})
  .finally(()=>{santriFetching=false;});
}

function realSantriList(){
 const real=getState().realSantris;
 return Array.isArray(real)?real:[];
}

function refreshMusyrifs(force,silent){
 const st=getState();
 const pid=activePondokId();
 const token=st.authToken;
 if(!pid||!token||(!force&&st.musyrifSrc===pid)||musyrifFetching)return Promise.resolve();
 musyrifFetching=true;
 return fetch("/api/pondoks/musyrifs?pondok_id="+pid,{headers:{Accept:"application/json",Authorization:"Bearer "+token}})
  .then(r=>r.json().then(b=>({ok:r.ok,b})))
  .then(({ok,b})=>{
   if(ok&&Array.isArray(b.data)){setState({realMusyrifs:b.data,musyrifSrc:pid});if(!silent)window.dispatchEvent(new Event("app:render"));}
  })
  .catch(()=>{})
  .finally(()=>{musyrifFetching=false;});
}

/* ====================== Halaqah (server) ====================== */

function mapServer(h){
 return {
  id:"srv-"+h.id,
  numericId:Number(h.id),
  name:h.name,
  startDate:h.program_start_date||null,
  musyrifId:h.musyrif_user_id?("user-"+h.musyrif_user_id):null,
  musyrifName:h.musyrif_name||null,
  students:(h.students||[]).map(s=>({
   name:s.name,
   santriUserId:String(s.id),
   mutqin:Number(s.mutqin)||0,
   pending:Number(s.pending)||0,
   status:s.status||"Aktif",
   dayNumber:s.progress_day!=null?Number(s.progress_day):null,
   percent:s.progress_percent!=null?Number(s.progress_percent):null
  }))
 };
}

const DAY_MS=86400000;
const WEEKDAY=["Minggu","Senin","Selasa","Rabu","Kamis","Jum'at","Sabtu"];

function fmtDate(d){
 return d?d.toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}):"";
}

function todayInfo(startDate){
 if(!startDate)return null;
 const start=new Date(startDate+"T00:00:00");
 const now=new Date();
 const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 if(isNaN(start.getTime())||today.getTime()<start.getTime())return null;
 let n=1;
 const cur=new Date(start.getTime());
 while(cur.getTime()<today.getTime()){
  cur.setTime(cur.getTime()+DAY_MS);
  if(cur.getDay()!==5)n++;
 }
 return {dayNumber:n,weekday:WEEKDAY[today.getDay()],date:fmtDate(today)};
}

/** Daftar di localStorage basi bila sudah lebih lama dari TTL ini. */
const HALAQAH_TTL=20000;
let halaqahFetching=0; // jumlah request aktif
let musyrifFetching=false; // pengganti penanda srcKey untuk menahan fetch dobel
let santriFetching=false;

function refreshHalaqahs(force,silent){
 const st=getState();
 const platform=isPlatformMusyrif();
 const pid=activePondokId();
 if(!st.authToken)return Promise.resolve();
 if(!platform&&!pid)return Promise.resolve();
 const srcKey=platform?"platform":String(pid??0);
 const fresh=st.halaqahSrc===srcKey
  &&Array.isArray(st.realHalaqahs)
  &&(Number(st.halaqahFetchedAt)||0)>(Date.now()-HALAQAH_TTL);
 if(!force&&fresh)return Promise.resolve();
 if(!force&&halaqahFetching)return Promise.resolve();
 halaqahFetching++;
 // srcKey hanya diset SETELAH fetch sukses — fetch gagal (mis. 403)
 // tidak boleh menandai data basi akun/lama tetap "sah" untuk kunci ini.
 const url=platform
  ?"/api/pondoks/halaqahs?pondok_id=0"
  :"/api/pondoks/halaqahs?pondok_id="+pid;
 return halaqApi(url+"&t="+Date.now())
  .then(b=>{
   const mapped=Array.isArray(b.data)?b.data.map(mapServer):[];
   const changed=JSON.stringify(mapped)!==JSON.stringify(getState().realHalaqahs);
   setState({realHalaqahs:mapped,halaqahSrc:srcKey,halaqahFetchedAt:Date.now()});
   if(!silent&&changed)window.dispatchEvent(new Event("app:render"));
   if(platform)return changed;
   return importLocalOnce(pid,mapped);
  })
  .catch(err=>{console.warn("halaqah:",err?.message);})
  .finally(()=>{halaqahFetching=Math.max(0,halaqahFetching-1);});
}

// Halaman lain (mis. Progress) menyimpan tanggal mulai → tarik ulang daftar halaqah.
window.addEventListener("app:halaqah-changed",()=>{refreshHalaqahs(true,true);});

/** Satu kali: bila server masih kosong, pindahkan halaqah lama (tersimpan lokal di HP) ke server. */
async function importLocalOnce(pid,serverList){
 const st=getState();
 if(st.halaqahImported===String(pid)||serverList.length)return;
 setState({halaqahImported:String(pid)});
 const local=localList();
 if(!local.length)return;
 for(const item of local){
  try{
   const created=await halaqApi("/api/pondoks/halaqahs",{method:"POST",body:JSON.stringify({
    pondok_id:Number(pid),
    name:item.name,
    musyrif_user_id:parseUserId(item.musyrifId)
   })});
   const hid=Number(created?.data?.id||0);
   const ids=(item.students||[]).map(s=>realSantriList().find(u=>u.name===s.name)?.id).filter(Boolean).map(Number);
   if(hid&&ids.length){
    await halaqApi("/api/pondoks/halaqahs/members",{method:"POST",body:JSON.stringify({pondok_id:Number(pid),halaqah_id:hid,user_ids:ids})});
   }
  }catch(err){console.warn("impor halaqah lokal:",err?.message);}
 }
 await refreshHalaqahs(true,true);
 window.dispatchEvent(new Event("app:render"));
}

function parseUserId(id){
 const match=/^user-(\d+)$/.exec(String(id||""));
 return match?Number(match[1]):null;
}

const dummyHalaqahIds=new Set(["halaqah-abu-bakar","halaqah-umar","halaqah-utsman"]);

/** Halaqah lama yang tersimpan lokal di browser (sebelum pindah ke server). */
function localList(){
 const saved=getState().halaqahs;
 const list=Array.isArray(saved)?saved:[];
 return list.filter(item=>item&&!dummyHalaqahIds.has(item.id));
}

function halaqahs(){
 const st=getState();
 const pid=activePondokId();
 const srcKey=isPlatformMusyrif()?"platform":String(pid??0);
 if(st.halaqahSrc===srcKey&&Array.isArray(st.realHalaqahs))return st.realHalaqahs;
 return localList();
}

function escapeHtml(value=""){
 return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function musyrifName(id){
 if(!id)return "Belum ditentukan";
 return musyrifOptions().find(item=>item.id===id)?.name||"Belum ditentukan";
}

function pondokName(){
 const st=getState();
 const mine=st.myPondoks||[];
 const active=mine.find(x=>x.id===(st.activePondokId??mine[0]?.id))||mine[0];
 return active?.name||st.pondokProfile?.name||"Pondok";
}

/** Maksimal 4 kotak per baris; bila jumlahnya lebih sedikit, kotak melebar
 *  supaya lebarnya simetris dan tidak menyisakan kolom kosong. */
function halaqahCols(items){
 return Math.min(4,Math.max(1,(items||[]).length));
}

function adminList(items){
 return `<div style="margin-bottom:18px">
  <p class="eyebrow">Pondok / Halaqah</p>
  <div class="row between" style="gap:12px"><h1 style="margin:0">Halaqah</h1><button class="btn primary" type="button" data-halaqah-add>+Halaqah</button></div>
  <p class="muted">Kelola halaqah, tentukan ustadz, dan lihat santri di setiap halaqah.</p></div>
 <div class="halaqah-grid" style="--cols:${halaqahCols(items)}">
  ${items.length?items.map(item=>`<div class="card">
   <div class="row" style="gap:12px">
    <div class="grow" style="min-width:0">
     <div class="row between" style="gap:8px"><b>${escapeHtml(item.name)}</b>${badge("Aktif","success")}</div>
     <div class="row between" style="gap:8px;margin-top:4px"><small class="muted">Ustadz ${escapeHtml(item.musyrifName||musyrifName(item.musyrifId))}</small><small class="muted"><b style="color:var(--text)">${item.students.length}</b> santri</small></div>
    </div>
    <div class="row" style="gap:8px;flex:0 0 auto;align-items:flex-start">
     <button class="btn" type="button" data-halaqah-edit="${item.id}" aria-label="Edit halaqah" title="Edit halaqah" style="padding:8px 10px">${pencilIcon()}</button>
     <button class="btn" type="button" data-halaqah-view="${item.id}" aria-label="Lihat detail" style="font-size:22px;padding:6px 14px">›</button>
    </div>
   </div>
  </div>`).join(""):`<div class="card"><p class="muted">Belum ada halaqah. Tekan <b>+Halaqah</b> untuk membuat yang pertama.</p></div>`}
 </div>
 <div class="modal-backdrop hidden" id="halaqahModal">
  <div class="modal-card">
   <div><p class="eyebrow">Pondok</p><h2>Tambah Halaqah</h2></div>
   <form class="stack" id="halaqahForm" style="margin-top:16px">
    <div><label class="label">Nama Halaqah</label><input class="input" id="halaqahName" placeholder="Contoh: Halaqah Ali" required></div>
    <div><label class="label">Ustadz</label><select class="input" id="halaqahMusyrif">
     ${musyrifOptions().length?musyrifOptions().map(item=>`<option value="${item.id}">${escapeHtml(item.name)}</option>`).join(""):'<option value="">— belum ada ustadz, bisa dipilih nanti —</option>'}
    </select></div>
    <small class="muted">Satu halaqah memiliki satu ustadz. Santri dapat ditambahkan setelah halaqah dibuat.</small>
    <small class="muted" id="halaqahFormMessage"></small>
    <div class="btn-joined">
     <button class="btn" type="button" data-halaqah-close>Tutup</button>
     <button class="btn primary" type="submit">Simpan Halaqah</button>
    </div>
   </form>
  </div>
 </div>
 <div class="modal-backdrop hidden" id="halaqahEditModal">
  <div class="modal-card">
   <div><p class="eyebrow">Pondok</p><h2>Edit Halaqah</h2></div>
   <form class="stack" id="halaqahEditForm" style="margin-top:16px">
    <div><label class="label">Nama Halaqah</label><input class="input" id="halaqahEditName" placeholder="Contoh: Halaqah Ali" required></div>
    <div><label class="label">Ustadz</label><select class="input" id="halaqahEditMusyrif"></select></div>
    <small class="muted">Satu halaqah memiliki satu ustadz. Pilih "— Tanpa ustadz —" bila penugasan ustadz ingin dikosongkan.</small>
    <small class="muted" id="halaqahEditMessage"></small>
    <div class="btn-joined">
     <button class="btn" type="button" data-halaqah-edit-close>Tutup</button>
     <button class="btn primary" type="submit">Simpan Perubahan</button>
    </div>
   </form>
  </div>
 </div>`;
}

/** Ikon pensil (edit) — gaya sama dengan chevronIcon. */
function pencilIcon(){
 return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';
}

function chevronIcon(direction){
 if(direction==="right"){
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
 }
 return direction==="up"
  ?'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>'
  :'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
}

function santriRows(item){
 if(!item.students.length)return '<p class="muted halaqah-acc-empty">Belum ada santri di halaqah ini.</p>';
 return item.students.map(student=>`<button class="halaqah-santri-row" type="button" data-student-progress="${escapeHtml(student.name)}" data-halaqah-id="${item.id}">
   <b>${escapeHtml(student.name)}</b>
   <span class="halaqah-santri-day">${student.dayNumber?`hari ke-${student.dayNumber}`:"—"}</span>
   <span class="halaqah-santri-pct">${student.percent!=null?student.percent+"%":"—"}</span>
   <span class="chev">${chevronIcon("right")}</span>
  </button>`).join("");
}

function musyrifList(items,opts={}){
 // undefined = belum dipilih (buka halaqah pertama); null = pengguna menutup semua.
 if(expandedHalaqahId===undefined&&items.length)expandedHalaqahId=items[0].id;
 const limit=5;
 const heading=opts.platform
  ?`<p class="eyebrow">MetodeQu Platform</p>
    <div class="row between" style="gap:12px;flex-wrap:wrap;align-items:flex-end">
     <h1 style="margin:0">Halaqah Saya</h1>
     <button class="btn primary" type="button" data-platform-halaqah-add ${items.length>=limit?"disabled":""}>+ Buat Halaqah</button>
    </div>
    <p class="muted">Halaqah yang Anda buat dan ampu di platform: <b style="color:var(--text)">${items.length}/${limit}</b>${items.length>=limit?" · batas maksimal tercapai":""}.</p>
    <div class="modal-backdrop hidden" id="platformHalaqahModal">
     <div class="modal-card">
      <div><p class="eyebrow">MetodeQu Platform</p><h2>Buat Halaqah</h2></div>
      <form class="stack" id="platformHalaqahForm" style="margin-top:16px">
       <div><label class="label">Nama Halaqah</label><input class="input" id="platformHalaqahName" placeholder="Contoh: Halaqah Al-Ikhlas" required></div>
       <small class="muted">Halaqah ini Anda ampu sendiri (tanpa pondok). Batas maksimal ${limit} halaqah. Santri dapat ditambahkan setelah halaqah dibuat.</small>
       <small class="muted" id="platformHalaqahFormMessage"></small>
       <div class="btn-joined">
        <button class="btn" type="button" data-platform-halaqah-close>Tutup</button>
        <button class="btn primary" type="submit">Buat</button>
       </div>
      </form>
     </div>
    </div>
    <div class="modal-backdrop hidden" id="platformHalaqahEditModal">
     <div class="modal-card">
       <div><p class="eyebrow">MetodeQu Platform</p><h2>Edit Halaqah</h2></div>
       <form class="stack" id="platformHalaqahEditForm" style="margin-top:16px">
        <div><label class="label">Nama Halaqah</label><input class="input" id="platformHalaqahEditName" placeholder="Contoh: Halaqah Al-Ikhlas" required></div>
        <small class="muted">Halaqah ini Anda ampu sendiri (tanpa pondok). Nama dapat diubah kapan saja.</small>
        <small class="muted" id="platformHalaqahEditMessage"></small>
        <div class="btn-joined">
         <button class="btn" type="button" data-platform-halaqah-edit-close>Tutup</button>
         <button class="btn primary" type="submit">Simpan Perubahan</button>
        </div>
       </form>
      </div>
     </div>
    <div class="modal-backdrop hidden" id="platformSantriActionModal">
     <div class="modal-card" style="width:min(520px,100%)">
      <h2 style="margin-bottom:20px">Undang Santri</h2>
      <p class="muted" style="font-size:16px;line-height:1.45;margin-bottom:18px">Undang banyak santri sekaligus lewat email &amp; WhatsApp, mereka buat akun sendiri.</p>
      <div class="stack" style="gap:16px">
       <button class="btn primary full" type="button" data-platform-santri-invite>Kirim Undangan</button>
       <button class="btn full" type="button" data-platform-santri-copy>Salin Link Undangan</button>
       <button class="btn full" type="button" data-platform-santri-form>Form +Santri</button>
      </div>
     </div>
    </div>
    <div class="modal-backdrop hidden" id="platformSantriInviteModal">
     <div class="modal-card">
      <div><p class="eyebrow">Undangan Santri</p><h2>Kirim Undangan</h2></div>
      <div class="stack" style="margin-top:16px">
       <div><label class="label">Email (bisa banyak, satu per baris)</label><textarea class="input" id="platformSantriEmails" rows="5" autocomplete="off" placeholder="nama1@email.com&#10;nama2@email.com"></textarea></div>
       <small class="muted" id="platformSantriInviteMessage">Santri menerima link untuk membuat akun sendiri.</small>
       <div class="btn-joined">
        <button class="btn" type="button" data-platform-santri-invite-close>Tutup</button>
        <button class="btn primary" type="button" data-platform-santri-invite-send>Kirim</button>
       </div>
      </div>
     </div>
    </div>
    <div class="modal-backdrop hidden" id="platformSantriFormModal">
     <div class="modal-card">
      <div><p class="eyebrow">Santri Platform</p><h2>Tambah Santri</h2></div>
      <div class="stack" style="margin-top:16px">
       <div><label class="label">Nama lengkap</label><input class="input" id="platformSantriName" autocomplete="off" placeholder="Nama lengkap"></div>
       <div><label class="label">Email</label><input class="input" id="platformSantriEmail" type="email" autocomplete="off" placeholder="nama@email.com"></div>
       <div><label class="label">Nomor WhatsApp</label><input class="input" id="platformSantriPhone" inputmode="tel" placeholder="+62 ..."></div>
       <div><label class="label">Password awal</label><input class="input" id="platformSantriPassword" type="password" autocomplete="new-password" placeholder="Minimal 8 karakter"></div>
       <small class="muted" id="platformSantriFormMessage"></small>
       <div class="btn-joined">
        <button class="btn" type="button" data-platform-santri-form-close>Tutup</button>
        <button class="btn primary" type="button" data-platform-santri-form-save>Simpan Santri</button>
       </div>
      </div>
     </div>
    </div>`
  :`<p class="eyebrow">Pondok / Halaqah</p>
    <h1>Halaqah Saya</h1>
    <p class="muted">Halaqah yang menjadi tanggung jawab Anda di ${escapeHtml(pondokName())}.</p>`;
 const empty=opts.platform
  ?`<div class="card"><h3>Belum ada halaqah</h3><p class="muted">Anda belum membuat halaqah. Klik <b>+ Buat Halaqah</b> untuk membuat halaqah pertama Anda (maksimal ${limit}).</p></div>`
  :`<div class="card"><h3>Belum ada halaqah</h3><p class="muted">Admin Pondok belum menugaskan halaqah ke akun Ustadz ini.</p></div>`;
 return `<div style="margin-bottom:18px">${heading}</div>
 <div class="halaqah-acc-list">
  ${items.length?items.map(item=>{
   const open=item.id===expandedHalaqahId;
   return `<div class="card halaqah-acc${open?" open":""}">
    <button class="halaqah-acc-head" type="button" data-halaqah-toggle="${item.id}" aria-expanded="${open}">
     <h3>${escapeHtml(item.name)}</h3>
     <span class="halaqah-acc-meta">${item.students.length} santri ${chevronIcon(open?"up":"down")}</span>
    </button>
    ${open?`<div class="halaqah-acc-body">
     <div class="halaqah-santri-list">${santriRows(item)}</div>
     ${opts.platform?`<div class="btn-joined" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      <button class="btn primary" type="button" data-platform-halaqah-santri="${item.id}">+ Santri</button>
      <button class="btn" type="button" data-halaqah-view="${item.id}">Detail</button>
      <button class="btn" type="button" data-platform-halaqah-edit="${item.id}" aria-label="Edit nama halaqah" title="Edit nama halaqah" style="display:grid;place-items:center;padding:8px 10px">${pencilIcon()}</button>
     </div>`:`<button class="btn full" type="button" data-halaqah-view="${item.id}">Lihat Detail</button>`}
    </div>`:""}
   </div>`;
  }).join(""):empty}
 </div>`;
}

function programCard(item,isAdmin){
 const info=todayInfo(item.startDate);
 return `<div class="card" style="margin-bottom:16px">
  <h3>Program Tahfidz</h3>
  <p class="muted" style="margin:4px 0 10px">Tentukan kapan <b>Hari ke-1</b> program halaqah ini. Jum'at otomatis libur dan tidak dihitung.</p>
  <div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end">
   <div style="flex:1;min-width:170px"><label class="label">Tanggal Mulai Program</label>
    <input class="input" type="date" id="halaqahStartInput" value="${item.startDate||""}"></div>
   <button class="btn primary" type="button" data-start-save="${item.id}" ${isAdmin?"":" "}>Simpan</button>
   ${item.startDate?'<button class="btn danger" type="button" data-start-clear="'+item.id+'">Hapus</button>':""}
  </div>
  ${info
   ?`<p class="muted" style="margin:10px 0 0">Hari ini <b>${info.weekday}, ${info.date}</b> → <b style="color:var(--text)">Hari ke-${info.dayNumber}</b></p>`
   :`<p class="muted" style="margin:10px 0 0">${item.startDate?"Tanggal mulai masih di masa depan.":"Belum diatur → diasumsikan Pekan 1 dimulai Sabtu."}</p>`}
  <p class="muted" id="startFormMessage" style="margin:6px 0 0"></p>
 </div>`;
}

function detail(item,isAdmin){
 return `<div class="row between" style="margin-bottom:18px;gap:12px;flex-wrap:wrap">
  <div>
   <button class="btn" type="button" data-halaqah-back style="margin-bottom:12px">← Kembali ke daftar</button>
   <p class="eyebrow">Pondok / Halaqah</p>
   <h1>${escapeHtml(item.name)}</h1>
   <p class="muted">Ustadz: ${escapeHtml(item.musyrifName||musyrifName(item.musyrifId))} · ${item.students.length} santri</p>
  </div>
  ${isAdmin?`<button class="btn primary" type="button" data-halaqah-santri="${item.id}">+Santri</button>
  <div class="modal-backdrop hidden" id="santriModal">
   <div class="modal-card">
    <div><p class="eyebrow">Halaqah</p><h2>+Santri ke ${escapeHtml(item.name)}</h2></div>
    <div class="stack" id="santriCheckList" style="margin-top:16px"><small class="muted">Memuat santri...</small></div>
    <small class="muted" id="santriFormMessage"></small>
    <div class="btn-joined">
     <button class="btn" type="button" data-santri-close>Tutup</button>
     <button class="btn primary" id="saveSantriBtn" type="button" data-save-santri="${item.id}">Simpan</button>
    </div>
   </div>
  </div>`:""}
 </div>
 <div class="kpi-row" style="margin-bottom:16px">
  <div class="kpi"><b>${item.students.length}</b><span class="muted">Santri</span></div>
  <div class="kpi"><b>${item.students.reduce((sum,s)=>sum+(Number(s.mutqin)||0),0)}</b><span class="muted">Total Mutqin</span></div>
  <div class="kpi"><b>${item.students.reduce((sum,s)=>sum+(Number(s.pending)||0),0)}</b><span class="muted">Setoran Pending</span></div>
 </div>
 <div class="kpi" style="margin-bottom:16px"><b>${isAdmin?"Admin":"Musyrif"}</b><span class="muted">Akses aktif</span></div>
 ${programCard(item,isAdmin)}
 <div class="card">
  <div class="row between" style="margin-bottom:10px"><div><h3>Daftar Santri</h3><p class="muted">Santri yang terdaftar di halaqah ini.</p></div></div>
  ${item.students.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Santri</th><th>Mutqin</th><th>Setoran pending</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
   ${item.students.map(student=>`<tr><td><b>${escapeHtml(student.name)}</b></td><td>${student.mutqin}</td><td>${student.pending}</td><td>${badge(student.status,statusTone(student.status))}</td><td><button class="btn" type="button" data-student-progress="${escapeHtml(student.name)}" data-halaqah-id="${item.id}">Lihat Progress</button></td></tr>`).join("")}
  </tbody></table></div>`:`<div class="quote">Belum ada santri di halaqah ini. ${isAdmin?"Gunakan invite link untuk mulai menambahkan santri.":"Hubungi admin pondok untuk menambahkan santri ke halaqah."}</div>`}
 </div>`;
}

export function halaqahPage(){
 const state=getState();
 const platform=isPlatformMusyrif();
 if(state.context!=="pondok"&&!platform){
  return `<div class="card"><p class="eyebrow">Halaqah</p><h2>Aktifkan konteks Pondok</h2><p class="muted">Menu Halaqah tersedia ketika konteks aktif berada di Pondok. Gunakan menu avatar untuk berpindah konteks.</p></div>`;
 }

 refreshMusyrifs();
 refreshHalaqahs();
 const items=halaqahs();
 const selected=items.find(item=>item.id===selectedHalaqahId);
 if(selected)return detail(selected,state.persona==="admin");

 if(state.persona==="admin")return adminList(items);
 if(state.persona==="musyrif"){
  if(platform)return musyrifList(items,{platform:true});
  const myId=state.authUser?("user-"+state.authUser.id):null;
  return musyrifList(myId?items.filter(item=>item.musyrifId===myId):[]);
 }

 return `<div class="card"><h2>Halaqah</h2><p class="muted">Akun ini tidak memiliki akses pengelolaan halaqah.</p></div>`;
}

document.addEventListener("click",event=>{
 const toggle=event.target.closest("[data-halaqah-toggle]");
 if(toggle){
  expandedHalaqahId=expandedHalaqahId===toggle.dataset.halaqahToggle?null:toggle.dataset.halaqahToggle;
  window.dispatchEvent(new Event("app:render"));
  return;
 }

 const view=event.target.closest("[data-halaqah-view]");
 if(view){
  selectedHalaqahId=view.dataset.halaqahView;
  window.dispatchEvent(new Event("app:render"));
  return;
 }

 if(event.target.closest("[data-halaqah-back]")){
  selectedHalaqahId=null;
  window.dispatchEvent(new Event("app:render"));
  return;
 }

 if(event.target.closest("[data-halaqah-add]")){
  if(getState().persona!=="admin"||getState().context!=="pondok")return;
  document.querySelector("#halaqahModal")?.classList.remove("hidden");
  document.querySelector("#halaqahName")?.focus();
  refreshMusyrifs(true,true).then(()=>{
   const sel=document.querySelector("#halaqahMusyrif");
   if(sel)sel.innerHTML=musyrifOptions().length?musyrifOptions().map(item=>`<option value="${item.id}">${escapeHtml(item.name)}</option>`).join(""):'<option value="">— belum ada ustadz, bisa dipilih nanti —</option>';
  });
  return;
 }

 if(event.target.closest("[data-halaqah-close]")){
  document.querySelector("#halaqahModal")?.classList.add("hidden");
  return;
 }

 const editBtn=event.target.closest("[data-halaqah-edit]");
 if(editBtn){
  if(getState().persona!=="admin"||getState().context!=="pondok")return;
  const item=halaqahs().find(row=>row.id===editBtn.dataset.halaqahEdit);
  if(!item)return;
  editingHalaqahId=item.id;
  document.querySelector("#halaqahEditName").value=item.name;
  const fillMusyrifOptions=()=>{
   const sel=document.querySelector("#halaqahEditMusyrif");
   if(!sel)return;
   const options=musyrifOptions();
   // Musyrif terpilih yang tak lagi ada di daftar tetap ditampilkan agar pilihan tidak hilang diam-diam.
   if(item.musyrifId&&options.length&&!options.some(opt=>opt.id===item.musyrifId)){
    options.push({id:item.musyrifId,name:item.musyrifName||musyrifName(item.musyrifId)});
   }
   sel.innerHTML='<option value="">— Tanpa ustadz —</option>'+(options.length
    ?options.map(opt=>`<option value="${opt.id}">${escapeHtml(opt.name)}</option>`).join("")
    :'<option value="" disabled>— belum ada ustadz terdaftar —</option>');
   sel.value=item.musyrifId||"";
  };
  fillMusyrifOptions();
  document.querySelector("#halaqahEditMessage").textContent="";
  document.querySelector("#halaqahEditModal")?.classList.remove("hidden");
  refreshMusyrifs(true,true).then(fillMusyrifOptions);
  return;
 }

 if(event.target.closest("[data-halaqah-edit-close]")){
  document.querySelector("#halaqahEditModal")?.classList.add("hidden");
  editingHalaqahId=null;
  return;
 }

 // === Musyrif platform: buat halaqah sendiri (maks 5) ===
 if(event.target.closest("[data-platform-halaqah-add]")){
  if(!isPlatformMusyrif())return;
  document.querySelector("#platformHalaqahModal")?.classList.remove("hidden");
  document.querySelector("#platformHalaqahName")?.focus();
  return;
 }

 if(event.target.closest("[data-platform-halaqah-close]")){
  document.querySelector("#platformHalaqahModal")?.classList.add("hidden");
  return;
 }

 const platformSantriBtn=event.target.closest("[data-platform-halaqah-santri]");
 if(platformSantriBtn){
  if(!isPlatformMusyrif())return;
  const item=halaqahs().find(row=>row.id===platformSantriBtn.dataset.platformHalaqahSantri);
  if(!item)return;
  const modal=document.querySelector("#platformSantriActionModal");
  if(!modal)return;
  modal.dataset.halaqahId=String(item.numericId||0);
  modal.dataset.halaqahName=item.name||"";
  modal.classList.remove("hidden");
  return;
 }

 const platformSantriModal=document.querySelector("#platformSantriActionModal");
 if(platformSantriModal&&event.target===platformSantriModal){
  platformSantriModal.classList.add("hidden");
  return;
 }

 const platformInviteOpen=event.target.closest("[data-platform-santri-invite]");
 if(platformInviteOpen){
  const source=document.querySelector("#platformSantriActionModal");
  const target=document.querySelector("#platformSantriInviteModal");
  if(!source||!target)return;
  target.dataset.halaqahId=source.dataset.halaqahId||"";
  target.dataset.halaqahName=source.dataset.halaqahName||"";
  source.classList.add("hidden");
  const emails=document.querySelector("#platformSantriEmails");if(emails)emails.value="";
  const msg=document.querySelector("#platformSantriInviteMessage");
  if(msg){msg.textContent="Santri menerima link untuk membuat akun sendiri.";msg.style.color="";}
  target.classList.remove("hidden");
  emails?.focus();
  return;
 }

 if(event.target.closest("[data-platform-santri-invite-close]")){
  document.querySelector("#platformSantriInviteModal")?.classList.add("hidden");
  return;
 }

 const platformInviteModal=document.querySelector("#platformSantriInviteModal");
 if(platformInviteModal&&event.target===platformInviteModal){
  platformInviteModal.classList.add("hidden");
  return;
 }

 const platformInviteSend=event.target.closest("[data-platform-santri-invite-send]");
 if(platformInviteSend){
  const modal=document.querySelector("#platformSantriInviteModal");
  const msg=document.querySelector("#platformSantriInviteMessage");
  const halaqahId=Number(modal?.dataset?.halaqahId||0);
  const emails=(document.querySelector("#platformSantriEmails")?.value||"").split(/[\n,;]+/).map(v=>v.trim()).filter(Boolean);
  if(!halaqahId||!emails.length){
   if(msg){msg.textContent="Isi minimal satu email.";msg.style.color="var(--danger)";}
   return;
  }
  const label=platformInviteSend.textContent;
  platformInviteSend.disabled=true;platformInviteSend.textContent="Mengirim…";
  halaqApi("/api/platform/santri-invites",{method:"POST",body:JSON.stringify({halaqah_id:halaqahId,emails})})
   .then(b=>{
    const sent=b.data?.sent?.length||0;
    const failed=b.data?.failed||[];
    if(msg){
     msg.textContent=(sent?sent+" undangan diproses":"")+(sent&&failed.length?"; ":"")+failed.map(x=>x.email+" ("+x.message+")").join("; ");
     msg.style.color=failed.length?"var(--danger)":"var(--brand)";
    }
    if(!failed.length){
     toast("Undangan santri dikirim.");
     setTimeout(()=>modal?.classList.add("hidden"),700);
    }
   })
   .catch(err=>{if(msg){msg.textContent=err?.message||"Gagal mengirim undangan.";msg.style.color="var(--danger)";}})
   .finally(()=>{platformInviteSend.disabled=false;platformInviteSend.textContent=label;});
  return;
 }

 const platformCopy=event.target.closest("[data-platform-santri-copy]");
 if(platformCopy){
  const modal=document.querySelector("#platformSantriActionModal");
  const halaqahId=Number(modal?.dataset?.halaqahId||0);
  if(!halaqahId)return;
  const label=platformCopy.textContent;
  platformCopy.disabled=true;platformCopy.textContent="Menyalin…";
  halaqApi("/api/platform/santri-invites/standing-link",{method:"POST",body:JSON.stringify({halaqah_id:halaqahId})})
   .then(async b=>{
    const link=b.data?.link||"";
    if(!link)throw new Error("Link tidak tersedia.");
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(link);
    else{
     const ta=document.createElement("textarea");ta.value=link;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();
    }
    toast("Link undangan santri tersalin.");
   })
   .catch(err=>{toast(err?.message||"Gagal menyalin link.");})
   .finally(()=>{platformCopy.disabled=false;platformCopy.textContent=label;});
  return;
 }

 const platformFormOpen=event.target.closest("[data-platform-santri-form]");
 if(platformFormOpen){
  const source=document.querySelector("#platformSantriActionModal");
  const target=document.querySelector("#platformSantriFormModal");
  if(!source||!target)return;
  target.dataset.halaqahId=source.dataset.halaqahId||"";
  target.dataset.halaqahName=source.dataset.halaqahName||"";
  source.classList.add("hidden");
  ["#platformSantriName","#platformSantriEmail","#platformSantriPhone","#platformSantriPassword"].forEach(sel=>{const el=document.querySelector(sel);if(el)el.value="";});
  const msg=document.querySelector("#platformSantriFormMessage");if(msg){msg.textContent="";msg.style.color="";}
  target.classList.remove("hidden");
  document.querySelector("#platformSantriName")?.focus();
  return;
 }

 if(event.target.closest("[data-platform-santri-form-close]")){
  document.querySelector("#platformSantriFormModal")?.classList.add("hidden");
  return;
 }

 const platformFormModal=document.querySelector("#platformSantriFormModal");
 if(platformFormModal&&event.target===platformFormModal){
  platformFormModal.classList.add("hidden");
  return;
 }

 const platformFormSave=event.target.closest("[data-platform-santri-form-save]");
 if(platformFormSave){
  const modal=document.querySelector("#platformSantriFormModal");
  const msg=document.querySelector("#platformSantriFormMessage");
  const payload={
   halaqah_id:Number(modal?.dataset?.halaqahId||0),
   name:(document.querySelector("#platformSantriName")?.value||"").trim(),
   email:(document.querySelector("#platformSantriEmail")?.value||"").trim(),
   phone:(document.querySelector("#platformSantriPhone")?.value||"").trim(),
   password:document.querySelector("#platformSantriPassword")?.value||""
  };
  if(msg){msg.textContent="";msg.style.color="";}
  const label=platformFormSave.textContent;
  platformFormSave.disabled=true;platformFormSave.textContent="Menyimpan…";
  halaqApi("/api/platform/santris",{method:"POST",body:JSON.stringify(payload)})
   .then(b=>{
    toast("Santri "+(b.data?.name||"")+" ditambahkan.");
    modal?.classList.add("hidden");
    return refreshHalaqahs(true,true);
   })
   .then(()=>window.dispatchEvent(new Event("app:render")))
   .catch(err=>{if(msg){msg.textContent=err?.message||"Gagal menambahkan santri.";msg.style.color="var(--danger)";}})
   .finally(()=>{platformFormSave.disabled=false;platformFormSave.textContent=label;});
  return;
 }

 const platformEditBtn=event.target.closest("[data-platform-halaqah-edit]");
 if(platformEditBtn){
  if(!isPlatformMusyrif())return;
  const item=halaqahs().find(row=>row.id===platformEditBtn.dataset.platformHalaqahEdit);
  if(!item)return;
  editingPlatformHalaqahId=item.id;
  const input=document.querySelector("#platformHalaqahEditName");
  if(input)input.value=item.name;
  const message=document.querySelector("#platformHalaqahEditMessage");
  if(message){message.textContent="";message.style.color="";}
  document.querySelector("#platformHalaqahEditModal")?.classList.remove("hidden");
  input?.focus();
  return;
 }

 if(event.target.closest("[data-platform-halaqah-edit-close]")){
  document.querySelector("#platformHalaqahEditModal")?.classList.add("hidden");
  editingPlatformHalaqahId=null;
  return;
 }

 const santriBtn=event.target.closest("[data-halaqah-santri]");
 if(santriBtn){
  if(getState().persona!=="admin"||getState().context!=="pondok")return;
  const item=halaqahs().find(row=>row.id===santriBtn.dataset.halaqahSantri);
  if(!item)return;
  document.querySelector("#santriModal")?.classList.remove("hidden");
  const renderList=(list)=>{
   const box=document.querySelector("#santriCheckList");
   if(!box)return;
   box.innerHTML=list.length?`<div class="check-group">`+list.map(u=>{
    const checked=(item.students||[]).some(x=>String(x.santriUserId)===String(u.id));
    return `<label class="check-row"><input type="checkbox" data-santri-check="${u.id||""}" data-santri-name="${escapeHtml(u.name)}" data-santri-email="${escapeHtml(u.email||"")}" ${checked?"checked":""}><span class="avatar">${escapeHtml((u.name||"?").slice(0,1))}</span><div class="grow"><b>${escapeHtml(u.name)}</b><small class="muted" style="display:block">${escapeHtml(u.email||"")}</small></div></label>`;
   }).join("")+`</div>`:'<small class="muted">Belum ada santri di pondok ini. Undang dulu via menu Santri.</small>';
  };
  renderList(realSantriList());
  refreshSantris(true,true).then(()=>renderList(realSantriList()));
  return;
 }

 if(event.target.closest("[data-santri-close]")){
  document.querySelector("#santriModal")?.classList.add("hidden");
  return;
 }

 const saveBtn=event.target.closest("[data-save-santri]");
 if(saveBtn){
  if(getState().persona!=="admin"||getState().context!=="pondok")return;
  const item=halaqahs().find(row=>row.id===saveBtn.dataset.saveSantri);
  if(!item)return;
  const picked=[...document.querySelectorAll("[data-santri-check]")].filter(c=>c.checked).map(c=>Number(c.dataset.santriCheck)).filter(n=>n>0);
  const original=saveBtn.textContent;
  saveBtn.disabled=true;
  saveBtn.textContent="Menyimpan…";
  halaqApi("/api/pondoks/halaqahs/members",{method:"POST",body:JSON.stringify({
   pondok_id:Number(activePondokId()),
   halaqah_id:Number(item.numericId||0),
   user_ids:picked
  })})
   .then(()=>{document.querySelector("#santriModal")?.classList.add("hidden");return refreshHalaqahs(true,true);})
   .then(()=>{window.dispatchEvent(new Event("app:render"));})
   .catch(err=>{alert(err?.message||"Gagal menyimpan santri.");})
   .finally(()=>{saveBtn.disabled=false;saveBtn.textContent=original;});
  return;
 }

 const startDateBtn=event.target.closest("[data-start-save]");
 if(startDateBtn){
  const item=halaqahs().find(row=>row.id===startDateBtn.dataset.startSave);
  if(!item)return;
  const value=document.querySelector("#halaqahStartInput")?.value||"";
  const msg=document.querySelector("#startFormMessage");
  if(!value){if(msg){msg.textContent="Pilih tanggal mulai dulu.";msg.style.color="var(--danger)";}return;}
  startDateBtn.disabled=true;
  halaqApi("/api/pondoks/halaqahs/start-date",{method:"POST",body:JSON.stringify({
   pondok_id:Number(activePondokId()),
   halaqah_id:Number(item.numericId||0),
   program_start_date:value
  })})
   .then(()=>{toast("Tanggal mulai program disimpan.");window.dispatchEvent(new Event("app:my-halaqah-changed"));return refreshHalaqahs(true,true);})
   .then(()=>{window.dispatchEvent(new Event("app:render"));})
   .catch(err=>{
    if(msg){msg.textContent=err?.message||"Gagal menyimpan.";msg.style.color="var(--danger)";}
    startDateBtn.disabled=false;
   });
  return;
 }

 const startDateClear=event.target.closest("[data-start-clear]");
 if(startDateClear){
  const item=halaqahs().find(row=>row.id===startDateClear.dataset.startClear);
  if(!item)return;
  if(!confirm("Hapus tanggal mulai? Hari ke-1 kembali ke asumsi Pekan 1 (Sabtu)."))return;
  startDateClear.disabled=true;
  halaqApi("/api/pondoks/halaqahs/start-date",{method:"POST",body:JSON.stringify({
   pondok_id:Number(activePondokId()),
   halaqah_id:Number(item.numericId||0),
   program_start_date:""
  })})
   .then(()=>{toast("Tanggal mulai dihapus.");window.dispatchEvent(new Event("app:my-halaqah-changed"));return refreshHalaqahs(true,true);})
   .then(()=>{window.dispatchEvent(new Event("app:render"));})
   .catch(err=>{alert(err?.message||"Gagal menghapus.");startDateClear.disabled=false;});
  return;
 }

 const progress=event.target.closest("[data-student-progress]");
 if(progress){
  const item=halaqahs().find(row=>row.id===progress.dataset.halaqahId);
  const student=item?.students.find(row=>row.name===progress.dataset.studentProgress);
  if(!item||!student)return;
  const studentId=Number(student.santriUserId)||0;
  setState({selectedStudentProgress:{
   student:{...student,userId:studentId||null},
   halaqahId:item.id,
   halaqahName:item.name,
   startDate:item.startDate||null,
   musyrifName:item.musyrifName||musyrifName(item.musyrifId)
  }});
  // Baris santri membuka halaman tinjau progress (layout sama dengan #progress).
  location.hash=studentId
   ?"review-progress?student="+studentId+"&halaqah="+encodeURIComponent(item.id)
   :"santri-progress";
 }
});

document.addEventListener("submit",event=>{
 if(event.target.id==="platformHalaqahForm"){
  event.preventDefault();
  if(!isPlatformMusyrif())return;

  const name=document.querySelector("#platformHalaqahName")?.value.trim()||"";
  const message=document.querySelector("#platformHalaqahFormMessage");
  if(!name){
   if(message){message.textContent="Nama halaqah wajib diisi.";message.style.color="var(--danger)";}
   return;
  }

  const submit=event.target.querySelector('button[type="submit"]');
  if(submit){submit.disabled=true;submit.textContent="Membuat…";}

  halaqApi("/api/pondoks/halaqahs",{method:"POST",body:JSON.stringify({pondok_id:0,name})})
   .then(()=>{
    document.querySelector("#platformHalaqahForm")?.reset();
    document.querySelector("#platformHalaqahModal")?.classList.add("hidden");
    toast("Halaqah dibuat.");
    return refreshHalaqahs(true,true);
   })
   .then(()=>{window.dispatchEvent(new Event("app:render"));})
   .catch(err=>{
    if(message){message.textContent=err?.message||"Gagal membuat halaqah.";message.style.color="var(--danger)";}
    if(document.querySelector("#platformHalaqahModal")?.classList.contains("hidden")===false&&err?.message){
     toast(err.message);
    }
   })
   .finally(()=>{
    if(submit){submit.disabled=false;submit.textContent="Buat";}
   });
  return;
 }
 if(event.target.id==="platformHalaqahEditForm"){
  event.preventDefault();
  if(!isPlatformMusyrif())return;

  const item=halaqahs().find(row=>row.id===editingPlatformHalaqahId);
  if(!item)return;

  const name=document.querySelector("#platformHalaqahEditName")?.value.trim()||"";
  const message=document.querySelector("#platformHalaqahEditMessage");
  if(!name){
   if(message){message.textContent="Nama halaqah wajib diisi.";message.style.color="var(--danger)";}
   return;
  }

  const submit=event.target.querySelector('button[type="submit"]');
  if(submit){submit.disabled=true;submit.textContent="Menyimpan…";}

  halaqApi("/api/pondoks/halaqahs/update",{method:"POST",body:JSON.stringify({
   pondok_id:0,
   halaqah_id:Number(item.numericId||0),
   name
  })})
   .then(()=>{
    document.querySelector("#platformHalaqahEditForm")?.reset();
    document.querySelector("#platformHalaqahEditModal")?.classList.add("hidden");
    editingPlatformHalaqahId=null;
    toast("Nama halaqah diperbarui.");
    return refreshHalaqahs(true,true);
   })
   .then(()=>{window.dispatchEvent(new Event("app:render"));})
   .catch(err=>{
    if(message){message.textContent=err?.message||"Gagal menyimpan perubahan.";message.style.color="var(--danger)";}
   })
   .finally(()=>{
    if(submit){submit.disabled=false;submit.textContent="Simpan Perubahan";}
   });
  return;
 }
 if(event.target.id==="halaqahEditForm"){
  event.preventDefault();
  if(getState().persona!=="admin"||getState().context!=="pondok")return;

  const item=halaqahs().find(row=>row.id===editingHalaqahId);
  if(!item)return;

  const name=document.querySelector("#halaqahEditName")?.value.trim()||"";
  const musyrifUserId=parseUserId(document.querySelector("#halaqahEditMusyrif")?.value||"");
  const message=document.querySelector("#halaqahEditMessage");

  if(!name){
   if(message){message.textContent="Nama halaqah wajib diisi.";message.style.color="var(--danger)";}
   return;
  }

  const submit=event.target.querySelector('button[type="submit"]');
  if(submit){submit.disabled=true;submit.textContent="Menyimpan…";}

  halaqApi("/api/pondoks/halaqahs/update",{method:"POST",body:JSON.stringify({
   pondok_id:Number(activePondokId()),
   halaqah_id:Number(item.numericId||0),
   name,
   musyrif_user_id:musyrifUserId
  })})
   .then(()=>{
    document.querySelector("#halaqahEditForm")?.reset();
    document.querySelector("#halaqahEditModal")?.classList.add("hidden");
    editingHalaqahId=null;
    toast("Halaqah diperbarui.");
    return refreshHalaqahs(true,true);
   })
   .then(()=>{window.dispatchEvent(new Event("app:render"));})
   .catch(err=>{
    if(message){message.textContent=err?.message||"Gagal menyimpan perubahan.";message.style.color="var(--danger)";}
   })
   .finally(()=>{
    if(submit){submit.disabled=false;submit.textContent="Simpan Perubahan";}
   });
  return;
 }

 if(event.target.id!=="halaqahForm")return;
 event.preventDefault();
 if(getState().persona!=="admin"||getState().context!=="pondok")return;

 const name=document.querySelector("#halaqahName")?.value.trim()||"";
 const musyrifUserId=parseUserId(document.querySelector("#halaqahMusyrif")?.value||"");
 const message=document.querySelector("#halaqahFormMessage");

 if(!name){
  if(message){message.textContent="Nama halaqah wajib diisi.";message.style.color="var(--danger)";}
  return;
 }

 const submit=event.target.querySelector('button[type="submit"]');
 if(submit){submit.disabled=true;submit.textContent="Menyimpan…";}

 halaqApi("/api/pondoks/halaqahs",{method:"POST",body:JSON.stringify({
  pondok_id:Number(activePondokId()),
  name,
  musyrif_user_id:musyrifUserId
 })})
  .then(()=>{
   document.querySelector("#halaqahForm")?.reset();
   document.querySelector("#halaqahModal")?.classList.add("hidden");
   toast("Halaqah dibuat.");
   return refreshHalaqahs(true,true);
  })
  .then(()=>{window.dispatchEvent(new Event("app:render"));})
  .catch(err=>{
   if(message){message.textContent=err?.message||"Gagal menyimpan halaqah.";message.style.color="var(--danger)";}
  })
  .finally(()=>{
   if(submit){submit.disabled=false;submit.textContent="Simpan Halaqah";}
  });
});
