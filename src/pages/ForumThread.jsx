import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  MessageSquare, 
  Flag, 
  User as UserIcon, 
  Clock, 
  Send,
  AlertTriangle,
  Lock,
  Trash2,
  Bookmark,
  BookmarkCheck
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import ReportForm from "../components/forum/ReportForm";
import ReactionButton from "../components/ReactionButton";
import UserAvatar from "../components/UserAvatar";
import KarmaBadge from "../components/KarmaBadge";
import GifPicker from "../components/GifPicker";
import { getUserAvatars } from "@/functions/getUserAvatars";

export default function ForumThreadPage() {
  const [thread, setThread] = useState(null);
  const [comments, setComments] = useState([]);
  const [user, setUser] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [showReportForm, setShowReportForm] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState(null);
  const [avatarMap, setAvatarMap] = useState({});
  const [commentGif, setCommentGif] = useState("");
  const [showGifPicker, setShowGifPicker] = useState(false);


  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const threadId = urlParams.get("id");
    if (threadId) {
      loadThreadData(threadId);
    } else {
      window.location.href = createPageUrl("Forum");
    }
  }, []);

  const loadThreadData = async (threadId) => {
    try {
      const [threadData, commentsData] = await Promise.all([
        base44.entities.ForumThread.filter({ id: threadId }),
        base44.entities.ForumComment.filter({ thread_id: threadId }, "created_date")
      ]);

      if (threadData.length === 0) {
        window.location.href = createPageUrl("Forum");
        return;
      }

      setThread(threadData[0]);
      setComments(commentsData);

      // Fetch avatars for all comment authors + thread author
      const uniqueIds = [...new Set([threadData[0].author_id, ...commentsData.map(c => c.author_id)].filter(Boolean))];
      if (uniqueIds.length > 0) {
        const res = await getUserAvatars({ userIds: uniqueIds });
        setAvatarMap(res.data || {});
      }

      try {
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (isAuthenticated) {
          const userData = await base44.auth.me();
          if (userData) {
            if (!userData.username || !userData.birthdate) {
              setUser({ ...userData, needsRegistration: true });
            } else {
              setUser(userData);
              const existing = await base44.entities.ForumBookmark.filter({ user_id: userData.id, thread_id: threadId });
              if (existing.length > 0) {
                setIsBookmarked(true);
                setBookmarkId(existing[0].id);
              }
            }
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      }
    } catch (error) {
      console.error("Error loading thread data:", error);
      setError("Failed to load discussion. Please try again.");
    }
    setIsLoading(false);
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return 0;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const canViewNSFW = () => {
    if (!user || user.needsRegistration) return false;
    return user.role === 'admin' || calculateAge(user.birthdate) >= 18;
  };

  const getAuthorDisplay = (item) => {
    return item?.author_username || 'User';
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if ((!newComment.trim() && !commentGif) || !user || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const commentData = {
        thread_id: thread.id,
        content: newComment.trim(),
        author_id: user.id,
        author_username: user.username,
        parent_comment_id: replyingTo || "",
        gif_url: commentGif || ""
      };

      await base44.entities.ForumComment.create(commentData);
      
      setNewComment("");
      setCommentGif("");
      setReplyingTo(null);
      
      const updatedComments = await base44.entities.ForumComment.filter({ thread_id: thread.id }, "created_date");
      setComments(updatedComments);
    } catch (error) {
      console.error("Error creating comment:", error);
      setError("Failed to post comment. Please try again.");
    }
    setIsSubmitting(false);
  };

  const handleReport = (type, id) => {
    setShowReportForm({ type, id });
  };

  const handleToggleBookmark = async () => {
    if (!user) return;
    if (isBookmarked && bookmarkId) {
      await base44.entities.ForumBookmark.delete(bookmarkId);
      setIsBookmarked(false);
      setBookmarkId(null);
    } else {
      const bm = await base44.entities.ForumBookmark.create({ user_id: user.id, thread_id: thread.id });
      setIsBookmarked(true);
      setBookmarkId(bm.id);
    }
  };

  const handleDeleteThread = async () => {
    if (!confirm("Are you sure you want to delete this discussion?")) return;
    try {
      await base44.entities.ForumThread.delete(thread.id);
      window.location.href = createPageUrl("Forum");
    } catch (error) {
      console.error("Error deleting thread:", error);
      setError("Failed to delete discussion. Please try again.");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await base44.entities.ForumComment.delete(commentId);
      const updatedComments = await base44.entities.ForumComment.filter({ thread_id: thread.id }, "created_date");
      setComments(updatedComments);
    } catch (error) {
      console.error("Error deleting comment:", error);
      setError("Failed to delete comment. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading discussion...</p>
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Discussion not found</h2>
          <Link to={createPageUrl("Forum")}>
            <Button>Back to Forum</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (thread.is_nsfw && !canViewNSFW()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Age Restricted Content</h2>
            <p className="text-gray-600 mb-6">
              This content is marked as NSFW and is only available to users 18 and over.
            </p>
            <Link to={createPageUrl("Forum")}>
              <Button>Back to Forum</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showReportForm) {
    return (
      <ReportForm
        type={showReportForm.type}
        id={showReportForm.id}
        user={user}
        onSuccess={() => setShowReportForm(null)}
        onCancel={() => setShowReportForm(null)}
      />
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Forum")} className="inline-flex items-center text-purple-600 hover:text-purple-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Forum
          </Link>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <CardTitle className="text-2xl">{thread.title}</CardTitle>
                  {thread.is_nsfw && (
                    <Badge variant="destructive">NSFW</Badge>
                  )}
                  {thread.locked && (
                    <Badge variant="outline" className="flex items-center">
                      <Lock className="w-3 h-3 mr-1" />
                      Locked
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-muted-foreground">
                  <div className="flex items-center gap-2">
                   <UserAvatar avatarUrl={avatarMap[thread.author_id]?.avatar_url} username={thread.author_username} />
                   <Link to={createPageUrl(`UserProfile?id=${thread.author_id}`)} className="hover:text-purple-600 hover:underline">@{getAuthorDisplay(thread)}</Link>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {format(new Date(thread.created_date), "MMM d, yyyy 'at' h:mm a")}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {user && !user.needsRegistration && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleBookmark}
                    className={isBookmarked ? "text-purple-600" : "text-muted-foreground"}
                    title={isBookmarked ? "Remove bookmark" : "Bookmark this thread"}
                  >
                    {isBookmarked ? <BookmarkCheck className="w-4 h-4 mr-1" /> : <Bookmark className="w-4 h-4 mr-1" />}
                    {isBookmarked ? "Saved" : "Save"}
                  </Button>
                )}
                {(user?.role === 'admin' || thread.author_id === user?.id) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={handleDeleteThread}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReport("thread", thread.id)}
                  className="flex items-center"
                >
                  <Flag className="w-4 h-4 mr-1" />
                  Report
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {thread.image_url && (
              <div className="mb-4">
                <img 
                  src={thread.image_url} 
                  alt="Thread image" 
                  className="max-w-full h-auto rounded-lg"
                />
              </div>
            )}
            <div className="prose dark:prose-invert max-w-none mb-4">
              <div dangerouslySetInnerHTML={{ __html: thread.content.replace(/\n/g, '<br>') }} />
            </div>
            {thread.tags && thread.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {thread.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-border flex items-center">
              <ReactionButton contentId={thread.id} contentType="thread" user={user} />
              <span className="text-sm text-muted-foreground ml-1">Like this thread</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Comments ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user && !user.needsRegistration && !thread.locked ? (
              <form onSubmit={handleSubmitComment} className="mb-6">
                <div className="mb-4">
                  {replyingTo && (
                    <div className="bg-gray-100 dark:bg-muted p-3 rounded-lg mb-2">
                      <p className="text-sm text-gray-600 dark:text-muted-foreground">
                        Replying to comment by @{getAuthorDisplay(comments.find(c => c.id === replyingTo))}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyingTo(null)}
                        className="mt-1"
                      >
                        Cancel Reply
                      </Button>
                    </div>
                  )}
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={replyingTo ? "Write your reply..." : "Share your thoughts..."}
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 dark:text-muted-foreground mt-1">
                    {newComment.length}/500 characters
                  </p>
                  {commentGif && (
                    <div className="mt-2 relative inline-block">
                      <img src={commentGif} alt="GIF" className="max-h-32 rounded-lg" />
                      <button onClick={() => setCommentGif("")} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 relative">
                  <div className="relative">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowGifPicker(p => !p)}>GIF</Button>
                    {showGifPicker && <GifPicker onSelect={(url) => { setCommentGif(url); setShowGifPicker(false); }} onClose={() => setShowGifPicker(false)} />}
                  </div>
                  <Button 
                    type="submit" 
                    disabled={(!newComment.trim() && !commentGif) || isSubmitting}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </form>
            ) : !user || user.needsRegistration ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-muted/50 rounded-lg">
                <p className="text-gray-600 dark:text-muted-foreground mb-4">
                  {user?.needsRegistration 
                    ? "Complete your profile to join the discussion" 
                    : "Sign in to join the discussion"}
                </p>
                <Button onClick={() => {
                  if (user?.needsRegistration) {
                    window.location.href = createPageUrl("Registration");
                  } else {
                    base44.auth.redirectToLogin();
                  }
                }}>
                  {user?.needsRegistration ? "Complete Profile" : "Sign In"}
                </Button>
              </div>
            ) : thread.locked ? (
              <div className="text-center py-8">
                <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-muted-foreground">This discussion has been locked</p>
              </div>
            ) : null}

            <div className="space-y-4">
              {comments.filter(comment => !comment.parent_comment_id).map((comment) => (
                <div key={comment.id} className="border-l-2 border-purple-200 pl-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <UserAvatar avatarUrl={avatarMap[comment.author_id]?.avatar_url} username={comment.author_username} />
                      <Link to={createPageUrl(`UserProfile?id=${comment.author_id}`)} className="font-medium hover:text-purple-600 hover:underline">@{getAuthorDisplay(comment)}</Link>
                      <KarmaBadge karma={avatarMap[comment.author_id]?.karma} />
                              <span className="text-sm text-gray-500 dark:text-muted-foreground">
                        {format(new Date(comment.created_date), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {user && !thread.locked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyingTo(comment.id)}
                        >
                          Reply
                        </Button>
                      )}
                      {(user?.role === 'admin' || comment.author_id === user?.id || thread.author_id === user?.id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 p-1"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReport("comment", comment.id)}
                      >
                        <Flag className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-foreground mb-2">{comment.content}</p>
                  {comment.gif_url && <img src={comment.gif_url} alt="GIF" className="max-h-40 rounded-lg mb-2" />}
                  <ReactionButton contentId={comment.id} contentType="forum_comment" user={user} />
                  
                  {/* Replies */}
                  <div className="ml-6 space-y-3">
                    {comments.filter(reply => reply.parent_comment_id === comment.id).map((reply) => (
                      <div key={reply.id} className="border-l border-gray-200 pl-3">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center space-x-2">
                            <UserAvatar avatarUrl={avatarMap[reply.author_id]?.avatar_url} username={reply.author_username} size="sm" />
                            <Link to={createPageUrl(`UserProfile?id=${reply.author_id}`)} className="font-medium text-sm hover:text-purple-600 hover:underline">@{getAuthorDisplay(reply)}</Link>
                            <KarmaBadge karma={avatarMap[reply.author_id]?.karma} />
                            <span className="text-xs text-gray-500 dark:text-muted-foreground">
                              {format(new Date(reply.created_date), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {(user?.role === 'admin' || reply.author_id === user?.id || thread.author_id === user?.id) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 p-1"
                                onClick={() => handleDeleteComment(reply.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReport("comment", reply.id)}
                              className="p-1"
                            >
                              <Flag className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-foreground text-sm">{reply.content}</p>
                        {reply.gif_url && <img src={reply.gif_url} alt="GIF" className="max-h-32 rounded-lg mt-1" />}
                        <ReactionButton contentId={reply.id} contentType="forum_comment" user={user} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {comments.length === 0 && (
                <div className="text-center py-8">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 dark:text-muted-foreground mb-2">No comments yet</h3>
                  <p className="text-gray-500 dark:text-muted-foreground">Be the first to share your thoughts!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}