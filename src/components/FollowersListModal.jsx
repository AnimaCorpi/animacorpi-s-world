import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MoreVertical, UserPlus, UserMinus, Flag } from "lucide-react";
import ReportUserModal from "./ReportUserModal";

export default function FollowersListModal({ isOpen, onClose, profileUser, viewer }) {
  const [followers, setFollowers] = useState([]);
  const [followerUsers, setFollowerUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [followStates, setFollowStates] = useState({});
  const [reportingUserId, setReportingUserId] = useState(null);

  useEffect(() => {
    if (isOpen && profileUser?.id) {
      loadFollowers();
    }
  }, [isOpen, profileUser?.id]);

  const loadFollowers = async () => {
    setIsLoading(true);
    try {
      const followData = await base44.entities.Follow.filter({ following_id: profileUser.id });
      setFollowers(followData);

      // Load user data for each follower
      const userIds = followData.map(f => f.follower_id);
      const users = await Promise.all(userIds.map(id => base44.entities.User.filter({ id })));
      setFollowerUsers(users.map(u => u[0]).filter(Boolean));

      // Load current viewer's follow states with these followers (bidirectional check)
      if (viewer?.id) {
        const viewerFollowData = await base44.entities.Follow.filter({ follower_id: viewer.id });
        const states = {};
        viewerFollowData.forEach(f => {
          states[f.following_id] = f;
        });
        setFollowStates(states);
      }
    } catch (error) {
      console.error("Error loading followers:", error);
    }
    setIsLoading(false);
  };

  const handleRemoveFollower = async (followerId) => {
    if (!confirm("Remove this follower?")) return;
    try {
      const followerRecord = followers.find(f => f.follower_id === followerId);
      if (followerRecord) {
        await base44.entities.Follow.delete(followerRecord.id);
        setFollowers(followers.filter(f => f.id !== followerRecord.id));
        setFollowerUsers(followerUsers.filter(u => u.id !== followerId));
      }
    } catch (error) {
      console.error("Error removing follower:", error);
    }
  };

  const handleToggleFollow = async (followerId) => {
    if (!viewer) {
      base44.auth.redirectToLogin();
      return;
    }
    try {
      if (followStates[followerId]) {
        await base44.entities.Follow.delete(followStates[followerId].id);
        setFollowStates(prev => {
          const newStates = { ...prev };
          delete newStates[followerId];
          return newStates;
        });
      } else {
        const created = await base44.entities.Follow.create({
          follower_id: viewer.id,
          following_id: followerId
        });
        setFollowStates(prev => ({ ...prev, [followerId]: created }));
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  const isOwnProfile = viewer?.id === profileUser?.id;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Followers</DialogTitle>
            <DialogDescription>
              {followerUsers.length} {followerUsers.length === 1 ? "follower" : "followers"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : followerUsers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No followers yet</div>
            ) : (
              followerUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <Link
                    to={createPageUrl(`UserProfile?id=${user.id}`)}
                    className="flex items-center gap-3 flex-1 hover:opacity-75 transition"
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.username} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-sm font-medium">
                        {user.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!isOwnProfile && (
                        <DropdownMenuItem onClick={() => handleToggleFollow(user.id)}>
                          {followStates[user.id] ? (
                            <>
                              <UserMinus className="w-4 h-4 mr-2" />
                              Unfollow
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-2" />
                              Follow
                            </>
                          )}
                        </DropdownMenuItem>
                      )}
                      {!isOwnProfile && (
                        <DropdownMenuItem onClick={() => setReportingUserId(user.id)}>
                          <Flag className="w-4 h-4 mr-2" />
                          Report
                        </DropdownMenuItem>
                      )}
                      {isOwnProfile && (
                        <DropdownMenuItem
                          onClick={() => handleRemoveFollower(user.id)}
                          className="text-red-600"
                        >
                          <UserMinus className="w-4 h-4 mr-2" />
                          Remove Follower
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {reportingUserId && (
        <ReportUserModal
          reportedUserId={reportingUserId}
          onClose={() => setReportingUserId(null)}
        />
      )}
    </>
  );
}