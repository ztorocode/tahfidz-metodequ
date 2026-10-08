import {getState} from "../store.js?v=dev-b3f742d1";
import {getProgressContext,setProgressContextPatch} from "../utils/progress-context.js?v=dev-b3f742d1";

const weeks=[1,2,3,4,5];
const days=[
 {id:"sabtu",name:"Sabtu"},
 {id:"ahad",name:"Ahad"},
 {id:"senin",name:"Senin"},
 {id:"selasa",name:"Selasa"},
 {id:"rabu",name:"Rabu"},
 {id:"kamis",name:"Kamis"}
];
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

function stateWeek(data=getProgressContext()){
 return Math.min(5,Math.max(1,Number(data.week)||1));
}

function fieldKey(week,day,id){return week+":"+day+":"+id}
function stepKey(week,day,id){return week+":"+day+":"+id}

function fieldValue(data,week,day,id){
 return data.fields?.[fieldKey(week,day,id)]||"";
}

function isStepDone(data,week,day,id){
 return Boolean(data.checks?.[stepKey(week,day,id)]);
}

function dayProgress(data,week,day){
 let done=0;
 fieldIds.forEach(id=>{if(String(fieldValue(data,week,day,id)).trim())done+=1});
 stepIds.forEach(id=>{if(isStepDone(data,week,day,id))done+=1});
 return Math.round(done/(fieldIds.length+stepIds.length)*100);
}

function progressField(data,week,day,label,id,placeholder=""){
 return '<div class="member-progress-field"><label>'+label+'</label><input class="member-progress-input" data-progress-field="'+id+'" data-progress-day="'+day+'" value="'+escapeHtml(fieldValue(data,week,day,id))+'" placeholder="'+placeholder+'"></div>';
}

function stepButton(data,week,day,label,id){
 const active=isStepDone(data,week,day,id);
 return '<button type="button" class="member-progress-step'+(active?" active":"")+'" data-progress-step="'+id+'" data-progress-day="'+day+'" aria-pressed="'+String(active)+'">'+label+'</button>';
}

function dayBody(data,week,day){
 const kemarin=Array.from({length:5},(_,i)=>stepButton(data,week,day,(i+1)+"x","kemarin-"+(i+1))).join("");
 const istima=Array.from({length:3},(_,i)=>stepButton(data,week,day,(i+1)+"x","istima-"+(i+1))).join("");
 const tikrar=Array.from({length:25},(_,i)=>stepButton(data,week,day,(i+1)+"x","tikrar-"+(i+1))).join("");
 return '<div class="member-progress-day-body">'+
  '<div class="member-progress-fields">'+
   progressField(data,week,day,"Target hal/hari","target")+
   progressField(data,week,day,"Muraja\'ah (juz)","murajaah")+
   '<div class="member-progress-rabth">'+
    progressField(data,week,day,"Rabth (1x)","rabth-awal","awal")+
    progressField(data,week,day,"Rabth akhir","rabth-akhir")+
   '</div>'+
  '</div>'+
  '<div class="member-progress-block"><label>Hafalan kemarin</label><div class="member-progress-options cols-5">'+kemarin+'</div></div>'+
  '<div class="member-progress-block"><label>Istima\' qari mujawwad</label><div class="member-progress-options cols-3">'+istima+'</div></div>'+
  '<div class="member-progress-block"><label>Hafalan baru</label><div class="member-progress-options cols-2">'+
   stepButton(data,week,day,"Menghafal","menghafal")+
   stepButton(data,week,day,"Merekam","merekam")+
  '</div></div>'+
  '<div class="member-progress-block"><label>Tikrar: ulang langsung hafalan yang didapat</label><div class="member-progress-options cols-7">'+tikrar+'</div></div>'+
 '</div>';
}

function dayCard(data,week,item,index){
 const open=data.openDay===item.id;
 const dayNumber=((week-1)*6)+index+1;
 const pct=dayProgress(data,week,item.id);
 return '<article class="member-progress-day'+(open?" open":"")+'">'+
  '<button type="button" class="member-progress-day-head" data-progress-day-toggle="'+item.id+'" aria-expanded="'+String(open)+'">'+
   '<span class="member-progress-day-title"><b>'+item.name+'</b><span>Hari ke-'+dayNumber+'</span></span>'+
   '<strong data-progress-percent="'+item.id+'">'+pct+'%</strong>'+
  '</button>'+
  (open?dayBody(data,week,item.id):"")+
 '</article>';
}

export function memberProgressPage(){
 const data=getProgressContext(getState());
 const week=stateWeek(data);
 return '<section class="member-progress-page">'+
  '<div class="member-progress-weeks" role="tablist" aria-label="Pilih pekan">'+
   weeks.map(item=>'<button type="button" class="member-progress-week'+(item===week?" active":"")+'" data-progress-week="'+item+'" role="tab" aria-selected="'+String(item===week)+'">Pekan '+item+'</button>').join("")+
  '</div>'+
  '<div class="member-progress-days">'+
   days.map((item,index)=>dayCard(data,week,item,index)).join("")+
   '<div class="member-progress-friday"><b>Jum\'at</b><span>· libur hafalan</span></div>'+
  '</div>'+
 '</section>';
}

function updatePercent(day){
 const data=getProgressContext(getState());
 const week=stateWeek(data);
 const node=document.querySelector('[data-progress-percent="'+day+'"]');
 if(node)node.textContent=dayProgress(data,week,day)+"%";
}

document.addEventListener("click",event=>{
 if(location.hash!=="#progress")return;

 const weekButton=event.target.closest("[data-progress-week]");
 if(weekButton){
  setProgressContextPatch({week:Number(weekButton.dataset.progressWeek),openDay:null});
  window.dispatchEvent(new Event("app:render"));
  return;
 }

 const dayButton=event.target.closest("[data-progress-day-toggle]");
 if(dayButton){
  const day=dayButton.dataset.progressDayToggle;
  const current=getProgressContext(getState()).openDay;
  setProgressContextPatch({openDay:current===day?null:day});
  window.dispatchEvent(new Event("app:render"));
  return;
 }

 const step=event.target.closest("[data-progress-step]");
 if(step){
  const data=getProgressContext(getState());
  const week=stateWeek(data);
  const day=step.dataset.progressDay;
  const key=stepKey(week,day,step.dataset.progressStep);
  const next={...(data.checks||{}),[key]:!Boolean(data.checks?.[key])};
  setProgressContextPatch({checks:next});
  const active=Boolean(next[key]);
  step.classList.toggle("active",active);
  step.setAttribute("aria-pressed",String(active));
  updatePercent(day);
 }
});

document.addEventListener("input",event=>{
 if(location.hash!=="#progress")return;
 const input=event.target.closest("[data-progress-field]");
 if(!input)return;
 const data=getProgressContext(getState());
 const week=stateWeek(data);
 const day=input.dataset.progressDay;
 const key=fieldKey(week,day,input.dataset.progressField);
 const next={...(data.fields||{}),[key]:input.value};
 setProgressContextPatch({fields:next});
 updatePercent(day);
});
