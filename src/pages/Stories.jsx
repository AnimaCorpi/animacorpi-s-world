import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Stories() {
  const [books, setBooks] = useState([]);
  const [settings, setSettings] = useState(null);
  const [showNSFW, setShowNSFW] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

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
          <p className="text-gray-600">Loading stories...</p>
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

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {user && user.birthdate && (user.role === 'admin' || calculateAge(user.birthdate) >= 18) && (
            <div className="flex justify-end mb-6">
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

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBooks.map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Link to={createPageUrl(`ChapterList?bookid=${book.id}`)}>
                  <Card className="card-hover overflow-hidden h-full">
                    {book.cover_image_url && (
                      <div className="aspect-[2/3] overflow-hidden bg-gray-100">
                        <img 
                          src={book.cover_image_url} 
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-bold text-gray-800 line-clamp-2 flex-1">
                          {book.title}
                        </h3>
                        {book.is_nsfw && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            NSFW
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-600 line-clamp-4 mb-4">
                        {book.description}
                      </p>
                      <div className="flex items-center text-purple-600 font-medium">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Read Now
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          {filteredBooks.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-800 mb-2">No Stories Yet</h3>
              <p className="text-gray-600">Check back soon for new adventures!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}