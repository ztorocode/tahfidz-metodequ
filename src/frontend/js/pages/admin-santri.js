import {getState} from "../store.js?v=11c34fe5";

export function adminSantriPage(){
 const pondokName=getState().pondokProfile?.name||(getState().myPondoks?.[0]?.name||"Pondok");
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Kelola Santri</p><h1>Santri ${pondokName}</h1><p class="muted">Undang santri lewat email & WhatsApp, mereka buat akun sendiri.</p></div></div>
<div class="grid-2"><div class="card"><h3>Daftar Santri</h3><div class="list" id="santriList"><small class="muted">Memuat...</small></div>
<h3 style="margin-top:16px">Undangan Terkirim</h3><div class="list" id="santriInviteList"><small class="muted">Memuat...</small></div></div>
<div class="card"><h3>Undang Santri</h3><div class="stack">
<div><label class="label">Email</label><input class="input" id="santriEmail" type="email" autocomplete="off" placeholder="nama@email.com"></div>
<small class="muted" id="santriMessage">Ketik email — bila sudah terdaftar akan muncul saran. Nama & WA diisi santri saat terima undangan.</small>Undangan berisi link; santri membuat password sendiri (berlaku 7 hari).</small>
<button class="btn primary full" id="inviteSantriBtn" type="button">Kirim Undangan</button>
<button class="btn full" id="copySantriLinkBtn" type="button">Salin Link Undangan</button>
</div></div></div>`;
}
