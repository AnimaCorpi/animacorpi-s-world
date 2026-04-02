import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, Tag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { format } from "date-fns";
import PullToRefresh from "@/components/PullToRefresh";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [settings, setSettings] = useState(null);
  const [activeThreads, setActiveThreads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterPosts();
  }, [posts, selectedCategory]);

  const loadData = useCallback(async () => {
    try {
      const [postsData, settingsData, threadsData] = await Promise.all([
        base44.entities.Post.filter({ published: true }, "-created_date"),
        base44.entities.SiteSettings.filter({ page: "home" }),
        base44.entities.ForumThread.filter({}, "-last_reply_at", 5)
      ]);
      const now = new Date();
      const visiblePosts = postsData.filter((post) =>
        !post.publish_at || new Date(post.publish_at) <= now
      );
      setPosts(visiblePosts);
      setSettings(settingsData[0] || { tagline: "Welcome to My Creative World", message: "Explore thoughts, artwork, photography, and stories from my heart." });
      // Sort by last_reply_at if available, else created_date
      const sorted = threadsData.sort((a, b) => {
        const dateA = new Date(a.last_reply_at || a.created_date);
        const dateB = new Date(b.last_reply_at || b.created_date);
        return dateB - dateA;
      });
      setActiveThreads(sorted.slice(0, 5));
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  }, []);

  const filterPosts = () => {
    if (selectedCategory === "all") {
      setFilteredPosts(posts);
    } else {
      setFilteredPosts(posts.filter((post) => post.category === selectedCategory));
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      thoughts: "bg-purple-100 text-purple-700 border-purple-200",
      artwork: "bg-pink-100 text-pink-700 border-pink-200",
      photography: "bg-blue-100 text-blue-700 border-blue-200"
    };
    return colors[category] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getCategoryIcon = (category) => {
    const icons = {
      thoughts: "💭",
      artwork: "🎨",
      photography: "📸"
    };
    return icons[category] || "📝";
  };

  const stripHtmlTags = (html) => {
    return html.replace(/<[^>]*>/g, '');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading creative content...</p>
        </div>
      </div>);

  }

  const categories = [
  { value: "all", label: "All" },
  { value: "thoughts", label: "💭 Thoughts" },
  { value: "artwork", label: "🎨 Artwork" },
  { value: "photography", label: "📸 Photography" }];


  return (
    <PullToRefresh onRefresh={loadData}>
      <div>

}