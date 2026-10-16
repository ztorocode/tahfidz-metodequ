import {getState} from "./store.js?v=8380da72";
import {loginPage} from "./pages/login.js?v=8380da72";
import {memberDashboard} from "./pages/member-dashboard.js?v=8380da72";
import {programPage} from "./pages/program.js?v=8380da72";
import {activityPage} from "./pages/activity.js?v=8380da72";
import {submissionPage} from "./pages/submission.js?v=8380da72";
import {murajaahPage} from "./pages/murajaah.js?v=8380da72";
import {notificationsPage} from "./pages/notifications.js?v=8380da72";
import {musyrifDashboard} from "./pages/musyrif-dashboard.js?v=8380da72";
import {reviewPage} from "./pages/review.js?v=8380da72";
import {acceptInvitePage} from "./pages/terima-undangan.js?v=8380da72";
import {adminSantriPage} from "./pages/admin-santri.js?v=8380da72";
import {adminMusyrifPage} from "./pages/admin-musyrif.js?v=8380da72";
import {adminDashboard} from "./pages/admin-dashboard.js?v=8380da72";
import {halaqahPage} from "./pages/halaqah.js?v=8380da72";
import {studentProgressPage} from "./pages/santri-progress.js?v=8380da72";
import {memberProgressPage} from "./pages/member-progress.js?v=8380da72";
import {progressTablePage} from "./pages/tabel-progress.js?v=8380da72";
import {whatsappPage} from "./pages/whatsapp.js?v=8380da72";
import {superAdminDashboard,userManagementPage,platformPondoksPage,platformMusyrifPage,platformSettingsPage} from "./pages/super-admin.js?v=8380da72";
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
