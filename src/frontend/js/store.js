const KEY="metodequ-demo-state";
const defaults={theme:"light",persona:"member",context:"personal",loggedIn:false};
let state={...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")};
const listeners=new Set();
export function getState(){return state}
export function setState(patch){state={...state,...patch};localStorage.setItem(KEY,JSON.stringify(state));listeners.forEach(fn=>fn(state))}
export function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
export function resetState(){state={...defaults};localStorage.setItem(KEY,JSON.stringify(state));listeners.forEach(fn=>fn(state))}
