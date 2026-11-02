const KEY="metodequ-demo-state";
const defaults={theme:"light",persona:"member",context:"personal",loggedIn:false};
let state={...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")};
const listeners=new Set();
export function getState(){return state}
export function setState(patch){state={...state,...patch};localStorage.setItem(KEY,JSON.stringify(state));listeners.forEach(fn=>fn(state))}
export function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
export function resetState(patch={}){
 state={...defaults,...patch};
 localStorage.setItem(KEY,JSON.stringify(state));
 listeners.forEach(fn=>fn(state));
}
// A logout from a second tab must also lock this tab.
window.addEventListener("storage",event=>{
 if(event.key!==KEY)return;
 let next;
 try{next=event.newValue?JSON.parse(event.newValue):{...defaults}}catch{next={...defaults}}
 if(state.loggedIn&&!next.loggedIn){
  state={...defaults,...next};
  window.location.hash="login";
  window.location.reload();
 }
});
