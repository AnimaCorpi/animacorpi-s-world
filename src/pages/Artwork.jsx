import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, Tag, ArrowRight, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { format } from "date-fns";
import PullToRefresh from "../components/PullToRefresh";

const stripHtmlTags = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
};

export default function Artwork() {
  const [posts, setPosts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [postsData, settingsData] = await Promise.all([
        base44.entities.Post.filter({ published: true, category: "artwork" }, "-created_date"),
        base44.entities.SiteSettings.filter({ page: "artwork" })
      ]);
      const sorted = [
        ...postsData.filter(p => p.pinned).sort((a, b) => (a.pin_order ?? 0) - (b.pin_order ?? 0)),
        ...postsData.filter(p => !p.pinned)
      ];
      setPosts(sorted);
      setSettings(settingsData[0] || { 
        tagline: "Creative Expressions", 
        message: "Explore my artistic creations and visual storytelling." 
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
          <p className="text-gray-600 dark:text-muted-foreground">Loading artwork...</p>
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadData}>
      <div>
        <section className="banner-transparent py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="banner-text text-4xl md:text-5xl font-bold mb-4">{settings?.tagline || "Creative Expressions"}</h1>
            <p className="banner-text-secondary text-xl">{settings?.message || "Explore my artistic creations and visual storytelling."}</p>
          </div>
        </section>

        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {posts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post, index) => (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Link to={createPageUrl(`Post?id=${post.id}`)}>
                      <div className="bg-white dark:bg-card rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow h-full flex flex-col">
                        {post.image_url && (
                          <div className="relative h-48 bg-gray-200 dark:bg-muted overflow-hidden">
                            <img src={post.image_url} alt={post.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                            {post.pinned && (
                              <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 p-1.5 rounded-full">
                                <Pin className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        )}
                        <div className="p-4 flex flex-col flex-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-foreground mb-2 line-clamp-2 hover:text-purple-600">{post.title}</h3>
                          <p className="text-gray-600 dark:text-muted-foreground text-sm mb-3 line-clamp-2">{stripHtmlTags(post.content).substring(0, 100)}...</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-muted-foreground mb-3 mt-auto">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(post.created_date), "MMM d, yyyy")}</span>
                          </div>
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {post.tags.slice(0, 2).map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs"><Tag className="w-2 h-2 mr-1" />{tag}</Badge>
                              ))}
                            </div>
                          )}
                          <span className="text-purple-600 hover:text-purple-800 font-medium text-sm inline-flex items-center gap-1">Read More <ArrowRight className="w-3 h-3" /></span>
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                ))}
              </div>
            ) : (
              <div className="text-center py-16"><div className="text-6xl mb-4">🎨</div><h3 className="text-2xl font-bold text-gray-800 dark:text-foreground mb-2">No artwork yet</h3><p className="text-gray-600 dark:text-muted-foreground">Check back soon for new creative content!</p></div>
            )}
          </div>
        </section>
      </div>
    </PullToRefresh>
  );
}