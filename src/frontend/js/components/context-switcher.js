import {getState,setState} from "../store.js?v=dev-f66389a1";
export function contextSwitcher(){
 const s=getState();const label=s.context==="personal"?"Personal":"Pondok Al-Furqan";
 return `<div style="position:relative"><button class="context-pill" id="contextBtn"><span class="dot"></span><b>${label}</b><span>⌄</span></button>
 <div class="context-menu hidden" id="contextMenu">
  <div class="muted" style="padding:6px 10px 8px;font-size:12px">Pilih konteks aktif</div>
  <button class="context-option ${s.context==="personal"?"active":""}" data-context="personal"><span class="avatar">AF</span><span><b>Akun Personal</b><small class="muted" style="display:block">Program pribadi</small></span></button>
  <button class="context-option ${s.context==="pondok"?"active":""}" data-context="pondok"><span class="avatar">P</span><span><b>Pondok Al-Furqan</b><small class="muted" style="display:block">Santri · Halaqah 1</small></span></button>
 </div></div>`;
}
export function bindContext(){
 const btn=document.querySelector("#contextBtn"),menu=document.querySelector("#contextMenu");
 btn?.addEventListener("click",()=>menu.classList.toggle("hidden"));
 document.querySelectorAll("[data-context]").forEach(el=>el.addEventListener("click",()=>{setState({context:el.dataset.context});menu.classList.add("hidden");window.dispatchEvent(new Event("app:render"))}));
}
