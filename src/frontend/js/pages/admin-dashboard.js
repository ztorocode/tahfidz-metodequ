import {getState} from "../store.js?v=757b3b6b";

export function adminDashboard(){
 const pondokName=getState().pondokProfile?.name||"Pondok Tahfidz Al-Furqan";
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Dashboard Pondok</p><h1>${pondokName}</h1><p class="muted">Ringkasan operasional tahfidz dan kualitas hafalan.</p></div><span class="badge success">WhatsApp Connected</span></div>
<div class="grid-4" style="margin-bottom:16px"><div class="kpi"><b>8</b><span class="muted">Halaqah</span></div><div class="kpi"><b>120</b><span class="muted">Santri</span></div><div class="kpi"><b>8</b><span class="muted">Musyrif</span></div><div class="kpi"><b>892</b><span class="muted">Hafalan Mutqin</span></div></div>
<div class="grid-2"><div class="card"><h3>Distribusi Progress</h3><div class="mini-bars">${[42,70,55,88,63,74,92,67,82,76,91,84].map(x=>`<span style="height:${x}%"></span>`).join("")}</div><div class="row between"><span class="badge success">Mutqin 892</span><span class="badge warning">Cukup Stabil 210</span><span class="badge danger">Perlu Ulang 45</span></div></div>
<div class="card"><h3>Musyrif Pondok</h3><div class="list" id="musyrifList"><small class="muted">Memuat...</small></div>
<div class="stack" style="margin-top:12px">
<div><label class="label">Nama musyrif</label><input class="input" id="musyrifName" placeholder="Nama lengkap"></div>
<div><label class="label">Email</label><input class="input" id="musyrifEmail" type="email" placeholder="nama@email.com"></div>
<div><label class="label">Nomor WhatsApp</label><input class="input" id="musyrifPhone" inputmode="tel" placeholder="+62 ..."></div>
<div><label class="label">Password awal</label><input class="input" id="musyrifPassword" type="password" placeholder="Minimal 8 karakter"></div>
<small class="muted" id="musyrifMessage"></small>
<button class="btn primary full" id="addMusyrifBtn" type="button">Tambah Musyrif</button>
</div></div>
<div class="card"><h3>Aktivitas Terbaru</h3><div class="list"><div class="list-item"><span class="dot"></span><div class="grow"><b>Ahmad Fauzi mengirim setoran</b><small class="muted" style="display:block">Juz 30 Hal. 12</small></div><small>10:42</small></div><div class="list-item"><span class="dot"></span><div class="grow"><b>Umar Khalid dinyatakan mutqin</b><small class="muted" style="display:block">Juz 30 Hal. 10</small></div><small>08:30</small></div></div></div></div>`;
}
