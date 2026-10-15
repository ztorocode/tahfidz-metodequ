import {getState} from "../store.js?v=e456ddf9";

export function adminMusyrifPage(){
 const pondokName=getState().pondokProfile?.name||(getState().myPondoks?.[0]?.name||"Pondok");
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Kelola Musyrif</p><h1>Musyrif ${pondokName}</h1><p class="muted">Undang musyrif lewat email & WhatsApp, mereka buat password sendiri.</p></div></div>
<div class="grid-2"><div class="card"><h3>Daftar Musyrif</h3><div class="list" id="musyrifList"><small class="muted">Memuat...</small></div>
<h3 style="margin-top:16px">Undangan Terkirim</h3><div class="list" id="inviteList"><small class="muted">Memuat...</small></div></div>
<div class="card"><h3>Undang Musyrif</h3><div class="stack">
<div><label class="label">Nama musyrif</label><input class="input" id="musyrifName" placeholder="Nama lengkap"></div>
<div><label class="label">Email</label><input class="input" id="musyrifEmail" type="email" placeholder="nama@email.com"></div>
<div><label class="label">Nomor WhatsApp</label><input class="input" id="musyrifPhone" inputmode="tel" placeholder="+62 ..."></div>
<small class="muted" id="musyrifMessage">Undangan berisi link; musyrif membuat password sendiri (berlaku 7 hari).</small>
<button class="btn primary full" id="inviteMusyrifBtn" type="button">Kirim Undangan</button>
</div></div></div>`;
}
