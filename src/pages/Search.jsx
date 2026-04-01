import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, Search as SearchIcon, ArrowRight, MessageSquare, BookOpen, PenTool } from "lucide-react";
import { format } from "date-fns";

const stripHtml = (html) => (html || "").replace(/<[^>]*>/g, "");

const categoryMeta = {
  thoughts: { label: "Thoughts", color: "bg-purple-100 text-purple-700 border-purple-200", icon: "💭" },
  artwork:  { label: "Artwork",  color: "bg-pink-100 text-pink-700 border-pink-200",   icon: "🎨" },
  photography: { label: "Photography", color: "bg-blue-100 text-blue-700 border-blue-200", icon: "📸" },
};

export default function Search() {
  const location = useLocation();
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState([]);
  const [threads, setThreads] = useState([]);
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sync input from URL param
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("q") || "";
    setInputValue(q);
    setQuery(q);
  }, [location.search]);

  // Run search whenever query changes
  useEffect(() => {
    if (!query.trim()) {
      setPosts([]); setThreads([]); setBooks([]);
      return;
    }
    runSearch(query.trim());
  }, [query]);

  const runSearch = async (q) => {
    setIsLoading(true);
    const lower = q.toLowerCase();
    const [allPosts, allThreads, allBooks] = await Promise.all([
      base44.entities.Post.filter({ published: true }),
      base44.entities.ForumThread.list("-created_date"),
      base44.entities.Book.filter({ published: true }),
    ]);

    setPosts(allPosts.filter(p =>
      p.title?.toLowerCase().includes(lower) ||
      stripHtml(p.content).toLowerCase().includes(lower) ||
      p.tags?.some(t => t.toLowerCase().includes(lower))
    ));

    setThreads(allThreads.filter(t =>
      t.title?.toLowerCase().includes(lower) ||
      stripHtml(t.content).toLowerCase().includes(lower) ||
      t.tags?.some(tag => tag.toLowerCase().includes(lower))
    ));

    setBooks(allBooks.filter(b =>
      b.title?.toLowerCase().includes(lower) ||
      b.description?.toLowerCase().includes(lower)
    ));

    setIsLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      navigate(createPageUrl(`Search?q=${encodeURIComponent(inputValue.trim())}`));
    }
  };

  const total = posts.length + threads.length + books.length;

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        {/* Search Bar */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center mb-4">
            <SearchIcon className="w-7 h-7 mr-3 text-purple-500" />
            Global Search
          </h1>
          <form onSubmit={handleSubmit} className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search posts, threads, stories…"
              className="pl-12 h-12 text-base rounded-xl border-border bg-card"
            />
          </form>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
          </div>
        )}

        {/* No query */}
        {!isLoading && !query && (
          <div className="text-center py-16 text-muted-foreground">
            <SearchIcon className="w-14 h-14 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Type something to search across the whole site.</p>
          </div>
        )}

        {/* No results */}
        {!isLoading && query && total === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <SearchIcon className="w-14 h-14 mx-auto mb-4 opacity-30" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No results for "{query}"</h3>
            <p>Try different keywords or check your spelling.</p>
          </div>
        )}

        {/* Results */}
        {!isLoading && query && total > 0 && (
          <div className="space-y-10">
            <p className="text-sm text-muted-foreground">{total} result{total !== 1 ? "s" : ""} for <span className="font-semibold text-foreground">"{query}"</span></p>

            {/* Posts */}
            {posts.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <PenTool className="w-5 h-5 text-purple-500" />
                  <h2 className="text-lg font-bold text-foreground">Posts</h2>
                  <Badge variant="secondary">{posts.length}</Badge>
                </div>
                <div className="space-y-3">
                  {posts.map(post => {
                    const meta = categoryMeta[post.category] || { label: post.category, color: "bg-gray-100 text-gray-700 border-gray-200", icon: "📝" };
                    return (
                      <Link key={post.id} to={createPageUrl(`Post?id=${post.id}`)} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-purple-300 dark:hover:border-purple-700 transition-colors group">
                        {post.image_url && (
                          <img src={post.image_url} alt={post.title} className="w-16 h-16 rounded-lg object-cover shrink-0 hidden sm:block" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className={`${meta.color} border text-xs`}>{meta.icon} {meta.label}</Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />{format(new Date(post.created_date), "MMM d, yyyy")}
                            </span>
                          </div>
                          <h3 className="font-semibold text-foreground group-hover:text-purple-600 transition-colors line-clamp-1">{post.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                            {post.excerpt || stripHtml(post.content).substring(0, 120) + "…"}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-500 shrink-0 mt-1 transition-colors" />
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Forum Threads */}
            {threads.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-pink-500" />
                  <h2 className="text-lg font-bold text-foreground">Forum Threads</h2>
                  <Badge variant="secondary">{threads.length}</Badge>
                </div>
                <div className="space-y-3">
                  {threads.map(thread => (
                    <Link key={thread.id} to={createPageUrl(`ForumThread?id=${thread.id}`)} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-pink-300 dark:hover:border-pink-700 transition-colors group">
                      <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-5 h-5 text-pink-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className="bg-pink-100 text-pink-700 border border-pink-200 text-xs">Forum</Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{format(new Date(thread.created_date), "MMM d, yyyy")}
                          </span>
                          {thread.is_nsfw && <Badge variant="destructive" className="text-xs">NSFW</Badge>}
                        </div>
                        <h3 className="font-semibold text-foreground group-hover:text-pink-600 transition-colors line-clamp-1">{thread.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {stripHtml(thread.content).substring(0, 120) + "…"}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-pink-500 shrink-0 mt-1 transition-colors" />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Stories / Books */}
            {books.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-bold text-foreground">Stories</h2>
                  <Badge variant="secondary">{books.length}</Badge>
                </div>
                <div className="space-y-3">
                  {books.map(book => (
                    <Link key={book.id} to={createPageUrl(`BookDetail?id=${book.id}`)} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
                      {book.cover_image_url ? (
                        <img src={book.cover_image_url} alt={book.title} className="w-14 h-20 rounded-lg object-cover shrink-0 hidden sm:block" />
                      ) : (
                        <div className="w-14 h-20 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 hidden sm:block">
                          <BookOpen className="w-6 h-6 text-blue-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs">📚 Story</Badge>
                          {book.is_nsfw && <Badge variant="destructive" className="text-xs">NSFW</Badge>}
                        </div>
                        <h3 className="font-semibold text-foreground group-hover:text-blue-600 transition-colors line-clamp-1">{book.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{book.description}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 shrink-0 mt-1 transition-colors" />
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}