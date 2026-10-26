import {getState} from "./store.js?v=fcee076c";
import {loginPage} from "./pages/login.js?v=fcee076c";
import {memberDashboard} from "./pages/member-dashboard.js?v=fcee076c";
import {programPage} from "./pages/program.js?v=fcee076c";
import {activityPage} from "./pages/activity.js?v=fcee076c";
import {submissionPage} from "./pages/submission.js?v=fcee076c";
import {murajaahPage} from "./pages/murajaah.js?v=fcee076c";
import {notificationsPage} from "./pages/notifications.js?v=fcee076c";
import {musyrifDashboard} from "./pages/musyrif-dashboard.js?v=fcee076c";
import {reviewPage} from "./pages/review.js?v=fcee076c";
import {acceptInvitePage} from "./pages/terima-undangan.js?v=fcee076c";
import {adminSantriPage} from "./pages/admin-santri.js?v=fcee076c";
import {adminMusyrifPage} from "./pages/admin-musyrif.js?v=fcee076c";
import {adminDashboard} from "./pages/admin-dashboard.js?v=fcee076c";
import {halaqahPage} from "./pages/halaqah.js?v=fcee076c";
import {studentProgressPage} from "./pages/santri-progress.js?v=fcee076c";
import {memberProgressPage} from "./pages/member-progress.js?v=fcee076c";
import {progressTablePage} from "./pages/tabel-progress.js?v=fcee076c";
import {rabthAyatPage} from "./pages/rabth-ayat.js?v=fcee076c";
import {whatsappPage} from "./pages/whatsapp.js?v=fcee076c";
import {superAdminDashboard,userManagementPage,platformPondoksPage,platformMusyrifPage,platformSettingsPage} from "./pages/super-admin.js?v=fcee076c";
const routes={
 login:loginPage,dashboard:memberDashboard,program:programPage,activity:activityPage,
 submission:submissionPage,murajaah:murajaahPage,notifications:notificationsPage,
 progress:memberProgressPage,"rabth-ayat":rabthAyatPage,report:progressTablePage,
 musyrif:musyrifDashboard,review:reviewPage,admin:adminDashboard,"kelola-musyrif":adminMusyrifPage,"kelola-santri":adminSantriPage,"terima-undangan":acceptInvitePage,halaqah:halaqahPage,"santri-progress":studentProgressPage,"tabel-progress":progressTablePage,whatsapp:whatsappPage,
 "super-admin":superAdminDashboard,users:userManagementPage,pondoks:platformPondoksPage,"platform-musyrif":platformMusyrifPage,"platform-settings":platformSettingsPage
};
const platformRoutes=["super-admin","users","pondoks","platform-musyrif","platform-settings"];
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
 if(s.persona==="super_admin"&&!platformRoutes.includes(name)){location.hash="super-admin";return superAdminDashboard();}
 const fn=routes[name]||memberDashboard;return fn();
}
