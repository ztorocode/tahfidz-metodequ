import {getState,setState} from "../store.js?v=dev-2f08f073";

export function contextSwitcher(){
 const s=getState();
 const pondokName=s.pondokProfile?.name||"Pondok Al-Furqan";
 const label=s.context==="personal"?"Personal":pondokName;
 return `<div style="position:relative"><button class="context-pill" id="contextBtn"><span class="dot"></span><b>${label}</b><span>⌄</span></button>
 <div class="context-menu hidden" id="contextMenu">
  <div class="muted" style="padding:6px 10px 8px;font-size:12px">Pilih konteks aktif</div>
  <button class="context-option ${s.context==="personal"?"active":""}" data-context="personal"><span class="avatar">AF</span><span><b>Akun Personal</b><small class="muted" style="display:block">Program pribadi</small></span></button>
  <button class="context-option ${s.context==="pondok"?"active":""}" data-context="pondok"><span class="avatar">P</span><span><b>${pondokName}</b><small class="muted" style="display:block">Santri · Halaqah</small></span></button>
 </div></div>`;
}

export function bindContext(){
 const btn=document.querySelector("#contextBtn"),menu=document.querySelector("#contextMenu");
 btn?.addEventListener("click",()=>menu.classList.toggle("hidden"));
 document.querySelectorAll("[data-context]").forEach(el=>el.addEventListener("click",()=>{
  setState({context:el.dataset.context});
  menu.classList.add("hidden");
  window.dispatchEvent(new Event("app:render"));
 }));
}
