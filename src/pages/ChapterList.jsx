import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, PlayCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ChapterList() {
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [user, setUser] = useState(null);
  const [bookmark, setBookmark] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('bookid');
    
    if (bookId) {
      loadBookData(bookId);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadBookData = async (bookId) => {
    try {
      const [bookData, chaptersData] = await Promise.all([
        base44.entities.Book.filter({ id: bookId }),
        base44.entities.Chapter.filter({ book_id: bookId, published: true }, "chapter_number")
      ]);

      if (bookData.length > 0) {
        setBook(bookData[0]);
        setChapters(chaptersData);

        try {
          const isAuthenticated = await base44.auth.isAuthenticated();
          if (isAuthenticated) {
            const userData = await base44.auth.me();
            setUser(userData);
            
            const bookmarks = await base44.entities.Bookmark.filter({ 
              user_id: userData.id, 
              book_id: bookId 
            });

            if (bookmarks.length > 0) {
              setBookmark(bookmarks[0]);
            }
          }
        } catch (error) {
          console.log("User not authenticated");
        }
      }
    } catch (error) {
      console.error("Error loading book:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chapters...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">Book not found.</p>
          <Link to={createPageUrl("Stories")}>
            <Button>Back to Stories</Button>
          </Link>
        </div>
      </div>
    );
  }

  const bookmarkedChapter = bookmark ? chapters.find(ch => ch.id === bookmark.chapter_id) : null;

  return (
    <div className="min-h-screen">
      <section className="banner-transparent py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link to={createPageUrl("Stories")} className="inline-flex items-center text-purple-600 hover:text-purple-800 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Stories
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex flex-col md:flex-row gap-8">
              {book.cover_image_url && (
                <div className="w-full md:w-64 shrink-0">
                  <img 
                    src={book.cover_image_url} 
                    alt={book.title}
                    className="w-full h-auto rounded-lg shadow-xl"
                  />
                </div>
              )}
              
              <div className="flex-1">
                <div className="banner-text-container">
                  <div className="flex items-start gap-3 mb-4">
                    <h1 className="banner-text text-4xl md:text-5xl font-bold flex-1">
                      {book.title}
                    </h1>
                    {book.is_nsfw && (
                      <Badge variant="destructive" className="text-sm">
                        NSFW
                      </Badge>
                    )}
                  </div>
                  <p className="banner-text-secondary text-lg md:text-xl mb-6">
                    {book.description}
                  </p>
                  
                  {bookmarkedChapter && (
                    <Link to={createPageUrl(`Reader?bookid=${book.id}&chapterid=${bookmarkedChapter.id}`)}>
                      <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 mb-4">
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Continue Reading: {bookmarkedChapter.title}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-purple-600" />
            Chapters ({chapters.length})
          </h2>

          <div className="space-y-4">
            {chapters.map((chapter, index) => (
              <motion.div
                key={chapter.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link to={createPageUrl(`Reader?bookid=${book.id}&chapterid=${chapter.id}`)}>
                  <Card className="card-hover">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-medium text-purple-600">
                              Chapter {chapter.chapter_number}
                            </span>
                            {bookmark && bookmark.chapter_id === chapter.id && (
                              <Badge variant="outline" className="text-xs">
                                Currently Reading
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900">
                            {chapter.title}
                          </h3>
                        </div>
                        <PlayCircle className="w-6 h-6 text-purple-600 shrink-0 ml-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          {chapters.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-800 mb-2">No Chapters Yet</h3>
              <p className="text-gray-600">Chapters are being prepared. Check back soon!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}