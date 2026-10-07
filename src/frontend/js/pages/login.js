import {setState} from "../store.js";
export function loginPage(){return `<section class="auth">
<div class="auth-hero"><div><div class="brand" style="padding:0;color:white"><img src="./assets/images/icon.svg?v=7f3a91c2">MetodeQu</div></div>
<div><p class="eyebrow" style="color:#86e5bd">Teman setia perjalanan tahfidz</p><h1 style="font-size:44px;max-width:520px">Hafalan yang sedikit, tapi mutqin.</h1><p style="max-width:520px;color:#d9f2e7">Aplikasi pendamping tahfidz untuk membantu Anda membangun hafalan Al-Qur'an yang kuat dan terjaga.</p></div>
<div><small>Prototype demo · Personal & Pondok</small></div></div>
<div class="auth-card-wrap"><div class="auth-card stack"><div><h1>Masuk ke MetodeQu</h1><p class="muted">Lanjutkan perjalanan hafalan Anda.</p></div>
<div class="segmented"><button class="active">Nomor WhatsApp</button><button>Username</button></div>
<div><label class="label">Nomor WhatsApp</label><input class="input" value="+62 812 3456 7890"></div>
<button class="btn primary full" id="loginBtn">Kirim kode OTP</button>
<div class="row"><span class="grow" style="height:1px;background:var(--border)"></span><small class="muted">atau</small><span class="grow" style="height:1px;background:var(--border)"></span></div>
<button class="btn full" id="demoLogin">Masuk ke mode demo</button><small class="muted" style="text-align:center">Belum punya akun? Daftar sekarang</small>
</div></div></section>`}
export function bindLogin(){const go=()=>{setState({loggedIn:true,persona:"member"});location.hash="dashboard"};document.querySelector("#loginBtn")?.addEventListener("click",go);document.querySelector("#demoLogin")?.addEventListener("click",go)}
