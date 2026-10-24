import {getState} from "../store.js?v=b7e3f1d5";
import {getProgressContext,setProgressContextPatch} from "../utils/progress-context.js?v=b7e3f1d5";
import {scheduleSave} from "../utils/progress-sync.js?v=b7e3f1d5";
import {SURAHS} from "../data/quran-juz.js?v=b7e3f1d5";
import {parseVerseRef,versesBetween} from "../utils/quran-text.js?v=b7e3f1d5";
import {dayProgress} from "./member-progress.js?v=b7e3f1d5";

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
  location.hash="progress";
 });

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

 // Simpan / Batal
 const key=week+":"+day+":"+step;
 const audio=document.querySelector("#ayatAudio");
 const stopAudio=()=>{if(audio){audio.pause();audio.removeAttribute("src");}};
 const saveChecks=(nextChecks)=>{
  setProgressContextPatch({checks:nextChecks});
  scheduleSave(week,day,dayProgress(getProgressContext(getState()),week,day));
  stopAudio();
  location.hash="progress";
 };
 actions.innerHTML='<button class="btn" type="button" data-ayat-cancel>Batal</button>'
  +'<button class="btn primary" type="button" data-ayat-save>Simpan</button>';
 actions.querySelector("[data-ayat-cancel]")?.addEventListener("click",()=>{
  const fresh=getProgressContext(getState());
  const checks={...(fresh.checks||{})};
  delete checks[key];
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
