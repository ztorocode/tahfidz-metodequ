import {getState} from "../store.js?v=91c5d7ea";

export function adminSantriPage(){
 const pondokName=getState().pondokProfile?.name||(getState().myPondoks?.[0]?.name||"Pondok");
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Kelola Santri</p><h1>Santri ${pondokName}</h1><p class="muted">Undang santri lewat email & WhatsApp, mereka buat akun sendiri.</p></div></div>
<div class="grid-2"><div class="card"><h3>Undang Santri</h3><div class="stack">
<p class="muted" style="margin:0">Undang banyak santri sekaligus lewat email & WhatsApp, mereka buat akun sendiri.</p>
<button class="btn primary full" id="inviteSantriBtn" type="button">Kirim Undangan</button>
<button class="btn full" id="copySantriLinkBtn" type="button">Salin Link Undangan</button>
<button class="btn full" id="addSantriBtn" type="button">Form +Santri</button>
<h3 style="margin-top:16px">Undangan Terkirim</h3><div class="list" id="santriInviteList"><small class="muted">Memuat...</small></div>
<h3 style="margin-top:16px">Menunggu Persetujuan</h3><div class="list" id="pendingSantriList"><small class="muted">Memuat...</small></div>
</div></div>
<div class="card"><h3>Daftar Santri</h3><div class="list" id="santriList"><small class="muted">Memuat...</small></div></div>
</div></div></div>
<div class="modal-backdrop hidden" id="inviteSantriModal">
 <div class="modal-card">
  <div><p class="eyebrow">Undangan</p><h2>Kirim Undangan</h2></div>
  <div class="stack">
   <div><label class="label">Email (bisa banyak, satu per baris)</label><textarea class="input" id="santriEmail" rows="4" autocomplete="off" placeholder="nama1@email.com&#10;nama2@email.com"></textarea></div>
   <small class="muted" id="santriMessage">Nama & WA diisi santri saat terima undangan. Berlaku 7 hari.</small>
   <div class="btn-joined">
    <button class="btn" id="closeInviteSantriBtn" type="button">Tutup</button>
    <button class="btn primary" id="sendSantriInviteBtn" type="button">Kirim</button>
   </div>
  </div>
 </div>
</div>
<div class="modal-backdrop hidden" id="santriModal">
 <div class="modal-card">
  <div><p class="eyebrow">Santri</p><h2>Tambah Santri</h2></div>
  <div class="stack">
   <div><label class="label">Nama lengkap</label><input class="input" id="newSantriName" autocomplete="off" placeholder="Nama lengkap"></div>
   <div><label class="label">Email</label><input class="input" id="newSantriEmail" type="email" autocomplete="off" placeholder="nama@email.com"></div>
   <div><label class="label">Nomor WhatsApp</label><input class="input" id="newSantriPhone" inputmode="tel" placeholder="+62 ..."></div>
   <div><label class="label">Password awal</label><input class="input" id="newSantriPassword" type="password" autocomplete="new-password" placeholder="Minimal 8 karakter"></div>
   <small class="muted" id="newSantriMessage"></small>
   <div class="btn-joined">
    <button class="btn" id="closeSantriBtn" type="button">Tutup</button>
    <button class="btn primary" id="saveSantriBtn" type="button">Simpan Santri</button>
   </div>
  </div>
 </div>
</div>`;
}
