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
  const shouldRestoreScrollRef = useRef(false);
  const restoreScrollPositionRef = useRef(0);
  const saveScrollProgressRef = useRef(null);

  // Helper function to save/update user bookmark
  // Cache chapter in service worker for offline access
  const cacheChapterOffline = async (chapter) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_CHAPTER',
        url: `/api/chapter/${chapter.id}`,
        data: chapter
      });
      console.log('Chapter cached for offline:', chapter.title);
    }
  };

  const saveUserBookmark = async (chapterId, progressPercentage = 0) => {
    if (!user || !book) return;
    try {

  // Load book and chapter data on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('bookid');
    
    if (bookId) {
      loadBookData(bookId);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Restore scroll position only when continue=true flag is present and content is stable
  useEffect(() => {
    if (!mainRef?.current || !currentChapter || !shouldRestoreScrollRef.current) {
      return;
    }

    const targetPosition = restoreScrollPositionRef.current;
    if (targetPosition <= 0) {
      shouldRestoreScrollRef.current = false;
      return;
    }

    // Wait for content to render and stabilize
    let lastScrollHeight = 0;
    let stableCount = 0;
    const maxAttempts = 200;
    let attempts = 0;

    const attemptRestore = () => {
      if (!mainRef?.current) return;

      const currentScrollHeight = mainRef.current.scrollHeight;

      if (currentScrollHeight > 0 && currentScrollHeight === lastScrollHeight) {
        stableCount++;
      } else {
        stableCount = 0;
      }

      lastScrollHeight = currentScrollHeight;
      attempts++;

      // Once content is stable, scroll to saved position
      if (stableCount >= 8 || attempts >= maxAttempts) {
        const scrollPosition = (mainRef.current.scrollHeight * targetPosition) / 100;
        mainRef.current.scrollTo(0, scrollPosition);
        shouldRestoreScrollRef.current = false;
        restoreScrollPositionRef.current = 0;
      } else {
        setTimeout(attemptRestore, 50);
      }
    };

    setTimeout(attemptRestore, 300);
  }, [currentChapter, mainRef]);

  // Always scroll to top for new chapters (unless continue=true)
  useEffect(() => {
    if (!mainRef?.current || !currentChapter || shouldRestoreScrollRef.current) {
      return;
    }
    mainRef.current.scrollTo(0, 0);
  }, [currentChapter, mainRef]);

  // Set up scroll position save when chapter loads
  useEffect(() => {
    if (!currentChapter || !user || !book || !mainRef?.current) return;

    // Define throttled save function
    const saveScrollProgress = throttle(async () => {
      const scrollPercentage = (mainRef.current.scrollTop / mainRef.current.scrollHeight) * 100;
      await saveUserBookmark(currentChapter.id, scrollPercentage);
    }, 2000);

    saveScrollProgressRef.current = saveScrollProgress;
    mainRef.current.addEventListener('scroll', saveScrollProgress, { passive: true });
    
    return () => {
      mainRef.current?.removeEventListener('scroll', saveScrollProgress);
      saveScrollProgress.cancel();
    };
  }, [currentChapter, user, book, mainRef]);

  const loadBookData = async (bookId) => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlChapterId = urlParams.get('chapterid');
      const continueReading = urlParams.get('continue') === 'true';
      
      // Authenticate user FIRST
      let userData = null;
      try {
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (isAuthenticated) {
          userData = await base44.auth.me();
          setUser(userData);
        }
      } catch (error) {
        console.log("User not authenticated");
      }
      
      const [bookData, chaptersData] = await Promise.all([
        base44.entities.Book.filter({ id: bookId }),
        base44.entities.Chapter.filter({ book_id: bookId, published: true }, "chapter_number")
      ]);

      if (bookData.length > 0) {
        const book = bookData[0];
        setBook(book);
        setChapters(chaptersData);

        // Determine which chapter to load
        let initialChapter = null;
        let initialProgressPercentage = 0;

        // 1. Check for chapter ID in URL
        if (urlChapterId) {
          const urlChapter = chaptersData.find(ch => ch.id === urlChapterId);
          if (urlChapter) {
            initialChapter = urlChapter;
            // Only restore scroll if continue=true flag is present
            if (continueReading && userData?.id) {
              try {
                const bookmarks = await base44.entities.Bookmark.filter({
                  user_id: userData.id,
                  book_id: bookId
                });
                if (bookmarks.length > 0) {
                  initialProgressPercentage = bookmarks[0].progress_percentage || 0;
                }
              } catch (error) {
                console.error('Error fetching bookmark:', error);
              }
            }
          }
        }

        // 2. If no URL chapter, check for user's bookmark to auto-load last read chapter
        if (!initialChapter && userData?.id) {
          try {
            const bookmarks = await base44.entities.Bookmark.filter({
              user_id: userData.id,
              book_id: bookId
            });
            if (bookmarks.length > 0 && bookmarks[0].chapter_id) {
              const bookmarkedChapter = chaptersData.find(ch => ch.id === bookmarks[0].chapter_id);
              if (bookmarkedChapter) {
                initialChapter = bookmarkedChapter;
                initialProgressPercentage = bookmarks[0].progress_percentage || 0;
              }
            }
          } catch (error) {
            console.error('Error fetching bookmark:', error);
          }
        }

        // 3. Default to first chapter
        if (!initialChapter && chaptersData.length > 0) {
          initialChapter = chaptersData[0];
        }

        // Set the current chapter
        if (initialChapter) {
          // Only restore scroll if we have a saved position and continue=true
          if (continueReading && initialProgressPercentage > 0) {
            shouldRestoreScrollRef.current = true;
            restoreScrollPositionRef.current = initialProgressPercentage;
          }

          setCurrentChapter(initialChapter);

          // Update bookmark with new chapter
          if (userData?.id) {
            await saveUserBookmark(initialChapter.id, initialProgressPercentage);
          }

          // Cache the chapter for offline access
          await cacheChapterOffline(initialChapter);
        }
      }
    } catch (error) {
      console.error("Error loading book:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToChapter = async (chapter) => {
    // Flush any pending scroll save from previous chapter
    if (saveScrollProgressRef.current) {
      saveScrollProgressRef.current.flush();
    }
    
    // Update bookmark with new chapter ID, reset progress to 0 (top of chapter)
    await saveUserBookmark(chapter.id, 0);
    
    // Cache the chapter for offline access
    await cacheChapterOffline(chapter);
    
    // Update the UI to the new chapter
    setCurrentChapter(chapter);
    
    // Update URL (no continue=true flag, so it won't restore scroll)
    window.history.pushState({}, '', createPageUrl(`Reader?bookid=${book.id}&chapterid=${chapter.id}`));
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