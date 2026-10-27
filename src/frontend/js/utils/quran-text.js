import {JUZ,SURAHS} from "../data/quran-juz.js?v=dae8efdc";

const VERSION="f1e7665";
const loaded=new Map();

/** Nomor surah dari namanya (mis. "Hud" → 11). 0 bila tidak dikenal. */
export function surahByName(name){
 const clean=String(name||"").trim().toLowerCase();
 return SURAHS.findIndex(row=>row[0].toLowerCase()===clean)+1;
}

/** "Hud 6" → {surah:11,ayah:6}. null bila tidak valid. */
export function parseVerseRef(text){
 const match=String(text||"").trim().match(/^(.*)\s+(\d+)$/);
 if(!match)return null;
 const surah=surahByName(match[1]);
 const ayah=Number(match[2]);
 if(!surah||!ayah)return null;
 return {surah,ayah};
}

export function juzOf(surah,ayah){
 for(let juz=30;juz>=1;juz-=1){
  const [startSurah,startAyah]=JUZ[juz-1][0];
  if(surah>startSurah||(surah===startSurah&&ayah>=startAyah))return juz;
 }
 return 1;
}

export async function loadJuz(number){
 const juz=Math.min(30,Math.max(1,Number(number)||1));
 if(loaded.has(juz))return loaded.get(juz);
 const file=String(juz).padStart(2,"0");
 const module=await import(`../data/quran/juz-${file}.js?v=${VERSION}`);
 loaded.set(juz,module.default);
 return module.default;
}

/** Ayat dari (surah,ayah) awal sampai akhir, inklusif. */
export async function versesBetween(from,to){
 const startJuz=juzOf(from.surah,from.ayah);
 const endJuz=juzOf(to.surah,to.ayah);
 const list=[];
 for(let juz=startJuz;juz<=endJuz;juz+=1){
  const rows=await loadJuz(juz);
  rows.forEach(([surah,ayah,text])=>{
   const afterStart=surah>from.surah||(surah===from.surah&&ayah>=from.ayah);
   const beforeEnd=surah<to.surah||(surah===to.surah&&ayah<=to.ayah);
   if(afterStart&&beforeEnd)list.push({surah,ayah,text});
  });
 }
 return {list,startJuz,endJuz};
}
