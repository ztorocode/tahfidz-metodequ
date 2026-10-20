import {getState} from "../store.js?v=c94e2f17";
import {member,progress,programPages,murajaah,daily} from "../data/dummy-data.js?v=c94e2f17";
import {badge,statusTone} from "../utils/helpers.js?v=c94e2f17";
import {cachedStudentProgress,loadStudentProgress,isStudentProgressLoading,studentPercent} from "../utils/student-progress.js?v=c94e2f17";

const PROGRESS_DAYS=["sabtu","ahad","senin","selasa","rabu","kamis"];

function escapeHtml(value=""){
 return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

const setoranHistory=[
 {date:"07 Okt 2026",ref:"Juz 30 Hal. 12",status:"Mutqin",note:"Bacaan lancar dan stabil."},
 {date:"05 Okt 2026",ref:"Juz 30 Hal. 11",status:"Cukup Stabil",note:"Perkuat sambungan antar ayat."},
 {date:"03 Okt 2026",ref:"Juz 30 Hal. 10",status:"Perlu Penguatan",note:"Ulangi ayat 15-20 sebelum setoran berikutnya."}
];

function dailyProgressCard(userId){
 const id=Number(userId||0);
 if(!id)return "";
 let data=cachedStudentProgress(id);
 if(!data){
  loadStudentProgress(id).then(()=>window.dispatchEvent(new Event("app:render"))).catch(()=>{});
  return `<div class="card" style="margin-bottom:16px"><h3>Isian Progress Harian</h3><p class="muted" style="margin-top:8px">${isStudentProgressLoading(id)?"Memuat isian dari server…":"Belum ada isian dari santri ini."}</p></div>`;
 }
 const week=1;
 const rows=PROGRESS_DAYS.map(day=>{
  const pct=studentPercent(data,week,day);
  return `<div class="list-item"><div class="grow"><b>${day.charAt(0).toUpperCase()+day.slice(1)}</b><small class="muted" style="display:block">Pekan ${week}</small></div><span class="badge ${pct>=60?"success":pct>0?"warning":""}">${pct}%</span></div>`;
 }).join("");
 const filled=Object.keys(data.checks||{}).length+Object.keys(data.fields||{}).length;
 const updated=data.updatedAt?new Date(String(data.updatedAt).replace(" ","T")+"Z").toLocaleString("id-ID",{timeZone:"Asia/Jakarta",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"-";
 return `<div class="card" style="margin-bottom:16px">
  <div class="row between" style="gap:12px;flex-wrap:wrap"><div><h3>Isian Progress Harian</h3><p class="muted">Data asli yang disimpan santri dari perangkatnya.</p></div><a class="btn" href="#tabel-progress">Buka Tabel Progress</a></div>
  <div class="list" style="margin-top:12px">${rows}</div>
  <p class="muted" style="margin-top:10px;font-size:13px">${filled} isian tersinkron · terakhir diperbarui ${escapeHtml(updated)} WIB</p>
 </div>`;
}

export function studentProgressPage(){
 const state=getState();
 const isMember=state.persona==="member";
 const selected=isMember?{
  student:{name:member.name,mutqin:progress.mutqin,pending:1,status:"Aktif"},
  halaqahName:member.halaqah,
  musyrifName:member.musyrif
 }:state.selectedStudentProgress;

 if(!isMember&&state.context!=="pondok"){
  return `<div class="card"><p class="eyebrow">Progress Santri</p><h2>Aktifkan konteks Pondok</h2><p class="muted">Detail progress santri hanya tersedia pada konteks Pondok.</p><a class="btn" href="#halaqah">Kembali ke Halaqah</a></div>`;
 }

 if(!selected?.student){
  return `<div class="card"><p class="eyebrow">Progress Santri</p><h2>Santri belum dipilih</h2><p class="muted">Buka menu Halaqah lalu pilih tombol Lihat Progress pada salah satu santri.</p><a class="btn" href="#halaqah">Kembali ke Halaqah</a></div>`;
 }

 const student=selected.student;
 const mutqin=Number(student.mutqin)||0;
 const pending=Number(student.pending)||0;
 const submitted=Math.max(mutqin+pending+2,mutqin);
 const memorized=submitted+6;
 const strengthen=3;
 const repeat=2;
 const roleLabel=isMember?"Santri":state.persona==="musyrif"?"Musyrif":"Admin Pondok";

 return `<div class="row between" style="margin-bottom:18px;gap:12px;flex-wrap:wrap">
  <div>
   ${isMember?"":`<a class="btn" href="#halaqah" style="display:inline-flex;margin-bottom:12px">← Kembali ke Halaqah</a>`}
   <p class="eyebrow">${isMember?"Progress Saya":"Pondok / Halaqah / Progress Santri"}</p>
   <h1>${escapeHtml(student.name)}</h1>
   <p class="muted">${escapeHtml(selected.halaqahName)} · Musyrif: ${escapeHtml(selected.musyrifName)} · ${escapeHtml(student.status||"Aktif")}</p>
  </div>
  <div class="row" style="flex-wrap:wrap;justify-content:flex-end"><a class="btn primary" href="${isMember?"#report":"#tabel-progress"}">${isMember?"Report":"Tabel Progress"}</a><span class="badge success">${roleLabel} · Monitoring</span></div>
 </div>

 <div class="card" style="margin-bottom:16px">
  <div class="row between" style="gap:12px;flex-wrap:wrap">
   <div><small class="muted">Program aktif</small><h2 style="margin-top:4px">Juz 30</h2><p class="muted">Fokus penguatan hafalan sampai mutqin.</p></div>
   <span class="badge success">Aktif</span>
  </div>
 </div>

 <div class="grid-4" style="margin-bottom:16px">
  <div class="kpi"><b>${memorized}</b><span class="muted">Halaman dihafal</span></div>
  <div class="kpi"><b>${submitted}</b><span class="muted">Sudah disetorkan</span></div>
  <div class="kpi"><b>${mutqin}</b><span class="muted">Mutqin</span></div>
  <div class="kpi"><b>${pending}</b><span class="muted">Setoran pending</span></div>
 </div>

 ${isMember?"":dailyProgressCard(selected.student?.userId)}

 <div class="grid-2" style="margin-bottom:16px">
  <div class="card">
   <div class="row between" style="margin-bottom:12px"><div><h3>Progress Hafalan</h3><p class="muted">Status kekuatan hafalan per halaman.</p></div></div>
   <div class="list">
    ${programPages.map(item=>`<div class="list-item"><div class="grow"><b>Hal. ${item.page} · ${escapeHtml(item.surah)}</b><small class="muted" style="display:block">Juz 30</small></div>${badge(item.status,statusTone(item.status))}</div>`).join("")}
   </div>
  </div>

  <div class="card">
   <h3>Ringkasan Penguatan</h3>
   <div class="list" style="margin-top:12px">
    <div class="list-item"><div class="grow"><b>Perlu penguatan</b><small class="muted" style="display:block">Bagian yang belum stabil</small></div><b>${strengthen}</b></div>
    <div class="list-item"><div class="grow"><b>Perlu ulang</b><small class="muted" style="display:block">Prioritas murajaah</small></div><b>${repeat}</b></div>
    <div class="list-item"><div class="grow"><b>Setoran pending</b><small class="muted" style="display:block">Menunggu review</small></div><b>${pending}</b></div>
   </div>
  </div>
 </div>

 <div class="grid-2" style="margin-bottom:16px">
  <div class="card">
   <h3>Murajaah</h3>
   <p class="muted">Bagian yang dijadwalkan untuk diulang.</p>
   <div class="list" style="margin-top:12px">
    ${murajaah.map((item,index)=>`<div class="list-item"><div class="grow"><b>${escapeHtml(item.ref)}</b><small class="muted" style="display:block">${escapeHtml(item.detail)}</small></div><span class="badge ${index===0?"warning":""}">${index===0?"Hari ini":index===1?"Besok":"Terjadwal"}</span></div>`).join("")}
   </div>
  </div>

  <div class="card">
   <h3>Aktivitas Terakhir</h3>
   <p class="muted">Aktivitas tahfidz terakhir santri.</p>
   <div class="list" style="margin-top:12px">
    ${daily.map(item=>`<div class="list-item"><div class="grow"><b>${escapeHtml(item.name)}</b><small class="muted" style="display:block">${item.time?escapeHtml(item.time):"Belum dikerjakan"}</small></div>${badge(item.status,item.tone)}</div>`).join("")}
   </div>
  </div>
 </div>

 <div class="card" style="margin-bottom:16px">
  <div class="row between" style="margin-bottom:10px"><div><h3>Riwayat Setoran</h3><p class="muted">Penilaian dan catatan setoran terbaru.</p></div></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>Tanggal</th><th>Setoran</th><th>Status</th><th>Catatan Musyrif</th></tr></thead><tbody>
   ${setoranHistory.map(item=>`<tr><td>${escapeHtml(item.date)}</td><td><b>${escapeHtml(item.ref)}</b></td><td>${badge(item.status,statusTone(item.status))}</td><td>${escapeHtml(item.note)}</td></tr>`).join("")}
  </tbody></table></div>
 </div>

 <div class="card">
  <p class="eyebrow">Catatan Musyrif</p>
  <h3>Fokus penguatan berikutnya</h3>
  <p class="quote" style="margin-top:12px">Perkuat kembali ayat 15-20 sebelum melanjutkan halaman berikutnya. Jaga sambungan antar ayat agar tetap stabil saat setoran.</p>
 </div>`;
}
