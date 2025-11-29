import React, { useState, useEffect } from "react";
import { Post } from "@/entities/Post";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Tag, Search as SearchIcon, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default function Search() {
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const q = searchParams.get("q") || "";
    setQuery(q);
    performSearch(q);
  }, [location.search]);

  const performSearch = async (searchQuery) => {
    if (!searchQuery) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Get all published posts
      const allPosts = await Post.filter({ published: true });
      
      // Filter posts based on title or tags
      const results = allPosts.filter(post => {
        const titleMatch = post.title.toLowerCase().includes(searchQuery.toLowerCase());
        const tagMatch = post.tags && post.tags.some(tag => 
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return titleMatch || tagMatch;
      });

      setSearchResults(results);
    } catch (error) {
      console.error("Error performing search:", error);
      setSearchResults([]);
    }
    setIsLoading(false);
  };

  const getCategoryColor = (category) => {
    const colors = {
      thoughts: "bg-purple-100 text-purple-700 border-purple-200",
      artwork: "bg-pink-100 text-pink-700 border-pink-200",
      photography: "bg-blue-100 text-blue-700 border-blue-200"
    };
    return colors[category] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getCategoryIcon = (category) => {
    const icons = {
      thoughts: "💭",
      artwork: "🎨", 
      photography: "📸"
    };
    return icons[category] || "📝";
  };

  const stripHtmlTags = (html) => {
    return html.replace(/<[^>]*>/g, '');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Searching...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <SearchIcon className="w-8 h-8 mr-3" />
            Search Results
          </h1>
          <p className="text-gray-600 mt-1">
            {query ? `Results for "${query}"` : "Enter a search term"}
          </p>
        </div>

        {query && (
          <>
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </p>
            </div>

            {searchResults.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {searchResults.map((post) => (
                  <Card key={post.id} className="card-hover bg-white rounded-2xl shadow-lg overflow-hidden border border-purple-100">
                    {post.image_url && (
                      <div className="aspect-video overflow-hidden">
                        <img 
                          src={post.image_url} 
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      </div>
                    )}
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={`${getCategoryColor(post.category)} border`}>
                          {getCategoryIcon(post.category)} {post.category}
                        </Badge>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-1" />
                          {format(new Date(post.created_date), "MMM d, yyyy")}
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {post.excerpt || stripHtmlTags(post.content).substring(0, 150) + "..."}
                      </p>
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {post.tags.slice(0, 3).map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <Link 
                        to={createPageUrl(`Post?id=${post.id}`)}
                        className="inline-flex items-center text-purple-600 hover:text-purple-800 font-medium transition-colors duration-200"
                      >
                        Read More
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-800 mb-2">No Results Found</h3>
                <p className="text-gray-600">
                  Try searching with different keywords or check your spelling.
                </p>
              </div>
            )}
          </>
        )}

        {!query && (
          <div className="text-center py-16">
            <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Search Posts</h3>
            <p className="text-gray-600">
              Use the search bar above to find posts by title or tags.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}