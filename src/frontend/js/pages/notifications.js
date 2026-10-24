import {notifications} from "../data/dummy-data.js?v=c8f4a2e6";import {badge} from "../utils/helpers.js?v=c8f4a2e6";
import {getState} from "../store.js?v=c8f4a2e6";
export function notificationsPage(){
 const st=getState();
 const mine=Array.isArray(st.myInvites)?st.myInvites:[];
 const inviteCard=mine.length?`<div class="card" style="margin-bottom:16px"><h3>Undangan Pondok (${mine.length})</h3><div class="list">${mine.map(v=>`<div class="list-item"><span class="avatar">✉</span><div class="grow"><b>${v.role==="musyrif"?"Musyrif":"Santri"} · ${v.pondok_name}</b><small class="muted" style="display:block">Berlaku s/d ${String(v.expires_at||"").slice(0,10)}</small></div><button class="btn primary" type="button" data-accept-invite="${v.id}">Terima</button></div>`).join("")}</div></div>`:"";
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Pusat Aktivitas</p><h1>Notifikasi</h1></div><button class="btn">Tandai semua dibaca</button></div>${inviteCard}<div class="card"><div class="list">${notifications.map(n=>`<div class="list-item"><span class="dot" style="background:var(--${n.tone==="success"?"brand":n.tone})"></span><div class="grow"><b>${n.title}</b><small class="muted" style="display:block">${n.body}</small></div>${badge(n.time,"")}</div>`).join("")}</div></div>`}
