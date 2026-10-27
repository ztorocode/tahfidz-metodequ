import {getState} from "../store.js?v=81bed469";

export async function logLearningActivity(step,week,day){
 const token=getState().authToken;
 if(!token||!step||!week||!day)return false;
 try{
  const response=await fetch("/api/progress/activity",{
   method:"POST",
   headers:{"Content-Type":"application/json",Accept:"application/json",Authorization:"Bearer "+token},
   body:JSON.stringify({step:String(step),week:Number(week),day:String(day)})
  });
  return response.ok;
 }catch{
  return false;
 }
}
