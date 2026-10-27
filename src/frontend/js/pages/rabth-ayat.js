import {getState} from "../store.js?v=hpfq5a1";
import {getProgressContext,setProgressContextPatch} from "../utils/progress-context.js?v=hpfq5a1";
import {scheduleSave} from "../utils/progress-sync.js?v=hpfq5a1";
import {SURAHS} from "../data/quran-juz.js?v=hpfq5a1";
import {parseVerseRef,versesBetween} from "../utils/quran-text.js?v=hpfq5a1";
import {dayProgress} from "./member-progress.js?v=hpfq5a1";

const BISMILLAH="بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

function escapeHtml(value=""){
 return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function query(){
 const raw=location.hash.replace(/^#/,"");
 return new URLSearchParams(raw.split("?")[1]||"");
}

function fieldValue(data,week,day,id){
 return data.fields?.[week+":"+day+":"+id]||"";
}

// Range default istima'/tikrar (hafalan baru): setelah akhir hafalan kemarin/rabth, 5 ayat.
function defaultNewRange(data,week,day){
 const prevEnd=parseVerseRef(fieldValue(data,week,day,"ayat_hafalan_kemaren-akhir")||fieldValue(data,week,day,"rabth-akhir"));
 if(!prevEnd)return null;
 let s=prevEnd.surah,y=prevEnd.ayah+1;
 if(y>SURAHS[s-1][1]){s+=1;y=1;}
 if(s>114)return null;
 const awal={surah:s,ayah:y};
 let es=s,ey=y+4;
 while(es<=114&&ey>SURAHS[es-1][1]){ey-=SURAHS[es-1][1];es++;}
 if(es>114){es=114;ey=SURAHS[113][1];}
 return {awal,akhir:{surah:es,ayah:ey}};
}

// Tikrar = hafalan baru (sama dengan istima'). Urutan: Set Ayat tikrar → ayat istima'
// tersimpan → range default (kemarin+1, 5 ayat) → ayat hafalan kemarin → rabth.
// Mengembalikan string "Surah Ayat" (format fieldValue) atau null per field.
function tikrarRange(data,week,day){
 for(const p of ["ayat_tikrar","ayat_istima"]){
  const a=fieldValue(data,week,day,p+"-awal"),k=fieldValue(data,week,day,p+"-akhir");
  if(a&&k)return{awal:a,akhir:k};
 }
 const d=defaultNewRange(data,week,day);
 if(d)return{awal:SURAHS[d.awal.surah-1][0]+" "+d.awal.ayah,akhir:SURAHS[d.akhir.surah-1][0]+" "+d.akhir.ayah};
 return{
  awal:fieldValue(data,week,day,"ayat_hafalan_kemaren-awal")||fieldValue(data,week,day,"rabth-awal")||null,
  akhir:fieldValue(data,week,day,"ayat_hafalan_kemaren-akhir")||fieldValue(data,week,day,"rabth-akhir")||null
 };
}

export function rabthAyatPage(){
 const data=getProgressContext(getState());
 const week=Math.min(5,Math.max(1,Number(data.week)||1));
 const params=query();
 const day=params.get("day")||data.openDay||"sabtu";
 const step=params.get("step")||"kemarin-1";
 const isIstima=step.startsWith("istima-");
 const isTikrar=step.startsWith("tikrar-");
 const stepLabel=isIstima?"Istima' qari mujawwad":(isTikrar?"Tikrar":"Hafalan kemarin");
 const maxSteps=isIstima?3:(isTikrar?25:5);
 const count=(step.match(/(\d+)$/)||[,"1"])[1];
 // Set Ayat menimpa fallback step. Hafalan kemarin: ayat sendiri → rabth; Istima': ayat
 // hafalan kemarin → rabth; Tikrar dihitung terpisah lewat tikrarRange (ikat hafalan baru).
 const setPrefix=isIstima?"ayat_istima":(isTikrar?"ayat_tikrar":"ayat_hafalan_kemaren");
 const fallbackPrefixes=isIstima?["ayat_hafalan_kemaren"]:[];
 const fb=name=>{for(const p of fallbackPrefixes){const v=fieldValue(data,week,day,p+"-"+name);if(v)return v;}return fieldValue(data,week,day,"rabth-"+name);};
 const setAwal=fieldValue(data,week,day,setPrefix+"-awal");
 const setAkhir=fieldValue(data,week,day,setPrefix+"-akhir");
 const tr=isTikrar?tikrarRange(data,week,day):null;
 const awal=tr?tr.awal:(setAwal||fb("awal"));
 const akhir=tr?tr.akhir:(setAkhir||fb("akhir"));
 const title=awal&&akhir?escapeHtml(awal)+" → "+escapeHtml(akhir):"Rabth belum diisi";
 return '<section class="ayat-page" data-ayat-page data-week="'+week+'" data-day="'+escapeHtml(day)+'" data-step="'+escapeHtml(step)+'">'
  +'<div class="ayat-head">'
  +'<button class="btn soft" type="button" data-ayat-back>← Kembali</button>'
  +'<div class="ayat-title">'
  +'<p class="eyebrow">'+escapeHtml(stepLabel)+' · '+escapeHtml(count)+'x</p>'
  +'<h1>'+title+'</h1>'
  +'<small class="muted" id="ayatMeta">Memuat…</small>'
  +'</div>'
  +'<button class="btn" type="button" data-ayat-open-set style="margin-left:auto;flex-shrink:0">Set Ayat</button>'
  +'</div>'
  +'<div class="modal-backdrop hidden" id="ayatSetModal"><div class="modal-card">'
  +'<div><p class="eyebrow">Set Ayat</p><h2><span id="ayatSetJumlahLabel">Jumlah ayat yang dihafal kemarin</span> <input class="input" type="number" id="ayatSetJumlah" min="1" value="5" style="width:64px;display:inline-block;height:36px;padding:4px 8px;text-align:center;vertical-align:middle"></h2></div>'
  +'<div style="display:grid;gap:10px;margin-top:14px">'
  +'<div style="display:grid;grid-template-columns:minmax(0,1fr) 96px;gap:8px">'
  +'<label class="rabth-label">Dari surat<select class="input" id="ayatSetSurahAwal"></select></label>'
  +'<label class="rabth-label">Ayat<input class="input" type="number" id="ayatSetAyahAwal" min="1" inputmode="numeric"></label>'
  +'</div>'
  +'<div style="display:grid;grid-template-columns:minmax(0,1fr) 96px;gap:8px">'
  +'<label class="rabth-label">Sampai surat<select class="input" id="ayatSetSurahAkhir"></select></label>'
  +'<label class="rabth-label">Ayat<input class="input" type="number" id="ayatSetAyahAkhir" min="1" inputmode="numeric"></label>'
  +'</div>'
  +'</div>'
  +'<small class="muted" id="ayatSetMessage" style="display:block;margin-top:8px"></small>'
  +'<div class="row" style="justify-content:flex-end;gap:8px;margin-top:14px">'
  +'<button class="btn" type="button" data-ayat-set-close>Tutup</button>'
  +'<button class="btn primary" type="button" data-ayat-set-save>Simpan</button>'
  +'</div>'
  +'</div></div>'
  +'<div id="ayatList" class="ayat-list"><div class="card"><small class="muted">Memuat ayat…</small></div></div>'
  +'<audio id="ayatAudio" preload="none"></audio>'
  +'<div class="btn-joined ayat-actions" id="ayatActions"></div>'
  +'<small class="muted ayat-credit">Teks Al-Qur\'an: <a href="https://tanzil.net" target="_blank" rel="noopener">Tanzil Project</a> · CC BY 3.0</small>'
  +'</section>';
}

export function bindRabthAyat(){
 const root=document.querySelector("[data-ayat-page]");
 if(!root)return;
 root.querySelector("[data-ayat-back]")?.addEventListener("click",()=>{
  const player=document.querySelector("#ayatAudio");
  if(player){player.pause();player.removeAttribute("src");}
  location.hash=backRoute;
 });

 // Kembali ke halaman asal: #progress (santri) atau #review-progress (musyrif).
 const backRoute=query().get("from")==="review-progress"?"review-progress":"progress";
 const data=getProgressContext(getState());
 const week=Number(root.dataset.week)||1;
 const day=root.dataset.day;
 const step=root.dataset.step;
 const isIstima=step.startsWith("istima-");
 const isTikrar=step.startsWith("tikrar-");
 const setPrefix=isIstima?"ayat_istima":(isTikrar?"ayat_tikrar":"ayat_hafalan_kemaren");
 const stepLabel=isIstima?"Istima' qari mujawwad":(isTikrar?"Tikrar":"Hafalan kemarin");
 const maxSteps=isIstima?3:(isTikrar?25:5);
 // Hafalan kemarin fallback ke rabth; istima' fallback ke ayat hafalan kemarin → rabth;
 // tikrar dihitung terpisah lewat tikrarRange (ikat hafalan baru, sama dengan istima').
 const fallbackPrefixes=isIstima?["ayat_hafalan_kemaren"]:[];
 const fb=name=>{for(const p of fallbackPrefixes){const v=fieldValue(data,week,day,p+"-"+name);if(v)return v;}return fieldValue(data,week,day,"rabth-"+name);};

 // --- Set Ayat: modal rentang ayat (dari/sampai surat & ayat) ---
 const setModal=document.querySelector("#ayatSetModal");
 const surahAwalSel=document.querySelector("#ayatSetSurahAwal");
 const surahAkhirSel=document.querySelector("#ayatSetSurahAkhir");
 const ayahAwalInput=document.querySelector("#ayatSetAyahAwal");
 const ayahAkhirInput=document.querySelector("#ayatSetAyahAkhir");
 const setMessage=msg=>{const el=document.querySelector("#ayatSetMessage");if(el)el.textContent=msg||"";};
 const jumlahLabel=document.querySelector("#ayatSetJumlahLabel");
 if(jumlahLabel)jumlahLabel.textContent=isIstima?"Jumlah ayat istima'":(isTikrar?"Jumlah ayat tikrar":"Jumlah ayat yang dihafal kemarin");
 if(surahAwalSel&&!surahAwalSel.options.length){
  const opts=SURAHS.map((row,i)=>'<option value="'+(i+1)+'">'+(i+1)+'. '+escapeHtml(row[0])+' ('+row[1]+')</option>').join("");
  surahAwalSel.innerHTML=opts;
  surahAkhirSel.innerHTML=opts;
 }
 // Pilih surat awal → ayat awal otomatis 1, lalu hitung sampai dari (dari+ayatSetJumlah)
 const jumlahInput=document.querySelector("#ayatSetJumlah");
 const updateSampai=()=>{
  const sA=Number(surahAwalSel?.value||0), yA=Number(ayahAwalInput?.value||0);
  const n=Number(jumlahInput?.value||5)||5;
  if(!sA||!yA)return;
  let s=sA, y=yA+n-1;
  while(s<=114&&y>SURAHS[s-1][1]){ y-=SURAHS[s-1][1]; s++; }
  if(s>114){s=114;y=SURAHS[113][1];}
  if(surahAkhirSel)surahAkhirSel.value=String(s);
  if(ayahAkhirInput)ayahAkhirInput.value=String(y);
 };
 surahAwalSel?.addEventListener("change",()=>{const el=document.querySelector("#ayatSetAyahAwal");if(el)el.value="1";updateSampai();});
 ayahAwalInput?.addEventListener("input",updateSampai);
 jumlahInput?.addEventListener("input",updateSampai);
 let currentAwal=parseVerseRef(fieldValue(data,week,day,setPrefix+"-awal"));
 let currentAkhir=parseVerseRef(fieldValue(data,week,day,setPrefix+"-akhir"));
 // Istima' belum diisi → dari = akhir hafalan kemarin (atau rabth) + 1 ayat.
 if(isIstima&&!currentAwal){
  const prevEnd=parseVerseRef(fieldValue(data,week,day,"ayat_hafalan_kemaren-akhir")||fieldValue(data,week,day,"rabth-akhir"));
  if(prevEnd){
   let s=prevEnd.surah, y=prevEnd.ayah+1;
   if(y>SURAHS[s-1][1]){s+=1;y=1;}
   if(s<=114)currentAwal={surah:s,ayah:y};
  }
 }
 // Tikrar belum diisi Set Ayat → ikut ayat istima' (hafalan baru yang diulang),
 // lalu range default (akhir kemarin + 1, 5 ayat), baru fallback biasa.
 if(isTikrar){
  const r=tikrarRange(data,week,day);
  currentAwal=parseVerseRef(r.awal);
  currentAkhir=parseVerseRef(r.akhir);
 }
 if(currentAwal){surahAwalSel.value=String(currentAwal.surah);ayahAwalInput.value=String(currentAwal.ayah);}
 if(currentAkhir){surahAkhirSel.value=String(currentAkhir.surah);ayahAkhirInput.value=String(currentAkhir.ayah);}
 else if(currentAwal)updateSampai();
 root.querySelector("[data-ayat-open-set]")?.addEventListener("click",()=>{setMessage("");setModal?.classList.remove("hidden");});
 root.querySelector("[data-ayat-set-close]")?.addEventListener("click",()=>{setModal?.classList.add("hidden");});
 setModal?.addEventListener("click",event=>{if(event.target===setModal)setModal.classList.add("hidden");});
 root.querySelector("[data-ayat-set-save]")?.addEventListener("click",()=>{
  const sA=Number(surahAwalSel?.value||0),yA=Number(ayahAwalInput?.value||0);
  const sB=Number(surahAkhirSel?.value||0),yB=Number(ayahAkhirInput?.value||0);
  if(!sA||!yA||!sB||!yB)return setMessage("Isi surat & ayat lengkap dulu.");
  if(yA>SURAHS[sA-1][1]||yB>SURAHS[sB-1][1])return setMessage("Nomor ayat melebihi jumlah ayat surah.");
  if(sA>sB||(sA===sB&&yA>yB))return setMessage("Urutan terbalik: 'Dari' harus sebelum 'Sampai'.");
  const fresh=getProgressContext(getState());
  setProgressContextPatch({fields:{...(fresh.fields||{}),[week+":"+day+":"+setPrefix+"-awal"]:SURAHS[sA-1][0]+" "+yA,[week+":"+day+":"+setPrefix+"-akhir"]:SURAHS[sB-1][0]+" "+yB}});
  scheduleSave(week,day,dayProgress(getProgressContext(getState()),week,day));
  setModal?.classList.add("hidden");
  window.dispatchEvent(new Event("app:render"));
 });
 const list=document.querySelector("#ayatList");
 const actions=document.querySelector("#ayatActions");
 const meta=document.querySelector("#ayatMeta");

 const stepIndex=Number((step.match(/(\d+)$/)||[,"1"])[1])||1;
 const stepPrefix=isIstima?"istima":(isTikrar?"tikrar":"kemarin");
 const keyFor=index=>week+":"+day+":"+stepPrefix+"-"+index;
 const key=keyFor(stepIndex);

 // Harus berurutan: kemarin 1x→5x, istima' 1x→3x, tikrar 1x→25x
 if(stepIndex>1&&!data.checks?.[keyFor(stepIndex-1)]){
  if(meta)meta.textContent="Terkunci";
  const sequence=isTikrar?"1x → 2x → … → 25x":(isIstima?"1x → 2x → 3x":"1x → 2x → 3x → 4x → 5x");
  list.innerHTML='<div class="card"><b>Selesaikan '+(stepIndex-1)+'x dulu.</b>'
   +'<p class="muted" style="margin-top:8px">'+stepLabel+' harus berurutan: '+sequence+'. Tandai '+(stepIndex-1)+'x sebagai selesai dulu, baru '+(stepIndex)+'x bisa dibuka.</p></div>';
  actions.innerHTML='<button class="btn" type="button" data-ayat-back2>Kembali</button>';
  actions.querySelector("[data-ayat-back2]")?.addEventListener("click",()=>{location.hash=backRoute;});
  return;
 }

 let awal=parseVerseRef(fieldValue(data,week,day,setPrefix+"-awal"));
 let akhir=parseVerseRef(fieldValue(data,week,day,setPrefix+"-akhir"));
 // Tikrar ikut hafalan baru: ayat istima' / range default, bukan ayat hafalan kemarin.
 if(isTikrar){
  const r=tikrarRange(data,week,day);
  awal=parseVerseRef(r.awal);
  akhir=parseVerseRef(r.akhir);
 }
 // Istima' belum diisi → tampilkan range default: akhir hafalan kemarin/rabth + 1, sejumlah 5 ayat.
 if(isIstima&&(!awal||!akhir)){
  const prevEnd=parseVerseRef(fieldValue(data,week,day,"ayat_hafalan_kemaren-akhir")||fieldValue(data,week,day,"rabth-akhir"));
  if(prevEnd){
   let s=prevEnd.surah, y=prevEnd.ayah+1;
   if(y>SURAHS[s-1][1]){s+=1;y=1;}
   if(s<=114){
    awal=awal||{surah:s,ayah:y};
    let es=awal.surah, ey=awal.ayah+4;
    while(es<=114&&ey>SURAHS[es-1][1]){ey-=SURAHS[es-1][1];es++;}
    if(es>114){es=114;ey=SURAHS[113][1];}
    akhir=akhir||{surah:es,ayah:ey};
   }
  }
 }
 if(!awal)awal=parseVerseRef(fb("awal"));
 if(!akhir)akhir=parseVerseRef(fb("akhir"));

 if(!awal||!akhir){
  if(meta)meta.textContent="Rabth belum lengkap";
  list.innerHTML='<div class="card"><b>Rabth awal / akhir belum diisi.</b>'
   +'<p class="muted" style="margin-top:8px">Isi Rabth awal dan Rabth akhir di halaman Progress (pilih surat & ayat), lalu klik lagi tombol di bagian '+stepLabel+'.</p></div>';
  return;
 }
 if(awal.surah>akhir.surah||(awal.surah===akhir.surah&&awal.ayah>akhir.ayah)){
  if(meta)meta.textContent="Urutan terbalik";
  list.innerHTML='<div class="card"><b>Urutan rabth terbalik.</b>'
   +'<p class="muted" style="margin-top:8px">Rabth awal harus berada sebelum Rabth akhir.</p></div>';
  return;
 }

 // Simpan / Batal
 const audio=document.querySelector("#ayatAudio");
 const stopAudio=()=>{if(audio){audio.pause();audio.removeAttribute("src");}};
 const saveChecks=(nextChecks)=>{
  setProgressContextPatch({checks:nextChecks});
  scheduleSave(week,day,dayProgress(getProgressContext(getState()),week,day));
  stopAudio();
  location.hash=backRoute;
 };
 actions.innerHTML='<button class="btn" type="button" data-ayat-cancel>Batal</button>'
  +'<button class="btn primary" type="button" data-ayat-save>Simpan</button>';
 actions.querySelector("[data-ayat-cancel]")?.addEventListener("click",()=>{
  const fresh=getProgressContext(getState());
  const checks={...(fresh.checks||{})};
  for(let index=stepIndex;index<=maxSteps;index+=1)delete checks[keyFor(index)];
  saveChecks(checks);
 });
 actions.querySelector("[data-ayat-save]")?.addEventListener("click",()=>{
  const fresh=getProgressContext(getState());
  const checks={...(fresh.checks||{})};
  checks[key]=true;
  saveChecks(checks);
 });

 // Pemutar audio per ayat
 let playingBtn=null;
 const pad3=value=>String(value).padStart(3,"0");
 const globalAyah=(surah,ayah)=>{
  let total=0;
  for(let index=0;index<surah-1;index+=1)total+=SURAHS[index][1];
  return total+ayah;
 };
 const setPlaying=button=>{
  if(playingBtn&&playingBtn!==button){playingBtn.classList.remove("playing");playingBtn.textContent="▶";}
  playingBtn=button;
  if(button){button.classList.add("playing");button.textContent="❚❚";}
 };
 list.addEventListener("click",event=>{
  const button=event.target.closest("[data-play]");
  if(!button||!audio)return;
  if(button===playingBtn){audio.pause();setPlaying(null);return;}
  const [surah,ayah]=button.dataset.play.split(":").map(Number);
  audio.dataset.surah=String(surah);
  audio.dataset.ayah=String(ayah);
  audio.dataset.fallback="0";
  audio.src="https://everyayah.com/data/Alafasy_128kbps/"+pad3(surah)+pad3(ayah)+".mp3";
  setPlaying(button);
  const attempt=audio.play();
  if(attempt&&attempt.catch)attempt.catch(()=>setPlaying(null));
 });
 audio?.addEventListener("error",()=>{
  if(!audio||audio.dataset.fallback==="1"){setPlaying(null);return;}
  audio.dataset.fallback="1";
  const surah=Number(audio.dataset.surah);
  const ayah=Number(audio.dataset.ayah);
  if(!surah||!ayah){setPlaying(null);return;}
  audio.src="https://cdn.islamic.network/quran/audio/128/ar.alafasy/"+globalAyah(surah,ayah)+".mp3";
  const retry=audio.play();
  if(retry&&retry.catch)retry.catch(()=>setPlaying(null));
 });
 audio?.addEventListener("ended",()=>setPlaying(null));

 versesBetween(awal,akhir).then(({list:verses,startJuz,endJuz})=>{
  if(meta)meta.textContent=(startJuz===endJuz?"Juz "+startJuz:"Juz "+startJuz+"–"+endJuz)+" · "+verses.length+" ayat";
  if(!verses.length){
   list.innerHTML='<div class="card"><b>Tidak ada ayat pada rentang ini.</b></div>';
   return;
  }
  let html="";
  let current=0;
  verses.forEach(verse=>{
   if(verse.surah!==current){
    if(current)html+="</div>";
    current=verse.surah;
    html+='<div class="ayat-surah"><div class="ayat-surah-head"><h3>'+escapeHtml(SURAHS[verse.surah-1][0])+'</h3>'
     +'<small class="muted">Surah ke-'+verse.surah+'</small></div>';
    if(verse.surah!==1&&verse.surah!==9&&verse.ayah===1)html+='<p class="ayat-bismillah">'+BISMILLAH+'</p>';
   }
   html+='<p class="ayat"><span class="ayat-tools"><span class="ayat-no">'+verse.ayah+'</span>'
    +'<button class="ayat-play" type="button" data-play="'+verse.surah+':'+verse.ayah+'" aria-label="Putar ayat '+verse.ayah+'">▶</button></span>'
    +'<span class="ayat-text">'+verse.text+'</span></p>';
  });
  if(current)html+="</div>";
  list.innerHTML=html;
 }).catch(()=>{
  if(meta)meta.textContent="Gagal memuat";
  list.innerHTML='<div class="card"><b>Gagal memuat teks ayat.</b>'
   +'<p class="muted" style="margin-top:8px">Periksa koneksi, lalu buka halaman ini sekali lagi. Setelah terbuka, teks tersimpan untuk pemakaian offline.</p></div>';
 });
}
