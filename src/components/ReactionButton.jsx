import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReactionButton({ contentId, contentType, user, className = "" }) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [reactionId, setReactionId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contentId) return;
    loadReactions();
  }, [contentId, user]);

  const loadReactions = async () => {
    const all = await base44.entities.ContentReaction.filter({ content_id: contentId, content_type: contentType });
    setCount(all.length);
    if (user) {
      const mine = all.find(r => r.user_id === user.id);
      if (mine) {
        setLiked(true);
        setReactionId(mine.id);
      } else {
        setLiked(false);
        setReactionId(null);
      }
    }
  };

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    if (loading) return;
    setLoading(true);
    if (liked && reactionId) {
      await base44.entities.ContentReaction.delete(reactionId);
      setLiked(false);
      setReactionId(null);
      setCount(c => c - 1);
    } else {
      const r = await base44.entities.ContentReaction.create({ user_id: user.id, content_id: contentId, content_type: contentType });
      setLiked(true);
      setReactionId(r.id);
      setCount(c => c + 1);
    }
    setLoading(false);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className={`flex items-center gap-1.5 px-2 h-8 ${liked ? "text-purple-600 font-semibold" : "text-muted-foreground"} ${className}`}
    >
      <ThumbsUp className={`w-4 h-4 ${liked ? "fill-purple-200" : ""}`} />
      <span className="text-sm">{count > 0 ? count : ""}</span>
    </Button>
  );
}