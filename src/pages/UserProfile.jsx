import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { getUserProfile } from "@/functions/getUserProfile";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User as UserIcon,
  Calendar,
  MessageSquare,
  UserPlus,
  UserCheck,
  Users,
  Bookmark,
  MoreVertical,
  Settings,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import KarmaBadge from "../components/KarmaBadge";
import FollowersListModal from "../components/FollowersListModal";
import ReportUserModal from "../components/ReportUserModal";
import { format } from "date-fns";

function safeFormat(date, fmt) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return format(d, fmt);
}

function getAge(birthdate) {
  if (!birthdate) return null;
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function UserProfile() {
  const [profileUser, setProfileUser] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [threads, setThreads] = useState([]);
  const [favoritedPosts, setFavoritedPosts] = useState([]);
  const [followRecord, setFollowRecord] = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [savedThreads, setSavedThreads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [notifyThreads, setNotifyThreads] = useState(true);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [reportingUser, setReportingUser] = useState(false);
  const [deletingThreadId, setDeletingThreadId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userId = params.get("id");
    if (!userId) return;
    loadData(userId);
  }, [location.search]);

  const loadData = async (userId) => {
    setIsLoading(true);
    try {
      const isAuth = await base44.auth.isAuthenticated();
      let viewerData = null;
      if (isAuth) {
        viewerData = await base44.auth.me();
        setViewer(viewerData);
      }

      const profileRes = await getUserProfile({ userId });
      const profileData = profileRes.data;
      if (!profileData || profileData.error) { navigate("/"); return; }
      setProfileUser(profileData);

      const [followers, following, allThreads, favorites, bookmarks] = await Promise.all([
        base44.entities.Follow.filter({ following_id: userId }),
        base44.entities.Follow.filter({ follower_id: userId }),
        base44.entities.ForumThread.filter({ author_id: userId }, "-created_date", 15),
        base44.entities.PostFavorite.filter({ user_id: userId }),
        base44.entities.ForumBookmark.filter({ user_id: userId })
      ]);
      setFollowersCount(followers.length);
      setFollowingCount(following.length);

      if (viewerData) {
        const myFollow = followers.find(f => f.follower_id === viewerData.id);
        setFollowRecord(myFollow || null);
        if (myFollow) setNotifyThreads(myFollow.notify_forum_threads !== false);
      }

      // Age-gate NSFW content
      const viewerAge = viewerData ? getAge(viewerData.birthdate) : null;
      const isUnderage = viewerAge === null || viewerAge < 18;
      setThreads(isUnderage ? allThreads.filter(t => !t.is_nsfw) : allThreads);

      // Load favorited posts
      if (favorites.length > 0) {
        const postFetches = await Promise.all(favorites.map(f => base44.entities.Post.filter({ id: f.post_id, published: true })));
        setFavoritedPosts(postFetches.flat());
      }

      // Load saved threads
      if (bookmarks.length > 0) {
        const saved = await Promise.all(bookmarks.map(b => base44.entities.ForumThread.filter({ id: b.thread_id })));
        setSavedThreads(saved.flat());
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
    setIsLoading(false);
  };

  // Temporarily apply this user's wallpaper; revert on unmount
  useEffect(() => {
    if (!profileUser) return;
    // Use their background image if set, otherwise dispatch empty string to show default (not viewer's own wallpaper)
    const img = profileUser.theme_preferences?.background_image || "";
    window.dispatchEvent(new CustomEvent("wallpaper-override", { detail: { image: img } }));
    return () => {
      window.dispatchEvent(new CustomEvent("wallpaper-override", { detail: { image: null } }));
    };
  }, [profileUser]);

  const handleFollow = async () => {
    if (!viewer) { base44.auth.redirectToLogin(); return; }
    setIsFollowLoading(true);
    try {
      if (followRecord) {
        await base44.entities.Follow.delete(followRecord.id);
        setFollowRecord(null);
        setFollowersCount(c => c - 1);
      } else {
        const created = await base44.entities.Follow.create({
          follower_id: viewer.id,
          following_id: profileUser.id,
          notify_forum_threads: notifyThreads
        });
        setFollowRecord(created);
        setFollowersCount(c => c + 1);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
    setIsFollowLoading(false);
  };

  const handleNotifyToggle = async () => {
    if (!followRecord) return;
    const newVal = !notifyThreads;
    setNotifyThreads(newVal);
    try {
      await base44.entities.Follow.update(followRecord.id, { notify_forum_threads: newVal });
    } catch (error) {
      console.error("Error updating notification preference:", error);
      setNotifyThreads(!newVal);
    }
  };

  const handleDeleteThread = async (threadId) => {
    if (!confirm("Are you sure you want to delete this thread?")) return;
    setDeletingThreadId(threadId);
    try {
      await base44.entities.ForumThread.delete(threadId);
      setThreads(threads.filter(t => t.id !== threadId));
    } catch (error) {
      console.error("Error deleting thread:", error);
    }
    setDeletingThreadId(null);
  };

  const handleRemoveFavorite = async (postId) => {
    try {
      const favorites = await base44.entities.PostFavorite.filter({
        post_id: postId,
        user_id: viewer?.id
      });
      if (favorites.length > 0) {
        await base44.entities.PostFavorite.delete(favorites[0].id);
        setFavoritedPosts(favoritedPosts.filter(p => p.id !== postId));
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">User not found.</p>
          <Link to={createPageUrl("Home")}>
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOwnProfile = viewer?.id === profileUser.id;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {profileUser.avatar_url ? (
                <img
                  src={profileUser.avatar_url}
                  alt={profileUser.username}
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-purple-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center ring-4 ring-purple-100">
                  <UserIcon className="w-12 h-12 text-purple-500" />
                </div>
              )}

              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold text-foreground">{profileUser.full_name}</h1>
                <p className="text-muted-foreground">@{profileUser.username}</p>
                <div className="flex items-center justify-center sm:justify-start gap-1 text-sm text-muted-foreground mt-1">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {safeFormat(profileUser.created_date, "MMMM yyyy")}</span>
                </div>
                {profileUser.karma > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <KarmaBadge karma={profileUser.karma} size="md" />
                    <span className="text-xs text-muted-foreground">imas</span>
                  </div>
                )}
                <div className="flex items-center justify-center sm:justify-start gap-6 mt-3">
                  <button
                    onClick={() => setShowFollowersModal(true)}
                    className="text-center hover:opacity-75 transition"
                  >
                    <p className="font-bold text-foreground">{followersCount}</p>
                    <p className="text-xs text-muted-foreground cursor-pointer hover:underline">Followers</p>
                  </button>
                  <div className="text-center">
                    <p className="font-bold text-foreground">{followingCount}</p>
                    <p className="text-xs text-muted-foreground">Following</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-foreground">{threads.length}</p>
                    <p className="text-xs text-muted-foreground">Threads</p>
                  </div>
                  </div>
              </div>

              <div className="flex flex-col gap-2 items-center">
                {isOwnProfile ? (
                    <Link to={createPageUrl("ProfileSettings")}>
                      <Button variant="outline" className="w-full" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </Link>
                  ) : (
                  <div className="flex gap-2 w-full">
                    <Button
                      onClick={handleFollow}
                      disabled={isFollowLoading}
                      variant={followRecord ? "secondary" : "default"}
                      className={`flex-1 ${followRecord ? "" : "bg-purple-500 hover:bg-purple-600 text-white"}`}
                    >
                      {followRecord ? <><UserCheck className="w-4 h-4 mr-1" />Following</> : <><UserPlus className="w-4 h-4 mr-1" />Follow</>}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="px-2">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setReportingUser(true)}>
                          Report User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                {followRecord && (
                  <button
                    onClick={handleNotifyToggle}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors w-full ${
                      notifyThreads
                        ? 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100'
                        : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200'
                    }`}
                    title="Toggle forum thread email notifications"
                  >
                    {notifyThreads ? '🔔 Notify new threads' : '🔕 Muted threads'}
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Favorited Posts */}
        {favoritedPosts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-purple-500" />
                Saved Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {favoritedPosts.map(post => (
                  <div key={post.id} className="p-4 border border-border rounded-lg hover:bg-accent transition-colors flex items-start justify-between">
                    <Link to={`/Post?id=${post.id}`} className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        {post.image_url && (
                          <img src={post.image_url} alt={post.title} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <Badge className="bg-purple-100 text-purple-700 border border-purple-200 capitalize text-xs mb-1">{post.category}</Badge>
                          <h3 className="font-semibold text-foreground truncate">{post.title}</h3>
                          <span className="text-xs text-muted-foreground">
                            {safeFormat(post.created_date, "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    </Link>
                    {isOwnProfile && (
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => handleRemoveFavorite(post.id)}
                         className="ml-2 text-red-600 hover:bg-red-50 shrink-0"
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
                     )}
                  </div>
                ))}
              </div>
            </CardContent>
            </Card>
            )}

            {/* Saved Threads */}
            {savedThreads.length > 0 && isOwnProfile && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-purple-500" />
                    Saved Threads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {savedThreads.map(thread => (
                      <div key={thread.id} className="p-4 border border-border rounded-lg hover:bg-accent transition-colors flex items-start justify-between gap-3">
                        <Link to={`/ForumThread?id=${thread.id}`} className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{thread.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {thread.content.replace(/<[^>]*>/g, '').substring(0, 100)}
                          </p>
                          <span className="text-xs text-muted-foreground mt-1 block">
                            {safeFormat(thread.created_date, "MMM d, yyyy")}
                          </span>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              const toDelete = await base44.entities.ForumBookmark.filter({
                                user_id: viewer?.id,
                                thread_id: thread.id
                              });
                              if (toDelete.length > 0) {
                                await base44.entities.ForumBookmark.delete(toDelete[0].id);
                                setSavedThreads(savedThreads.filter(t => t.id !== thread.id));
                              }
                            } catch (error) {
                              console.error('Error unsaving thread:', error);
                            }
                          }}
                          className="text-red-600 hover:bg-red-50 shrink-0"
                        >
                          <Bookmark className="w-4 h-4 fill-current" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Threads */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Forum Threads
                </CardTitle>
              </CardHeader>
              <CardContent>
                {threads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No public threads yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {threads.map(thread => (
                      <div key={thread.id} className="p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                        <Link to={`/ForumThread?id=${thread.id}`} className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{thread.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {thread.content.replace(/<[^>]*>/g, '').substring(0, 120)}
                            </p>
                            <span className="text-xs text-muted-foreground mt-1 block">
                              {safeFormat(thread.created_date, "MMM d, yyyy")}
                            </span>
                          </div>
                          {thread.is_nsfw && <Badge variant="destructive" className="shrink-0">NSFW</Badge>}
                        </Link>
                        {isOwnProfile && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteThread(thread.id)}
                            disabled={deletingThreadId === thread.id}
                            className="ml-2 text-red-600 hover:bg-red-50 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
      </div>

      <FollowersListModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        profileUser={profileUser}
        viewer={viewer}
      />

      {reportingUser && (
        <ReportUserModal
          reportedUserId={profileUser?.id}
          onClose={() => setReportingUser(false)}
        />
      )}
    </div>
  );
}