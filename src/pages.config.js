import Home from './pages/Home';
import Admin from './pages/Admin';
import Registration from './pages/Registration';
import Stories from './pages/Stories';
import Reader from './pages/Reader';
import Forum from './pages/Forum';
import Profile from './pages/Profile';
import Thoughts from './pages/Thoughts';
import Artwork from './pages/Artwork';
import Photography from './pages/Photography';
import Post from './pages/Post';
import Notifications from './pages/Notifications';
import ForumThread from './pages/ForumThread';
import Terms from './pages/Terms';
import Guidelines from './pages/Guidelines';
import Search from './pages/Search';
import AdminMessage from './pages/AdminMessage';
import Contact from './pages/Contact';
import ChapterIndex from './pages/ChapterIndex';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Admin": Admin,
    "Registration": Registration,
    "Stories": Stories,
    "Reader": Reader,
    "Forum": Forum,
    "Profile": Profile,
    "Thoughts": Thoughts,
    "Artwork": Artwork,
    "Photography": Photography,
    "Post": Post,
    "Notifications": Notifications,
    "ForumThread": ForumThread,
    "Terms": Terms,
    "Guidelines": Guidelines,
    "Search": Search,
    "AdminMessage": AdminMessage,
    "Contact": Contact,
    "ChapterIndex": ChapterIndex,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};