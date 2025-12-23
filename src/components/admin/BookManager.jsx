import React, { useState, useEffect } from "react";
import { Book } from "@/entities/Book";
import { Chapter } from "@/entities/Chapter";
import { Bookmark } from "@/entities/Bookmark";
import { User } from "@/entities/User";
import { Notification } from "@/entities/Notification";
import { UploadFile, SendEmail } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Save, X, Upload, BookOpen, FileText } from "lucide-react";
import ReactQuill from 'react-quill';

export default function BookManager({ onStatsUpdate }) {
  const [books, setBooks] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [isEditingBook, setIsEditingBook] = useState(false);
  const [isEditingChapter, setIsEditingChapter] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [editingChapter, setEditingChapter] = useState(null);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [bookFormData, setBookFormData] = useState({
    title: "",
    description: "",
    cover_image_url: "",
    published: true,
    order_index: 0
  });
  const [chapterFormData, setChapterFormData] = useState({
    book_id: "",
    title: "",
    content: "",
    chapter_number: 1,
    published: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    if (selectedBookId) {
      loadChapters(selectedBookId);
    }
  }, [selectedBookId]);

  const loadBooks = async () => {
    try {
      const data = await Book.list("order_index");
      setBooks(data);
    } catch (error) {
      console.error("Error loading books:", error);
    }
  };

  const loadChapters = async (bookId) => {
    try {
      const data = await Chapter.filter({ book_id: bookId }, "chapter_number");
      setChapters(data);
    } catch (error) {
      console.error("Error loading chapters:", error);
    }
  };

  const handleEditBook = (book) => {
    setEditingBook(book);
    setBookFormData({
      title: book.title,
      description: book.description,
      cover_image_url: book.cover_image_url || "",
      published: book.published,
      order_index: book.order_index || 0
    });
    setIsEditingBook(true);
  };

  const handleNewBook = () => {
    setEditingBook(null);
    setBookFormData({
      title: "",
      description: "",
      cover_image_url: "",
      published: true,
      order_index: books.length
    });
    setIsEditingBook(true);
  };

  const handleSaveBook = async () => {
    setIsLoading(true);
    try {
      if (editingBook) {
        await Book.update(editingBook.id, bookFormData);
      } else {
        await Book.create(bookFormData);
      }
      setIsEditingBook(false);
      loadBooks();
      onStatsUpdate?.();
    } catch (error) {
      console.error("Error saving book:", error);
    }
    setIsLoading(false);
  };

  const handleDeleteBook = async (bookId) => {
    if (!confirm("Are you sure? This will also delete all chapters in this book.")) return;
    
    try {
      // Delete all chapters first
      const bookChapters = await Chapter.filter({ book_id: bookId });
      for (const chapter of bookChapters) {
        await Chapter.delete(chapter.id);
      }
      
      await Book.delete(bookId);
      loadBooks();
      if (selectedBookId === bookId) {
        setSelectedBookId(null);
        setChapters([]);
      }
      onStatsUpdate?.();
    } catch (error) {
      console.error("Error deleting book:", error);
    }
  };

  const handleEditChapter = (chapter) => {
    setEditingChapter(chapter);
    setChapterFormData({
      book_id: chapter.book_id,
      title: chapter.title,
      content: chapter.content,
      chapter_number: chapter.chapter_number,
      published: chapter.published
    });
    setIsEditingChapter(true);
  };

  const handleNewChapter = (bookId) => {
    const nextChapterNumber = chapters.length > 0 
      ? Math.max(...chapters.map(c => c.chapter_number)) + 1 
      : 1;
      
    setEditingChapter(null);
    setChapterFormData({
      book_id: bookId,
      title: "",
      content: "",
      chapter_number: nextChapterNumber,
      published: true
    });
    setIsEditingChapter(true);
  };

  const notifyReaders = async (bookId, chapterTitle, isNewChapter = true) => {
    try {
      // Get all users who have bookmarked this book
      const bookmarks = await Bookmark.filter({ book_id: bookId });
      const userIds = [...new Set(bookmarks.map(b => b.user_id))];
      
      // Get user details for notification preferences
      const users = await User.list();
      const readersToNotify = users.filter(user => 
        userIds.includes(user.id) && 
        user.notification_preferences?.chapter_updates !== false
      );

      // Create notifications and send emails
      for (const user of readersToNotify) {
        const book = books.find(b => b.id === bookId);
        const message = isNewChapter 
          ? `A new chapter "${chapterTitle}" has been added to "${book?.title}"`
          : `Chapter "${chapterTitle}" in "${book?.title}" has been updated`;

        // Create notification
        await Notification.create({
          user_id: user.id,
          type: "chapter_update",
          title: isNewChapter ? "New Chapter Available!" : "Chapter Updated",
          message,
          related_id: bookId,
          action_url: `/Reader?bookId=${bookId}`
        });

        // Send email if enabled
        if (user.notification_preferences?.email_notifications && user.notification_email) {
          await SendEmail({
            to: user.notification_email,
            subject: isNewChapter ? "New Chapter Available!" : "Chapter Updated",
            body: `Hi ${user.username},

${message}

Continue reading: ${window.location.origin}/Reader?bookId=${bookId}

Happy reading!
Anamaria`
          });
        }
      }
    } catch (error) {
      console.error("Error notifying readers:", error);
    }
  };

  const handleSaveChapter = async () => {
    setIsLoading(true);
    try {
      const isNewChapter = !editingChapter;
      
      if (editingChapter) {
        await Chapter.update(editingChapter.id, chapterFormData);
      } else {
        await Chapter.create(chapterFormData);
      }
      
      // Notify readers about the new/updated chapter
      if (chapterFormData.published) {
        await notifyReaders(chapterFormData.book_id, chapterFormData.title, isNewChapter);
      }
      
      setIsEditingChapter(false);
      loadChapters(chapterFormData.book_id);
      onStatsUpdate?.();
    } catch (error) {
      console.error("Error saving chapter:", error);
    }
    setIsLoading(false);
  };

  const handleDeleteChapter = async (chapterId) => {
    if (!confirm("Are you sure you want to delete this chapter?")) return;
    
    try {
      await Chapter.delete(chapterId);
      loadChapters(selectedBookId);
      onStatsUpdate?.();
    } catch (error) {
      console.error("Error deleting chapter:", error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await UploadFile({ file });
      setBookFormData(prev => ({ ...prev, cover_image_url: file_url }));
    } catch (error) {
      console.error("Error uploading image:", error);
    }
    setUploadingImage(false);
  };

  if (isEditingBook) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {editingBook ? "Edit Book" : "Create New Book"}
          </h3>
          <Button variant="outline" onClick={() => setIsEditingBook(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>

        <div className="grid gap-6">
          <div>
            <Label htmlFor="book-title">Title</Label>
            <Input
              id="book-title"
              value={bookFormData.title}
              onChange={(e) => setBookFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Book title"
            />
          </div>

          <div>
            <Label htmlFor="book-description">Description</Label>
            <Textarea
              id="book-description"
              value={bookFormData.description}
              onChange={(e) => setBookFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Book description"
              rows={4}
            />
          </div>

          <div>
            <Label>Cover Image</Label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="cover-upload"
              />
              <label htmlFor="cover-upload">
                <Button variant="outline" asChild disabled={uploadingImage}>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingImage ? "Uploading..." : "Upload Cover"}
                  </span>
                </Button>
              </label>
              {bookFormData.cover_image_url && (
                <img 
                  src={bookFormData.cover_image_url} 
                  alt="Cover preview" 
                  className="w-16 h-20 object-cover rounded"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="order-index">Display Order</Label>
              <Input
                id="order-index"
                type="number"
                value={bookFormData.order_index}
                onChange={(e) => setBookFormData(prev => ({ ...prev, order_index: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="book-published"
                checked={bookFormData.published}
                onChange={(e) => setBookFormData(prev => ({ ...prev, published: e.target.checked }))}
              />
              <Label htmlFor="book-published">Published</Label>
            </div>
          </div>

          <Button onClick={handleSaveBook} disabled={isLoading || !bookFormData.title}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "Saving..." : "Save Book"}
          </Button>
        </div>
      </div>
    );
  }

  if (isEditingChapter) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {editingChapter ? "Edit Chapter" : "Create New Chapter"}
          </h3>
          <Button variant="outline" onClick={() => setIsEditingChapter(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>

        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="chapter-title">Chapter Title</Label>
              <Input
                id="chapter-title"
                value={chapterFormData.title}
                onChange={(e) => setChapterFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Chapter title"
              />
            </div>
            <div>
              <Label htmlFor="chapter-number">Chapter Number</Label>
              <Input
                id="chapter-number"
                type="number"
                value={chapterFormData.chapter_number}
                onChange={(e) => setChapterFormData(prev => ({ ...prev, chapter_number: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="chapter-content">Content</Label>
            <div className="mt-2">
              <ReactQuill
                theme="snow"
                value={chapterFormData.content}
                onChange={(content) => setChapterFormData(prev => ({ ...prev, content }))}
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'indent': '-1'}, { 'indent': '+1' }],
                    ['link'],
                    ['clean']
                  ]
                }}
                style={{ height: "400px", marginBottom: "50px" }}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="chapter-published"
              checked={chapterFormData.published}
              onChange={(e) => setChapterFormData(prev => ({ ...prev, published: e.target.checked }))}
            />
            <Label htmlFor="chapter-published">Published</Label>
          </div>

          <Button onClick={handleSaveChapter} disabled={isLoading || !chapterFormData.title}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "Saving..." : "Save Chapter"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Books & Stories Management</h3>
        <Button onClick={handleNewBook}>
          <Plus className="w-4 h-4 mr-2" />
          New Book
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Books List */}
        <div>
          <h4 className="font-medium mb-4">Books</h4>
          <div className="space-y-4">
            {books.map((book) => (
              <Card 
                key={book.id} 
                className={`cursor-pointer transition-colors ${
                  selectedBookId === book.id ? 'ring-2 ring-purple-500' : ''
                }`}
                onClick={() => setSelectedBookId(book.id)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <BookOpen className="w-4 h-4" />
                        <h5 className="font-semibold">{book.title}</h5>
                        <Badge variant={book.published ? "default" : "secondary"}>
                          {book.published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{book.description}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEditBook(book); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteBook(book.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {books.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No books created yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chapters List */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium">
              Chapters {selectedBookId && `(${books.find(b => b.id === selectedBookId)?.title})`}
            </h4>
            {selectedBookId && (
              <Button size="sm" onClick={() => handleNewChapter(selectedBookId)}>
                <Plus className="w-4 h-4 mr-2" />
                New Chapter
              </Button>
            )}
          </div>
          
          {selectedBookId ? (
            <div className="space-y-4">
              {chapters.map((chapter) => (
                <Card key={chapter.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm font-medium">Chapter {chapter.chapter_number}</span>
                          <h5 className="font-semibold">{chapter.title}</h5>
                          <Badge variant={chapter.published ? "default" : "secondary"}>
                            {chapter.published ? "Published" : "Draft"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {chapter.content.substring(0, 100).replace(/<[^>]*>/g, '')}...
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditChapter(chapter)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteChapter(chapter.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {chapters.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No chapters created yet.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Select a book to view its chapters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}