import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Tag, User as UserIcon, Heart, MessageSquare, Send, ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function PostPage() {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [user, setUser] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [navigation, setNavigation] = useState({ prev: null, next: null });

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
      const [postData, commentsData, reactionsData, allUsers] = await Promise.all([
        base44.entities.Post.filter({ id: postId }),
        base44.entities.PostComment.filter({ post_id: postId }, "created_date"),
        base44.entities.PostReaction.filter({ post_id: postId }),
        base44.entities.User.list()
      ]);

      if (postData.length > 0) {
        setPost(postData[0]);
        setComments(commentsData);
        setReactions(reactionsData);
        loadNavigation(postData[0]);

        // Create users map for quick lookup
        const userMap = {};
        allUsers.forEach(u => {
          userMap[u.id] = u;
        });
        setUsersMap(userMap);
      }

      try {
        // Check if user is authenticated first without prompting login
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (isAuthenticated) {
          const userData = await base44.auth.me();
          setUser(userData);
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
    if (!newComment.trim() || !user) return;
    
    setIsSubmitting(true);
    try {
      await base44.entities.PostComment.create({
        post_id: post.id,
        content: newComment,
        author_id: user.id,
        author_username: user.username
      });
      setNewComment("");
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
      await base44.entities.PostComment.delete(commentId);
      await loadCommentsAndReactions();
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Failed to delete comment. Please try again.");
    }
  };
  
  const userHasReacted = reactions.some(r => r.created_by === user?.email);
  const isAdmin = user?.role === 'admin'; // Determine if the current user is an admin

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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
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
              className="w-full h-auto object-contain bg-gray-100"
            />
          )}
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge className="bg-purple-100 text-purple-700 border border-purple-200 capitalize">
                {post.category}
              </Badge>
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="w-4 h-4 mr-1" />
                {format(new Date(post.created_date), "MMMM d, yyyy")}
              </div>
            </div>
            <CardTitle className="text-4xl font-bold text-gray-900 mt-4">{post.title}</CardTitle>
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
              className="prose max-w-none text-lg text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
            
            {/* Reactions */}
            <div className="mt-8 pt-4 border-t">
              <Button onClick={handleReaction} variant="outline" disabled={!user}>
                <Heart className={`w-5 h-5 mr-2 ${userHasReacted ? 'text-red-500 fill-current' : ''}`} />
                {reactions.length} {reactions.length === 1 ? 'Like' : 'Likes'}
              </Button>
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
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {newComment.length}/500 characters
                  </span>
                  <Button type="submit" disabled={isSubmitting || !newComment.trim()}>
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center mb-8 p-4 bg-gray-100 rounded-lg">
                <p>
                  <button onClick={() => base44.auth.redirectToLogin()} className="text-purple-600 font-semibold">Sign in</button> to leave a comment.
                </p>
              </div>
            )}

            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-800">
                          @{comment.author_username || (usersMap[comment.author_id]?.username) || 'User'}
                        </p>
                        <p className="text-sm text-gray-500 mb-1">
                          {format(new Date(comment.created_date), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      {/* Show delete button only if user is admin */}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 p-1" // Added padding to button
                          onClick={() => handleDeleteComment(comment.id)}
                          aria-label="Delete comment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-gray-700 break-words">{comment.content}</p> {/* Added break-words */}
                  </div>
                </div>
              ))}

              {comments.length === 0 && (
                <div className="text-center py-8">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No comments yet. Be the first to share your thoughts!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}