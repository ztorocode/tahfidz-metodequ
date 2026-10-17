import {getState} from "./store.js?v=6f85b9bf";
import {loginPage} from "./pages/login.js?v=6f85b9bf";
import {memberDashboard} from "./pages/member-dashboard.js?v=6f85b9bf";
import {programPage} from "./pages/program.js?v=6f85b9bf";
import {activityPage} from "./pages/activity.js?v=6f85b9bf";
import {submissionPage} from "./pages/submission.js?v=6f85b9bf";
import {murajaahPage} from "./pages/murajaah.js?v=6f85b9bf";
import {notificationsPage} from "./pages/notifications.js?v=6f85b9bf";
import {musyrifDashboard} from "./pages/musyrif-dashboard.js?v=6f85b9bf";
import {reviewPage} from "./pages/review.js?v=6f85b9bf";
import {acceptInvitePage} from "./pages/terima-undangan.js?v=6f85b9bf";
import {adminSantriPage} from "./pages/admin-santri.js?v=6f85b9bf";
import {adminMusyrifPage} from "./pages/admin-musyrif.js?v=6f85b9bf";
import {adminDashboard} from "./pages/admin-dashboard.js?v=6f85b9bf";
import {halaqahPage} from "./pages/halaqah.js?v=6f85b9bf";
import {studentProgressPage} from "./pages/santri-progress.js?v=6f85b9bf";
import {memberProgressPage} from "./pages/member-progress.js?v=6f85b9bf";
import {progressTablePage} from "./pages/tabel-progress.js?v=6f85b9bf";
import {whatsappPage} from "./pages/whatsapp.js?v=6f85b9bf";
import {superAdminDashboard,userManagementPage,platformPondoksPage,platformMusyrifPage,platformSettingsPage} from "./pages/super-admin.js?v=6f85b9bf";
const routes={
 login:loginPage,dashboard:memberDashboard,program:programPage,activity:activityPage,
 submission:submissionPage,murajaah:murajaahPage,notifications:notificationsPage,
 progress:memberProgressPage,report:progressTablePage,
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
