export const badge=(text,tone="")=>`<span class="badge ${tone}">${text}</span>`;
export const avatar=(text="AF")=>`<span class="avatar">${text}</span>`;
export function toast(message){const el=document.querySelector("#toast");if(!el)return;el.textContent=message;el.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove("show"),2200)}
export function statusTone(s){if(["Mutqin","SENT","Aktif","Selesai","PASSED"].includes(s))return"success";if(["Cukup Stabil","Dalam proses","PENDING","Menunggu"].includes(s))return"warning";if(["Perlu Ulang","FAILED","Perlu Penguatan"].includes(s))return"danger";return""}
