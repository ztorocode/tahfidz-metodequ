import {getState} from "../store.js?v=81bed469";

export function ustadzBankProfileSection(){
 if(getState().persona!=="musyrif")return "";
 return `<div class="stack">
  <small class="muted">Rekening ini dapat ditampilkan kepada donatur jika Anda mengizinkannya.</small>
  <form id="profileDonorBankForm" class="stack">
   <div><label class="label" for="profileDonorBankName">Nama bank</label><input class="input" id="profileDonorBankName" maxlength="100" required placeholder="Nama bank"></div>
   <div><label class="label" for="profileDonorBankNumber">Nomor rekening</label><input class="input" id="profileDonorBankNumber" maxlength="35" inputmode="numeric" required></div>
   <div><label class="label" for="profileDonorBankHolder">Atas nama</label><input class="input" id="profileDonorBankHolder" maxlength="150" required></div>
   <label class="donor-check"><input type="checkbox" id="profileDonorBankPublic"> Tampilkan nomor rekening dan nama penerima di halaman Donasi.</label>
   <button type="submit" class="btn primary full" id="profileDonorBankSave">Simpan Rekening</button>
   <small class="muted" id="profileDonorBankMessage" role="status"></small>
  </form>
 </div>`;
}

export function bindUstadzBankProfile(){
 const form=document.querySelector("#profileDonorBankForm");
 if(!form||form.dataset.bound==="1")return;
 form.dataset.bound="1";
 const state=getState();
 const token=state.authToken;
 const message=document.querySelector("#profileDonorBankMessage");
 const status=(text,error=false)=>{
  if(!message)return;
  message.textContent=text;
  message.style.color=error?"var(--danger)":"var(--brand)";
 };
 if(!token){
  status("Login ulang untuk mengatur rekening donasi.",true);
  return;
 }
 const headers={Authorization:"Bearer "+token,Accept:"application/json"};
 const load=async()=>{
  try{
   const response=await fetch("/api/ustadz/donation-profile",{headers,cache:"no-store"});
   const result=await response.json().catch(()=>({}));
   if(!response.ok||!result.success)throw new Error(result.message||"Gagal memuat rekening.");
   if(!form.isConnected)return;
   const bank=result.data?.bank||{};
   document.querySelector("#profileDonorBankName").value=bank.bank_name||"";
   document.querySelector("#profileDonorBankNumber").value=bank.account_number||"";
   document.querySelector("#profileDonorBankHolder").value=bank.account_holder||"";
   document.querySelector("#profileDonorBankPublic").checked=bank.is_public===true;
  }catch(error){
   status(error?.message||"Gagal memuat rekening.",true);
  }
 };
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  const button=document.querySelector("#profileDonorBankSave");
  const payload={
   bank_name:document.querySelector("#profileDonorBankName").value.trim(),
   account_number:document.querySelector("#profileDonorBankNumber").value.trim(),
   account_holder:document.querySelector("#profileDonorBankHolder").value.trim(),
   is_public:document.querySelector("#profileDonorBankPublic").checked
  };
  button.disabled=true;
  status("");
  try{
   const response=await fetch("/api/ustadz/donation-profile/bank",{
    method:"POST",
    headers:{...headers,"Content-Type":"application/json"},
    body:JSON.stringify(payload)
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok||!result.success)throw new Error(result.message||"Gagal menyimpan rekening.");
   status(payload.is_public?"Rekening tersimpan dan tampil di halaman Donasi.":"Rekening tersimpan, tetapi belum dipublikasikan.");
  }catch(error){
   status(error?.message||"Gagal menyimpan rekening.",true);
  }finally{
   button.disabled=false;
  }
 });
 load();
}
