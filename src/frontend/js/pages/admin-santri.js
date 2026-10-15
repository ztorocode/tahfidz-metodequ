import {getState} from "../store.js?v=a2ba1716";

export function adminSantriPage(){
 const pondokName=getState().pondokProfile?.name||(getState().myPondoks?.[0]?.name||"Pondok");
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Kelola Santri</p><h1>Santri ${pondokName}</h1><p class="muted">Undang santri lewat email & WhatsApp, mereka buat akun sendiri.</p></div></div>
<div class="grid-2"><div class="card"><h3>Daftar Santri</h3><div class="list" id="santriList"><small class="muted">Memuat...</small></div>
<h3 style="margin-top:16px">Undangan Terkirim</h3><div class="list" id="santriInviteList"><small class="muted">Memuat...</small></div></div>
<div class="card"><h3>Undang Santri</h3><div class="stack">
<div><label class="label">Nama santri</label><input class="input" id="santriName" placeholder="Nama lengkap"></div>
<div><label class="label">Email</label><input class="input" id="santriEmail" type="email" placeholder="nama@email.com"></div>
<div><label class="label">Nomor WhatsApp</label><input class="input" id="santriPhone" inputmode="tel" placeholder="+62 ..."></div>
<small class="muted" id="santriMessage">Undangan berisi link; santri membuat password sendiri (berlaku 7 hari).</small>
<button class="btn primary full" id="inviteSantriBtn" type="button">Kirim Undangan</button>
</div></div></div>`;
}
