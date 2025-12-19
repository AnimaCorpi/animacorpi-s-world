import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function Reader() {
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [user, setUser] = useState(null);
  const [bookmark, setBookmark] = useState(null);
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
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link to={createPageUrl("Stories")}>
            <Button variant="ghost">Back to Stories</Button>
          </Link>
          <div className="text-center">
            <h1 className="font-bold text-gray-800">{book.title}</h1>
            <p className="text-sm text-gray-600">
              Chapter {currentChapter.chapter_number}: {currentChapter.title}
            </p>
          </div>
        </div>
      </header>

      {/* Reader Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="prose max-w-none mb-8" dangerouslySetInnerHTML={{ __html: currentChapter.content }} />
        <div className="flex justify-between">
          {previousChapter ? (
            <Button onClick={() => navigateToChapter(previousChapter.id)} variant="outline">Previous: {previousChapter.title}</Button>
          ) : <div />}
          {nextChapter ? (
            <Button onClick={() => navigateToChapter(nextChapter.id)}>Next: {nextChapter.title}</Button>
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