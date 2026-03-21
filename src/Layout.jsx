import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  PenTool,
  Camera,
  BookOpen,
  MessageSquare,
  Settings,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Search,
  Bell,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserContext } from "./components/UserContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BottomTabBar from "./components/BottomTabBar";
import ThemeToggle from "./components/ThemeToggle";

const publicPages = ["Home", "Thoughts", "Artwork", "Photography", "Stories", "BookDetail", "ChapterReader", "Post", "Terms", "Guidelines", "Search", "Forum", "ForumThread", "Registration", "Contact"];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [siteName, setSiteName] = useState("Anamaria's World");
  const [footerSettings, setFooterSettings] = useState({
    footer_text: "© 2024 Anamaria's World. A space for creativity and connection.",
    instagram_url: "",
    linkedin_url: ""
  });
  const [themePrefs, setThemePrefs] = useState({
    background_color: "#fef7ff",
    taskbar_color: "#e879f9",
    background_image: "",
    transparent_banners: false
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationCount, setNotificationCount] = useState(0);

  // No longer force redirect - users can browse as guests

  useEffect(() => {
    loadUserAndSettings();
  }, [currentPageName]);

  useEffect(() => {
    if (user) {
      loadNotificationCount();
      const interval = setInterval(loadNotificationCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadUserAndSettings = async () => {
    try {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (isAuthenticated) {
        try {
          const userData = await base44.auth.me();
          setUser(userData);
          if (userData?.theme_preferences) {
            setThemePrefs(prev => ({ ...prev, ...userData.theme_preferences }));
          }
        } catch (meError) {
          // isAuthenticated() returned true but me() failed — likely a transient error.
          // Retry once after 1 second before giving up.
          console.warn("Could not fetch user details, retrying...", meError.message);
          setTimeout(async () => {
            try {
              const userData = await base44.auth.me();
              setUser(userData);
              if (userData?.theme_preferences) {
                setThemePrefs(prev => ({ ...prev, ...userData.theme_preferences }));
              }
            } catch {
              setUser(null);
            }
          }, 1000);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error checking auth status:", error.message);
      setUser(null);
    }
    loadSiteSettings();
  };
  
  const loadNotificationCount = async () => {
    if (!user) return;
    try {
      const notifications = await base44.entities.Notification.filter({ user_id: user.id, read: false });
      setNotificationCount(notifications.length);
    } catch (error) {
      console.error("Error loading notification count:", error);
    }
  };

  const loadSiteSettings = async () => {
    try {
      const [footerData, nameData] = await Promise.all([
        base44.entities.SiteSettings.filter({ page: "footer" }),
        base44.entities.SiteSettings.filter({ page: "site_name" })
      ]);

      if (footerData.length > 0) {
        setFooterSettings(footerData[0]);
      }
      if (nameData.length > 0 && nameData[0].site_name) {
        setSiteName(nameData[0].site_name);
      }
    } catch (error) {
      console.error("Error loading site settings:", error);
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout();
    setUser(null);
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(createPageUrl(`Search?q=${searchQuery.trim()}`));
      setIsMenuOpen(false);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isActive = (pageName) => location.pathname === createPageUrl(pageName);

  const navItems = [
    { name: "Thoughts", path: "Thoughts", icon: PenTool },
    { name: "Artwork", path: "Artwork", icon: PenTool },
    { name: "Photography", path: "Photography", icon: Camera },
    { name: "Stories", path: "Stories", icon: BookOpen },
    { name: "Forum", path: "Forum", icon: MessageSquare },
  ];

  const backgroundStyle = themePrefs.background_image
    ? {
        backgroundImage: `url(${themePrefs.background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }
    : { backgroundColor: themePrefs.background_color };

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden" style={backgroundStyle}>
      <style>{`
        :root {
          --primary-pastel: #e879f9;
          --secondary-pastel: #a855f7;
          --accent-mint: #6ee7b7;
          --accent-peach: #fbbf24;
          --accent-sky: #60a5fa;
          --soft-lavender: #e879f9;
          --background-cream: #fef7ff;
          --text-dark: #1f2937;
          --text-light: #6b7280;
          --banner-bg: ${themePrefs.transparent_banners ? 'transparent' : 'linear-gradient(135deg, #fef7ff 0%, #f3e8ff 50%, #ede9fe 100%)'};
          --banner-backdrop: ${themePrefs.transparent_banners ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)'};
        }
        
        .pastel-gradient {
          background: var(--banner-bg);
          ${themePrefs.transparent_banners ? 'backdrop-filter: blur(10px);' : ''}
        }
        
        .banner-transparent {
          background: ${themePrefs.transparent_banners ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #fef7ff 0%, #f3e8ff 50%, #ede9fe 100%)'};
          ${themePrefs.transparent_banners ? 'backdrop-filter: blur(10px);' : ''}
          ${themePrefs.transparent_banners ? 'border: 1px solid rgba(255, 255, 255, 0.2);' : ''}
        }

        .banner-text-container {
          ${themePrefs.transparent_banners ? `
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(15px);
            border-radius: 20px;
            padding: 2.5rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          ` : 'padding: 2rem;'}
        }
        
        .nav-link {
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .nav-link::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(232, 121, 249, 0.1), transparent);
          transition: left 0.5s;
        }
        
        .nav-link:hover::before {
          left: 100%;
        }
        
        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        .smooth-scroll {
          scroll-behavior: smooth;
        }

        .notification-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          font-size: 10px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        ${themePrefs.transparent_banners ? `
          .banner-text {
            text-shadow: 
              4px 4px 8px rgba(0, 0, 0, 0.9),
              2px 2px 4px rgba(0, 0, 0, 0.8),
              1px 1px 2px rgba(0, 0, 0, 0.7);
            color: white !important;
            font-weight: 800;
            letter-spacing: 0.5px;
          }
          .banner-text-secondary {
            color: rgba(255, 255, 255, 0.95) !important;
            text-shadow: 
              3px 3px 6px rgba(0, 0, 0, 0.8),
              2px 2px 4px rgba(0, 0, 0, 0.7),
              1px 1px 2px rgba(0, 0, 0, 0.6);
            font-weight: 600;
            letter-spacing: 0.3px;
          }
        ` : ''}
      `}</style>

      <header
        className={`sticky top-0 z-50 transition-colors duration-300 ${
          themePrefs.transparent_banners ? 'banner-transparent border-b border-white/20' : 'backdrop-blur-md border-b border-purple-100/50'
        }`}
        style={themePrefs.transparent_banners ? {} : { backgroundColor: `${themePrefs.taskbar_color}20` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              to={createPageUrl("Home")}
              className={`flex items-center space-x-3 text-2xl font-bold transition-colors duration-200 ${
                themePrefs.transparent_banners ? 'banner-text hover:text-purple-200' : 'text-gray-800 hover:text-purple-600'
              }`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: themePrefs.taskbar_color }}
              >
                {siteName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:block">{siteName}</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={createPageUrl(item.path)}
                  className={`nav-link px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                    isActive(item.path)
                      ? 'bg-purple-100 text-purple-700'
                      : themePrefs.transparent_banners
                        ? 'banner-text-secondary hover:text-white hover:bg-white/10'
                        : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>

            <div className="flex items-center space-x-3">
              <form onSubmit={handleSearch} className="relative hidden lg:block">
                <Input
                  type="search"
                  placeholder="Search posts..."
                  className="pl-10 h-9 w-48"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${themePrefs.transparent_banners ? 'text-white/70' : 'text-gray-400'}`} />
              </form>

              {user && (
                <Link to={createPageUrl("Notifications")} className="relative">
                  <Button variant="ghost" size="sm" className="relative p-2">
                    <Bell className={`w-5 h-5 ${themePrefs.transparent_banners ? 'text-white' : 'text-gray-600'}`} />
                    {notificationCount > 0 && (
                      <span className="notification-badge">
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </span>
                    )}
                  </Button>
                </Link>
              )}
            
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className={`flex items-center space-x-2 ${themePrefs.transparent_banners ? 'text-white' : ''}`}>
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt="Profile"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                          style={{ backgroundColor: themePrefs.taskbar_color }}
                        >
                          {user.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className={`hidden sm:block text-sm font-medium ${themePrefs.transparent_banners ? 'banner-text-secondary' : ''}`}>
                        {user.username}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("Profile")} className="flex items-center">
                        <UserIcon className="w-4 h-4 mr-2" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("Admin")} className="flex items-center">
                          <Settings className="w-4 h-4 mr-2" />
                          Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200"
                >
                  Sign In
                </Button>
              )}

              <Button
                variant="ghost"
                className="md:hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className={`w-5 h-5 ${themePrefs.transparent_banners ? 'text-white' : ''}`} /> : <Menu className={`w-5 h-5 ${themePrefs.transparent_banners ? 'text-white' : ''}`} />}
              </Button>
            </div>
          </div>

          {isMenuOpen && (
            <div className={`md:hidden ${themePrefs.transparent_banners ? 'border-t border-white/20' : 'border-t border-purple-100'} py-4`}>
              <nav className="flex flex-col space-y-2">
                <form onSubmit={handleSearch} className="relative mb-2 lg:hidden">
                  <Input
                    type="search"
                    placeholder="Search posts..."
                    className="pl-10 h-10 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${themePrefs.transparent_banners ? 'text-white/70' : 'text-gray-400'}`} />
                </form>
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={createPageUrl(item.path)}
                    onClick={() => setIsMenuOpen(false)}
                    className={`nav-link px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-3 ${
                      isActive(item.path)
                        ? 'bg-purple-100 text-purple-700'
                        : themePrefs.transparent_banners
                          ? 'banner-text-secondary hover:text-white hover:bg-white/10'
                          : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                ))}
                {user && (
                  <Link
                    to={createPageUrl("Notifications")}
                    onClick={() => setIsMenuOpen(false)}
                    className={`nav-link px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-3 ${
                      themePrefs.transparent_banners
                        ? 'banner-text-secondary hover:text-white hover:bg-white/10'
                        : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                    {notificationCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {notificationCount}
                      </span>
                    )}
                  </Link>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      <main 
        className="flex-1 transition-colors duration-300"
      >
        <UserContext.Provider value={user}>
          {children}
        </UserContext.Provider>
      </main>

      <BottomTabBar taskbarColor={themePrefs.taskbar_color} />

      <footer
        className={`transition-colors duration-300 ${
          themePrefs.transparent_banners ? 'banner-transparent border-t border-white/20' : 'border-t border-purple-100 bg-white/80 backdrop-blur-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <p className={`text-sm ${themePrefs.transparent_banners ? 'banner-text-secondary' : 'text-gray-600'}`}>
                {footerSettings.footer_text}
              </p>
              <div className="flex justify-center md:justify-start space-x-4 mt-2">
                <Link to={createPageUrl("Terms")} className={`text-sm ${themePrefs.transparent_banners ? 'banner-text-secondary' : 'text-gray-500'} hover:text-purple-600`}>
                  Terms of Service
                </Link>
                <Link to={createPageUrl("Guidelines")} className={`text-sm ${themePrefs.transparent_banners ? 'banner-text-secondary' : 'text-gray-500'} hover:text-purple-600`}>
                  Community Guidelines
                </Link>
                <Link to={createPageUrl("Contact")} className={`text-sm ${themePrefs.transparent_banners ? 'banner-text-secondary' : 'text-gray-500'} hover:text-purple-600`}>
                  Contact
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {footerSettings.instagram_url && (
                <a
                  href={footerSettings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`hover:text-pink-500 transition-colors duration-200 ${themePrefs.transparent_banners ? 'text-white/70' : 'text-gray-400'}`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919-4.919-1.266-.058-1.644-.07-4.85-.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              )}
              {footerSettings.linkedin_url && (
                <a
                  href={footerSettings.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`hover:text-blue-500 transition-colors duration-200 ${themePrefs.transparent_banners ? 'text-white/70' : 'text-gray-400'}`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}