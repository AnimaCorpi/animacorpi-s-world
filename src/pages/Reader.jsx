import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Settings, Type, Palette, Highlighter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export default function Reader() {
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [user, setUser] = useState(null);
  const [bookmark, setBookmark] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('readerFontSize') || 'medium');
  const [theme, setTheme] = useState(() => localStorage.getItem('readerTheme') || 'light');
  const [highlights, setHighlights] = useState([]);
  const [readProgress, setReadProgress] = useState(0);
  const contentRef = useRef(null);

  useEffect(() => {
    loadReaderData();
  }, []);

  useEffect(() => {
    if (currentChapter) {
      loadHighlights();
      const handleScroll = () => {
        if (contentRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
          const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
          setReadProgress(Math.min(progress, 100));
        }
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [currentChapter]);

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

      let chapter;
      if (chapterId) {
        chapter = chaptersData.find(c => c.id === chapterId);
      }
      if (!chapter && chaptersData.length > 0) {
        chapter = chaptersData[0];
      }
      setCurrentChapter(chapter);

      try {
        const userData = await base44.auth.me();
        setUser(userData);
        const userBookmarks = await base44.entities.Bookmark.filter({ user_id: userData.id, book_id: bookId });
        if (userBookmarks.length > 0) setBookmark(userBookmarks[0]);
      } catch (error) {
        setUser(null);
      }
    } catch (error) {
      console.error("Error loading reader data:", error);
    }
    setIsLoading(false);
  };

  const updateBookmark = async (chapterId) => {
    if (!book || !user) return;

    try {
      const currentChapterIndex = chapters.findIndex(c => c.id === chapterId);
      const progress = Math.round(((currentChapterIndex + 1) / chapters.length) * 100);

      if (bookmark) {
        await base44.entities.Bookmark.update(bookmark.id, { chapter_id: chapterId, progress_percentage: progress });
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
      updateBookmark(chapterId);
      window.history.pushState(null, null, `${createPageUrl("Reader")}?bookId=${book.id}&chapterId=${chapterId}`);
      window.scrollTo(0, 0);
      setReadProgress(0);
    }
  };

  const loadHighlights = () => {
    const stored = localStorage.getItem(`highlights_${currentChapter?.id}`);
    if (stored) {
      setHighlights(JSON.parse(stored));
    } else {
      setHighlights([]);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0) {
      const range = selection.getRangeAt(0);
      const highlight = {
        id: Date.now(),
        text: selectedText,
        color: '#fef08a',
        timestamp: new Date().toISOString()
      };
      
      const newHighlights = [...highlights, highlight];
      setHighlights(newHighlights);
      localStorage.setItem(`highlights_${currentChapter.id}`, JSON.stringify(newHighlights));
      
      selection.removeAllRanges();
    }
  };

  const removeHighlight = (highlightId) => {
    const newHighlights = highlights.filter(h => h.id !== highlightId);
    setHighlights(newHighlights);
    localStorage.setItem(`highlights_${currentChapter.id}`, JSON.stringify(newHighlights));
  };

  const changeFontSize = (size) => {
    setFontSize(size);
    localStorage.setItem('readerFontSize', size);
  };

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('readerTheme', newTheme);
  };

  const getCurrentChapterIndex = () => chapters.findIndex(c => c.id === currentChapter?.id);
  const getPreviousChapter = () => { const i = getCurrentChapterIndex(); return i > 0 ? chapters[i-1] : null; }
  const getNextChapter = () => { const i = getCurrentChapterIndex(); return i < chapters.length-1 ? chapters[i+1] : null; }

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading story...</p>
      </div>
    </div>
  );

  if (!book || !currentChapter) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Story Not Found</h1>
        <Link to={createPageUrl("Stories")}>
          <Button>Return to Stories</Button>
        </Link>
      </div>
    </div>
  );

  const previousChapter = getPreviousChapter();
  const nextChapter = getNextChapter();

  const fontSizes = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
    'extra-large': 'text-xl'
  };

  const themes = {
    light: { bg: 'bg-white', text: 'text-gray-900', content: 'bg-white' },
    dark: { bg: 'bg-gray-900', text: 'text-gray-100', content: 'bg-gray-800' },
    sepia: { bg: 'bg-amber-50', text: 'text-amber-900', content: 'bg-amber-50' }
  };

  const currentTheme = themes[theme];

  return (
    <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text}`}>
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
        <div 
          className="h-full bg-purple-500 transition-all duration-300"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      {/* Header */}
      <header className={`${currentTheme.content} border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} sticky top-0 z-10 pt-1`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link to={createPageUrl("Stories")}>
            <Button variant="ghost">Back to Stories</Button>
          </Link>
          <div className="text-center flex-1 mx-4">
            <h1 className="font-bold">{book.title}</h1>
            <p className="text-sm opacity-70">
              Chapter {currentChapter.chapter_number}: {currentChapter.title}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center">
                <Type className="w-4 h-4 mr-2" />
                Font Size
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => changeFontSize('small')}>
                {fontSize === 'small' && '✓ '} Small
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeFontSize('medium')}>
                {fontSize === 'medium' && '✓ '} Medium
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeFontSize('large')}>
                {fontSize === 'large' && '✓ '} Large
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeFontSize('extra-large')}>
                {fontSize === 'extra-large' && '✓ '} Extra Large
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuLabel className="flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                Theme
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => changeTheme('light')}>
                {theme === 'light' && '✓ '} Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeTheme('dark')}>
                {theme === 'dark' && '✓ '} Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeTheme('sepia')}>
                {theme === 'sepia' && '✓ '} Sepia
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="flex items-center">
                <Highlighter className="w-4 h-4 mr-2" />
                Highlight Text
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={handleTextSelection}>
                Select text to highlight
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Reader Content */}
      <main className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${currentTheme.content}`} ref={contentRef}>
        {/* Highlights List */}
        {highlights.length > 0 && (
          <div className="mb-6 p-4 rounded-lg border" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
            <h3 className="font-semibold mb-2 flex items-center">
              <Highlighter className="w-4 h-4 mr-2" />
              Your Highlights ({highlights.length})
            </h3>
            <div className="space-y-2">
              {highlights.map(highlight => (
                <div key={highlight.id} className="flex justify-between items-start text-sm p-2 rounded" style={{ backgroundColor: highlight.color }}>
                  <span className="flex-1 text-gray-900">{highlight.text}</span>
                  <button 
                    onClick={() => removeHighlight(highlight.id)}
                    className="ml-2 text-red-600 hover:text-red-800 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div 
          className={`prose max-w-none mb-8 ${fontSizes[fontSize]} leading-relaxed`}
          style={{ color: theme === 'dark' ? '#e5e7eb' : theme === 'sepia' ? '#78350f' : '#111827' }}
          dangerouslySetInnerHTML={{ __html: currentChapter.content }} 
        />
        
        <div className="flex justify-between items-center">
          {previousChapter ? (
            <Button onClick={() => navigateToChapter(previousChapter.id)} variant="outline">
              Previous: {previousChapter.title}
            </Button>
          ) : <div />}
          {nextChapter ? (
            <Button onClick={() => navigateToChapter(nextChapter.id)}>
              Next: {nextChapter.title}
            </Button>
          ) : (
            <Link to={createPageUrl("Stories")}>
              <Button variant="outline">Explore More Stories</Button>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}