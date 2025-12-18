import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  BookOpen, 
  Clock,
  CheckCircle,
  Play
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ChapterIndex() {
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [user, setUser] = useState(null);
  const [bookmark, setBookmark] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('bookId');

    console.log('[ChapterIndex] Loading data with bookId:', bookId);
    console.log('[ChapterIndex] Full URL:', window.location.href);
    console.log('[ChapterIndex] Search params:', window.location.search);

    if (!bookId) {
      console.error('[ChapterIndex] ERROR: No bookId in URL params - redirecting to Stories');
      window.location.href = createPageUrl("Stories");
      return;
    }

    try {
      console.log('[ChapterIndex] Fetching book data for ID:', bookId);
      
      const [bookData, chaptersData] = await Promise.all([
        base44.entities.Book.filter({ id: bookId, published: true }),
        base44.entities.Chapter.filter({ book_id: bookId, published: true }, "chapter_number")
      ]);

      console.log('[ChapterIndex] Book data received:', bookData);
      console.log('[ChapterIndex] Chapters data received:', chaptersData);

      if (bookData.length === 0) {
        console.error('[ChapterIndex] ERROR: No book found with ID:', bookId, '- redirecting to Stories');
        window.location.href = createPageUrl("Stories");
        return;
      }

      console.log('[ChapterIndex] Successfully loaded book:', bookData[0]);
      setBook(bookData[0]);
      setChapters(chaptersData);

      // Load user data and bookmark
      try {
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (isAuthenticated) {
          const userData = await base44.auth.me();
          setUser(userData);
          const userBookmarks = await base44.entities.Bookmark.filter({ 
            user_id: userData.id, 
            book_id: bookId 
          });
          if (userBookmarks.length > 0) {
            setBookmark(userBookmarks[0]);
          }
        }
      } catch (error) {
        setUser(null);
      }
    } catch (error) {
      console.error('[ChapterIndex] CRITICAL ERROR loading data:', error);
      console.error('[ChapterIndex] Error details:', {
        message: error.message,
        stack: error.stack,
        bookId: urlParams.get('bookId')
      });
      // Don't redirect on error - show error state instead
    }
    setIsLoading(false);
  };

  const getBookmarkedChapter = () => {
    if (!bookmark || !bookmark.chapter_id) return null;
    return chapters.find(c => c.id === bookmark.chapter_id);
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

  if (!book && !isLoading) {
    console.log('[ChapterIndex] Rendering not found state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Story Not Found</h1>
          <p className="text-gray-600 mb-4">The requested story could not be loaded.</p>
          <p className="text-sm text-gray-500 mb-6">Book ID: {new URLSearchParams(window.location.search).get('bookId')}</p>
          <Link to={createPageUrl("Stories")}>
            <Button>Return to Stories</Button>
          </Link>
        </div>
      </div>
    );
  }

  const bookmarkedChapter = getBookmarkedChapter();

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Stories")} className="inline-flex items-center text-purple-600 hover:text-purple-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Stories
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="md:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="aspect-[3/4] mb-4 overflow-hidden rounded-lg">
                  <img 
                    src={book.cover_image_url || 'https://placehold.co/600x800/f3e8ff/a855f7?text=Book+Cover'} 
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">{book.title}</h1>
                <p className="text-gray-600 text-sm mb-4">{book.description}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <BookOpen className="w-4 h-4 mr-2" />
                  {chapters.length} {chapters.length === 1 ? 'Chapter' : 'Chapters'}
                </div>
                {bookmark && (
                  <div className="mt-4 flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {bookmark.progress_percentage}% Complete
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Chapters
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bookmarkedChapter && (
                  <Alert className="mb-6 bg-purple-50 border-purple-200">
                    <Clock className="w-4 h-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>Continue from Chapter {bookmarkedChapter.chapter_number}: {bookmarkedChapter.title}</span>
                      <Link to={createPageUrl(`Reader?bookId=${book.id}&chapterId=${bookmarkedChapter.id}`)}>
                        <Button size="sm" className="ml-4 bg-purple-500 hover:bg-purple-600">
                          <Play className="w-4 h-4 mr-1" />
                          Resume
                        </Button>
                      </Link>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  {chapters.map((chapter) => (
                    <Link 
                      key={chapter.id} 
                      to={createPageUrl(`Reader?bookId=${book.id}&chapterId=${chapter.id}`)}
                      className="block"
                    >
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <Badge variant="outline">Chapter {chapter.chapter_number}</Badge>
                                {bookmark && bookmark.chapter_id === chapter.id && (
                                  <Badge className="bg-green-100 text-green-700 border-green-200">
                                    Current
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-semibold text-gray-800 mt-2">{chapter.title}</h3>
                            </div>
                            <ArrowLeft className="w-5 h-5 text-gray-400 transform rotate-180" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>

                {chapters.length === 0 && (
                  <div className="text-center py-8">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No chapters available yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}