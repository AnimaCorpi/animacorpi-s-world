import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Eye, EyeOff, CheckCircle, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

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
    <div className="min-h-screen">
      <section className="banner-transparent py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="dark:bg-black/40 dark:rounded-2xl dark:px-8 dark:py-6"
          >
            <div className="banner-text-container">
              <h1 className="banner-text text-4xl md:text-6xl font-bold mb-6">
                {settings?.tagline || "Explore My Stories"}
              </h1>
              <p className="banner-text-secondary text-xl md:text-2xl mb-8">
                {settings?.message || "Dive into worlds of imagination, one chapter at a time."}
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}