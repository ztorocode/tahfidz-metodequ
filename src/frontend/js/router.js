import {getState} from "./store.js?v=dae8efdc";
import {loginPage} from "./pages/login.js?v=dae8efdc";
import {memberDashboard} from "./pages/member-dashboard.js?v=dae8efdc";
import {programPage} from "./pages/program.js?v=dae8efdc";
import {activityPage} from "./pages/activity.js?v=dae8efdc";
import {submissionPage} from "./pages/submission.js?v=dae8efdc";
import {murajaahPage} from "./pages/murajaah.js?v=dae8efdc";
import {notificationsPage} from "./pages/notifications.js?v=dae8efdc";
import {musyrifDashboard} from "./pages/musyrif-dashboard.js?v=dae8efdc";
import {reviewPage} from "./pages/review.js?v=dae8efdc";
import {acceptInvitePage} from "./pages/terima-undangan.js?v=dae8efdc";
import {adminSantriPage} from "./pages/admin-santri.js?v=dae8efdc";
import {adminMusyrifPage} from "./pages/admin-musyrif.js?v=dae8efdc";
import {adminDashboard} from "./pages/admin-dashboard.js?v=dae8efdc";
import {halaqahPage} from "./pages/halaqah.js?v=dae8efdc";
import {studentProgressPage} from "./pages/santri-progress.js?v=dae8efdc";
import {memberProgressPage} from "./pages/member-progress.js?v=dae8efdc";
import {progressTablePage} from "./pages/tabel-progress.js?v=dae8efdc";
import {rabthAyatPage} from "./pages/rabth-ayat.js?v=dae8efdc";
import {whatsappPage} from "./pages/whatsapp.js?v=dae8efdc";
import {superAdminDashboard,userManagementPage,platformPondoksPage,platformMusyrifPage,platformSettingsPage} from "./pages/super-admin.js?v=dae8efdc";
const routes={
 login:loginPage,dashboard:memberDashboard,program:programPage,activity:activityPage,
 submission:submissionPage,murajaah:murajaahPage,notifications:notificationsPage,
 progress:memberProgressPage,"rabth-ayat":rabthAyatPage,report:progressTablePage,
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
 if(platformRoutes.includes(name)&&s.persona!=="super_admin"){name=homeRoute(s);location.hash=name;return routes[name]();}
 if(adminRoutes.includes(name)&&s.persona!=="admin"&&s.persona!=="super_admin"){name=homeRoute(s);location.hash=name;return routes[name]();}
 if(s.persona==="super_admin"&&!platformRoutes.includes(name)){location.hash="super-admin";return superAdminDashboard();}
 const fn=routes[name]||memberDashboard;return fn();
}
