import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  FileText, 
  BookOpen,
  Users, 
  Eye,
  Image,
  Bell,
  Send,
  Flag
} from "lucide-react";
import PostManager from "../components/admin/PostManager";
import BookManager from "../components/admin/BookManager";
import SiteSettingsManager from "../components/admin/SiteSettingsManager";
import UserManager from "../components/admin/UserManager";
import BackgroundManager from "../components/admin/BackgroundManager";
import UserMessaging from "../components/admin/UserMessaging";
import ReportManager from "../components/admin/ReportManager";


export default function Admin() {
  const [user, setUser] = useState(null);
  const [adminReady, setAdminReady] = useState(false);
  useEffect(() => {
    checkAdminAccess();
  }, []);

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [posts, books, chapters, users] = await Promise.all([
        base44.entities.Post.list(),
        base44.entities.Book.list(),
        base44.entities.Chapter.list(),
        base44.entities.User.list()
      ]);
      return { posts: posts.length, books: books.length, chapters: chapters.length, users: users.length };
    },
    enabled: adminReady,
    staleTime: 60_000,
  });

  const stats = statsData ?? { posts: 0, books: 0, chapters: 0, users: 0 };

  const checkAdminAccess = async () => {
    try {
      const userData = await base44.auth.me();
      if (userData.role !== 'admin') {
        window.location.href = createPageUrl("Home");
        return;
      }
      setUser(userData);
      setAdminReady(true);
    } catch (error) {
      window.location.href = createPageUrl("Home");
    }
  };

  const loadStats = () => refetchStats();

  const handlePreviewMode = () => {
    window.open(window.location.origin, '_blank');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-3 sm:px-6 lg:px-8 pb-24 lg:pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your creative platform</p>
          </div>
          <Button
            onClick={handlePreviewMode}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 w-full sm:w-auto"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Preview as Public User</span>
            <span className="sm:hidden">Preview</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Posts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.posts}</p>
                </div>
                <FileText className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Books</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.books}</p>
                </div>
                <BookOpen className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Chapters</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.chapters}</p>
                </div>
                <BookOpen className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.users}</p>
                </div>
                <Users className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Content Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 gap-1 p-1 h-auto mb-6">
                <TabsTrigger value="posts" className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 px-1 py-2">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] sm:text-xs">Posts</span>
                </TabsTrigger>
                <TabsTrigger value="books" className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 px-1 py-2">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] sm:text-xs">Books</span>
                </TabsTrigger>
                <TabsTrigger value="backgrounds" className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 px-1 py-2">
                  <Image className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] sm:text-xs">Backgrounds</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 px-1 py-2">
                  <Settings className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] sm:text-xs">Settings</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 px-1 py-2">
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] sm:text-xs">Users</span>
                </TabsTrigger>
                <TabsTrigger value="messaging" className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 px-1 py-2">
                  <Send className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] sm:text-xs">Messaging</span>
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 px-1 py-2">
                  <Flag className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] sm:text-xs">Reports</span>
                </TabsTrigger>

              </TabsList>
              
              <TabsContent value="posts" className="mt-6">
                <PostManager onStatsUpdate={loadStats} />
              </TabsContent>
              
              <TabsContent value="books" className="mt-6">
                <BookManager onStatsUpdate={loadStats} />
              </TabsContent>
              
              <TabsContent value="backgrounds" className="mt-6">
                <BackgroundManager />
              </TabsContent>
              
              <TabsContent value="settings" className="mt-6">
                <SiteSettingsManager />
              </TabsContent>
              
              <TabsContent value="users" className="mt-6">
                <UserManager />
              </TabsContent>
              
              <TabsContent value="messaging" className="mt-6">
                <UserMessaging />
              </TabsContent>
              
              <TabsContent value="reports" className="mt-6">
                <ReportManager />
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}