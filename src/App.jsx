import React from 'react'
import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
const Home = React.lazy(() => import('@/pages/Home'));
const ChapterList = React.lazy(() => import('@/pages/ChapterList'));
const UserProfile = React.lazy(() => import('@/pages/UserProfile'));
const ProfileSettings = React.lazy(() => import('@/pages/ProfileSettings'));
const MyReports = React.lazy(() => import('@/pages/MyReports'));
import { ThemeProvider } from '@/lib/ThemeContext';
import { AnimatePresence, motion } from 'framer-motion';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const pageVariants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -24 },
};
const pageTransition = { duration: 0.22, ease: "easeInOut" };

const AnimatedPage = ({ children }) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={pageTransition}
    style={{ width: "100%" }}
  >
    {children}
  </motion.div>
);

const AdminRoute = ({ children }) => {
  const { user, isLoadingAuth } = useAuth();
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }
  if (!user || user.role !== 'admin') {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-foreground mb-2">Access Denied</h2>
          <p className="text-gray-500 dark:text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();
  const location = useLocation();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <React.Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    }>
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {(() => { const AdminPage = Pages['Admin']; return AdminPage ? (
          <Route path="/Admin" element={
            <LayoutWrapper currentPageName="Admin">
              <AdminRoute>
                <AnimatedPage><AdminPage /></AnimatedPage>
              </AdminRoute>
            </LayoutWrapper>
          } />
        ) : null; })()}
        <Route
          path="/"
          element={
            <LayoutWrapper currentPageName="Home">
              <AnimatedPage><Home /></AnimatedPage>
            </LayoutWrapper>
          }
        />
        {Object.entries(Pages).filter(([path]) => path !== 'Admin').map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <AnimatedPage><Page /></AnimatedPage>
              </LayoutWrapper>
            }
          />
        ))}
        <Route 
          path="/ChapterList" 
          element={
            <LayoutWrapper currentPageName="ChapterList">
              <AnimatedPage><ChapterList /></AnimatedPage>
            </LayoutWrapper>
          } 
        />
        <Route
          path="/UserProfile"
          element={
            <LayoutWrapper currentPageName="UserProfile">
              <AnimatedPage><UserProfile /></AnimatedPage>
            </LayoutWrapper>
          }
        />
        <Route
          path="/ProfileSettings"
          element={
            <LayoutWrapper currentPageName="ProfileSettings">
              <AnimatedPage><ProfileSettings /></AnimatedPage>
            </LayoutWrapper>
          }
        />
        <Route
          path="/MyReports"
          element={
            <LayoutWrapper currentPageName="MyReports">
              <AnimatedPage><MyReports /></AnimatedPage>
            </LayoutWrapper>
          }
        />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </AnimatePresence>
    </React.Suspense>
  );
};


function App() {

  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <VisualEditAgent />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App