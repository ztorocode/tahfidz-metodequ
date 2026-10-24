import {getState} from "../store.js?v=f2d8c6b3";
import {getProgressContext,setProgressContextPatch} from "../utils/progress-context.js?v=f2d8c6b3";
import {scheduleSave} from "../utils/progress-sync.js?v=f2d8c6b3";
import {SURAHS} from "../data/quran-juz.js?v=f2d8c6b3";
import {parseVerseRef,versesBetween} from "../utils/quran-text.js?v=f2d8c6b3";
import {dayProgress} from "./member-progress.js?v=f2d8c6b3";

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

export function rabthAyatPage(){
 const data=getProgressContext(getState());
 const week=Math.min(5,Math.max(1,Number(data.week)||1));
 const params=query();
 const day=params.get("day")||data.openDay||"sabtu";
 const step=params.get("step")||"kemarin-1";
 const count=(step.match(/(\d+)$/)||[,"1"])[1];
 const awal=fieldValue(data,week,day,"rabth-awal");
 const akhir=fieldValue(data,week,day,"rabth-akhir");
 const title=awal&&akhir?escapeHtml(awal)+" → "+escapeHtml(akhir):"Rabth belum diisi";
 return '<section class="ayat-page" data-ayat-page data-week="'+week+'" data-day="'+escapeHtml(day)+'" data-step="'+escapeHtml(step)+'">'
  +'<div class="ayat-head">'
  +'<button class="btn soft" type="button" data-ayat-back>← Kembali</button>'
  +'<div class="ayat-title">'
  +'<p class="eyebrow">Hafalan kemarin · '+escapeHtml(count)+'x</p>'
  +'<h1>'+title+'</h1>'
  +'<small class="muted" id="ayatMeta">Memuat…</small>'
  +'</div></div>'
  +'<div id="ayatList" class="ayat-list"><div class="card"><small class="muted">Memuat ayat…</small></div></div>'
  +'<div class="ayat-actions" id="ayatActions"></div>'
  +'<small class="muted ayat-credit">Teks Al-Qur\'an: <a href="https://tanzil.net" target="_blank" rel="noopener">Tanzil Project</a> · CC BY 3.0</small>'
  +'</section>';
}

export function bindRabthAyat(){
 const root=document.querySelector("[data-ayat-page]");
 if(!root)return;
 root.querySelector("[data-ayat-back]")?.addEventListener("click",()=>{location.hash="progress";});

 const data=getProgressContext(getState());
 const week=Number(root.dataset.week)||1;
 const day=root.dataset.day;
 const step=root.dataset.step;
 const list=document.querySelector("#ayatList");
 const actions=document.querySelector("#ayatActions");
 const meta=document.querySelector("#ayatMeta");

 const awal=parseVerseRef(fieldValue(data,week,day,"rabth-awal"));
 const akhir=parseVerseRef(fieldValue(data,week,day,"rabth-akhir"));

 if(!awal||!akhir){
  if(meta)meta.textContent="Rabth belum lengkap";
  list.innerHTML='<div class="card"><b>Rabth awal / akhir belum diisi.</b>'
   +'<p class="muted" style="margin-top:8px">Isi Rabth awal dan Rabth akhir di halaman Progress (pilih surat & ayat), lalu klik lagi tombol hafalan kemarin.</p></div>';
  return;
 }
 if(awal.surah>akhir.surah||(awal.surah===akhir.surah&&awal.ayah>akhir.ayah)){
  if(meta)meta.textContent="Urutan terbalik";
  list.innerHTML='<div class="card"><b>Urutan rabth terbalik.</b>'
   +'<p class="muted" style="margin-top:8px">Rabth awal harus berada sebelum Rabth akhir.</p></div>';
  return;
 }

 // Tandai selesai / batalkan
 const key=week+":"+day+":"+step;
 const done=Boolean(data.checks?.[key]);
 actions.innerHTML='<button class="btn" type="button" data-ayat-back2>Kembali</button>'
  +'<button class="btn '+(done?"soft":"primary")+'" type="button" data-ayat-toggle>'+(done?"Batalkan tanda selesai":"Tandai selesai")+'</button>';
 actions.querySelector("[data-ayat-back2]")?.addEventListener("click",()=>{location.hash="progress";});
 actions.querySelector("[data-ayat-toggle]")?.addEventListener("click",()=>{
  const fresh=getProgressContext(getState());
  const checks={...(fresh.checks||{})};
  if(checks[key])delete checks[key]; else checks[key]=true;
  setProgressContextPatch({checks});
  scheduleSave(week,day,dayProgress(getProgressContext(getState()),week,day));
  location.hash="progress";
 });

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
   html+='<p class="ayat"><span class="ayat-no">'+verse.ayah+'</span><span class="ayat-text">'+verse.text+'</span></p>';
  });
  if(current)html+="</div>";
  list.innerHTML=html;
 }).catch(()=>{
  if(meta)meta.textContent="Gagal memuat";
  list.innerHTML='<div class="card"><b>Gagal memuat teks ayat.</b>'
   +'<p class="muted" style="margin-top:8px">Periksa koneksi, lalu buka halaman ini sekali lagi. Setelah terbuka, teks tersimpan untuk pemakaian offline.</p></div>';
 });
}
