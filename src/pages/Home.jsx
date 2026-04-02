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

const CATEGORY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "thoughts", label: "💭 Thoughts" },
  { value: "artwork", label: "🎨 Artwork" },
  { value: "photography", label: "📸 Photography" }
];

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

  const filterPosts = () => {
    if (selectedCategory === 'all') {
      setFilteredPosts(posts.filter(p => p.published));
    } else {
      setFilteredPosts(posts.filter(p => p.published && p.category === selectedCategory));
    }
  };

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

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="min-h-screen">
        <section className="banner-transparent py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="banner-text text-4xl md:text-5xl font-bold mb-4">{settings?.tagline || "Welcome"}</h1>
            <p className="banner-text-secondary text-xl">{settings?.message || "Explore creativity and connection"}</p>
          </div>
        </section>

        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <label className="text-sm font-semibold text-foreground block mb-3">Filter by Category:</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedCategory === cat.value
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-200 dark:bg-muted text-gray-700 dark:text-foreground hover:bg-gray-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredPosts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {filteredPosts.map((post, index) => (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Link to={createPageUrl(`Post?id=${post.id}`)}>
                      <div className="bg-white dark:bg-card rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow h-full flex flex-col">
                        {post.image_url && (
                          <img src={post.image_url} alt={post.title} className="w-full h-48 object-cover" />
                        )}
                        <div className="p-4 flex flex-col flex-1">
                          <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2">{post.title}</h3>
                          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{post.excerpt || stripHtmlTags(post.content).substring(0, 100)}...</p>
                          <div className="flex items-center text-xs text-muted-foreground mt-auto">
                            <span>{format(new Date(post.created_date), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                ))}
              </div>
            )}

            {activeThreads.length > 0 && (
              <div className="mt-16">
                <h2 className="text-3xl font-bold text-foreground mb-6">Latest Discussions</h2>
                <div className="space-y-3">
                  {activeThreads.slice(0, 5).map(thread => (
                    <Link key={thread.id} to={createPageUrl(`ForumThread?id=${thread.id}`)}>
                      <div className="bg-white dark:bg-card p-4 rounded-lg hover:shadow-md transition-shadow">
                        <h3 className="font-semibold text-foreground hover:text-purple-600">{thread.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">by @{thread.author_username} • {format(new Date(thread.created_date), "MMM d")}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </PullToRefresh>
  );
}