import {getState} from "../store.js?v=8380da72";

export function adminSantriPage(){
 const pondokName=getState().pondokProfile?.name||(getState().myPondoks?.[0]?.name||"Pondok");
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Kelola Santri</p><h1>Santri ${pondokName}</h1><p class="muted">Undang santri lewat email & WhatsApp, mereka buat akun sendiri.</p></div></div>
<div class="grid-2"><div class="card"><h3>Daftar Santri</h3><div class="list" id="santriList"><small class="muted">Memuat...</small></div>
<h3 style="margin-top:16px">Undangan Terkirim</h3><div class="list" id="santriInviteList"><small class="muted">Memuat...</small></div></div>
<div class="card"><h3>Undang Santri</h3><div class="stack">
<p class="muted" style="margin:0">Undang banyak santri sekaligus lewat email & WhatsApp, mereka buat akun sendiri.</p>
<button class="btn primary full" id="inviteSantriBtn" type="button">Kirim Undangan</button>
<button class="btn full" id="copySantriLinkBtn" type="button">Salin Link Undangan</button>
</div></div></div>
<div class="modal-backdrop hidden" id="inviteSantriModal">
 <div class="modal-card">
  <div class="row between"><div><p class="eyebrow">Undangan</p><h2>Kirim Undangan</h2></div><button class="btn" id="closeInviteSantriBtn" type="button">Tutup</button></div>
  <div class="stack">
   <div><label class="label">Email (bisa banyak, satu per baris)</label><textarea class="input" id="santriEmail" rows="4" autocomplete="off" placeholder="nama1@email.com&#10;nama2@email.com"></textarea></div>
   <small class="muted" id="santriMessage">Nama & WA diisi santri saat terima undangan. Berlaku 7 hari.</small>
   <button class="btn primary full" id="sendSantriInviteBtn" type="button">Kirim</button>
  </div>
 </div>
</div>`;
}
