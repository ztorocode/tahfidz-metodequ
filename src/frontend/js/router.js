import {getState} from "./store.js?v=dev-2f08f073";
import {loginPage} from "./pages/login.js?v=dev-2f08f073";
import {memberDashboard} from "./pages/member-dashboard.js?v=dev-2f08f073";
import {programPage} from "./pages/program.js?v=dev-2f08f073";
import {activityPage} from "./pages/activity.js?v=dev-2f08f073";
import {submissionPage} from "./pages/submission.js?v=dev-2f08f073";
import {murajaahPage} from "./pages/murajaah.js?v=dev-2f08f073";
import {notificationsPage} from "./pages/notifications.js?v=dev-2f08f073";
import {musyrifDashboard} from "./pages/musyrif-dashboard.js?v=dev-2f08f073";
import {reviewPage} from "./pages/review.js?v=dev-2f08f073";
import {adminDashboard} from "./pages/admin-dashboard.js?v=dev-2f08f073";
import {halaqahPage} from "./pages/halaqah.js?v=dev-2f08f073";
import {whatsappPage} from "./pages/whatsapp.js?v=dev-2f08f073";
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
