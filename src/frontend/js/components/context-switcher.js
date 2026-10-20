import {getState,setState} from "../store.js?v=e5f81c2a";

export function pondokList(){
 const s=getState();
 const mine=[...(s.myPondoks||[])];
 if(s.pondokProfile&&!mine.some(p=>p.id===(s.pondokProfile.id??0))){
  mine.push({id:s.pondokProfile.id??0,name:s.pondokProfile.name||"Pondok",slug:s.pondokProfile.slug||"",role:"admin"});
 }
 return mine;
}

export function canPersonal(){
 const s=getState();
 const u=s.authUser;
 if(u)return (u.roles||[]).includes("member");
 return s.persona!=="admin";
}

export function contextSwitcher(){
 const s=getState();
 const list=pondokList();
 const personal=canPersonal();
 const ctx=personal?s.context:"pondok";
 const active=list.find(p=>p.id===(s.activePondokId??list[0]?.id))||list[0];
 const label=ctx==="pondok"&&active?active.name:"Personal";
 const personalActive=ctx!=="pondok";
 const options=list.map(p=>`<button class="context-option ${s.context==="pondok"&&active?.id===p.id?"active":""}" data-context="pondok" data-pondok-id="${p.id}"><span class="avatar">P</span><span><b>${p.name}</b><small class="muted" style="display:block">Santri · Halaqah</small></span></button>`).join("");
 return `<div style="position:relative"><button class="context-pill" id="contextBtn"><span class="dot"></span><b>${label}</b><span>⌄</span></button>
 <div class="context-menu hidden" id="contextMenu">
  <div class="muted" style="padding:6px 10px 8px;font-size:12px">Pilih konteks aktif</div>
  ${personal?`<button class="context-option ${personalActive?"active":""}" data-context="personal"><span class="avatar">AF</span><span><b>Akun Personal</b><small class="muted" style="display:block">Program pribadi</small></span></button>`:""}
  ${options}
 </div></div>`;
}

export function bindContext(){
 const btn=document.querySelector("#contextBtn"),menu=document.querySelector("#contextMenu");
 btn?.addEventListener("click",()=>menu.classList.toggle("hidden"));
 document.querySelectorAll("[data-context]").forEach(el=>el.addEventListener("click",()=>{
  const patch={context:el.dataset.context};
  if(el.dataset.context==="pondok"&&el.dataset.pondokId!==undefined){
   patch.activePondokId=isNaN(Number(el.dataset.pondokId))?el.dataset.pondokId:Number(el.dataset.pondokId);
  }
  setState(patch);
  menu.classList.add("hidden");
  window.dispatchEvent(new Event("app:render"));
 }));
}
