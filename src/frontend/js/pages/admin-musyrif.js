import {getState} from "../store.js?v=f3ae0417";

export function adminMusyrifPage(){
 const pondokName=getState().pondokProfile?.name||(getState().myPondoks?.[0]?.name||"Pondok");
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Kelola Musyrif</p><h1>Musyrif ${pondokName}</h1><p class="muted">Undang musyrif lewat email & WhatsApp, mereka buat password sendiri.</p></div></div>
<div class="grid-2"><div class="card"><h3>Undang Musyrif</h3><div class="stack">
<p class="muted" style="margin:0">Undang banyak musyrif sekaligus lewat email & WhatsApp, mereka buat password sendiri.</p>
<button class="btn primary full" id="inviteMusyrifBtn" type="button">Kirim Undangan</button>
<button class="btn full" id="copyMusyrifLinkBtn" type="button">Salin Link Undangan</button>
<button class="btn full" id="addMusyrifBtn" type="button">Form +Musyrif</button>
<h3 style="margin-top:16px">Undangan Terkirim</h3><div class="list" id="inviteList"><small class="muted">Memuat...</small></div>
<h3 style="margin-top:16px">Menunggu Persetujuan</h3><div class="list" id="pendingMusyrifList"><small class="muted">Memuat...</small></div>
</div></div>
<div class="card"><h3>Daftar Musyrif</h3><div class="list" id="musyrifList"><small class="muted">Memuat...</small></div></div>
</div></div></div>
<div class="modal-backdrop hidden" id="inviteMusyrifModal">
 <div class="modal-card">
  <div class="row between"><div><p class="eyebrow">Undangan</p><h2>Kirim Undangan</h2></div><button class="btn" id="closeInviteMusyrifBtn" type="button">Tutup</button></div>
  <div class="stack">
   <div><label class="label">Email (bisa banyak, satu per baris)</label><textarea class="input" id="musyrifEmail" rows="4" autocomplete="off" placeholder="nama1@email.com&#10;nama2@email.com"></textarea></div>
   <small class="muted" id="musyrifMessage">Ketik email — bila sudah terdaftar akan muncul saran. Nama & WA diisi musyrif saat terima undangan. Berlaku 7 hari.</small>
   <button class="btn primary full" id="sendMusyrifInviteBtn" type="button">Kirim</button>
  </div>
 </div>
</div>
</div></div></div>
<div class="modal-backdrop hidden" id="musyrifModal">
 <div class="modal-card">
  <div class="row between"><div><p class="eyebrow">Musyrif</p><h2>Tambah Musyrif</h2></div><button class="btn" id="closeMusyrifBtn" type="button">Tutup</button></div>
  <div class="stack">
   <div><label class="label">Nama lengkap</label><input class="input" id="newMusyrifName" autocomplete="off" placeholder="Nama lengkap"></div>
   <div><label class="label">Email</label><input class="input" id="newMusyrifEmail" type="email" autocomplete="off" placeholder="nama@email.com"></div>
   <div><label class="label">Nomor WhatsApp</label><input class="input" id="newMusyrifPhone" inputmode="tel" placeholder="+62 ..."></div>
   <div><label class="label">Password awal</label><input class="input" id="newMusyrifPassword" type="password" autocomplete="new-password" placeholder="Minimal 8 karakter"></div>
   <small class="muted" id="newMusyrifMessage"></small>
   <button class="btn primary full" id="saveMusyrifBtn" type="button">Simpan Musyrif</button>
  </div>
 </div>
</div>`;
}
