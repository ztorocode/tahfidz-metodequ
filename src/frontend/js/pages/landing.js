export function landingPage(){
 return `<main class="landing-page">
  <header class="landing-header">
   <a class="landing-brand" href="#" aria-label="Mutqeen"><span class="landing-logo">م</span><span>Mutqeen</span></a>
   <nav class="landing-nav" aria-label="Navigasi utama">
    <a href="#masalah">Masalah</a>
    <a href="#cara-kerja">Cara Kerja</a>
    <a href="#dampak">Dampak</a>
   </nav>
   <a class="btn landing-login" href="#login">Masuk</a>
  </header>

  <section class="landing-hero">
   <div class="landing-hero-copy">
    <span class="landing-kicker">Dukungan langsung untuk penjaga hafalan Al-Qur'an</span>
    <h1>Bantu Ustadz Tahfidz Secara Langsung. <span>Lihat Dampaknya pada Hafalan Santri.</span></h1>
    <p>Mutqeen menghubungkan donatur dengan ustadz tahfidz. Dukungan ditransfer langsung ke rekening ustadz, sementara aktivitas bimbingan dan progres hafalan santri tercatat dan dapat dipantau.</p>
    <div class="landing-hero-actions">
     <a class="btn primary landing-cta" href="#login?intent=donasi">Donasi Sekarang</a>
     <a class="btn landing-cta secondary" href="#login?intent=ustadz">Daftar sebagai Ustadz</a>
    </div>
    <div class="landing-trust-row">
     <span>Transfer langsung</span><span>Penerima jelas</span><span>Aktivitas tercatat</span><span>Progres terpantau</span>
    </div>
   </div>
   <div class="landing-impact-card" aria-label="Contoh laporan dampak">
    <div class="landing-impact-head"><div><small>Contoh tampilan laporan dampak</small><strong>Ustadz Abdullah</strong></div><span class="badge success">Aktif membimbing</span></div>
    <div class="landing-progress"><span style="width:58%"></span></div>
    <div class="landing-support"><b>Transfer langsung</b><span>ke rekening ustadz</span></div>
    <div class="landing-metrics">
     <div><b>Santri</b><span>Jumlah binaan aktif</span></div>
     <div><b>Setoran</b><span>Evaluasi yang direview</span></div>
     <div><b>Mutqin</b><span>Progres hafalan santri</span></div>
     <div><b>Aktivitas</b><span>Bimbingan yang tercatat</span></div>
    </div>
    <small class="landing-demo-note">Contoh tampilan laporan dampak, bukan data transaksi nyata.</small>
   </div>
  </section>

  <section class="landing-section" id="masalah">
   <div class="landing-section-head"><span class="landing-kicker">Masalah yang ingin diselesaikan</span><h2>Donatur ingin yakin. Ustadz tahfidz membutuhkan dukungan yang layak.</h2></div>
   <div class="landing-problem-grid">
    <article class="landing-problem-card">
     <span class="landing-card-no">01</span>
     <h3>Donatur butuh penyaluran yang transparan</h3>
     <p>Donatur ingin tahu siapa penerimanya, dana masuk ke mana, dan apa dampak nyata setelah bantuan diberikan.</p>
     <ul><li>Tidak ingin dana melewati terlalu banyak pihak.</li><li>Butuh penerima yang jelas dan dapat diverifikasi.</li><li>Butuh laporan yang lebih dari sekadar foto penyerahan.</li></ul>
    </article>
    <article class="landing-problem-card accent">
     <span class="landing-card-no">02</span>
     <h3>Ustadz tahfidz perlu ditingkatkan kesejahteraannya</h3>
     <p>Mereka menerima setoran, membetulkan bacaan, mengawal murajaah, dan menjaga kualitas hafalan santri setiap hari.</p>
     <ul><li>Tanggung jawabnya besar dan berkelanjutan.</li><li>Aktivitas bimbingannya sering tidak terlihat donatur.</li><li>Dukungan rutin dapat membantu mereka fokus membina santri.</li></ul>
    </article>
   </div>
  </section>

  <section class="landing-solution">
   <div class="landing-solution-copy">
    <span class="landing-kicker">Solusi Mutqeen</span>
    <h2>Bukan menampung donasi. Mutqeen membangun jalur kepercayaan.</h2>
    <p>Donatur memilih ustadz yang ingin didukung lalu mentransfer langsung ke rekening penerima. Mutqeen mencatat aktivitas bimbingan dan progres hafalan santri sebagai laporan dampak yang terus diperbarui.</p>
   </div>
   <div class="landing-flow">
    <div><span>1</span><b>Donatur</b><small>Pilih ustadz yang ingin didukung</small></div>
    <i>→</i>
    <div><span>2</span><b>Rekening Ustadz</b><small>Transfer langsung ke penerima</small></div>
    <i>→</i>
    <div><span>3</span><b>Mutqeen</b><small>Pantau aktivitas & progres</small></div>
   </div>
  </section>

  <section class="landing-section" id="cara-kerja">
   <div class="landing-section-head"><span class="landing-kicker">Cara kerja</span><h2>Sederhana untuk donatur. Bermakna untuk ustadz dan santri.</h2></div>
   <div class="landing-steps">
    <article><span>01</span><h3>Pilih ustadz</h3><p>Lihat profil, pondok, jumlah santri binaan, dan aktivitas tahfidz yang tercatat.</p></article>
    <article><span>02</span><h3>Transfer langsung</h3><p>Kirim dukungan langsung ke rekening atau kanal pembayaran milik ustadz.</p></article>
    <article><span>03</span><h3>Pantau amanahnya</h3><p>Lihat setoran yang direview, aktivitas bimbingan, dan perkembangan hafalan santri.</p></article>
    <article><span>04</span><h3>Dukung berkelanjutan</h3><p>Bangun dukungan rutin kepada ustadz yang amanah dan aktif membimbing.</p></article>
   </div>
  </section>

  <section class="landing-section landing-impact-section" id="dampak">
   <div class="landing-section-head"><span class="landing-kicker">Laporan dampak</span><h2>Bukan hanya “dana sudah diterima”.</h2><p>Donatur dapat melihat indikator aktivitas tahfidz yang relevan untuk memahami dampak dukungannya.</p></div>
   <div class="landing-report-grid">
    <div class="landing-report-main">
     <small>Contoh laporan · 30 hari terakhir</small>
     <h3>Ustadz Abdullah</h3>
     <div class="landing-report-bars">
      <div><span>Setoran direview</span><b>Tercatat</b></div>
      <div><span>Hafalan dinyatakan mutqin</span><b>Terukur</b></div>
      <div><span>Santri aktif dibimbing</span><b>Terlihat</b></div>
      <div><span>Aktivitas tahfidz</span><b>Terlacak</b></div>
     </div>
    </div>
    <aside class="landing-report-note">
     <h3>Transparansi yang konkret</h3>
     <p>Mutqeen berfokus pada hal yang dapat ditunjukkan:</p>
     <ul><li>Siapa ustadz penerima dukungan.</li><li>Transfer masuk langsung ke penerima.</li><li>Aktivitas pembinaan tercatat.</li><li>Perkembangan hafalan santri dapat dipantau.</li></ul>
    </aside>
   </div>
  </section>

  <section class="landing-final-cta">
   <span class="landing-kicker">Menjaga penghafal Al-Qur'an bersama</span>
   <h2>Dukung orang yang setiap hari menjaga hafalan para santri.</h2>
   <p>Mulai dari satu ustadz. Lihat aktivitasnya. Ikuti perkembangan santri yang dibimbingnya.</p>
   <div class="landing-hero-actions landing-final-actions">
    <a class="btn primary landing-cta" href="#login?intent=donasi">Donasi Sekarang</a>
    <a class="btn landing-cta secondary" href="#login?intent=ustadz">Daftar sebagai Ustadz</a>
   </div>
  </section>

  <footer class="landing-footer"><b>Mutqeen</b><span>Transfer langsung. Penerima jelas. Aktivitas tercatat. Progres terpantau.</span></footer>
 </main>`;
}

export function bindLanding(){
 document.querySelectorAll('.landing-nav a[href^="#"]').forEach(link=>link.addEventListener("click",event=>{
  const id=link.getAttribute("href");
  const target=id&&document.querySelector(id);
  if(!target)return;
  event.preventDefault();
  target.scrollIntoView({behavior:"smooth",block:"start"});
 }));
 const secondary=document.querySelector('.landing-hero-actions a[href="#cara-kerja"]');
 secondary?.addEventListener("click",event=>{
  const target=document.querySelector("#cara-kerja");
  if(!target)return;
  event.preventDefault();
  target.scrollIntoView({behavior:"smooth",block:"start"});
 });
}
