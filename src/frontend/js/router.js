import {getState} from "./store.js?v=81bed469";
import {loginPage} from "./pages/login.js?v=b8c14e72";
import {memberDashboard} from "./pages/member-dashboard.js?v=c6e18a42";
import {programPage} from "./pages/program.js?v=81bed469";
import {activityPage} from "./pages/activity.js?v=81bed469";
import {submissionPage} from "./pages/submission.js?v=c6e18a42";
import {murajaahPage} from "./pages/murajaah.js?v=81bed469";
import {notificationsPage} from "./pages/notifications.js?v=c6e18a42";
import {musyrifDashboard} from "./pages/musyrif-dashboard.js?v=c6e18a42";
import {reviewPage} from "./pages/review.js?v=81bed469";
import {acceptInvitePage} from "./pages/terima-undangan.js?v=b8c14e72";
import {adminSantriPage} from "./pages/admin-santri.js?v=81bed469";
import {adminMusyrifPage} from "./pages/admin-musyrif.js?v=c6e18a42";
import {adminDashboard} from "./pages/admin-dashboard.js?v=c6e18a42";
import {halaqahPage} from "./pages/halaqah.js?v=b8c14e72";
import {studentProgressPage} from "./pages/santri-progress.js?v=c6e18a42";
import {memberProgressPage} from "./pages/member-progress.js?v=d91f3c28";
import {progressTablePage} from "./pages/tabel-progress.js?v=c6e18a42";
import {rabthAyatPage} from "./pages/rabth-ayat.js?v=81bed469";
import {whatsappPage} from "./pages/whatsapp.js?v=b8c14e72";
import {superAdminDashboard,userManagementPage,platformPondoksPage,platformMusyrifPage,platformSettingsPage} from "./pages/super-admin.js?v=b8c14e72";
const routes={
 login:loginPage,dashboard:memberDashboard,program:programPage,activity:activityPage,
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
 // Halaman progress versi musyrif hanya untuk musyrif.
 if(name==="review-progress"&&s.persona!=="musyrif"){name=homeRoute(s);location.hash=name;return routes[name]();}
 if(s.persona==="super_admin"&&!platformRoutes.includes(name)){location.hash="super-admin";return superAdminDashboard();}
 const fn=routes[name]||routes[homeRoute(s)]||memberDashboard;return fn();
}
