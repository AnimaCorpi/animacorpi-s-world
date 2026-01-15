import React, { useState, useEffect, useRef } from "react";
import { Book } from "@/entities/Book";
import { Chapter } from "@/entities/Chapter";
import { Bookmark } from "@/entities/Bookmark";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { throttle } from "lodash";

export default function ChapterReader() {
  const [book, setBook] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [user, setUser] = useState(null);
  const [bookmark, setBookmark] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const contentRef = useRef(null);
  const hasRestoredScroll = useRef(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('bookId');
    const chapterId = urlParams.get('chapterId');
    
    if (bookId && chapterId) {
      loadChapterData(bookId, chapterId);
    }
  }, [window.location.search]);

  useEffect(() => {
    if (!chapter || !user || hasRestoredScroll.current) return;

    const restoreScrollPosition = async () => {
      try {
        const bookmarks = await Bookmark.filter({ 
          user_id: user.id, 
          book_id: book.id,
          chapter_id: chapter.id 
        });

        if (bookmarks.length > 0 && bookmarks[0].progress_percentage) {
          const scrollPosition = (document.documentElement.scrollHeight * bookmarks[0].progress_percentage) / 100;
          window.scrollTo(0, scrollPosition);
          hasRestoredScroll.current = true;
        }
      } catch (error) {
        console.error("Error restoring scroll:", error);
      }
    };

    setTimeout(restoreScrollPosition, 100);
  }, [chapter, user, book]);

  useEffect(() => {
    if (!chapter || !user) return;

    const saveScrollProgress = throttle(async () => {
      const scrollPercentage = (window.scrollY / document.documentElement.scrollHeight) * 100;
      
      try {
        const existingBookmarks = await Bookmark.filter({ 
          user_id: user.id, 
          book_id: book.id 
        });

        if (existingBookmarks.length > 0) {
          await Bookmark.update(existingBookmarks[0].id, {
            chapter_id: chapter.id,
            progress_percentage: scrollPercentage
          });
        } else {
          await Bookmark.create({
            user_id: user.id,
            book_id: book.id,
            chapter_id: chapter.id,
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
  }, [chapter, user, book]);

  const loadChapterData = async (bookId, chapterId) => {
    setIsLoading(true);
    hasRestoredScroll.current = false;

    try {
      const [bookData, chapterData, chaptersData] = await Promise.all([
        Book.filter({ id: bookId }),
        Chapter.filter({ id: chapterId }),
        Chapter.filter({ book_id: bookId }, "chapter_number")
      ]);

      if (bookData.length > 0 && chapterData.length > 0) {
        setBook(bookData[0]);
        setChapter(chapterData[0]);
        setChapters(chaptersData.filter(ch => ch.published));

        try {
          const isAuthenticated = await base44.auth.isAuthenticated();
          if (isAuthenticated) {
            const userData = await base44.auth.me();
            setUser(userData);

            const bookmarks = await Bookmark.filter({ 
              user_id: userData.id, 
              book_id: bookId 
            });
            if (bookmarks.length > 0) {
              setBookmark(bookmarks[0]);
            }
          }
        } catch (error) {
          setUser(null);
        }
      }
    } catch (error) {
      console.error("Error loading chapter:", error);
    }
    setIsLoading(false);
  };

  const getCurrentChapterIndex = () => {
    return chapters.findIndex(ch => ch.id === chapter?.id);
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

  if (!chapter || !book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Chapter not found.</p>
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
            <Link to={createPageUrl(`BookDetail?id=${book.id}`)} className="flex items-center text-purple-600 hover:text-purple-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to {book.title}
            </Link>
            <div className="flex items-center text-sm text-gray-600">
              <BookOpen className="w-4 h-4 mr-2" />
              Chapter {currentIndex + 1} of {chapters.length}
            </div>
          </div>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-12 text-center">
          <p className="text-sm text-purple-600 font-medium mb-2">Chapter {currentIndex + 1}</p>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{chapter.title}</h1>
          <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto"></div>
        </header>

        <div 
          ref={contentRef}
          className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-purple-600 prose-strong:text-gray-900"
          dangerouslySetInnerHTML={{ __html: chapter.content }}
        />

        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {previousChapter ? (
              <Link to={createPageUrl(`ChapterReader?bookId=${book.id}&chapterId=${previousChapter.id}`)} className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous Chapter
                </Button>
              </Link>
            ) : <div className="w-full sm:w-auto"></div>}

            {nextChapter ? (
              <Link to={createPageUrl(`ChapterReader?bookId=${book.id}&chapterId=${nextChapter.id}`)} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  Next Chapter
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <Link to={createPageUrl(`BookDetail?id=${book.id}`)} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Back to Book
                </Button>
              </Link>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}