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
    const unsubscribe = base44.entities.Post.subscribe((event) => {
      const now = new Date();
      if (event.type === 'create' && event.data?.published && (!event.data.publish_at || new Date(event.data.publish_at) <= now)) {
        setPosts(prev => [event.data, ...prev]);
      } else if (event.type === 'update') {
        setPosts(prev => {
          const exists = prev.find(p => p.id === event.id);
          if (event.data?.published && (!event.data.publish_at || new Date(event.data.publish_at) <= now)) {
            return exists ? prev.map(p => p.id === event.id ? event.data : p) : [event.data, ...prev];
          }
          return prev.filter(p => p.id !== event.id);
        });
      } else if (event.type === 'delete') {
        setPosts(prev => prev.filter(p => p.id !== event.id));
      }
    });
    return unsubscribe;
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="banner-transparent py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="dark:bg-black/40 dark:rounded-2xl dark:px-8 dark:py-6">
              
            <div className="banner-text-container">
              <h1 className="banner-text text-4xl md:text-6xl font-bold mb-6 leading-tight">
                {settings?.tagline || "Welcome to My Creative World"}
              </h1>
              <p className="banner-text-secondary text-xl md:text-2xl mb-8 leading-relaxed">
                {settings?.message || "Explore thoughts, artwork, photography, and stories from my heart."}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to={createPageUrl("Thoughts")}>
                  <Button
                      size="lg"
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 rounded-full font-medium transition-all duration-300 transform hover:scale-105">
                      
                    💭 Explore Thoughts
                  </Button>
                </Link>
                <Link to={createPageUrl("Stories")}>
                  <Button
                      size="lg"
                      variant="outline"
                      className="border-2 border-purple-300 text-purple-700 hover:bg-purple-50 px-8 py-3 rounded-full font-medium transition-all duration-300 transform hover:scale-105">
                      
                    📚 Read Stories
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filter Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-background/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-foreground mb-2">Latest Posts</h2>
              <p className="text-gray-600 dark:text-muted-foreground">Discover my latest creative expressions</p>
            </div>
            <div className="flex items-center gap-2 mt-4 md:mt-0 flex-wrap">
              {categories.map((cat) =>
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  aria-pressed={selectedCategory === cat.value}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px] min-w-[44px] ${
                  selectedCategory === cat.value ?
                  "bg-purple-600 text-white shadow-md" :
                  "bg-white dark:bg-card text-gray-600 dark:text-muted-foreground border border-gray-200 dark:border-border hover:border-purple-300 hover:text-purple-600"}`
                  }>
                  
                  {cat.label}
                </button>
                )}
            </div>
          </div>

          {/* Posts Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post, index) =>
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card-hover bg-white dark:bg-card rounded-2xl shadow-lg overflow-hidden border border-purple-100 dark:border-border">
                
                {post.image_url &&
                <Link to={createPageUrl(`Post?id=${post.id}`)}>
                <div className="aspect-video overflow-hidden hover:opacity-90 transition-opacity cursor-pointer">
                    <img
                    src={post.image_url}
                    alt={post.title}
                    className="w-full h-full object-contain" />
                  
                  </div>
                </Link>
                }
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className={`${getCategoryColor(post.category)} border`}>
                      {getCategoryIcon(post.category)} {post.category}
                    </Badge>
                    <div className="flex items-center text-sm text-gray-500 dark:text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-1" />
                      {format(new Date(post.created_date), "MMM d, yyyy")}
                    </div>
                  </div>
                  <Link to={createPageUrl(`Post?id=${post.id}`)} className="block hover:text-purple-600 transition-colors">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-foreground mb-3 line-clamp-2">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="text-gray-600 dark:text-muted-foreground mb-4 line-clamp-3">
                    {post.excerpt || stripHtmlTags(post.content).substring(0, 150) + "..."}
                  </p>
                  {post.tags && post.tags.length > 0 &&
                  <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.slice(0, 3).map((tag, tagIndex) =>
                    <span
                      key={tagIndex}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-muted text-gray-800 dark:text-foreground">
                      
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                    )}
                    </div>
                  }
                  <Link
                    to={createPageUrl(`Post?id=${post.id}`)}
                    className="inline-flex items-center text-purple-600 hover:text-purple-800 font-medium transition-colors duration-200">
                    
                    Read More
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </motion.article>
              )}
          </div>

          {filteredPosts.length === 0 &&
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-foreground mb-2">No posts yet</h3>
              <p className="text-gray-600 dark:text-muted-foreground">
                {selectedCategory === "all" ?
                "Check back soon for new creative content!" :
                `No ${selectedCategory} posts available yet.`
                }
              </p>
            </div>
            }
        </div>
      </section>

      {/* Active Threads */}
      {activeThreads.length > 0 && (
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-foreground mb-1">Active Threads</h2>
                <p className="text-gray-600 dark:text-muted-foreground">Most recently active discussions</p>
              </div>
              <Link to={createPageUrl("Forum")} className="text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {activeThreads.map((thread) => (
                <Link key={thread.id} to={createPageUrl(`ForumThread?id=${thread.id}`)}>
                  <div className="bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-xl border border-purple-100 dark:border-border p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-all flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                      <span className="text-lg">💬</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 dark:text-foreground truncate">{thread.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-muted-foreground mt-0.5">
                        by @{thread.author_username} · last active {thread.last_reply_at
                          ? format(new Date(thread.last_reply_at), "MMM d")
                          : format(new Date(thread.created_date), "MMM d")}
                      </p>
                    </div>
                    {thread.is_nsfw && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full shrink-0">NSFW</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Call to Action */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-500 to-pink-500">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Join the Creative Journey</h2>
          <p className="text-xl mb-8 opacity-90">
            Connect with a community of creative souls and share your own story
          </p>
          <Link to={createPageUrl("Forum")}>
            <Button
                size="lg"
                className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105">
                
              Join Our Forum
            </Button>
          </Link>
        </div>
      </section>
    </div>
    </PullToRefresh>);

}