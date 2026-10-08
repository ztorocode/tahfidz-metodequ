import {getState,setState} from "../store.js?v=dev-b3f742d1";import {students} from "../data/dummy-data.js?v=dev-2f08f073";import {badge,statusTone} from "../utils/helpers.js?v=dev-2f08f073";
export function musyrifDashboard(){return `<div class="row between" style="margin-bottom:18px"><div><p class="eyebrow">Musyrif · Halaqah 1</p><h1>Ust. Rahmat Hidayat</h1><p class="muted">Prioritaskan setoran yang perlu keputusan hari ini.</p></div><a class="btn primary" href="#review">Review setoran</a></div>
<div class="grid-4" style="margin-bottom:16px"><div class="kpi"><b>12</b><span class="muted">Santri aktif</span></div><div class="kpi"><b>4</b><span class="muted">Setoran pending</span></div><div class="kpi"><b>38</b><span class="muted">Mutqin pekan ini</span></div><div class="kpi"><b>6</b><span class="muted">Perlu penguatan</span></div></div>
<div class="card"><div class="row between"><h3>Santri Halaqah</h3><a href="#halaqah" class="muted">Lihat semua</a></div><div class="table-wrap"><table class="table"><thead><tr><th>Santri</th><th>Mutqin</th><th>Pending</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${students.map(s=>`<tr><td><b>${s.name}</b></td><td>${s.mutqin} halaman</td><td>${s.pending}</td><td>${badge(s.status,statusTone(s.status))}</td><td><button class="btn" type="button" data-musyrif-table-progress="${s.name}">Tabel Progress</button></td></tr>`).join("")}</tbody></table></div></div>`}

document.addEventListener("click",event=>{
 const button=event.target.closest("[data-musyrif-table-progress]");
 if(!button)return;
 const student=students.find(item=>item.name===button.dataset.musyrifTableProgress);
 if(!student)return;
 const state=getState();
 setState({selectedStudentProgress:{
  student:{...student},
  halaqahId:"halaqah-1",
  halaqahName:student.halaqah||"Halaqah 1",
  musyrifName:state.profileOverrides?.musyrif?.name||"Ust. Rahmat Hidayat"
 }});
 location.hash="tabel-progress";
});
