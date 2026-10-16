import {getState} from "./store.js?v=ec26735e";
import {loginPage} from "./pages/login.js?v=ec26735e";
import {memberDashboard} from "./pages/member-dashboard.js?v=ec26735e";
import {programPage} from "./pages/program.js?v=ec26735e";
import {activityPage} from "./pages/activity.js?v=ec26735e";
import {submissionPage} from "./pages/submission.js?v=ec26735e";
import {murajaahPage} from "./pages/murajaah.js?v=ec26735e";
import {notificationsPage} from "./pages/notifications.js?v=ec26735e";
import {musyrifDashboard} from "./pages/musyrif-dashboard.js?v=ec26735e";
import {reviewPage} from "./pages/review.js?v=ec26735e";
import {acceptInvitePage} from "./pages/terima-undangan.js?v=ec26735e";
import {adminSantriPage} from "./pages/admin-santri.js?v=ec26735e";
import {adminMusyrifPage} from "./pages/admin-musyrif.js?v=ec26735e";
import {adminDashboard} from "./pages/admin-dashboard.js?v=ec26735e";
import {halaqahPage} from "./pages/halaqah.js?v=ec26735e";
import {studentProgressPage} from "./pages/santri-progress.js?v=ec26735e";
import {memberProgressPage} from "./pages/member-progress.js?v=ec26735e";
import {progressTablePage} from "./pages/tabel-progress.js?v=ec26735e";
import {whatsappPage} from "./pages/whatsapp.js?v=ec26735e";
import {superAdminDashboard,userManagementPage,platformPondoksPage,platformMusyrifPage,platformSettingsPage} from "./pages/super-admin.js?v=ec26735e";
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
