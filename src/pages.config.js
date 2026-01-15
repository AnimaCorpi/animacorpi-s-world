import Admin from './pages/Admin';
import AdminMessage from './pages/AdminMessage';
import Artwork from './pages/Artwork';
import Contact from './pages/Contact';
import Forum from './pages/Forum';
import ForumThread from './pages/ForumThread';
import Guidelines from './pages/Guidelines';
import Home from './pages/Home';
import Notifications from './pages/Notifications';
import Photography from './pages/Photography';
import Post from './pages/Post';
import Profile from './pages/Profile';
import Registration from './pages/Registration';
import Search from './pages/Search';
import Terms from './pages/Terms';
import Thoughts from './pages/Thoughts';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "AdminMessage": AdminMessage,
    "Artwork": Artwork,
    "Contact": Contact,
    "Forum": Forum,
    "ForumThread": ForumThread,
    "Guidelines": Guidelines,
    "Home": Home,
    "Notifications": Notifications,
    "Photography": Photography,
    "Post": Post,
    "Profile": Profile,
    "Registration": Registration,
    "Search": Search,
    "Terms": Terms,
    "Thoughts": Thoughts,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};