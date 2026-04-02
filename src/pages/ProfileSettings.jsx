import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AccountDeletionModal from "../components/AccountDeletionModal";
import ProfileActivity from "../components/ProfileActivity";

export default function ProfileSettings() {
  const [user, setUser] = useState(null);
  const [userThreads, setUserThreads] = useState([]);
  const [userReplies, setUserReplies] = useState([]);
  const [savedThreads, setSavedThreads] = useState([]);
  const [backgroundImages, setBackgroundImages] = useState([]);
  const [profileData, setProfileData] = useState({
    username: "",
    avatar_url: "",
    notification_preferences: {
      email_notifications: true,
      sms_notifications: false,
      forum_replies: true,
      new_stories: true,
      admin_messages: true,
      chapter_updates: true
    },
    notification_email: "",
    phone_number: "",
    theme_preferences: {
      background_color: "#fef7ff",
      taskbar_color: "#e879f9",
      background_image: "",
      transparent_banners: false
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (!isAuthenticated) {
        base44.auth.redirectToLogin();
        return;
      }
      loadUserData();
    };
    checkAuth();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      setProfileData({
        username: userData.username || "",
        avatar_url: userData.avatar_url || "",
        notification_preferences: userData.notification_preferences ? {
          email_notifications: userData.notification_preferences.email_notifications ?? true,
          sms_notifications: userData.notification_preferences.sms_notifications ?? false,
          forum_replies: userData.notification_preferences.forum_replies ?? true,
          new_stories: userData.notification_preferences.new_stories ?? true,
          admin_messages: userData.notification_preferences.admin_messages ?? true,
          chapter_updates: userData.notification_preferences.chapter_updates ?? true
        } : {
          email_notifications: true,
          sms_notifications: false,
          forum_replies: true,
          new_stories: true,
          admin_messages: true,
          chapter_updates: true
        },
        notification_email: userData.notification_email || userData.email,
        phone_number: userData.phone_number || "",
        theme_preferences: userData.theme_preferences ? {
          background_color: userData.theme_preferences.background_color ?? "#fef7ff",
          taskbar_color: userData.theme_preferences.taskbar_color ?? "#e879f9",
          background_image: userData.theme_preferences.background_image ?? "",
          transparent_banners: userData.theme_preferences.transparent_banners ?? false
        } : {
          background_color: "#fef7ff",
          taskbar_color: "#e879f9",
          background_image: "",
          transparent_banners: false
        }
      });

      const [bookmarks, backgrounds] = await Promise.all([
        base44.entities.ForumBookmark.filter({ user_id: userData.id }, "-created_date"),
        base44.entities.BackgroundImage.filter({ active: true })
      ]);
      setBackgroundImages(backgrounds);

      if (bookmarks.length > 0) {
        const saved = await Promise.all(bookmarks.map(b => base44.entities.ForumThread.filter({ id: b.thread_id })));
        setSavedThreads(saved.flat());
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
    setIsLoading(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfileData(prev => ({ ...prev, avatar_url: file_url }));
      setMessage("Avatar uploaded successfully!");
      setError("");
    } catch (error) {
      setError("Failed to upload avatar. Please try again.");
      setMessage("");
      console.error("Error uploading avatar:", error);
    }
    setUploadingAvatar(false);
  };

  const handleBackgroundUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingBackground(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfileData(prev => ({
        ...prev,
        theme_preferences: {
          ...prev.theme_preferences,
          background_image: file_url
        }
      }));
      setMessage("Background image uploaded successfully!");
      setError("");
    } catch (error) {
      setError("Failed to upload background image. Please try again.");
      setMessage("");
      console.error("Error uploading background:", error);
    }
    setUploadingBackground(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      if (profileData.username !== user.username) {
        if (!/^[a-zA-Z0-9_]+$/.test(profileData.username)) {
          setError("Username can only contain letters, numbers, and underscores.");
          setIsSaving(false);
          return;
        }

        const existingUsers = await base44.entities.User.filter({ username: profileData.username.toLowerCase() });
        if (existingUsers.some(u => u.id !== user.id)) {
          setError("Username already taken. Please choose another.");
          setIsSaving(false);
          return;
        }
      }

      const updateData = {
        username: profileData.username.toLowerCase(),
        avatar_url: profileData.avatar_url,
        notification_preferences: {
          email_notifications: profileData.notification_preferences.email_notifications,
          sms_notifications: profileData.notification_preferences.sms_notifications,
          forum_replies: profileData.notification_preferences.forum_replies,
          new_stories: profileData.notification_preferences.new_stories,
          admin_messages: profileData.notification_preferences.admin_messages !== false,
          chapter_updates: profileData.notification_preferences.chapter_updates !== false,
        },
        notification_email: profileData.notification_email,
        phone_number: profileData.phone_number,
        theme_preferences: {
          background_color: profileData.theme_preferences.background_color,
          taskbar_color: profileData.theme_preferences.taskbar_color,
          background_image: profileData.theme_preferences.background_image,
          transparent_banners: profileData.theme_preferences.transparent_banners
        }
      };

      await base44.auth.updateMe(updateData);

      setMessage("Profile updated successfully! Page will reload to apply theme changes.");
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      setError("Failed to update profile. Please try again.");
      console.error("Error updating profile:", error);
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-foreground">Settings</h1>
          <p className="text-gray-600 dark:text-muted-foreground mt-1">Manage your account settings and preferences</p>
        </div>

        {message && (
          <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
            <Check className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 gap-1 p-1 h-auto">
            <TabsTrigger value="profile" className="text-xs sm:text-sm py-2 px-1">Profile</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm py-2 px-1">Notifs</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm py-2 px-1">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserIcon className="w-5 h-5" />
                  <span>Profile Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    {profileData.avatar_url ? (
                      <img 
                        src={profileData.avatar_url} 
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-12 h-12 text-purple-500" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      id="avatar-upload"
                      disabled={uploadingAvatar}
                    />
                    <label 
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 right-0 bg-purple-500 text-white p-2 rounded-full cursor-pointer hover:bg-purple-600 transition-colors"
                    >
                      {uploadingAvatar ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </label>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{user?.full_name}</h3>
                    <p className="text-gray-600 dark:text-muted-foreground">@{user?.username}</p>
                    <p className="text-sm text-gray-500 dark:text-muted-foreground">
                      Joined {format(new Date(user?.created_date), "MMMM yyyy")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="username">Username (Can be changed anytime)</Label>
                    <Input
                      id="username"
                      value={profileData.username}
                      onChange={(e) => setProfileData(prev => ({ 
                        ...prev, 
                        username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') 
                      }))}
                      placeholder="your_username"
                      pattern="[a-zA-Z0-9_]+"
                    />
                    <p className="text-xs text-gray-500 dark:text-muted-foreground mt-1">Only letters, numbers, and underscores allowed</p>
                  </div>
                  <div>
                    <Label>Birthdate</Label>
                    <Input
                      value={format(new Date(user?.birthdate), "MMMM d, yyyy")}
                      disabled
                      className="bg-gray-50 dark:bg-muted"
                    />
                    <p className="text-xs text-gray-500 dark:text-muted-foreground mt-1">Birthdate cannot be changed after registration</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="w-5 h-5" />
                  <span>Theme & Appearance</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">Customize your visual experience</p>
              </CardHeader>
              <CardContent>
                <ThemeSettings
                  themePrefs={profileData.theme_preferences}
                  onChange={(key, value) => setProfileData(prev => ({
                    ...prev,
                    theme_preferences: { ...prev.theme_preferences, [key]: value }
                  }))}
                  backgroundImages={backgroundImages}
                  onBackgroundUpload={handleBackgroundUpload}
                  uploadingBackground={uploadingBackground}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>Notification Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="notification-email">Notification Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="notification-email"
                      type="email"
                      value={profileData.notification_email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, notification_email: e.target.value }))}
                      placeholder="Email for notifications"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone-number">Phone Number (for SMS)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone-number"
                      type="tel"
                      value={profileData.phone_number}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone_number: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Notification Types</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-gray-600 dark:text-muted-foreground">Receive notifications via email</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profileData.notification_preferences.email_notifications}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          notification_preferences: {
                            ...prev.notification_preferences,
                            email_notifications: e.target.checked
                          }
                        }))}
                        className="w-4 h-4"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">SMS Notifications</p>
                        <p className="text-sm text-gray-600 dark:text-muted-foreground">Receive notifications via text message</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profileData.notification_preferences.sms_notifications}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          notification_preferences: {
                            ...prev.notification_preferences,
                            sms_notifications: e.target.checked
                          }
                        }))}
                        className="w-4 h-4"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Forum Replies</p>
                        <p className="text-sm text-gray-600 dark:text-muted-foreground">Get notified when someone replies to your posts</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profileData.notification_preferences.forum_replies}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          notification_preferences: {
                            ...prev.notification_preferences,
                            forum_replies: e.target.checked
                          }
                        }))}
                        className="w-4 h-4"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">New Stories</p>
                        <p className="text-sm text-gray-600 dark:text-muted-foreground">Get notified when new stories are published</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profileData.notification_preferences.new_stories}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          notification_preferences: {
                            ...prev.notification_preferences,
                            new_stories: e.target.checked
                          }
                        }))}
                        className="w-4 h-4"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Admin Messages</p>
                        <p className="text-sm text-gray-600 dark:text-muted-foreground">Receive important messages from site administrators</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profileData.notification_preferences.admin_messages}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          notification_preferences: {
                            ...prev.notification_preferences,
                            admin_messages: e.target.checked
                          }
                        }))}
                        className="w-4 h-4"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Chapter Updates</p>
                        <p className="text-sm text-gray-600 dark:text-muted-foreground">Get notified about new chapters for followed stories</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profileData.notification_preferences.chapter_updates}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          notification_preferences: {
                            ...prev.notification_preferences,
                            chapter_updates: e.target.checked
                          }
                        }))}
                        className="w-4 h-4"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Your Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProfileActivity user={user} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving || uploadingAvatar || uploadingBackground}
            className="bg-purple-500 hover:bg-purple-600"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="mt-8 border border-red-200 dark:border-red-900 rounded-xl p-6 bg-red-50/50 dark:bg-red-950/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-bold text-red-700">Danger Zone</h2>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
          <Button
            variant="outline"
            className="border-red-400 text-red-600 hover:bg-red-100"
            onClick={() => setShowDeleteModal(true)}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Delete My Account
          </Button>
        </div>

        {showDeleteModal && (
          <AccountDeletionModal user={user} onClose={() => setShowDeleteModal(false)} />
        )}
      </div>
    </div>
  );
}