import {getState} from "./store.js?v=81bed469";
import {memberEnrollmentGate} from "./utils/member-enrollment.js?v=frifirst1106";
import {studentHalaqahPage,halaqahApplicationsPage} from "./pages/student-halaqah.js?v=startmode1106";
import {loginPage} from "./pages/login.js?v=demofill1106";
import {memberDashboard} from "./pages/member-dashboard.js?v=frifirst1106";
import {programPage} from "./pages/program.js?v=81bed469";
import {activityPage} from "./pages/activity.js?v=81bed469";
import {submissionPage} from "./pages/submission.js?v=frifirst1106";
import {murajaahPage} from "./pages/murajaah.js?v=81bed469";
import {notificationsPage} from "./pages/notifications.js?v=membernav1106";
import {musyrifDashboard} from "./pages/musyrif-dashboard.js?v=7c3e1a90";
import {reviewPage} from "./pages/review.js?v=81bed469";
import {acceptInvitePage} from "./pages/terima-undangan.js?v=b8c14e72";
import {adminSantriPage} from "./pages/admin-santri.js?v=81bed469";
import {adminMusyrifPage} from "./pages/admin-musyrif.js?v=c6e18a42";
import {adminDashboard} from "./pages/admin-dashboard.js?v=c6e18a42";
import {halaqahPage} from "./pages/halaqah.js?v=firstact1106";
import {studentProgressPage} from "./pages/santri-progress.js?v=frifirst1106";
import {memberProgressPage} from "./pages/member-progress.js?v=frifirst1106";
import {progressTablePage} from "./pages/tabel-progress.js?v=frifirst1106";
import {rabthAyatPage} from "./pages/rabth-ayat.js?v=ayatcopy1107";
import {whatsappPage} from "./pages/whatsapp.js?v=b8c14e72";
import {superAdminDashboard,userManagementPage,platformPondoksPage,platformMusyrifPage,platformSettingsPage} from "./pages/super-admin.js?v=usereditb27";
const routes={
 login:loginPage,dashboard:memberDashboard,"daftar-halaqah":studentHalaqahPage,"pendaftar-halaqah":halaqahApplicationsPage,program:programPage,activity:activityPage,
 submission:submissionPage,murajaah:murajaahPage,notifications:notificationsPage,
 progress:memberProgressPage,"review-progress":memberProgressPage,"rabth-ayat":rabthAyatPage,report:progressTablePage,
 musyrif:musyrifDashboard,review:reviewPage,admin:adminDashboard,"kelola-musyrif":adminMusyrifPage,"kelola-santri":adminSantriPage,"terima-undangan":acceptInvitePage,halaqah:halaqahPage,"santri-progress":studentProgressPage,"tabel-progress":progressTablePage,whatsapp:whatsappPage,
 "super-admin":superAdminDashboard,users:userManagementPage,pondoks:platformPondoksPage,"platform-musyrif":platformMusyrifPage,"platform-settings":platformSettingsPage
};
const platformRoutes=["super-admin","users","pondoks","platform-musyrif","platform-settings"];
const adminRoutes=["admin","kelola-musyrif","kelola-santri","whatsapp"];
function homeRoute(state){
 return state.persona==="super_admin"?"super-admin":state.persona==="admin"?"admin":state.persona==="musyrif"?"musyrif":"dashboard";
}
export function routeName(){return location.hash.replace(/^#/,"")||"dashboard"}
export function view(){
 const s=getState();
 let name=routeName().split("?")[0];
 const publicRoutes=["login","terima-undangan"];
 if(!s.loggedIn&&!publicRoutes.includes(name)){location.hash="login";return loginPage();}
 if(s.loggedIn&&name==="login"){name=homeRoute(s);location.hash=name;return routes[name]();}
 if(s.loggedIn&&name==="dashboard"&&s.persona!=="member"){name=homeRoute(s);location.hash=name;return routes[name]();}
 if(platformRoutes.includes(name)&&s.persona!=="super_admin"){name=homeRoute(s);location.hash=name;return routes[name]();}
 if(adminRoutes.includes(name)&&s.persona!=="admin"&&s.persona!=="super_admin"){name=homeRoute(s);location.hash=name;return routes[name]();}
 if(name==="pendaftar-halaqah"&&!["admin","musyrif"].includes(s.persona)){name=homeRoute(s);location.hash=name;return routes[name]();}
 // Halaman progress versi musyrif hanya untuk musyrif.
 if(name==="review-progress"&&s.persona!=="musyrif"){name=homeRoute(s);location.hash=name;return routes[name]();}
 if(s.persona==="super_admin"&&!platformRoutes.includes(name)){location.hash="super-admin";return superAdminDashboard();}
 if(s.persona==="member"){
  // Santri hanya memakai program berbimbing dan Notifikasi.
  if(!["dashboard","progress","report","notifications","daftar-halaqah","rabth-ayat"].includes(name)){
   name="dashboard";location.hash=name;
  }
  if(name!=="notifications"&&name!=="daftar-halaqah"){
   const gated=memberEnrollmentGate(name);
   if(gated!==null)return gated;
  }
 }
 const fn=routes[name]||routes[homeRoute(s)]||memberDashboard;return fn();
}
