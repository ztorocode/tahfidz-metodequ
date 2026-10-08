const users=[
 {name:"Ahmad Fauzi",email:"member@metodequ.id",role:"Member",type:"Personal",scope:"Personal",status:"Aktif"},
 {name:"Siti Aisyah",email:"siti@example.com",role:"Santri",type:"Pondok",scope:"Pondok Tahfidz Al-Furqan",status:"Aktif"},
 {name:"Ust. Rahmat Hidayat",email:"musyrif@metodequ.id",role:"Musyrif",type:"Pondok",scope:"Pondok Tahfidz Al-Furqan",status:"Aktif"},
 {name:"Ust. Abdullah",email:"abdullah@metodequ.id",role:"Musyrif",type:"Platform",scope:"MetodeQu",status:"Aktif"},
 {name:"Admin Pondok",email:"admin@metodequ.id",role:"Admin Pondok",type:"Pondok",scope:"Pondok Tahfidz Al-Furqan",status:"Aktif"},
 {name:"Super Admin",email:"superadmin@metodequ.id",role:"Super Admin",type:"Platform",scope:"MetodeQu",status:"Aktif"}
];

export function superAdminDashboard(){
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Admin Aplikasi</p><h1>Dashboard MetodeQu</h1><p class="muted">Ringkasan platform lintas akun dan pondok.</p></div><span class="badge success">Platform Aktif</span></div>
 <div class="grid-4" style="margin-bottom:16px"><div class="kpi"><b>1.284</b><span class="muted">Total user</span></div><div class="kpi"><b>24</b><span class="muted">Pondok</span></div><div class="kpi"><b>12</b><span class="muted">Musyrif platform</span></div><div class="kpi"><b>740</b><span class="muted">User personal</span></div></div>
 <div class="grid-2"><div class="card"><div class="row between"><h3>Manajemen User</h3><a href="#users" class="muted">Lihat semua</a></div><div class="list"><div class="list-item"><span class="dot"></span><div class="grow"><b>Member / Santri</b><small class="muted" style="display:block">Personal dan anggota pondok</small></div><b>1.126</b></div><div class="list-item"><span class="dot"></span><div class="grow"><b>Musyrif</b><small class="muted" style="display:block">Platform dan pondok</small></div><b>109</b></div><div class="list-item"><span class="dot"></span><div class="grow"><b>Admin Pondok</b><small class="muted" style="display:block">Pengelola tenant pondok</small></div><b>48</b></div><div class="list-item"><span class="dot"></span><div class="grow"><b>Super Admin</b><small class="muted" style="display:block">Pengelola aplikasi MetodeQu</small></div><b>1</b></div></div></div>
 <div class="card"><h3>Aktivitas Platform</h3><div class="list"><div class="list-item"><span class="dot"></span><div class="grow"><b>Pondok Al-Ikhlas bergabung</b><small class="muted" style="display:block">Tenant baru aktif</small></div><small>Hari ini</small></div><div class="list-item"><span class="dot"></span><div class="grow"><b>Ust. Abdullah ditugaskan</b><small class="muted" style="display:block">Musyrif Platform · 8 user personal</small></div><small>Hari ini</small></div></div></div></div>`;
}

export function userManagementPage(){
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Admin Aplikasi</p><h1>Manajemen User</h1><p class="muted">Daftar akun lintas Personal dan Pondok. Data masih prototype/demo.</p></div><span class="badge success">${users.length} sample user</span></div>
 <div class="grid-4" style="margin-bottom:16px"><div class="kpi"><b>1.126</b><span class="muted">Member / Santri</span></div><div class="kpi"><b>109</b><span class="muted">Musyrif</span></div><div class="kpi"><b>48</b><span class="muted">Admin Pondok</span></div><div class="kpi"><b>1</b><span class="muted">Super Admin</span></div></div>
 <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Tipe</th><th>Scope</th><th>Status</th></tr></thead><tbody>${users.map(user=>`<tr><td><b>${user.name}</b></td><td>${user.email}</td><td>${user.role}</td><td>${user.type}</td><td>${user.scope}</td><td><span class="badge success">${user.status}</span></td></tr>`).join("")}</tbody></table></div></div>`;
}

export function platformPondoksPage(){
 const pondoks=[["Pondok Tahfidz Al-Furqan","Admin Pondok",120,8],["Pondok Tahfidz Al-Ikhlas","Ahmad Hasyim",86,6],["Rumah Qur'an An-Nur","Muhammad Fikri",54,4]];
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Admin Aplikasi</p><h1>Pondok</h1><p class="muted">Daftar tenant pondok yang menggunakan MetodeQu.</p></div><span class="badge success">24 pondok aktif</span></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Pondok</th><th>Admin Pondok</th><th>Santri</th><th>Musyrif</th><th>Status</th></tr></thead><tbody>${pondoks.map(item=>`<tr><td><b>${item[0]}</b></td><td>${item[1]}</td><td>${item[2]}</td><td>${item[3]}</td><td><span class="badge success">Aktif</span></td></tr>`).join("")}</tbody></table></div></div>`;
}

export function platformMusyrifPage(){
 const items=[["Ust. Abdullah","abdullah@metodequ.id",8],["Ust. Salman","salman@metodequ.id",11],["Ust. Haris","haris@metodequ.id",6]];
 return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Admin Aplikasi</p><h1>Musyrif Platform</h1><p class="muted">Musyrif yang dikelola MetodeQu untuk mendampingi user Personal.</p></div><span class="badge success">12 musyrif aktif</span></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Musyrif</th><th>Email</th><th>User dampingan</th><th>Tipe</th><th>Status</th></tr></thead><tbody>${items.map(item=>`<tr><td><b>${item[0]}</b></td><td>${item[1]}</td><td>${item[2]}</td><td>Platform</td><td><span class="badge success">Aktif</span></td></tr>`).join("")}</tbody></table></div></div>`;
}

export function platformSettingsPage(){
 return `<div style="margin-bottom:18px"><p class="eyebrow">Admin Aplikasi</p><h1>Pengaturan Platform</h1><p class="muted">Konfigurasi global MetodeQu. Pada prototype ini pengaturan masih read-only.</p></div><div class="grid-2"><div class="card"><h3>Role & akses</h3><div class="list"><div class="list-item"><div class="grow"><b>Super Admin</b><small class="muted" style="display:block">Akses level platform</small></div></div><div class="list-item"><div class="grow"><b>Admin Pondok</b><small class="muted" style="display:block">Akses tenant pondok</small></div></div><div class="list-item"><div class="grow"><b>Musyrif</b><small class="muted" style="display:block">Tipe Platform atau Pondok</small></div></div></div></div><div class="card"><h3>Scope data</h3><p class="muted">Data Personal, Pondok, dan Platform diperlakukan sebagai scope berbeda. Backend authorization tetap diperlukan sebelum production.</p></div></div>`;
}
