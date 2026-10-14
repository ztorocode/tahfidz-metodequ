import {getState} from "../store.js?v=6a86f974";

export function adminMusyrifPage(){
 const pondokName=getState().pondokProfile?.name||(getState().myPondoks?.[0]?.name||"Pondok");
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Kelola Musyrif</p><h1>Musyrif ${pondokName}</h1><p class="muted">Tambah dan lihat musyrif pondok Anda.</p></div></div>
<div class="grid-2"><div class="card"><h3>Daftar Musyrif</h3><div class="list" id="musyrifList"><small class="muted">Memuat...</small></div></div>
<div class="card"><h3>Tambah Musyrif</h3><div class="stack">
<div><label class="label">Nama musyrif</label><input class="input" id="musyrifName" placeholder="Nama lengkap"></div>
<div><label class="label">Email</label><input class="input" id="musyrifEmail" type="email" placeholder="nama@email.com"></div>
<div><label class="label">Nomor WhatsApp</label><input class="input" id="musyrifPhone" inputmode="tel" placeholder="+62 ..."></div>
<div><label class="label">Password awal</label><input class="input" id="musyrifPassword" type="password" placeholder="Minimal 8 karakter"></div>
<small class="muted" id="musyrifMessage"></small>
<button class="btn primary full" id="addMusyrifBtn" type="button">Tambah Musyrif</button>
</div></div></div>`;
}
