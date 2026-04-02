import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Search } from "lucide-react";

const TENOR_KEY = "LIVDSRZULELA";

export default function GifPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  // Load trending on mount
  useEffect(() => {
    fetchGifs("");
  }, []);

  const fetchGifs = async (q) => {
    setLoading(true);
    const endpoint = q
      ? `https://api.tenor.com/v1/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=24`
      : `https://api.tenor.com/v1/trending?key=${TENOR_KEY}&limit=24`;
    const res = await fetch(endpoint);
    const data = await res.json();
    setGifs(data.results || []);
    setLoading(false);
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGifs(val), 400);
  };

  return (
    <div className="absolute z-50 bottom-full mb-2 left-0 w-full sm:w-96 bg-popover border border-border rounded-xl shadow-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-foreground">Search GIFs</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="relative mb-3">
        <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleInput}
          placeholder="Search Tenor..."
          className="pl-8"
          autoFocus
        />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 max-h-60 overflow-y-auto">
          {gifs.map((gif) => {
            const url = gif.media?.[0]?.tinygif?.url || gif.media?.[0]?.gif?.url;
            if (!url) return null;
            return (
              <button
                key={gif.id}
                onClick={() => { onSelect(url); onClose(); }}
                className="rounded overflow-hidden hover:opacity-80 transition-opacity"
              >
                <img src={url} alt={gif.content_description} className="w-full h-20 object-cover" loading="lazy" />
              </button>
            );
          })}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground mt-2 text-center">Powered by Tenor</p>
    </div>
  );
}