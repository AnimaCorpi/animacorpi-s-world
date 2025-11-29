import React, { useState, useEffect } from "react";
import { Book } from "@/entities/Book";
import { SiteSettings } from "@/entities/SiteSettings";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function Stories() {
  const [books, setBooks] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [booksData, settingsData] = await Promise.all([
        Book.filter({ published: true }, "order_index"),
        SiteSettings.filter({ page: "stories" })
      ]);
      setBooks(booksData);
      setSettings(settingsData[0] || { 
        tagline: "Stories from the Heart", 
        message: "Dive into immersive stories and adventures crafted with love." 
      });
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <section className="banner-transparent py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="banner-text-container">
              <h1 className="banner-text text-4xl md:text-6xl font-bold mb-6 leading-tight">
                {settings?.tagline || "Stories from the Heart"}
              </h1>
              <p className="banner-text-secondary text-xl md:text-2xl">
                {settings?.message || "Dive into immersive stories and adventures crafted with love."}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {books.map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Link to={createPageUrl(`Reader?bookId=${book.id}`)} className="block card-hover">
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-purple-100 h-full flex flex-col">
                    <div className="aspect-[3/4] overflow-hidden">
                      <img 
                        src={book.cover_image_url || 'https://placehold.co/600x800/f3e8ff/a855f7?text=Book+Cover'} 
                        alt={book.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-6 flex-grow flex flex-col">
                      <h3 className="text-xl font-bold text-gray-800 mb-3">
                        {book.title}
                      </h3>
                      <p className="text-gray-600 mb-4 flex-grow text-sm leading-relaxed">
                        {book.description}
                      </p>
                      <Button as="span" className="w-full mt-auto bg-purple-500 hover:bg-purple-600">
                        Start Reading
                      </Button>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {books.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">No stories yet</h3>
              <p className="text-gray-600">Check back soon for new adventures!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}