import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, Tag, ArrowRight, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { format } from "date-fns";

const stripHtmlTags = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
};

export default function Photography() {
  const [posts, setPosts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [postsData, settingsData] = await Promise.all([
        base44.entities.Post.filter({ published: true, category: "photography" }, "-created_date"),
        base44.entities.SiteSettings.filter({ page: "photography" })
      ]);
      const sorted = [
        ...postsData.filter(p => p.pinned).sort((a, b) => (a.pin_order ?? 0) - (b.pin_order ?? 0)),
        ...postsData.filter(p => !p.pinned)
      ];
      setPosts(sorted);
      setSettings(settingsData[0] || { 
        tagline: "Captured Moments", 
        message: "Visual stories through the lens of my camera." 
      });
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading photography...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="pastel-gradient py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-6 leading-tight">
              {settings?.tagline || "Captured Moments"}
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              {settings?.message || "Visual stories through the lens of my camera."}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Posts Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-background/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card-hover bg-white dark:bg-card rounded-2xl shadow-lg overflow-hidden border border-purple-100 dark:border-border"
              >
                {post.image_url && (
                  <Link to={createPageUrl(`Post?id=${post.id}`)}>
                    <div className="aspect-video overflow-hidden">
                      <img 
                        src={post.image_url} 
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    </div>
                  </Link>
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
                      📸 Photography
                    </Badge>
                    {post.pinned && (
                      <Badge className="bg-purple-50 text-purple-500 border border-purple-200 flex items-center gap-1 text-xs">
                        <Pin className="w-3 h-3" /> Pinned
                      </Badge>
                    )}
                  </div>
                    <div className="flex items-center text-sm text-gray-500 dark:text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-1" />
                      {format(new Date(post.created_date), "MMM d, yyyy")}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-foreground mb-3 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 dark:text-muted-foreground mb-4 line-clamp-3">
                    {stripHtmlTags(post.excerpt || post.content).substring(0, 150) + "..."}
                  </p>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.slice(0, 3).map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-muted text-gray-800 dark:text-foreground"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <Link 
                    to={createPageUrl(`Post?id=${post.id}`)}
                    className="inline-flex items-center text-purple-600 hover:text-purple-800 font-medium transition-colors duration-200"
                  >
                    View Photo
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>

          {posts.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📸</div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-foreground mb-2">No photography yet</h3>
              <p className="text-gray-600 dark:text-muted-foreground">Check back soon for new captured moments!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}