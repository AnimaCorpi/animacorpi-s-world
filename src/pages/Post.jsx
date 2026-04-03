import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Tag, User as UserIcon, Heart, MessageSquare, Send, ArrowLeft, ArrowRight, Trash2, Bookmark, Share2 } from "lucide-react";
import ReactionButton from "../components/ReactionButton";
import UserAvatar from "../components/UserAvatar";
import KarmaBadge from "../components/KarmaBadge";
import GifPicker from "../components/GifPicker";
import { getUserAvatars } from "@/functions/getUserAvatars";
import { deletePostComment } from "@/functions/deletePostComment";
import { format } from "date-fns";

export default function PostPage() {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [user, setUser] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteRecord, setFavoriteRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [navigation, setNavigation] = useState({ prev: null, next: null });
  const [avatarMap, setAvatarMap] = useState({});
  const [commentGif, setCommentGif] = useState("");
  const [showGifPicker, setShowGifPicker] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    if(postId) {
        loadPostData(postId);
    }
  }, [window.location.search]);

  // Auto-refresh comments and reactions every 10 seconds when user is on the page
  useEffect(() => {
    if (post) {
      const interval = setInterval(() => {
        loadCommentsAndReactions();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [post]);

  const loadPostData = async (postId) => {
    setIsLoading(true);
    
    if (!postId) {
      setIsLoading(false);
      return;
    }

    try {
      const [postData, commentsData, reactionsData] = await Promise.all([
        base44.entities.Post.filter({ id: postId }),
        base44.entities.PostComment.filter({ post_id: postId }, "created_date"),
        base44.entities.PostReaction.filter({ post_id: postId })
      ]);

      if (postData.length > 0) {
        setPost(postData[0]);
        setComments(commentsData);
        setReactions(reactionsData);
        loadNavigation(postData[0]);
        // Fetch avatars for comment authors
        const uniqueIds = [...new Set(commentsData.map(c => c.author_id).filter(Boolean))];
        if (uniqueIds.length > 0) {
          const res = await getUserAvatars({ userIds: uniqueIds });
          setAvatarMap(res.data || {});
        }
      }

      try {
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (isAuthenticated) {
          const userData = await base44.auth.me();
          setUser(userData);
          // Check if user has favorited this post
          const favs = await base44.entities.PostFavorite.filter({ post_id: postId, user_id: userData.id });
          if (favs.length > 0) {
            setIsFavorited(true);
            setFavoriteRecord(favs[0]);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      }
    } catch (error) {
      console.error("Error loading post data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCommentsAndReactions = async () => {
    if (!post) return;
    
    try {
      const [commentsData, reactionsData] = await Promise.all([
        base44.entities.PostComment.filter({ post_id: post.id }, "created_date"),
        base44.entities.PostReaction.filter({ post_id: post.id })
      ]);
      setComments(commentsData);
      setReactions(reactionsData);
    } catch (error) {
      console.error("Error refreshing comments and reactions:", error);
    }
  };

  const loadNavigation = async (currentPost) => {
    try {
      const allPosts = await base44.entities.Post.filter({ published: true, category: currentPost.category }, "-created_date");
      const currentIndex = allPosts.findIndex(p => p.id === currentPost.id);
      
      setNavigation({
        prev: currentIndex > 0 ? allPosts[currentIndex - 1] : null,
        next: currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null
      });
    } catch (error) {
      console.error("Error loading navigation posts:", error);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if ((!newComment.trim() && !commentGif) || !user) return;
    
    setIsSubmitting(true);
    try {
      await base44.entities.PostComment.create({
        post_id: post.id,
        content: newComment,
        author_id: user.id,
        author_username: user.username,
        gif_url: commentGif || ""
      });
      setNewComment("");
      setCommentGif("");
      await loadCommentsAndReactions();
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReaction = async () => {
    if (!user) return;

    // The existing reaction check was by created_by (email), but the new reaction creation uses user_id.
    // It's safer to check by user_id if that's what's consistently used in PostReaction entity.
    // Assuming created_by in PostReaction matches user.email based on existing code.
    const existingReaction = reactions.find(r => r.created_by === user.email); 
    try {
      if (existingReaction) {
        await base44.entities.PostReaction.delete(existingReaction.id);
      } else {
        await base44.entities.PostReaction.create({
          post_id: post.id,
          user_id: user.id,
          emoji: '❤️'
        });
      }
      await loadCommentsAndReactions();
    } catch (error) {
      console.error("Error handling reaction:", error);
    }
  };

  // New function to handle comment deletion
  const handleDeleteComment = async (commentId) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await deletePostComment({ commentId });
      await loadCommentsAndReactions();
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Failed to delete comment. Please try again.");
    }
  };
  
  const userHasReacted = reactions.some(r => r.created_by === user?.email);
  const isAdmin = user?.role === 'admin';

  const handleFavorite = async () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    if (isFavorited && favoriteRecord) {
      await base44.entities.PostFavorite.delete(favoriteRecord.id);
      setIsFavorited(false);
      setFavoriteRecord(null);
    } else {
      const created = await base44.entities.PostFavorite.create({ post_id: post.id, user_id: user.id });
      setIsFavorited(true);
      setFavoriteRecord(created);
    }
  }; // Determine if the current user is an admin

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Post not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="flex justify-between items-center mb-4">
          {navigation.prev ? (
            <Link to={createPageUrl(`Post?id=${navigation.prev.id}`)} className="flex items-center text-purple-600 hover:text-purple-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous Post
            </Link>
          ) : <div></div>}
          {navigation.next ? (
            <Link to={createPageUrl(`Post?id=${navigation.next.id}`)} className="flex items-center text-purple-600 hover:text-purple-800">
              Next Post
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          ) : <div></div>}
        </div>

        <Card className="overflow-hidden">
          {post.image_url && (
            <img 
              src={post.image_url} 
              alt={post.title} 
              className="w-full h-auto object-contain bg-gray-100 dark:bg-muted"
            />
          )}
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge className="bg-purple-100 text-purple-700 border border-purple-200 capitalize">
                {post.category}
              </Badge>
              <div className="flex items-center text-sm text-gray-500 dark:text-muted-foreground">
                <Calendar className="w-4 h-4 mr-1" />
                {format(new Date(post.created_date), "MMMM d, yyyy")}
              </div>
            </div>
            <CardTitle className="text-4xl font-bold text-gray-900 dark:text-foreground mt-4">{post.title}</CardTitle>
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {post.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div 
              className="prose dark:prose-invert max-w-none text-lg text-gray-700 dark:text-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
            
            {/* Reactions */}
            <div className="mt-8 pt-4 border-t flex flex-wrap items-center gap-3">
              <Button onClick={handleReaction} variant="outline" disabled={!user}>
                <Heart className={`w-5 h-5 mr-2 ${userHasReacted ? 'text-red-500 fill-current' : ''}`} />
                {reactions.length} {reactions.length === 1 ? 'Like' : 'Likes'}
              </Button>
              <Button onClick={handleFavorite} variant="outline" disabled={!user} title={isFavorited ? 'Remove from saved' : 'Save post'}>
                <Bookmark className={`w-5 h-5 mr-2 ${isFavorited ? 'text-purple-500 fill-current' : ''}`} />
                {isFavorited ? 'Saved' : 'Save'}
              </Button>

              {/* Social sharing */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground flex items-center gap-1"><Share2 className="w-4 h-4" /> Share:</span>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 transition-colors"
                  title="Share on X (Twitter)"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  title="Share on Facebook"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a
                  href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(post.title)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-700 text-white hover:bg-blue-800 transition-colors"
                  title="Share on LinkedIn"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <span>Comments ({comments.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <form onSubmit={handleCommentSubmit} className="space-y-4 mb-8">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add your comment..."
                  rows={3}
                  maxLength={500}
                />
                {commentGif && (
                  <div className="mt-2 relative inline-block">
                    <img src={commentGif} alt="GIF" className="max-h-32 rounded-lg" />
                    <button onClick={() => setCommentGif("")} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button>
                  </div>
                )}
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-muted-foreground">{newComment.length}/500</span>
                    <div className="relative">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowGifPicker(p => !p)}>GIF</Button>
                      {showGifPicker && <GifPicker onSelect={(url) => { setCommentGif(url); setShowGifPicker(false); }} onClose={() => setShowGifPicker(false)} />}
                    </div>
                  </div>
                  <Button type="submit" disabled={isSubmitting || (!newComment.trim() && !commentGif)}>
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center mb-8 p-4 bg-gray-100 dark:bg-muted rounded-lg">
                <p>
                  <button onClick={() => base44.auth.redirectToLogin()} className="text-purple-600 font-semibold">Sign in</button> to leave a comment.
                </p>
              </div>
            )}

            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start space-x-3">
                  <UserAvatar avatarUrl={avatarMap[comment.author_id]?.avatar_url} username={comment.author_username} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="flex items-center gap-2">
                          <Link to={createPageUrl(`UserProfile?id=${comment.author_id}`)} className="font-semibold text-gray-800 dark:text-foreground hover:text-purple-600 hover:underline">
                            @{comment.author_username || 'User'}
                          </Link>
                          <KarmaBadge karma={avatarMap[comment.author_id]?.karma} />
                        </span>
                        <p className="text-sm text-gray-500 dark:text-muted-foreground mb-1">
                          {format(new Date(comment.created_date), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      {(isAdmin || comment.author_id === user?.id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 p-1"
                          onClick={() => handleDeleteComment(comment.id)}
                          aria-label="Delete comment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-gray-700 dark:text-foreground break-words">{comment.content}</p>
                    {comment.gif_url && <img src={comment.gif_url} alt="GIF" className="max-h-40 rounded-lg my-2" />}
                    <ReactionButton contentId={comment.id} contentType="post_comment" user={user} />
                  </div>
                </div>
              ))}

              {comments.length === 0 && (
                <div className="text-center py-8">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}