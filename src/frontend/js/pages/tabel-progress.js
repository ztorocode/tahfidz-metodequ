import {getState} from "../store.js?v=dev-2f08f073";

function escapeHtml(value=""){
 return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

const days=["sabtu","ahad","senin","selasa","rabu","kamis"];
const blankCells=count=>Array.from({length:count},()=>"<td></td>").join("");

function weekRows(){
 return Array.from({length:5},(_,week)=>`${days.map(day=>`<tr><td class="progress-day">${day}</td>${blankCells(40)}</tr>`).join("")}<tr class="progress-friday"><td colspan="41">jum'at</td></tr>`).join("");
}

export function progressTablePage(){
 const state=getState();
 const selected=state.selectedStudentProgress;

 if(state.context!=="pondok"){
  return `<div class="card"><p class="eyebrow">Tabel Progress</p><h2>Aktifkan konteks Pondok</h2><p class="muted">Tabel progress santri hanya tersedia pada konteks Pondok.</p><a class="btn" href="#halaqah">Kembali ke Halaqah</a></div>`;
 }

 if(!selected?.student){
  return `<div class="card"><p class="eyebrow">Tabel Progress</p><h2>Santri belum dipilih</h2><p class="muted">Buka Halaqah, pilih santri, lalu buka Tabel Progress dari halaman detail santri.</p><a class="btn" href="#halaqah">Kembali ke Halaqah</a></div>`;
 }

 const student=selected.student;
 const pondok=state.pondokProfile?.name||"Pondok Al-Furqan";

 return `<div class="row between" style="margin-bottom:16px;gap:12px;flex-wrap:wrap">
  <div>
   <a class="btn" href="#santri-progress" style="display:inline-flex;margin-bottom:12px">← Kembali ke Progress Santri</a>
   <p class="eyebrow">Pondok / Halaqah / Tabel Progress</p>
   <h1>Tabel Progress</h1>
   <p class="muted">${escapeHtml(student.name)} · ${escapeHtml(selected.halaqahName)} · ${escapeHtml(pondok)}</p>
  </div>
  <span class="badge success">Program Juz 30</span>
 </div>

 <div class="quote" style="margin-bottom:12px">Geser tabel ke kanan untuk melihat seluruh kolom pada layar mobile.</div>

 <div class="card progress-sheet-card">
  <div class="progress-sheet-scroll">
   <div class="progress-meta">
    <div class="progress-meta-item"><b>Program Hafalan</b><span>Juz 30</span></div>
    <div class="progress-meta-item"><b>Dari juz</b><span>30</span></div>
    <div class="progress-meta-item"><b>s/d</b><span>30</span></div>
    <div class="progress-meta-item"><b>Target waktu menghafal</b><span>-</span></div>
    <div class="progress-meta-item"><b>Start</b><span>-</span></div>
    <div class="progress-meta-item"><b>Finish</b><span>-</span></div>
   </div>

   <div class="progress-student-row"><b>Nama</b><span>${escapeHtml(student.name)}</span><b>Musyrif</b><span>${escapeHtml(selected.musyrifName)}</span></div>

   <table class="progress-sheet" aria-label="Tabel progress hafalan ${escapeHtml(student.name)}">
    <thead>
     <tr>
      <th colspan="3" rowspan="2">Target Harian</th>
      <th colspan="13" class="progress-group-old">Hafalan lama</th>
      <th colspan="25" class="progress-group-new">Hafalan baru</th>
     </tr>
     <tr>
      <th rowspan="2">Muraja'ah<br>(1x)</th>
      <th colspan="2">Rabth (1x)</th>
      <th colspan="5">Hafalan kemarin</th>
      <th colspan="3">Istima' Qari<br>mujawwad</th>
      <th rowspan="2">Menghafal</th>
      <th rowspan="2">Merekam</th>
      <th colspan="25">Tikrar (Mengulang langsung hafalan yang telah didapat biidznillah)</th>
     </tr>
     <tr>
      <th>Hari</th>
      <th>Tanggal</th>
      <th>Halaman / hari</th>
      <th>Juz</th>
      <th>Awal</th>
      <th>Akhir</th>
      ${Array.from({length:5},(_,i)=>`<th>${i+1}x</th>`).join("")}
      ${Array.from({length:3},(_,i)=>`<th>${i+1}x</th>`).join("")}
      ${Array.from({length:25},(_,i)=>`<th>${i+1}x</th>`).join("")}
     </tr>
    </thead>
    <tbody>${weekRows()}</tbody>
   </table>
  </div>
 </div>`;
}
