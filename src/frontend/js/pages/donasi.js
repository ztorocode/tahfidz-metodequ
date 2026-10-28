function escapeHtml(value){
 return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
const countFormat=new Intl.NumberFormat("id-ID");
const moneyFormat=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0,minimumFractionDigits:0});
const monthFormat=new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric",timeZone:"Asia/Jakarta"});
function monthLabel(value){
 if(!/^\d{4}-\d{2}$/.test(String(value||"")))return "bulan ini";
 const date=new Date(value+"-01T12:00:00+07:00");
 return Number.isNaN(date.getTime())?"bulan ini":monthFormat.format(date);
}
function ustadzCard(item){
 const name=escapeHtml(item.name);
 const scope=item.type==="pondok"?(item.pondok_name||"Pondok"):"Ustadz Platform";
 const initial=escapeHtml((item.name||"U").trim().charAt(0).toUpperCase());
 const number=value=>countFormat.format(Math.max(0,Number(value)||0));
 const amount=item.donasi_bulan_ini==null?null:Number(item.donasi_bulan_ini);
 return '<article class="donasi-ustadz-card">'
  +'<div class="donasi-ustadz-head"><span class="donasi-avatar" aria-hidden="true">'+initial+'</span><div><h2>'+name+'</h2><p>'+escapeHtml(scope)+'</p></div></div>'
  +'<div class="donasi-ustadz-metrics">'
  +'<div><strong>'+number(item.santri_aktif)+'</strong><span>Santri aktif</span></div>'
  +'<div><strong>'+number(item.setoran_dinilai)+'</strong><span>Setoran dinilai</span></div>'
  +'<div><strong>'+number(item.hafalan_mutqin)+'</strong><span>Penilaian mutqin</span></div>'
  +'</div><div class="donasi-ustadz-total"><span>Donasi terverifikasi bulan ini</span><strong>'
  +(amount!==null&&Number.isFinite(amount)&&amount>=0?moneyFormat.format(amount):"Belum tersedia")
  +'</strong></div></article>';
}
export function donationListPage(){
 return '<main class="landing-page donasi-page">'
  +'<header class="landing-header"><a class="landing-brand" href="#home" aria-label="Kembali ke beranda Mutqeen"><span class="landing-logo">م</span><span>Mutqeen</span></a><a class="btn landing-login" href="#login">Masuk</a></header>'
  +'<section class="donasi-main"><a href="#home" class="donasi-back">Kembali ke beranda</a>'
  +'<div class="donasi-intro"><span class="landing-kicker">Dukung penjaga hafalan Al-Qur\'an</span><h1>Pilih Ustadz yang Ingin Anda Dukung</h1>'
  +'<p>Lihat jumlah santri binaan, catatan penilaian hafalan, dan donasi yang sudah terverifikasi. Semua angka berasal dari catatan Mutqeen.</p></div>'
  +'<div class="donasi-summary"><span id="donasiPeriode">Donasi terverifikasi bulan ini</span><small>Nominal hanya mencakup transfer yang sudah tercatat dan terverifikasi di Mutqeen. Transfer langsung di luar pencatatan mungkin belum termasuk.</small></div>'
  +'<div id="donasiList" class="donasi-list" aria-live="polite" aria-busy="true"><div class="donasi-state">Memuat daftar ustadz...</div></div>'
  +'<p class="donasi-footnote">Pencapaian setoran dan mutqin dihitung dari catatan penilaian sejak mulai tercatat. Jumlah santri menunjukkan binaan aktif saat ini.</p></section>'
  +'<footer class="landing-footer"><b>Mutqeen</b><span>Dukungan langsung untuk ustadz tahfidz.</span></footer></main>';
}
export async function bindDonationList(){
 const box=document.querySelector("#donasiList");
 if(!box)return;
 try{
  const response=await fetch("/api/public/ustadz",{headers:{"Accept":"application/json"},cache:"no-store"});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.success)throw new Error("Data ustadz belum dapat dimuat.");
  if(!box.isConnected)return;
  const data=result.data||{};
  const period=document.querySelector("#donasiPeriode");
  if(period)period.textContent="Donasi terverifikasi "+monthLabel(data.month);
  const items=Array.isArray(data.items)?data.items:[];
  box.innerHTML=items.length?items.map(ustadzCard).join(""):'<div class="donasi-state">Belum ada ustadz aktif yang dapat ditampilkan.</div>';
 }catch(error){
  if(box.isConnected){
   box.innerHTML='<div class="donasi-state">Daftar ustadz belum bisa dimuat. <button type="button" class="btn" id="donasiRetry">Coba lagi</button></div>';
   document.querySelector("#donasiRetry")?.addEventListener("click",()=>{
    if(!box.isConnected)return;
    box.innerHTML='<div class="donasi-state">Memuat daftar ustadz...</div>';
    box.setAttribute("aria-busy","true");
    bindDonationList();
   });
  }
 }finally{
  if(box.isConnected)box.setAttribute("aria-busy","false");
 }
}
