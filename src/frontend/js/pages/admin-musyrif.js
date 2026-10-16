import {getState} from "../store.js?v=24a0eced";

export function adminMusyrifPage(){
 const pondokName=getState().pondokProfile?.name||(getState().myPondoks?.[0]?.name||"Pondok");
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Kelola Musyrif</p><h1>Musyrif ${pondokName}</h1><p class="muted">Undang musyrif lewat email & WhatsApp, mereka buat password sendiri.</p></div></div>
<div class="grid-2"><div class="card"><h3>Daftar Musyrif</h3><div class="list" id="musyrifList"><small class="muted">Memuat...</small></div>
<h3 style="margin-top:16px">Undangan Terkirim</h3><div class="list" id="inviteList"><small class="muted">Memuat...</small></div></div>
<div class="card"><h3>Undang Musyrif</h3><div class="stack">
<div><label class="label">Email</label><input class="input" id="musyrifEmail" type="email" autocomplete="off" placeholder="nama@email.com"></div>
<small class="muted" id="musyrifMessage">Ketik email — bila sudah terdaftar akan muncul saran. Nama & WA diisi musyrif saat terima undangan.</small>Undangan berisi link; musyrif membuat password sendiri (berlaku 7 hari).</small>
<button class="btn primary full" id="inviteMusyrifBtn" type="button">Kirim Undangan</button>
<button class="btn full" id="copyMusyrifLinkBtn" type="button">Salin Link Undangan</button>
</div></div></div>`;
}
