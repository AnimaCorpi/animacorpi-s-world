import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
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
  Users
} from "lucide-react";
import { format } from "date-fns";

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
  const [followRecord, setFollowRecord] = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [notifyThreads, setNotifyThreads] = useState(true);
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

      const users = await base44.entities.User.filter({ id: userId });
      if (!users.length) { navigate("/"); return; }
      const pu = users[0];
      setProfileUser(pu);

      const [followers, allThreads] = await Promise.all([
        base44.entities.Follow.filter({ following_id: userId }),
        base44.entities.ForumThread.filter({ author_id: userId }, "-created_date", 15)
      ]);
      setFollowersCount(followers.length);

      if (viewerData) {
        const myFollow = followers.find(f => f.follower_id === viewerData.id);
        setFollowRecord(myFollow || null);
        if (myFollow) setNotifyThreads(myFollow.notify_forum_threads !== false);
      }

      // Age-gate NSFW content
      const viewerAge = viewerData ? getAge(viewerData.birthdate) : null;
      const isUnderage = viewerAge === null || viewerAge < 18;
      setThreads(isUnderage ? allThreads.filter(t => !t.is_nsfw) : allThreads);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profileUser) return null;

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
                  <span>Joined {format(new Date(profileUser.created_date), "MMMM yyyy")}</span>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-6 mt-3">
                  <div className="text-center">
                    <p className="font-bold text-foreground">{followersCount}</p>
                    <p className="text-xs text-muted-foreground">Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-foreground">{threads.length}</p>
                    <p className="text-xs text-muted-foreground">Threads</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 items-center">
                {isOwnProfile ? (
                  <Link to={createPageUrl("Profile")}>
                    <Button variant="outline" className="w-full">Edit Profile</Button>
                  </Link>
                ) : (
                  <>
                    <Button
                      onClick={handleFollow}
                      disabled={isFollowLoading}
                      variant={followRecord ? "secondary" : "default"}
                      className={followRecord ? "" : "bg-purple-500 hover:bg-purple-600 text-white"}
                    >
                      {followRecord ? <><UserCheck className="w-4 h-4 mr-1" />Following</> : <><UserPlus className="w-4 h-4 mr-1" />Follow</>}
                    </Button>
                    {followRecord && (
                      <button
                        onClick={handleNotifyToggle}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                          notifyThreads
                            ? 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100'
                            : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200'
                        }`}
                        title="Toggle forum thread email notifications"
                      >
                        {notifyThreads ? '🔔 Notify new threads' : '🔕 Muted threads'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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
                  <Link key={thread.id} to={`/ForumThread?id=${thread.id}`}>
                    <div className="p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{thread.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {thread.content.replace(/<[^>]*>/g, '').substring(0, 120)}
                          </p>
                          <span className="text-xs text-muted-foreground mt-1 block">
                            {format(new Date(thread.created_date), "MMM d, yyyy")}
                          </span>
                        </div>
                        {thread.is_nsfw && <Badge variant="destructive" className="shrink-0">NSFW</Badge>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}