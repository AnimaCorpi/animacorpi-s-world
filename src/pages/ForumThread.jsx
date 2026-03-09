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
  Lock
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import ReportForm from "../components/forum/ReportForm";

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
      const [threadData, commentsData, allUsers] = await Promise.all([
        base44.entities.ForumThread.filter({ id: threadId }),
        base44.entities.ForumComment.filter({ thread_id: threadId }, "created_date"),
        base44.entities.User.list()
      ]);

      if (threadData.length === 0) {
        window.location.href = createPageUrl("Forum");
        return;
      }

      setThread(threadData[0]);
      setComments(commentsData);

      // Create users map for quick lookup
      const userMap = {};
      allUsers.forEach(u => {
        userMap[u.id] = u;
      });
      setUsersMap(userMap);

      try {
        // Check if user is authenticated first without prompting login
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (isAuthenticated) {
          const userData = await base44.auth.me();
          if (userData) {
            if (!userData.username || !userData.birthdate) {
              // User logged in but needs to complete registration
              setUser({ ...userData, needsRegistration: true });
            } else {
              setUser(userData);
            }
          }
        } else {
          // User is browsing as guest - can still view
          setUser(null);
        }
      } catch (error) {
        // User not logged in - can still view
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
    if (item?.author_username) {
      return item.author_username;
    }
    if (item?.author_id && usersMap[item.author_id]) {
      return usersMap[item.author_id].username;
    }
    return 'User';
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const commentData = {
        thread_id: thread.id,
        content: newComment.trim(),
        author_id: user.id,
        author_username: user.username,
        parent_comment_id: replyingTo || ""
      };

      await base44.entities.ForumComment.create(commentData);
      
      setNewComment("");
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
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-gray-50">
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
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <UserIcon className="w-4 h-4 mr-1" />
                    @{getAuthorDisplay(thread)}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {format(new Date(thread.created_date), "MMM d, yyyy 'at' h:mm a")}
                  </div>
                </div>
              </div>
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
            <div className="prose max-w-none mb-4">
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
                    <div className="bg-gray-100 p-3 rounded-lg mb-2">
                      <p className="text-sm text-gray-600">
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
                  <p className="text-xs text-gray-500 mt-1">
                    {newComment.length}/500 characters
                  </p>
                </div>
                <Button 
                  type="submit" 
                  disabled={!newComment.trim() || isSubmitting}
                  className="bg-purple-500 hover:bg-purple-600"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Posting..." : "Post Comment"}
                </Button>
              </form>
            ) : !user || user.needsRegistration ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600 mb-4">
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
                <p className="text-gray-600">This discussion has been locked</p>
              </div>
            ) : null}

            <div className="space-y-4">
              {comments.filter(comment => !comment.parent_comment_id).map((comment) => (
                <div key={comment.id} className="border-l-2 border-purple-200 pl-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <UserIcon className="w-4 h-4" />
                      <span className="font-medium">@{getAuthorDisplay(comment)}</span>
                      <span className="text-sm text-gray-500">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReport("comment", comment.id)}
                      >
                        <Flag className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-2">
                    {comment.content}
                  </p>
                  
                  {/* Replies */}
                  <div className="ml-6 space-y-3">
                    {comments.filter(reply => reply.parent_comment_id === comment.id).map((reply) => (
                      <div key={reply.id} className="border-l border-gray-200 pl-3">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center space-x-2">
                            <UserIcon className="w-3 h-3" />
                            <span className="font-medium text-sm">@{getAuthorDisplay(reply)}</span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(reply.created_date), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReport("comment", reply.id)}
                            className="p-1"
                          >
                            <Flag className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-gray-700 text-sm">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {comments.length === 0 && (
                <div className="text-center py-8">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No comments yet</h3>
                  <p className="text-gray-500">Be the first to share your thoughts!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}