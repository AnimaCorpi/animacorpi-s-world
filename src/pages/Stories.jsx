import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Eye, EyeOff, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import PullToRefresh from "../components/PullToRefresh";

export default function Stories() {
  const [books, setBooks] = useState([]);
  const [settings, setSettings] = useState(null);
  const [showNSFW, setShowNSFW] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadBookmarks();
    }
  }, [user?.id]);

  const loadData = async () => {
    try {
      const [booksData, settingsData] = await Promise.all([
        base44.entities.Book.filter({ published: true }, "order_index"),
        base44.entities.SiteSettings.filter({ page: "stories" })
      ]);
      
      setBooks(booksData);
      setSettings(settingsData[0] || {
        tagline: "Explore My Stories",
        message: "Dive into worlds of imagination, one chapter at a time."
      });

      try {
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (isAuthenticated) {
          const userData = await base44.auth.me();
          setUser(userData);
          if (userData.role === 'admin' || calculateAge(userData.birthdate) >= 18) {
            setShowNSFW(true);
          }
        }
      } catch (error) {
        console.log("User not authenticated");
      }
    } catch (error) {
      console.error("Error loading stories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBookmarks = async () => {
    try {
      const bookmarkData = await base44.entities.Bookmark.filter({ user_id: user.id });
      setBookmarks(bookmarkData);
    } catch (error) {
      console.error("Error loading bookmarks:", error);
    }
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

  const filteredBooks = books.filter(book => {
    if (!user || !user.birthdate) {
      return !book.is_nsfw;
    }
    const isAdmin = user.role === 'admin';
    const userAge = calculateAge(user.birthdate);
    
    if (isAdmin) return true;
    if (userAge < 18) return !book.is_nsfw;
    if (!showNSFW) return !book.is_nsfw;
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading stories...</p>
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadData}>
      <div>
        <section className="banner-transparent py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="banner-text text-4xl md:text-5xl font-bold mb-4">{settings?.tagline || "Explore My Stories"}</h1>
            <p className="banner-text-secondary text-xl">{settings?.message || "Dive into worlds of imagination, one chapter at a time."}</p>
          </div>
        </section>

        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {user && (user.role === 'admin' || (user.birthdate && calculateAge(user.birthdate) >= 18)) && (
              <div className="flex justify-end mb-6">
                <Button
                  variant="outline"
                  onClick={() => setShowNSFW(!showNSFW)}
                  className="flex items-center gap-2"
                >
                  {showNSFW ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {showNSFW ? "Hide NSFW" : "Show NSFW"}
                </Button>
              </div>
            )}

            {filteredBooks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBooks.map((book, index) => {
                  const bookmark = bookmarks.find(b => b.book_id === book.id);
                  return (
                    <motion.div
                      key={book.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Link to={createPageUrl(`ChapterList?id=${book.id}`)}>
                        <Card className="h-full hover:shadow-lg transition-shadow overflow-hidden">
                          {book.cover_image_url && (
                            <div className="relative h-48 bg-gray-200 dark:bg-muted overflow-hidden">
                              <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                            </div>
                          )}
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-lg font-bold text-foreground line-clamp-2 flex-1">{book.title}</h3>
                              {book.is_nsfw && <Badge variant="destructive" className="ml-2 text-xs shrink-0">NSFW</Badge>}
                            </div>
                            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{book.description}</p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <BookOpen className="w-3 h-3" />
                                <span>{book.status === 'completed' ? 'Completed' : book.status === 'in_progress' ? 'In Progress' : 'Not Started'}</span>
                              </div>
                              {bookmark && (
                                <div className="flex items-center gap-2 text-xs text-purple-600">
                                  <Clock className="w-3 h-3" />
                                  <span>{Math.round(bookmark.progress_percentage)}% read</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-foreground mb-2">No stories available</h3>
                <p className="text-muted-foreground">Check back soon for new stories!</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </PullToRefresh>
  );
}