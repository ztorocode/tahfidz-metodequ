import {getState} from "./store.js";
import {loginPage} from "./pages/login.js";
import {memberDashboard} from "./pages/member-dashboard.js";
import {programPage} from "./pages/program.js";
import {activityPage} from "./pages/activity.js";
import {submissionPage} from "./pages/submission.js";
import {murajaahPage} from "./pages/murajaah.js";
import {notificationsPage} from "./pages/notifications.js";
import {musyrifDashboard} from "./pages/musyrif-dashboard.js";
import {reviewPage} from "./pages/review.js";
import {adminDashboard} from "./pages/admin-dashboard.js";
import {halaqahPage} from "./pages/halaqah.js";
import {whatsappPage} from "./pages/whatsapp.js";
const routes={
 login:loginPage,dashboard:memberDashboard,program:programPage,activity:activityPage,
 submission:submissionPage,murajaah:murajaahPage,notifications:notificationsPage,
 musyrif:musyrifDashboard,review:reviewPage,admin:adminDashboard,halaqah:halaqahPage,whatsapp:whatsappPage
};
export function routeName(){return location.hash.replace(/^#/,"")||"dashboard"}
export function view(){
 const s=getState();
 if(!s.loggedIn&&routeName()!=="login")location.hash="login";
 if(s.loggedIn&&routeName()==="login")location.hash=s.persona==="admin"?"admin":s.persona==="musyrif"?"musyrif":"dashboard";
 const fn=routes[routeName()]||memberDashboard;return fn();
}
