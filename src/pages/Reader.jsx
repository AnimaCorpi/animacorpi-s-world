import React, { useState, useEffect, useRef, useContext } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ReaderModeToggle from "../components/ReaderModeToggle";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, BookOpen, List } from "lucide-react";
import ReactionButton from "../components/ReactionButton";
import { throttle } from "lodash";
import { MainRefContext } from "@/lib/MainRefContext";

export default function Reader() {
  const mainRef = useContext(MainRefContext);
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [readingMode, setReadingMode] = useState('light');
  const scrollToTopRef = useRef(false);
  const scrollListenerRef = useRef(null);
  const saveScrollProgressRef = useRef(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('bookid');
    
    if (bookId) {
      loadBookData(bookId);
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (scrollToTopRef.current && mainRef?.current) {
      setTimeout(() => {
        mainRef.current.scrollTo(0, 0);
        scrollToTopRef.current = false;
      }, 0);
    }
  }, [currentChapter, mainRef]);

  useEffect(() => {
    if (!currentChapter || !user || !book) return;
    updateBookStatus('in_progress');
    updateBookmark();

    // Remove old listener if exists
    if (scrollListenerRef.current) {
      if (mainRef?.current) {
        mainRef.current.removeEventListener('scroll', scrollListenerRef.current);
      } else {
        window.removeEventListener('scroll', scrollListenerRef.current);
      }
    }

    const saveScrollProgress = throttle(async () => {
      const scrollPercentage = mainRef?.current ? (mainRef.current.scrollTop / mainRef.current.scrollHeight) * 100 : (window.scrollY / document.documentElement.scrollHeight) * 100;
      
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

    saveScrollProgressRef.current = saveScrollProgress;
    scrollListenerRef.current = () => saveScrollProgress();
    if (mainRef?.current) {
      mainRef.current.addEventListener('scroll', scrollListenerRef.current, { passive: true });
    } else {
      window.addEventListener('scroll', scrollListenerRef.current);
    }
    
    return () => {
      if (scrollListenerRef.current) {
        if (mainRef?.current) {
          mainRef.current.removeEventListener('scroll', scrollListenerRef.current);
        } else {
          window.removeEventListener('scroll', scrollListenerRef.current);
        }
      }
      saveScrollProgress.cancel();
    };
  }, [currentChapter, user, book, mainRef]);

  const loadBookData = async (bookId) => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlChapterId = urlParams.get('chapterid');
      
      const [bookData, chaptersData] = await Promise.all([
        base44.entities.Book.filter({ id: bookId }),
        base44.entities.Chapter.filter({ book_id: bookId, published: true }, "chapter_number")
      ]);

      if (bookData.length > 0) {
        setBook(bookData[0]);
        setChapters(chaptersData);

        // If chapterid in URL, navigate to that chapter
        if (urlChapterId) {
          const urlChapter = chaptersData.find(ch => ch.id === urlChapterId);
          if (urlChapter) {
            setCurrentChapter(urlChapter);
            setIsLoading(false);
            return;
          }
        }

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
                // If progress is 100%, go to next chapter at top
                if (bookmarks[0].progress_percentage >= 100) {
                  const currentIndex = chaptersData.findIndex(ch => ch.id === bookmarkedChapter.id);
                  const nextChapter = chaptersData[currentIndex + 1];
                  if (nextChapter) {
                    setCurrentChapter(nextChapter);
                    setIsLoading(false);
                    return;
                  }
                }
                // Otherwise, go to bookmarked chapter at saved position
                setCurrentChapter(bookmarkedChapter);
                setTimeout(() => {
                  if (mainRef?.current) {
                    const scrollPosition = (mainRef.current.scrollHeight * bookmarks[0].progress_percentage) / 100;
                    mainRef.current.scrollTo(0, scrollPosition);
                  } else {
                    const scrollPosition = (document.documentElement.scrollHeight * bookmarks[0].progress_percentage) / 100;
                    window.scrollTo(0, scrollPosition);
                  }
                }, 100);
                setIsLoading(false);
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

  const navigateToChapter = async (chapter) => {
    scrollToTopRef.current = true;
    // Flush any pending scroll progress save before navigating
    if (saveScrollProgressRef.current) {
      saveScrollProgressRef.current.flush();
    }
    setCurrentChapter(chapter);
    if (user && book) {
      try {
        const bookmarks = await base44.entities.Bookmark.filter({ user_id: user.id, book_id: book.id });
        if (bookmarks.length > 0) {
          await base44.entities.Bookmark.update(bookmarks[0].id, { chapter_id: chapter.id, progress_percentage: 0 });
        } else {
          await base44.entities.Bookmark.create({ user_id: user.id, book_id: book.id, chapter_id: chapter.id, progress_percentage: 0 });
        }
      } catch (error) {
        console.error("Error updating bookmark:", error);
      }
    }
    window.history.pushState({}, '', createPageUrl(`Reader?bookid=${book.id}&chapterid=${chapter.id}`));
  };

  const updateBookStatus = async (status) => {
    if (!book) return;
    try {
      await base44.entities.Book.update(book.id, { status });
      setBook(prev => ({ ...prev, status }));
    } catch (error) {
      console.error('Error updating book status:', error);
    }
  };

  const updateBookmark = async () => {
    if (!user || !book || !currentChapter) return;
    try {
      const existingBookmarks = await base44.entities.Bookmark.filter({ 
        user_id: user.id, 
        book_id: book.id 
      });
      if (existingBookmarks.length > 0) {
        await base44.entities.Bookmark.update(existingBookmarks[0].id, {
          chapter_id: currentChapter.id,
          progress_percentage: 0
        });
      } else {
        await base44.entities.Bookmark.create({
          user_id: user.id,
          book_id: book.id,
          chapter_id: currentChapter.id,
          progress_percentage: 0
        });
      }
    } catch (error) {
      console.error('Error updating bookmark:', error);
    }
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

  const handleNextChapter = () => {
    const next = getNextChapter();
    if (next) navigateToChapter(next);
  };

  const handlePreviousChapter = () => {
    const prev = getPreviousChapter();
    if (prev) navigateToChapter(prev);
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
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <Link to={createPageUrl(`ChapterList?bookid=${book.id}`)} className="flex items-center text-purple-600 hover:text-purple-800">
              <List className="w-4 h-4 mr-2" />
              Chapter List
            </Link>
            
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <ReaderModeToggle readingMode={readingMode} onModeChange={setReadingMode} />
              <div className="flex items-center text-sm text-gray-600 dark:text-muted-foreground shrink-0">
                <BookOpen className="w-4 h-4 mr-2" />
                Chapter {currentIndex + 1} of {chapters.length}
              </div>
              
              <Select value={currentChapter.id} onValueChange={(chapterId) => {
                const chapter = chapters.find(ch => ch.id === chapterId);
                if (chapter) navigateToChapter(chapter);
              }}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      Ch. {chapter.chapter_number}: {chapter.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-12 text-center">
          <p className="text-sm text-purple-600 font-medium mb-2">Chapter {currentIndex + 1}</p>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-foreground mb-4">{currentChapter.title}</h1>
          <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto"></div>
        </header>

        <div 
          className={`prose prose-lg max-w-none prose-headings:font-bold prose-p:leading-relaxed prose-a:text-purple-600 prose-strong:font-bold ${
            readingMode === 'light'
              ? 'dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-foreground prose-p:text-gray-700 dark:prose-p:text-foreground prose-strong:text-gray-900 dark:prose-strong:text-foreground bg-white dark:bg-background'
              : readingMode === 'sepia'
              ? 'bg-yellow-50 text-yellow-900 prose-headings:text-yellow-900 prose-p:text-yellow-900'
              : 'bg-gray-900 text-gray-100 prose-headings:text-gray-100 prose-p:text-gray-100 prose-strong:text-gray-100 prose-a:text-purple-400'
          } p-6 rounded-lg`}
          style={{
            backgroundColor: readingMode === 'light' ? undefined : readingMode === 'sepia' ? '#fef3c7' : '#111827',
            color: readingMode === 'light' ? undefined : readingMode === 'sepia' ? '#78350f' : '#f3f4f6'
          }}
          dangerouslySetInnerHTML={{ __html: currentChapter.content }}
        />

        {currentChapter.author_notes && (
          <div className="mt-12 p-6 border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-900/20 rounded">
            <h3 className="font-bold text-lg text-purple-900 dark:text-purple-300 mb-2">Author's Notes</h3>
            <p className="text-purple-800 dark:text-purple-200 whitespace-pre-wrap">{currentChapter.author_notes}</p>
          </div>
        )}

        <div className="mt-16 pt-8 border-t border-border">
          <div className="flex items-center mb-6">
            <ReactionButton contentId={currentChapter.id} contentType="chapter" user={user} />
            <span className="text-sm text-gray-500 dark:text-muted-foreground ml-1">Like this chapter</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {previousChapter ? (
              <Button 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={handlePreviousChapter}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous Chapter
              </Button>
            ) : <div className="w-full sm:w-auto"></div>}

            {nextChapter ? (
              <Button 
                className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                onClick={handleNextChapter}
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