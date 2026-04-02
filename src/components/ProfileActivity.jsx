import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { MessageSquare, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProfileActivity({ user }) {
  const [activity, setActivity] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActivity();
  }, [user]);

  const loadActivity = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [threads, replies, posts, postComments] = await Promise.all([
        base44.entities.ForumThread.filter({ author_id: user.id }, "-created_date", 50),
        base44.entities.ForumComment.filter({ author_id: user.id }, "-created_date", 50),
        base44.entities.Post.filter({ created_by: user.email }, "-created_date", 50),
        base44.entities.PostComment.filter({ author_id: user.id }, "-created_date", 50)
      ]);

      const combined = [
        ...threads.map(t => ({ type: 'thread', id: t.id, date: t.created_date, item: t })),
        ...replies.map(r => ({ type: 'reply', id: r.id, date: r.created_date, item: r })),
        ...posts.map(p => ({ type: 'post', id: p.id, date: p.created_date, item: p })),
        ...postComments.map(c => ({ type: 'post_comment', id: c.id, date: c.created_date, item: c }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      setActivity(combined);
    } catch (error) {
      console.error("Error loading activity:", error);
    }
    setIsLoading(false);
  };

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === activity.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(activity.map(a => a.id)));
    }
  };

  const deleteSelected = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Delete ${selectedItems.size} item(s)? This cannot be undone.`)) return;

    try {
      const items = activity.filter(a => selectedItems.has(a.id)).map(a => ({
        itemId: a.id,
        itemType: a.type
      }));

      await base44.functions.invoke('bulkDeleteActivityItems', { items });
      setActivity(activity.filter(a => !selectedItems.has(a.id)));
      setSelectedItems(new Set());
    } catch (error) {
      console.error("Error deleting items:", error);
    }
  };

  const deleteSingle = async (id, type) => {
    if (!confirm("Delete this item?")) return;
    try {
      await base44.functions.invoke('deleteActivityItem', { itemId: id, itemType: type });
      setActivity(activity.filter(a => a.id !== id));
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const getLabel = (type) => {
    const labels = {
      thread: 'Created forum thread',
      reply: 'Replied in forum',
      post: 'Created post',
      post_comment: 'Commented on post'
    };
    return labels[type] || type;
  };

  const getContent = (entry) => {
    if (entry.type === 'thread') return entry.item.title;
    if (entry.type === 'post') return entry.item.title;
    return entry.item.content?.replace(/<[^>]*>/g, '').substring(0, 100) || '';
  };

  const getLink = (entry) => {
    if (entry.type === 'thread') return `/ForumThread?id=${entry.item.id}`;
    if (entry.type === 'post') return `/Post?id=${entry.item.id}`;
    return null;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading activity...</div>;
  }

  if (activity.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-muted-foreground">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedItems.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <input
            type="checkbox"
            checked={selectedItems.size === activity.length}
            onChange={toggleSelectAll}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium flex-1">
            {selectedItems.size} of {activity.length} selected
          </span>
          <Button
            onClick={deleteSelected}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete Selected
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {activity.map(entry => (
          <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors">
            <input
              type="checkbox"
              checked={selectedItems.has(entry.id)}
              onChange={() => toggleSelect(entry.id)}
              className="w-4 h-4 mt-1 shrink-0"
            />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${
              entry.type === 'thread' ? 'bg-purple-100 text-purple-600' :
              entry.type === 'reply' ? 'bg-blue-100 text-blue-600' :
              entry.type === 'post' ? 'bg-green-100 text-green-600' :
              'bg-orange-100 text-orange-600'
            }`}>
              {entry.type === 'thread' || entry.type === 'post' ? '📝' : '💬'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">
                {getLabel(entry.type)}
              </p>
              {getLink(entry) ? (
                <Link to={getLink(entry)} className="font-medium text-foreground hover:text-purple-600 truncate block">
                  {getContent(entry)}
                </Link>
              ) : (
                <p className="text-sm text-foreground line-clamp-2">
                  {getContent(entry)}
                </p>
              )}
              <span className="text-xs text-muted-foreground">
                {format(new Date(entry.date), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
            <button
              onClick={() => deleteSingle(entry.id, entry.type)}
              className="text-red-600 hover:bg-red-50 p-1.5 rounded shrink-0 transition-colors"
              title="Delete this item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <Button
        onClick={async () => {
          if (!confirm('Delete ALL activity? This cannot be undone.')) return;
          try {
            const allItems = activity.map(a => ({ itemId: a.id, itemType: a.type }));
            await base44.functions.invoke('bulkDeleteActivityItems', { items: allItems });
            setActivity([]);
          } catch (error) {
            console.error('Error clearing activity:', error);
          }
        }}
        variant="outline"
        className="mt-4 border-red-300 text-red-600 hover:bg-red-50 w-full"
      >
        Clear All Activity
      </Button>
    </div>
  );
}