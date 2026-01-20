import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { throttle } from "lodash";

export default function Reader() {
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('bookId');
    
    if (bookId) {
      loadBookData(bookId);
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentChapter || !user || !book) return;

    const saveScrollProgress = throttle(async () => {
      const scrollPercentage = (window.scrollY / document.documentElement.scrollHeight) * 100;
      
      try {
        const existingBookmarks = await base44.entities.Bookmark.filter({ 
          user_id: user.id, 
          book_id: book.id 
        });

        if (existingBookmarks.length > 0) {
          await base44.entities.Bookmark.update(existingBookmarks[0].id, {
            chapter_id: currentChapter.id,
            progress_percentage: scrollPercentage
          });
        } else {
          await base44.entities.Bookmark.create({
            user_id: user.id,
            book_id: book.id,
            chapter_id: currentChapter.id,
            progress_percentage: scrollPercentage
          });
        }
      } catch (error) {
        console.error("Error saving progress:", error);
      }
    }, 2000);

    window.addEventListener('scroll', saveScrollProgress);
    return () => {
      window.removeEventListener('scroll', saveScrollProgress);
      saveScrollProgress.cancel();
    };
  }, [currentChapter, user, book]);

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

            if (bookmarks.length > 0 && bookmarks[0].chapter_id) {
              const bookmarkedChapter = chaptersData.find(ch => ch.id === bookmarks[0].chapter_id);
              if (bookmarkedChapter) {
                setCurrentChapter(bookmarkedChapter);
                setTimeout(() => {
                  const scrollPosition = (document.documentElement.scrollHeight * bookmarks[0].progress_percentage) / 100;
                  window.scrollTo(0, scrollPosition);
                }, 100);
                return;
              }
            }
          }
        } catch (error) {
          console.log("User not authenticated");
        }

        if (chaptersData.length > 0) {
          setCurrentChapter(chaptersData[0]);
        }
      }
    } catch (error) {
      console.error("Error loading book:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToChapter = (chapter) => {
    setCurrentChapter(chapter);
    window.scrollTo(0, 0);
    window.history.pushState({}, '', createPageUrl(`Reader?bookId=${book.id}&chapterId=${chapter.id}`));
  };

  const getCurrentChapterIndex = () => {
    return chapters.findIndex(ch => ch.id === currentChapter?.id);
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
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!book || !currentChapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">Book or chapter not found.</p>
          <Link to={createPageUrl("Stories")}>
            <Button>Back to Stories</Button>
          </Link>
        </div>
      </div>
    );
  }

  const previousChapter = getPreviousChapter();
  const nextChapter = getNextChapter();
  const currentIndex = getCurrentChapterIndex();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to={createPageUrl("Stories")} className="flex items-center text-purple-600 hover:text-purple-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Stories
            </Link>
            <div className="flex items-center text-sm text-gray-600">
              <BookOpen className="w-4 h-4 mr-2" />
              {book.title} - Chapter {currentIndex + 1} of {chapters.length}
            </div>
          </div>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-12 text-center">
          <p className="text-sm text-purple-600 font-medium mb-2">Chapter {currentIndex + 1}</p>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{currentChapter.title}</h1>
          <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto"></div>
        </header>

        <div 
          className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-purple-600 prose-strong:text-gray-900"
          dangerouslySetInnerHTML={{ __html: currentChapter.content }}
        />

        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {previousChapter ? (
              <Button 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={() => navigateToChapter(previousChapter)}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous Chapter
              </Button>
            ) : <div className="w-full sm:w-auto"></div>}

            {nextChapter ? (
              <Button 
                className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                onClick={() => navigateToChapter(nextChapter)}
              >
                Next Chapter
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Link to={createPageUrl("Stories")} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Back to Stories
                </Button>
              </Link>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}