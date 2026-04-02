import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Eye,
  EyeOff,
  Clock,
  User as UserIcon,
  Lock,
  Image as ImageIcon,
  Filter,
  Trash2
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import ForumThreadForm from "../components/forum/ForumThreadForm";
import ReactionButton from "../components/ReactionButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "../components/UserContext";

export default function Forum() {
  const user = useUser();
  const [threads, setThreads] = useState([]);
  const [filteredThreads, setFilteredThreads] = useState([]);
  const [settings, setSettings] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [showNSFW, setShowNSFW] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [allTags, setAllTags] = useState([]);


  // Derived state - no separate auth fetch needed, user comes from Layout context
  const needsRegistration = user && (!user.username || !user.birthdate);

  useEffect(() => {
    loadData();
  }, []);

  // Update NSFW visibility whenever user changes
  useEffect(() => {
    if (user && !needsRegistration) {
      if (user.role === 'admin' || calculateAge(user.birthdate) >= 18) {
        setShowNSFW(true);
      } else {
        setShowNSFW(false);
      }
    } else {
      setShowNSFW(false);
    }
  }, [user]);

  useEffect(() => {
    filterThreads();
  }, [threads, searchTerm, selectedTag, showNSFW, user]);

  const loadData = async () => {
    try {
      const [threadsData, settingsData] = await Promise.all([
        base44.entities.ForumThread.list("-created_date"),
        base44.entities.SiteSettings.filter({ page: "forum" })
      ]);

      setThreads(threadsData);
      setSettings(settingsData[0] || {
        tagline: "Connect & Share",
        message: "Join our vibrant creative community and share your thoughts."
      });

      const tags = new Set();
      threadsData.forEach(thread => {
        if (thread.tags && Array.isArray(thread.tags)) {
          thread.tags.forEach(tag => {
            if (tag && tag.trim()) tags.add(tag.trim());
          });
        }
      });
      setAllTags(Array.from(tags).sort());
    } catch (error) {
      console.error("Error loading forum data:", error);
    }
    setIsLoading(false);
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return 0;
    const today = new Date();
    const birth = new Date(birthdate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  };

  const filterThreads = () => {
    let filtered = threads;

    if (!user || needsRegistration) {
      // Guest or incomplete profile: hide all NSFW
      filtered = filtered.filter(thread => !thread.is_nsfw);
    } else {
      const userAge = calculateAge(user.birthdate);
      const isAdmin = user.role === 'admin';
      if (!isAdmin && userAge < 18) {
        filtered = filtered.filter(thread => !thread.is_nsfw);
      } else if (!isAdmin && !showNSFW) {
        filtered = filtered.filter(thread => !thread.is_nsfw);
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(thread =>
        thread.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        thread.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (thread.tags && thread.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }

    if (selectedTag !== "all") {
      filtered = filtered.filter(thread =>
        thread.tags && thread.tags.includes(selectedTag)
      );
    }

    setFilteredThreads(filtered);
  };

  const handleThreadCreated = () => {
    setShowCreateForm(false);
    loadData();
  };

  const canCreateNSFW = () => {
    return user && !needsRegistration && (user.role === 'admin' || calculateAge(user.birthdate) >= 18);
  };

  const getAuthorDisplay = (thread) => {
    return thread.author_username || 'User';
  };

  const handleDeleteThread = async (e, threadId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this discussion?")) return;
    try {
      await base44.entities.ForumThread.delete(threadId);
      loadData();
    } catch (error) {
      console.error("Error deleting thread:", error);
      alert("Failed to delete discussion. Please try again.");
    }
  };

  const handleStartDiscussion = () => {
    if (!user) {
      base44.auth.redirectToLogin();
    } else if (needsRegistration) {
      window.location.href = createPageUrl("Registration");
    } else {
      setShowCreateForm(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading forum...</p>
        </div>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <ForumThreadForm
        user={user}
        canCreateNSFW={canCreateNSFW()}
        onSuccess={handleThreadCreated}
        onCancel={() => setShowCreateForm(false)}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <section className="banner-transparent py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="banner-text-container">
            <h1 className="banner-text text-4xl md:text-5xl font-bold mb-6">
              {settings?.tagline || "Connect & Share"}
            </h1>
            <p className="banner-text-secondary text-xl mb-8">
              {settings?.message || "Join our vibrant creative community and share your thoughts."}
            </p>
            <Button
              onClick={handleStartDiscussion}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-8 py-3"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Start a Discussion
            </Button>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search discussions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={selectedTag} onValueChange={setSelectedTag}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {allTags.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              </div>

              {user && !needsRegistration && (user.role === 'admin' || calculateAge(user.birthdate) >= 18) && (
              <div className="flex items-center space-x-2">
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setShowNSFW(!showNSFW)}
                 className="flex items-center"
               >
                 {showNSFW ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                 {showNSFW ? "Hide NSFW" : "Show NSFW"}
               </Button>
              </div>
              )}
              </div>

              <div className="space-y-4">