import {member} from "../data/dummy-data.js?v=dev-2f08f073";
import {getState} from "../store.js?v=dev-b3f742d1";
import {getProgressContext} from "../utils/progress-context.js?v=dev-b3f742d1";
import {badge} from "../utils/helpers.js?v=dev-2f08f073";

const days=["sabtu","ahad","senin","selasa","rabu","kamis"];
const weekdayIds=["ahad","senin","selasa","rabu","kamis","jumat","sabtu"];
const fieldIds=["target","murajaah","rabth-awal","rabth-akhir"];
const stepIds=[
 ...Array.from({length:5},(_,i)=>"kemarin-"+(i+1)),
 ...Array.from({length:3},(_,i)=>"istima-"+(i+1)),
 "menghafal","merekam",
 ...Array.from({length:25},(_,i)=>"tikrar-"+(i+1))
];

function escapeHtml(value=""){
 return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function field(data,week,day,id){
 return data.fields?.[week+":"+day+":"+id]||"";
}

function step(data,week,day,id){
 return Boolean(data.checks?.[week+":"+day+":"+id]);
}

function dayStats(data,week,day){
 const fieldsFilled=fieldIds.filter(id=>String(field(data,week,day,id)).trim()).length;
 const stepsDone=stepIds.filter(id=>step(data,week,day,id)).length;
 return {
  filled:fieldsFilled+stepsDone>0,
  done:fieldsFilled+stepsDone,
  total:fieldIds.length+stepIds.length,
  pct:Math.round((fieldsFilled+stepsDone)/(fieldIds.length+stepIds.length)*100)
 };
}

function countSteps(data,week,day,prefix,total){
 let count=0;
 for(let i=1;i<=total;i++)if(step(data,week,day,prefix+"-"+i))count+=1;
 return count;
}

function statusBadge(label,done,total){
 if(done>=total)return badge(label,"success");
 if(done>0)return badge(label,"warning");
 return badge(label,"");
}

export function memberDashboard(){
 const state=getState();
 const data=getProgressContext(state);
 const week=Math.min(5,Math.max(1,Number(data.week)||1));
 const contextLabel=state.context==="pondok"?(state.pondokProfile?.name||member.pondok):"Personal";

 const stats=days.map(day=>dayStats(data,week,day));
 const totalDone=stats.reduce((sum,item)=>sum+item.done,0);
 const totalItems=stats.reduce((sum,item)=>sum+item.total,0);
 const weekPct=totalItems?Math.round(totalDone/totalItems*100):0;
 const filledDays=stats.filter(item=>item.filled).length;
 const hafalanDays=days.filter(day=>step(data,week,day,"menghafal")).length;
 const recordedDays=days.filter(day=>step(data,week,day,"merekam")).length;
 const tikrarWeek=days.reduce((sum,day)=>sum+countSteps(data,week,day,"tikrar",25),0);

 const today=weekdayIds[new Date().getDay()];
 const isFriday=today==="jumat";
 const target=isFriday?"":field(data,week,today,"target");
 const murajaahValue=isFriday?"":field(data,week,today,"murajaah");
 const rabthStart=isFriday?"":field(data,week,today,"rabth-awal");
 const rabthEnd=isFriday?"":field(data,week,today,"rabth-akhir");
 const kemarinDone=isFriday?0:countSteps(data,week,today,"kemarin",5);
 const istimaDone=isFriday?0:countSteps(data,week,today,"istima",3);
 const tikrarDone=isFriday?0:countSteps(data,week,today,"tikrar",25);
 const menghafalDone=!isFriday&&step(data,week,today,"menghafal");
 const merekamDone=!isFriday&&step(data,week,today,"merekam");
 const rabthDone=Number(Boolean(rabthStart))+Number(Boolean(rabthEnd));

 const activities=isFriday?[
  {name:"Jum'at",detail:"Libur hafalan",status:"Libur",tone:""}
 ]:[
  {name:"Muraja'ah",detail:murajaahValue?"Juz "+murajaahValue:"Belum diisi",status:murajaahValue?"Selesai":"Belum",tone:murajaahValue?"success":""},
  {name:"Rabth",detail:rabthStart||rabthEnd?((rabthStart||"-")+" → "+(rabthEnd||"-")):"Belum diisi",status:rabthDone===2?"Selesai":rabthDone?"Sebagian":"Belum",tone:rabthDone===2?"success":rabthDone?"warning":""},
  {name:"Hafalan kemarin",detail:kemarinDone+"/5 pengulangan",status:kemarinDone+"/5",tone:kemarinDone===5?"success":kemarinDone?"warning":""},
  {name:"Istima' qari",detail:istimaDone+"/3 pengulangan",status:istimaDone+"/3",tone:istimaDone===3?"success":istimaDone?"warning":""},
  {name:"Menghafal",detail:menghafalDone?"Sudah dikerjakan":"Belum dikerjakan",status:menghafalDone?"Selesai":"Belum",tone:menghafalDone?"success":""},
  {name:"Merekam",detail:merekamDone?"Sudah dikerjakan":"Belum dikerjakan",status:merekamDone?"Selesai":"Belum",tone:merekamDone?"success":""},
  {name:"Tikrar",detail:tikrarDone+"/25 pengulangan",status:tikrarDone+"/25",tone:tikrarDone===25?"success":tikrarDone?"warning":""}
 ];

 const targetText=isFriday?"Libur hafalan":target?escapeHtml(target)+" halaman":"Belum diisi";

 return `
<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Assalamu'alaikum</p><h1>${escapeHtml(member.name)}</h1><p class="muted">Konteks aktif: <b>${escapeHtml(contextLabel)}</b> · Fokus hari ini: kuatkan hafalan, bukan sekadar menambah.</p></div></div>

<div class="hero-card card" style="margin-bottom:16px"><div class="row between"><div><p style="opacity:.8;margin-bottom:6px">Program aktif · Pekan ${week}</p><h2 style="margin-bottom:7px">${escapeHtml(member.personalProgram)}</h2><b>Target hari ini: ${targetText}</b></div><a class="btn" href="#progress" style="background:white;color:#14533e;border:0">Buka Progress</a></div></div>

<div class="card" style="margin-bottom:16px"><div class="row between"><div><h3>Progress Pekan ${week}</h3><small class="muted">Dihitung langsung dari form Progress konteks ${escapeHtml(contextLabel)}.</small></div><a href="#progress" class="muted">Lihat detail</a></div><div class="progress" style="--value:${weekPct}%;margin-top:14px"><span></span></div>
<div class="grid-4" style="margin-top:16px">
 <div><b class="metric">${weekPct}%</b><div class="metric-label">Progress pekan</div></div>
 <div><b class="metric">${filledDays}/6</b><div class="metric-label">Hari terisi</div></div>
 <div><b class="metric" style="color:var(--brand)">${hafalanDays}/6</b><div class="metric-label">Menghafal selesai</div></div>
 <div><b class="metric">${tikrarWeek}</b><div class="metric-label">Tikrar tercatat</div></div>
</div></div>

<div class="grid-3">
 <div class="card">
  <div class="row between"><div><h3>Aktivitas Hari Ini</h3><small class="muted">${isFriday?"Jum'at":"Pekan "+week+" · "+today}</small></div><a href="#progress" class="muted">Buka</a></div>
  <div class="list" style="margin-top:12px">${activities.map(item=>`<div class="list-item"><span class="check ${item.tone==="success"?"done":""}">${item.tone==="success"?"✓":""}</span><div class="grow"><b>${escapeHtml(item.name)}</b><small class="muted" style="display:block">${escapeHtml(item.detail)}</small></div>${badge(item.status,item.tone)}</div>`).join("")}</div>
 </div>

 <div class="card">
  <div class="row between"><div><h3>Data Hari Ini</h3><small class="muted">Dari form Progress</small></div><a href="#report" class="muted">Report</a></div>
  <div class="list" style="margin-top:12px">
   <div class="list-item"><div class="grow"><b>Target hal/hari</b><small class="muted" style="display:block">${isFriday?"Libur hafalan":target?escapeHtml(target):"Belum diisi"}</small></div></div>
   <div class="list-item"><div class="grow"><b>Muraja'ah</b><small class="muted" style="display:block">${murajaahValue?"Juz "+escapeHtml(murajaahValue):"Belum diisi"}</small></div></div>
   <div class="list-item"><div class="grow"><b>Rabth</b><small class="muted" style="display:block">${rabthStart||rabthEnd?escapeHtml(rabthStart||"-")+" → "+escapeHtml(rabthEnd||"-"):"Belum diisi"}</small></div>${statusBadge(rabthDone===2?"2/2":rabthDone+"/2",rabthDone,2)}</div>
   <div class="list-item"><div class="grow"><b>Tikrar</b><small class="muted" style="display:block">${tikrarDone}/25 pengulangan</small></div>${statusBadge(tikrarDone+"/25",tikrarDone,25)}</div>
  </div>
 </div>

 <div class="card">
  <div class="row between"><div><h3>Ringkasan Pekan ${week}</h3><small class="muted">${escapeHtml(contextLabel)}</small></div></div>
  <div class="list" style="margin-top:12px">
   <div class="list-item"><div class="grow"><b>Hari dengan aktivitas</b><small class="muted" style="display:block">Dari Sabtu sampai Kamis</small></div><b>${filledDays}/6</b></div>
   <div class="list-item"><div class="grow"><b>Menghafal selesai</b><small class="muted" style="display:block">Checklist Menghafal aktif</small></div><b>${hafalanDays}/6</b></div>
   <div class="list-item"><div class="grow"><b>Merekam selesai</b><small class="muted" style="display:block">Checklist Merekam aktif</small></div><b>${recordedDays}/6</b></div>
   <div class="list-item"><div class="grow"><b>Total Tikrar</b><small class="muted" style="display:block">Checklist 1x-25x seluruh pekan</small></div><b>${tikrarWeek}</b></div>
  </div>
 </div>
</div>`;
}
