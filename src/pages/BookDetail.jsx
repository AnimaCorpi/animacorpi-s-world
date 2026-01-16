import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowLeft, PlayCircle, ChevronRight } from "lucide-react";

export default function BookDetail() {
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [bookmark, setBookmark] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');
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
        base44.entities.Chapter.filter({ book_id: bookId }, "chapter_number")
      ]);

      if (bookData.length > 0) {
        setBook(bookData[0]);
        setChapters(chaptersData.filter(ch => ch.published));

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

  const handleStartReading = () => {
    if (bookmark && bookmark.chapter_id) {
      const chapter = chapters.find(ch => ch.id === bookmark.chapter_id);
      if (chapter) {
        window.location.href = createPageUrl(`ChapterReader?bookId=${book.id}&chapterId=${chapter.id}`);
        return;
      }
    }
    
    if (chapters.length > 0) {
      window.location.href = createPageUrl(`ChapterReader?bookId=${book.id}&chapterId=${chapters[0].id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Book not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Link to={createPageUrl("Stories")} className="inline-flex items-center text-purple-600 hover:text-purple-800 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Stories
        </Link>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="md:col-span-1">
            {book.cover_image_url && (
              <div className="aspect-[2/3] overflow-hidden rounded-lg shadow-lg bg-gray-100">
                <img 
                  src={book.cover_image_url} 
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-4xl font-bold text-gray-900">{book.title}</h1>
              {book.is_nsfw && (
                <Badge variant="destructive">NSFW</Badge>
              )}
            </div>
            
            <div className="prose max-w-none mb-6">
              <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-wrap">
                {book.description}
              </p>
            </div>

            <Button 
              onClick={handleStartReading}
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              disabled={chapters.length === 0}
            >
              <PlayCircle className="w-5 h-5 mr-2" />
              {bookmark ? "Continue Reading" : "Start Reading"}
            </Button>

            {bookmark && (
              <p className="text-sm text-gray-600 mt-2">
                Last read: Chapter {chapters.findIndex(ch => ch.id === bookmark.chapter_id) + 1}
              </p>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="w-5 h-5 mr-2" />
              Table of Contents ({chapters.length} chapters)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chapters.length > 0 ? (
              <div className="space-y-2">
                {chapters.map((chapter, index) => (
                  <Link
                    key={chapter.id}
                    to={createPageUrl(`ChapterReader?bookId=${book.id}&chapterId=${chapter.id}`)}
                    className="block p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <span className="text-sm text-gray-500 font-medium">Chapter {index + 1}</span>
                        <h3 className="text-lg font-semibold text-gray-800">{chapter.title}</h3>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No chapters available yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}