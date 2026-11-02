import {getState,setState} from "../store.js?v=81bed469";

export const DEMO_DONOR_EMAIL="donatur@mutqeen.id";
export const DEMO_DONOR_PASSWORD="DemoDonatur2026!";

export function isDemoDonorEmail(value){
 return String(value||"").trim().toLowerCase()===DEMO_DONOR_EMAIL;
}
export function isDemoDonorCredentials(email,password){
 return isDemoDonorEmail(email)&&password===DEMO_DONOR_PASSWORD;
}
export function isDemoDonorSession(){
 const s=getState();
 return Boolean(s.loggedIn&&s.demoSession&&!s.authToken&&
  Array.isArray(s.authUser?.roles)&&s.authUser.roles.includes("donatur_demo"));
}
export function startDemoDonorSession(){
 setState({
  loggedIn:true,demoSession:true,authToken:null,
  authUser:{id:null,name:"Donatur Demo",email:DEMO_DONOR_EMAIL,phone:"",roles:["donatur_demo"],pondoks:[]},
  persona:"donatur",context:"personal",musyrifType:null,musyrifContexts:null,
  myPondoks:[],activePondokId:null,
  realHalaqahs:[],halaqahSrc:null,halaqahFetchedAt:0,
  realMusyrifs:[],musyrifSrc:null,realSantris:[],santriSrc:null,halaqahs:[],halaqahImported:null
 });
}
export function demoStudentsData(){
 return {
  demo:true,halaqah_name:"Halaqah Contoh",ustadz_name:"Ustadz Contoh",
  students:[
   {name:"Santri Demo 1",progress_percent:40,progress_week:1,progress_day:"senin",progress_updated_at:null},
   {name:"Santri Demo 2",progress_percent:75,progress_week:1,progress_day:"selasa",progress_updated_at:null},
   {name:"Santri Demo 3",progress_percent:null,progress_week:null,progress_day:null,progress_updated_at:null}
  ]
 };
}
