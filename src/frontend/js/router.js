import {getState} from "./store.js?v=e22d4bc0";
import {loginPage} from "./pages/login.js?v=e22d4bc0";
import {memberDashboard} from "./pages/member-dashboard.js?v=e22d4bc0";
import {programPage} from "./pages/program.js?v=e22d4bc0";
import {activityPage} from "./pages/activity.js?v=e22d4bc0";
import {submissionPage} from "./pages/submission.js?v=e22d4bc0";
import {murajaahPage} from "./pages/murajaah.js?v=e22d4bc0";
import {notificationsPage} from "./pages/notifications.js?v=e22d4bc0";
import {musyrifDashboard} from "./pages/musyrif-dashboard.js?v=e22d4bc0";
import {reviewPage} from "./pages/review.js?v=e22d4bc0";
import {adminDashboard} from "./pages/admin-dashboard.js?v=e22d4bc0";
import {halaqahPage} from "./pages/halaqah.js?v=e22d4bc0";
import {studentProgressPage} from "./pages/santri-progress.js?v=e22d4bc0";
import {memberProgressPage} from "./pages/member-progress.js?v=e22d4bc0";
import {progressTablePage} from "./pages/tabel-progress.js?v=e22d4bc0";
import {whatsappPage} from "./pages/whatsapp.js?v=e22d4bc0";
import {superAdminDashboard,userManagementPage,platformPondoksPage,platformMusyrifPage,platformSettingsPage} from "./pages/super-admin.js?v=e22d4bc0";
const routes={
 login:loginPage,dashboard:memberDashboard,program:programPage,activity:activityPage,
 submission:submissionPage,murajaah:murajaahPage,notifications:notificationsPage,
 progress:memberProgressPage,report:progressTablePage,
 musyrif:musyrifDashboard,review:reviewPage,admin:adminDashboard,halaqah:halaqahPage,"santri-progress":studentProgressPage,"tabel-progress":progressTablePage,whatsapp:whatsappPage,
 "super-admin":superAdminDashboard,users:userManagementPage,pondoks:platformPondoksPage,"platform-musyrif":platformMusyrifPage,"platform-settings":platformSettingsPage
};
const platformRoutes=["super-admin","users","pondoks","platform-musyrif","platform-settings"];
function homeRoute(state){
 return state.persona==="super_admin"?"super-admin":state.persona==="admin"?"admin":state.persona==="musyrif"?"musyrif":"dashboard";
}
export function routeName(){return location.hash.replace(/^#/,"")||"dashboard"}
export function view(){
 const s=getState();
 let name=routeName();
 if(!s.loggedIn&&name!=="login"){location.hash="login";return loginPage();}
 if(s.loggedIn&&name==="login"){name=homeRoute(s);location.hash=name;return routes[name]();}
 if(platformRoutes.includes(name)&&s.persona!=="super_admin"){name=homeRoute(s);location.hash=name;return routes[name]();}
 if(s.persona==="super_admin"&&!platformRoutes.includes(name)){location.hash="super-admin";return superAdminDashboard();}
 const fn=routes[name]||memberDashboard;return fn();
}
