import {getState} from "../store.js?v=81bed469";
import {loadMemberEnrollment} from "./member-enrollment.js?v=membernav1106";

export async function logLearningActivity(step,week,day){
 const token=getState().authToken;
 if(!token||!step||!week||!day)return false;
 try{
  const response=await fetch("/api/progress/activity",{
   method:"POST",
   headers:{"Content-Type":"application/json",Accept:"application/json",Authorization:"Bearer "+token},
   body:JSON.stringify({step:String(step),week:Number(week),day:String(day),pondok_id:Number(getState().activePondokId||getState().authUser?.pondoks?.[0]?.id||0)})
  });
  if(response.ok){
   const body=await response.json().catch(()=>({}));
   if(body.data?.program_started===true&&getState().authToken===token){
    window.dispatchEvent(new Event("app:my-halaqah-changed"));
    loadMemberEnrollment(true);
   }
  }
  return response.ok;
 }catch{
  return false;
 }
}
