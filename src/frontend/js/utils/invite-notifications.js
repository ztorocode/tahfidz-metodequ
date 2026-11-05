// Per akun, pada browser ini saja. Simpan identitas undangan, bukan link/token.
const storageKey = userId => "mutqeen-invites-read-v1:" + userId;
const idFor = invite => {
 const id=Number(invite?.id);
 return Number.isSafeInteger(id)&&id>0&&["platform","pondok"].includes(invite.type)
  ? invite.type+":"+id : null;
};
function readIds(userId){
 if(!Number.isSafeInteger(Number(userId))||Number(userId)<1)return [];
 try{
  const saved=JSON.parse(localStorage.getItem(storageKey(userId))||"[]");
  return Array.isArray(saved)?saved.filter(v=>typeof v==="string"):[];
 }catch{return []}
}
export function unreadInvitationCount(invites,userId){
 if(!Array.isArray(invites))return 0;
 const read=new Set(readIds(userId));
 return new Set(invites.map(idFor).filter(id=>id&&!read.has(id))).size;
}
export function markInvitationsRead(invites,userId){
 if(!Number.isSafeInteger(Number(userId))||Number(userId)<1||!Array.isArray(invites))return;
 const previous=readIds(userId);
 const next=new Set(previous);
 invites.map(idFor).filter(Boolean).forEach(id=>next.add(id));
 if(next.size===previous.length)return;
 try{localStorage.setItem(storageKey(userId),JSON.stringify([...next].slice(-500)))}catch{}
}
