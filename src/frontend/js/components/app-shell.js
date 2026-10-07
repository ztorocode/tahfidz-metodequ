import {getState,setState} from "../store.js";
import {contextSwitcher,bindContext} from "./context-switcher.js";
const memberNav=[["dashboard","Dashboard"],["program","Program"],["activity","Aktivitas Hari Ini"],["submission","Setoran"],["murajaah","Muraja'ah"],["notifications","Notifikasi"]];
const musyrifNav=[["musyrif","Dashboard"],["review","Setoran"],["halaqah","Santri / Halaqah"],["notifications","Notifikasi"]];
const adminNav=[["admin","Dashboard"],["halaqah","Halaqah"],["whatsapp","WhatsApp"],["notifications","Notifikasi"]];
function navItems(){
 const p=getState().persona;return p==="admin"?adminNav:p==="musyrif"?musyrifNav:memberNav;
}
export function shell(content){
 const s=getState(),route=location.hash.replace("#","")||"dashboard";
 const nav=navItems().map(([r,l])=>`<a href="#${r}" class="${route===r?"active":""}">${l}</a>`).join("");
 return `<div class="app-shell"><aside class="sidebar"><div class="brand"><img src="./assets/images/icon.svg">MetodeQu</div><nav class="nav">${nav}</nav>
 <div class="sidebar-footer"><button class="btn full" id="personaBtn">Demo: ${s.persona}</button></div></aside>
 <main class="main"><header class="topbar"><div class="search muted">Cari halaman, surat, atau menu...</div><div class="row">${contextSwitcher()}<button class="btn" id="themeBtn">${s.theme==="dark"?"Light":"Dark"}</button></div></header>
 <section class="content"><div id="installSlot"></div>${content}</section>
 <nav class="mobile-nav">${navItems().slice(0,5).map(([r,l])=>`<a href="#${r}" class="${route===r?"active":""}">${l}</a>`).join("")}</nav></main></div>`;
}
export function bindShell(){
 bindContext();
 document.querySelector("#themeBtn")?.addEventListener("click",()=>{const theme=getState().theme==="dark"?"light":"dark";setState({theme});document.documentElement.dataset.theme=theme;window.dispatchEvent(new Event("app:render"))});
 document.querySelector("#personaBtn")?.addEventListener("click",()=>{const p=getState().persona;const next=p==="member"?"musyrif":p==="musyrif"?"admin":"member";setState({persona:next});location.hash=next==="admin"?"admin":next==="musyrif"?"musyrif":"dashboard";});
}
