import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  ArrowRight, 
  BookOpen, 
  Bookmark as BookmarkIcon,
  List,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Reader() {
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [user, setUser] = useState(null);
  const [bookmark, setBookmark] = useState(null);
  const [showChapterList, setShowChapterList] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReaderData();
  }, []);

  const loadReaderData = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('bookId');
    const chapterId = urlParams.get('chapterId');

    if (!bookId) {
      window.location.href = createPageUrl("Stories");
      return;
    }

    try {
      const [bookData, chaptersData] = await Promise.all([
        base44.entities.Book.filter({ id: bookId, published: true }),
        base44.entities.Chapter.filter({ book_id: bookId, published: true }, "chapter_number")
      ]);

      if (bookData.length === 0) {
        window.location.href = createPageUrl("Stories");
        return;
      }

      setBook(bookData[0]);
      setChapters(chaptersData);

      // Set current chapter
      let chapter;
      if (chapterId) {
        chapter = chaptersData.find(c => c.id === chapterId);
      }
      if (!chapter && chaptersData.length > 0) {
        chapter = chaptersData[0];
      }
      setCurrentChapter(chapter);

      // Load user data and bookmark
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        const userBookmarks = await base44.entities.Bookmark.filter({ 
          user_id: userData.id, 
          book_id: bookId 
        });
        if (userBookmarks.length > 0) {
          setBookmark(userBookmarks[0]);
        }
      } catch (error) {
        setUser(null);
      }
    } catch (error) {
      console.error("Error loading reader data:", error);
    }
    setIsLoading(false);
  };

  const updateBookmark = async (chapterId) => {
    if (!user || !book) return;

    try {
      const currentChapterIndex = chapters.findIndex(c => c.id === chapterId);
      const progress = Math.round(((currentChapterIndex + 1) / chapters.length) * 100);

      if (bookmark) {
        await base44.entities.Bookmark.update(bookmark.id, {
          chapter_id: chapterId,
          progress_percentage: progress
        });
      } else {
        const newBookmark = await base44.entities.Bookmark.create({
          user_id: user.id,
          book_id: book.id,
          chapter_id: chapterId,
          progress_percentage: progress
        });
        setBookmark(newBookmark);
      }
    } catch (error) {
      console.error("Error updating bookmark:", error);
    }
  };

  const navigateToChapter = (chapterId) => {
    const chapter = chapters.find(c => c.id === chapterId);
    if (chapter) {
      setCurrentChapter(chapter);
      setShowChapterList(false);
      updateBookmark(chapterId);
      window.history.pushState(null, null, `${createPageUrl("Reader")}?bookId=${book.id}&chapterId=${chapterId}`);
    }
  };

  const getCurrentChapterIndex = () => {
    return chapters.findIndex(c => c.id === currentChapter?.id);
  };

  const getPreviousChapter = () => {
    const currentIndex = getCurrentChapterIndex();
    return currentIndex > 0 ? chapters[currentIndex - 1] : null;
  };

  const getNextChapter = () => {
    const currentIndex = getCurrentChapterIndex();
    return currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading story...</p>
        </div>
      </div>
    );
  }

  if (!book || !currentChapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Story Not Found</h1>
          <Link to={createPageUrl("Stories")}>
            <Button>Return to Stories</Button>
          </Link>
        </div>
      </div>
    );
  }

  const previousChapter = getPreviousChapter();
  const nextChapter = getNextChapter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to={createPageUrl(`ChapterIndex?bookId=${book.id}`)}>
              <Button variant="ghost" className="flex items-center">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Chapters
              </Button>
            </Link>
            
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <h1 className="font-bold text-gray-800">{book.title}</h1>
                <p className="text-sm text-gray-600">
                  Chapter {currentChapter.chapter_number}: {currentChapter.title}
                </p>
              </div>
              
              <Button
                variant="outline"
                onClick={() => setShowChapterList(!showChapterList)}
                className="flex items-center"
              >
                <List className="w-4 h-4 mr-2" />
                Chapters
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Chapter List Dropdown */}
      {showChapterList && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => navigateToChapter(chapter.id)}
                  className={`text-left p-3 rounded-lg transition-colors ${
                    currentChapter.id === chapter.id
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium">Chapter {chapter.chapter_number}</div>
                  <div className="text-sm text-gray-600 truncate">{chapter.title}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reader Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-lg">
          <CardContent className="p-8 md:p-12">
            <div className="prose prose-lg max-w-none">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <Badge className="mb-2">Chapter {currentChapter.chapter_number}</Badge>
                  <h1 className="text-3xl font-bold text-gray-800 mb-0">
                    {currentChapter.title}
                  </h1>
                </div>
                {user && (
                  <Button
                    variant="outline"
                    onClick={() => updateBookmark(currentChapter.id)}
                    className="flex items-center"
                  >
                    <BookmarkIcon className="w-4 h-4 mr-2" />
                    Bookmark
                  </Button>
                )}
              </div>
              
              <div 
                className="chapter-content"
                dangerouslySetInnerHTML={{ __html: currentChapter.content }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          {previousChapter ? (
            <Button
              onClick={() => navigateToChapter(previousChapter.id)}
              variant="outline"
              className="flex items-center"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous: {previousChapter.title}
            </Button>
          ) : (
            <div></div>
          )}

          {nextChapter ? (
            <Button
              onClick={() => navigateToChapter(nextChapter.id)}
              className="flex items-center bg-purple-500 hover:bg-purple-600"
            >
              Next: {nextChapter.title}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 mb-4">You've reached the end of this story!</p>
              <div className="flex gap-2 justify-center">
                <Link to={createPageUrl(`ChapterIndex?bookId=${book.id}`)}>
                  <Button variant="outline">View Chapters</Button>
                </Link>
                <Link to={createPageUrl("Stories")}>
                  <Button variant="outline">Explore More Stories</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}