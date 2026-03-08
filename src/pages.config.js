/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
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
import Reader from './pages/Reader';
import Registration from './pages/Registration';
import Search from './pages/Search';
import Stories from './pages/Stories';
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
    "Reader": Reader,
    "Registration": Registration,
    "Search": Search,
    "Stories": Stories,
    "Terms": Terms,
    "Thoughts": Thoughts,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};