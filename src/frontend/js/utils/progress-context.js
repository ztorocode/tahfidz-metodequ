import {getState,setState} from "../store.js?v=dev-2f08f073";

function emptyProgressContext(){
 return {week:1,openDay:null,fields:{},checks:{}};
}

function normalizeProgressContext(value={}){
 return {
  week:Math.min(5,Math.max(1,Number(value.week)||1)),
  openDay:value.openDay||null,
  fields:{...(value.fields||{})},
  checks:{...(value.checks||{})}
 };
}

export function progressContextKey(state=getState()){
 return state.context==="pondok"?"pondok":"personal";
}

function legacyProgress(state){
 const hasFields=state.memberProgressFields&&Object.keys(state.memberProgressFields).length;
 const hasChecks=state.memberProgressChecks&&Object.keys(state.memberProgressChecks).length;
 const hasWeek=state.memberProgressWeek!=null;
 const hasOpenDay=state.memberProgressOpenDay!=null;
 if(!hasFields&&!hasChecks&&!hasWeek&&!hasOpenDay)return null;
 return normalizeProgressContext({
  week:state.memberProgressWeek,
  openDay:state.memberProgressOpenDay,
  fields:state.memberProgressFields,
  checks:state.memberProgressChecks
 });
}

export function getProgressContext(state=getState()){
 const key=progressContextKey(state);
 const existing=state.memberProgressByContext?.[key];
 if(existing)return normalizeProgressContext(existing);

 if(!state.memberProgressLegacyMigrated){
  const legacy=legacyProgress(state);
  if(legacy){
   const next={...(state.memberProgressByContext||{}),[key]:legacy};
   setState({memberProgressByContext:next,memberProgressLegacyMigrated:true});
   return legacy;
  }
 }

 return emptyProgressContext();
}

export function setProgressContextPatch(patch){
 const state=getState();
 const key=progressContextKey(state);
 const current=getProgressContext(state);
 const latest=getState();
 const next=normalizeProgressContext({...current,...patch});
 setState({memberProgressByContext:{...(latest.memberProgressByContext||{}),[key]:next}});
 return next;
}
