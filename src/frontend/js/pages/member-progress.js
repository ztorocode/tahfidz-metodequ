import {getState,setState} from "../store.js?v=dev-2f08f073";

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

function stateWeek(){
 const value=Number(getState().memberProgressWeek)||1;
 return Math.min(5,Math.max(1,value));
}

function fieldKey(week,day,id){return week+":"+day+":"+id}
function stepKey(week,day,id){return week+":"+day+":"+id}

function fieldValue(state,week,day,id){
 return state.memberProgressFields?.[fieldKey(week,day,id)]||"";
}

function isStepDone(state,week,day,id){
 return Boolean(state.memberProgressChecks?.[stepKey(week,day,id)]);
}

function dayProgress(state,week,day){
 let done=0;
 fieldIds.forEach(id=>{if(String(fieldValue(state,week,day,id)).trim())done+=1});
 stepIds.forEach(id=>{if(isStepDone(state,week,day,id))done+=1});
 return Math.round(done/(fieldIds.length+stepIds.length)*100);
}

function progressField(state,week,day,label,id,placeholder=""){
 return '<div class="member-progress-field"><label>'+label+'</label><input class="member-progress-input" data-progress-field="'+id+'" data-progress-day="'+day+'" value="'+escapeHtml(fieldValue(state,week,day,id))+'" placeholder="'+placeholder+'"></div>';
}

function stepButton(state,week,day,label,id){
 const active=isStepDone(state,week,day,id);
 return '<button type="button" class="member-progress-step'+(active?" active":"")+'" data-progress-step="'+id+'" data-progress-day="'+day+'" aria-pressed="'+String(active)+'">'+label+'</button>';
}

function dayBody(state,week,day){
 const kemarin=Array.from({length:5},(_,i)=>stepButton(state,week,day,(i+1)+"x","kemarin-"+(i+1))).join("");
 const istima=Array.from({length:3},(_,i)=>stepButton(state,week,day,(i+1)+"x","istima-"+(i+1))).join("");
 const tikrar=Array.from({length:25},(_,i)=>stepButton(state,week,day,(i+1)+"x","tikrar-"+(i+1))).join("");
 return '<div class="member-progress-day-body">'+
  '<div class="member-progress-fields">'+
   progressField(state,week,day,"Target hal/hari","target")+
   progressField(state,week,day,"Muraja\'ah (juz)","murajaah")+
   '<div class="member-progress-rabth">'+
    progressField(state,week,day,"Rabth (1x)","rabth-awal","awal")+
    progressField(state,week,day,"Rabth akhir","rabth-akhir")+
   '</div>'+
  '</div>'+
  '<div class="member-progress-block"><label>Hafalan kemarin</label><div class="member-progress-options cols-5">'+kemarin+'</div></div>'+
  '<div class="member-progress-block"><label>Istima\' qari mujawwad</label><div class="member-progress-options cols-3">'+istima+'</div></div>'+
  '<div class="member-progress-block"><label>Hafalan baru</label><div class="member-progress-options cols-2">'+
   stepButton(state,week,day,"Menghafal","menghafal")+
   stepButton(state,week,day,"Merekam","merekam")+
  '</div></div>'+
  '<div class="member-progress-block"><label>Tikrar: ulang langsung hafalan yang didapat</label><div class="member-progress-options cols-7">'+tikrar+'</div></div>'+
 '</div>';
}

function dayCard(state,week,item,index){
 const open=state.memberProgressOpenDay===item.id;
 const dayNumber=((week-1)*6)+index+1;
 const pct=dayProgress(state,week,item.id);
 return '<article class="member-progress-day'+(open?" open":"")+'">'+
  '<button type="button" class="member-progress-day-head" data-progress-day-toggle="'+item.id+'" aria-expanded="'+String(open)+'">'+
   '<span class="member-progress-day-title"><b>'+item.name+'</b><span>Hari ke-'+dayNumber+'</span></span>'+
   '<strong data-progress-percent="'+item.id+'">'+pct+'%</strong>'+
  '</button>'+
  (open?dayBody(state,week,item.id):"")+
 '</article>';
}

export function memberProgressPage(){
 const state=getState();
 const week=stateWeek();
 return '<section class="member-progress-page">'+
  '<div class="member-progress-weeks" role="tablist" aria-label="Pilih pekan">'+
   weeks.map(item=>'<button type="button" class="member-progress-week'+(item===week?" active":"")+'" data-progress-week="'+item+'" role="tab" aria-selected="'+String(item===week)+'">Pekan '+item+'</button>').join("")+
  '</div>'+
  '<div class="member-progress-days">'+
   days.map((item,index)=>dayCard(state,week,item,index)).join("")+
   '<div class="member-progress-friday"><b>Jum\'at</b><span>· libur hafalan</span></div>'+
  '</div>'+
 '</section>';
}

function updatePercent(day){
 const state=getState();
 const week=stateWeek();
 const node=document.querySelector('[data-progress-percent="'+day+'"]');
 if(node)node.textContent=dayProgress(state,week,day)+"%";
}

document.addEventListener("click",event=>{
 if(location.hash!=="#progress")return;

 const weekButton=event.target.closest("[data-progress-week]");
 if(weekButton){
  setState({memberProgressWeek:Number(weekButton.dataset.progressWeek),memberProgressOpenDay:null});
  window.dispatchEvent(new Event("app:render"));
  return;
 }

 const dayButton=event.target.closest("[data-progress-day-toggle]");
 if(dayButton){
  const day=dayButton.dataset.progressDayToggle;
  const current=getState().memberProgressOpenDay;
  setState({memberProgressOpenDay:current===day?null:day});
  window.dispatchEvent(new Event("app:render"));
  return;
 }

 const step=event.target.closest("[data-progress-step]");
 if(step){
  const state=getState();
  const week=stateWeek();
  const day=step.dataset.progressDay;
  const key=stepKey(week,day,step.dataset.progressStep);
  const next={...(state.memberProgressChecks||{}),[key]:!Boolean(state.memberProgressChecks?.[key])};
  setState({memberProgressChecks:next});
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
 const state=getState();
 const week=stateWeek();
 const day=input.dataset.progressDay;
 const key=fieldKey(week,day,input.dataset.progressField);
 const next={...(state.memberProgressFields||{}),[key]:input.value};
 setState({memberProgressFields:next});
 updatePercent(day);
});
