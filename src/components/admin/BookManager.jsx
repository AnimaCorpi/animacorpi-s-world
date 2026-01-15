import React, { useState, useEffect } from "react";
import { Book } from "@/entities/Book";
import { Chapter } from "@/entities/Chapter";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  BookOpen, 
  Upload,
  FileText,
  ChevronDown,
  ChevronUp,
  GripVertical
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function BookManager({ onStatsUpdate }) {
  const [books, setBooks] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [isEditingBook, setIsEditingBook] = useState(false);
  const [isEditingChapter, setIsEditingChapter] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);
  const [expandedBook, setExpandedBook] = useState(null);
  const [bookForm, setBookForm] = useState({
    title: '',
    description: '',
    cover_image_url: '',
    published: true,
    is_nsfw: false,
    order_index: 0
  });
  const [chapterForm, setChapterForm] = useState({
    title: '',
    content: '',
    chapter_number: 1,
    published: true
  });
  const [uploadingCover, setUploadingCover] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const booksData = await Book.list("order_index");
      setBooks(booksData);
      if (onStatsUpdate) onStatsUpdate();
    } catch (error) {
      console.error("Error loading books:", error);
    }
  };

  const loadChapters = async (bookId) => {
    try {
      const chaptersData = await Chapter.filter({ book_id: bookId }, "chapter_number");
      setChapters(chaptersData);
    } catch (error) {
      console.error("Error loading chapters:", error);
    }
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedBook) {
        await Book.update(selectedBook.id, bookForm);
        showAlert("Book updated successfully!", "success");
      } else {
        await Book.create(bookForm);
        showAlert("Book created successfully!", "success");
      }
      resetBookForm();
      loadBooks();
    } catch (error) {
      showAlert("Error saving book: " + error.message, "error");
    }
  };

  const handleChapterSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingChapter) {
        await Chapter.update(editingChapter.id, chapterForm);
        showAlert("Chapter updated successfully!", "success");
      } else {
        await Chapter.create({
          ...chapterForm,
          book_id: expandedBook
        });
        showAlert("Chapter created successfully!", "success");
      }
      resetChapterForm();
      loadChapters(expandedBook);
    } catch (error) {
      showAlert("Error saving chapter: " + error.message, "error");
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!confirm("Delete this book and all its chapters?")) return;
    try {
      const bookChapters = await Chapter.filter({ book_id: bookId });
      await Promise.all(bookChapters.map(ch => Chapter.delete(ch.id)));
      await Book.delete(bookId);
      showAlert("Book deleted successfully!", "success");
      loadBooks();
    } catch (error) {
      showAlert("Error deleting book: " + error.message, "error");
    }
  };

  const handleDeleteChapter = async (chapterId) => {
    if (!confirm("Delete this chapter?")) return;
    try {
      await Chapter.delete(chapterId);
      showAlert("Chapter deleted successfully!", "success");
      loadChapters(expandedBook);
    } catch (error) {
      showAlert("Error deleting chapter: " + error.message, "error");
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setBookForm({ ...bookForm, cover_image_url: result.file_url });
      showAlert("Cover uploaded successfully!", "success");
    } catch (error) {
      showAlert("Error uploading cover: " + error.message, "error");
    }
    setUploadingCover(false);
  };

  const handleEditBook = (book) => {
    setSelectedBook(book);
    setBookForm({
      title: book.title,
      description: book.description,
      cover_image_url: book.cover_image_url || '',
      published: book.published,
      is_nsfw: book.is_nsfw,
      order_index: book.order_index
    });
    setIsEditingBook(true);
  };

  const handleEditChapter = (chapter) => {
    setEditingChapter(chapter);
    setChapterForm({
      title: chapter.title,
      content: chapter.content,
      chapter_number: chapter.chapter_number,
      published: chapter.published
    });
    setIsEditingChapter(true);
  };

  const resetBookForm = () => {
    setBookForm({
      title: '',
      description: '',
      cover_image_url: '',
      published: true,
      is_nsfw: false,
      order_index: books.length
    });
    setSelectedBook(null);
    setIsEditingBook(false);
  };

  const resetChapterForm = () => {
    setChapterForm({
      title: '',
      content: '',
      chapter_number: chapters.length + 1,
      published: true
    });
    setEditingChapter(null);
    setIsEditingChapter(false);
  };

  const toggleBookExpansion = async (bookId) => {
    if (expandedBook === bookId) {
      setExpandedBook(null);
      setChapters([]);
    } else {
      setExpandedBook(bookId);
      await loadChapters(bookId);
    }
  };

  const handleChapterReorder = async (result) => {
    if (!result.destination) return;

    const reorderedChapters = Array.from(chapters);
    const [movedChapter] = reorderedChapters.splice(result.source.index, 1);
    reorderedChapters.splice(result.destination.index, 0, movedChapter);

    setChapters(reorderedChapters);

    try {
      await Promise.all(
        reorderedChapters.map((chapter, index) =>
          Chapter.update(chapter.id, { chapter_number: index + 1 })
        )
      );
      showAlert("Chapters reordered successfully!", "success");
    } catch (error) {
      showAlert("Error reordering chapters: " + error.message, "error");
      loadChapters(expandedBook);
    }
  };

  const showAlert = (message, type) => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };

  return (
    <div className="space-y-6">
      {alert && (
        <Alert className={alert.type === 'error' ? 'border-red-500' : 'border-green-500'}>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Books & Stories Management</h2>
        <Button onClick={() => setIsEditingBook(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Book
        </Button>
      </div>

      {isEditingBook && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedBook ? 'Edit Book' : 'Create New Book'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBookSubmit} className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Description / Blurb</Label>
                <Textarea
                  value={bookForm.description}
                  onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                  rows={5}
                  required
                />
              </div>

              <div>
                <Label>Cover Image</Label>
                <div className="flex gap-4 items-start">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    disabled={uploadingCover}
                  />
                  {bookForm.cover_image_url && (
                    <img src={bookForm.cover_image_url} className="w-24 h-32 object-cover rounded" alt="Cover" />
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={bookForm.published}
                    onCheckedChange={(checked) => setBookForm({ ...bookForm, published: checked })}
                  />
                  <Label>Published</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={bookForm.is_nsfw}
                    onCheckedChange={(checked) => setBookForm({ ...bookForm, is_nsfw: checked })}
                  />
                  <Label>NSFW</Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {selectedBook ? 'Update Book' : 'Create Book'}
                </Button>
                <Button type="button" variant="outline" onClick={resetBookForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {books.map((book) => (
          <Card key={book.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {book.cover_image_url && (
                    <img src={book.cover_image_url} className="w-16 h-24 object-cover rounded" alt={book.title} />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-xl font-semibold">{book.title}</h3>
                      {!book.published && <Badge variant="outline">Draft</Badge>}
                      {book.is_nsfw && <Badge variant="destructive">NSFW</Badge>}
                    </div>
                    <p className="text-gray-600 line-clamp-2">{book.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => toggleBookExpansion(book.id)}>
                    {expandedBook === book.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEditBook(book)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteBook(book.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {expandedBook === book.id && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Chapters ({chapters.length})
                    </h4>
                    <Button size="sm" onClick={() => setIsEditingChapter(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Chapter
                    </Button>
                  </div>

                  {isEditingChapter && (
                    <Card className="mb-4">
                      <CardContent className="p-4">
                        <form onSubmit={handleChapterSubmit} className="space-y-4">
                          <div>
                            <Label>Chapter Title</Label>
                            <Input
                              value={chapterForm.title}
                              onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                              required
                            />
                          </div>

                          <div>
                            <Label>Chapter Content</Label>
                            <ReactQuill
                              theme="snow"
                              value={chapterForm.content}
                              onChange={(content) => setChapterForm({ ...chapterForm, content })}
                              modules={{
                                toolbar: [
                                  [{ 'header': [1, 2, 3, false] }],
                                  ['bold', 'italic', 'underline', 'strike'],
                                  ['blockquote', 'code-block'],
                                  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                  ['link', 'image'],
                                  ['clean']
                                ]
                              }}
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={chapterForm.published}
                              onCheckedChange={(checked) => setChapterForm({ ...chapterForm, published: checked })}
                            />
                            <Label>Published</Label>
                          </div>

                          <div className="flex gap-2">
                            <Button type="submit">
                              {editingChapter ? 'Update Chapter' : 'Create Chapter'}
                            </Button>
                            <Button type="button" variant="outline" onClick={resetChapterForm}>
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  <DragDropContext onDragEnd={handleChapterReorder}>
                    <Droppable droppableId="chapters">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                          {chapters.map((chapter, index) => (
                            <Draggable key={chapter.id} draggableId={chapter.id} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                                >
                                  <div className="flex items-center space-x-3 flex-1">
                                    <div {...provided.dragHandleProps}>
                                      <GripVertical className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-gray-500">Ch. {index + 1}</span>
                                        <span className="font-semibold">{chapter.title}</span>
                                        {!chapter.published && <Badge variant="outline" className="text-xs">Draft</Badge>}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEditChapter(chapter)}>
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteChapter(chapter.id)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>

                  {chapters.length === 0 && !isEditingChapter && (
                    <p className="text-center text-gray-500 py-4">No chapters yet. Add your first chapter!</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {books.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Books Yet</h3>
            <p className="text-gray-500 mb-4">Create your first book to get started!</p>
            <Button onClick={() => setIsEditingBook(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Book
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}