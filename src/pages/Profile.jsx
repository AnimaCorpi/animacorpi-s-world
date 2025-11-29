
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { BackgroundImage } from "@/entities/BackgroundImage";
import { ForumThread } from "@/entities/ForumThread";
import { UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User as UserIcon, 
  Camera, 
  Save, 
  Bell, 
  Palette,
  MessageSquare,
  Calendar,
  Mail,
  Phone,
  Upload,
  Check
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [userThreads, setUserThreads] = useState([]);
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
      transparent_banners: false // New field
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await User.me();
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
          transparent_banners: userData.theme_preferences.transparent_banners ?? false // New field initialization
        } : {
          background_color: "#fef7ff",
          taskbar_color: "#e879f9",
          background_image: "",
          transparent_banners: false // New field default
        }
      });

      const threads = await ForumThread.filter({ author_id: userData.id }, "-created_date");
      setUserThreads(threads);

      const backgrounds = await BackgroundImage.filter({ active: true });
      setBackgroundImages(backgrounds);
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
      const { file_url } = await UploadFile({ file });
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
      const { file_url } = await UploadFile({ file });
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
      // Validate username if changed
      if (profileData.username !== user.username) {
        if (!/^[a-zA-Z0-9_]+$/.test(profileData.username)) {
          setError("Username can only contain letters, numbers, and underscores.");
          setIsSaving(false);
          return;
        }

        const existingUsers = await User.filter({ username: profileData.username.toLowerCase() });
        if (existingUsers.some(u => u.id !== user.id)) {
          setError("Username already taken. Please choose another.");
          setIsSaving(false);
          return;
        }
      }

      // Update user data with explicit field mapping
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
          transparent_banners: profileData.theme_preferences.transparent_banners // Include new field
        }
      };

      await User.updateMyUserData(updateData);

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

  const calculateAge = (birthdate) => {
    if (!birthdate) return "Unknown";
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
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
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="activity">My Activity</TabsTrigger>
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
                {/* Avatar */}
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
                    <p className="text-gray-600">@{user?.username}</p>
                    <p className="text-sm text-gray-500">
                      Joined {format(new Date(user?.created_date), "MMMM yyyy")}
                    </p>
                  </div>
                </div>

                {/* Basic Info */}
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
                    <p className="text-xs text-gray-500 mt-1">Only letters, numbers, and underscores allowed</p>
                  </div>
                  <div>
                    <Label>Birthdate</Label>
                    <Input
                      value={format(new Date(user?.birthdate), "MMMM d, yyyy")}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Birthdate cannot be changed after registration</p>
                  </div>
                </div>
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
                        <p className="text-sm text-gray-600">Receive notifications via email</p>
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
                        <p className="text-sm text-gray-600">Receive notifications via text message</p>
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
                        <p className="text-sm text-gray-600">Get notified when someone replies to your posts</p>
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
                        <p className="text-sm text-gray-600">Get notified when new stories are published</p>
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
                        <p className="text-sm text-gray-600">Receive important messages from site administrators</p>
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
                        <p className="text-sm text-gray-600">Get notified about new chapters for followed stories</p>
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
          
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="w-5 h-5" />
                  <span>Theme Preferences</span>
                </CardTitle>
                <p className="text-sm text-gray-600">Customize your visual experience</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="background-color">Background Color</Label>
                  <div className="flex items-center space-x-4 mt-2">
                    <input
                      id="background-color"
                      type="color"
                      value={profileData.theme_preferences.background_color}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        theme_preferences: {
                          ...prev.theme_preferences,
                          background_color: e.target.value
                        }
                      }))}
                      className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <Input
                      value={profileData.theme_preferences.background_color}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        theme_preferences: {
                          ...prev.theme_preferences,
                          background_color: e.target.value
                        }
                      }))}
                      className="font-mono flex-1"
                      placeholder="#fef7ff"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="taskbar-color">Navigation Bar Color</Label>
                  <div className="flex items-center space-x-4 mt-2">
                    <input
                      id="taskbar-color"
                      type="color"
                      value={profileData.theme_preferences.taskbar_color}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        theme_preferences: {
                          ...prev.theme_preferences,
                          taskbar_color: e.target.value
                        }
                      }))}
                      className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <Input
                      value={profileData.theme_preferences.taskbar_color}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        theme_preferences: {
                          ...prev.theme_preferences,
                          taskbar_color: e.target.value
                        }
                      }))}
                      className="font-mono flex-1"
                      placeholder="#e879f9"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="transparent-banners">Banner Transparency</Label>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="transparent-banners"
                        checked={profileData.theme_preferences.transparent_banners}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          theme_preferences: {
                            ...prev.theme_preferences,
                            transparent_banners: e.target.checked
                          }
                        }))}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="transparent-banners" className="text-sm">
                        Make page banners transparent
                      </Label>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    When enabled, page headers will be transparent to show your background
                  </p>
                </div>

                <div>
                  <Label>Custom Background Image</Label>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm">Upload Custom Background</Label>
                      <div className="flex items-center space-x-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBackgroundUpload}
                          className="hidden"
                          id="background-upload"
                          disabled={uploadingBackground}
                        />
                        <label htmlFor="background-upload">
                          <Button variant="outline" asChild disabled={uploadingBackground}>
                            <span>
                              <Upload className="w-4 h-4 mr-2" />
                              {uploadingBackground ? "Uploading..." : "Upload Image"}
                            </span>
                          </Button>
                        </label>
                        {profileData.theme_preferences.background_image && (
                          <Button
                            variant="outline"
                            onClick={() => setProfileData(prev => ({
                              ...prev,
                              theme_preferences: {
                                ...prev.theme_preferences,
                                background_image: ""
                              }
                            }))}
                          >
                            Remove Background
                          </Button>
                        )}
                      </div>
                    </div>

                    {backgroundImages.length > 0 && (
                      <div>
                        <Label className="text-sm">Choose from Available Backgrounds</Label>
                        <div className="grid grid-cols-3 gap-3 mt-2">
                          {backgroundImages.map((bg) => (
                            <div
                              key={bg.id}
                              className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-colors ${
                                profileData.theme_preferences.background_image === bg.image_url
                                  ? 'border-purple-500'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => setProfileData(prev => ({
                                ...prev,
                                theme_preferences: {
                                  ...prev.theme_preferences,
                                  background_image: bg.image_url
                                }
                              }))}
                            >
                              <img
                                src={bg.thumbnail_url || bg.image_url}
                                alt={bg.name}
                                className="w-full h-20 object-cover"
                              />
                              {profileData.theme_preferences.background_image === bg.image_url && (
                                <div className="absolute inset-0 bg-purple-500 bg-opacity-20 flex items-center justify-center">
                                  <Check className="w-6 h-6 text-purple-600" />
                                </div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                                {bg.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-gray-50">
                  <h3 className="font-medium mb-2">Preview</h3>
                  <div 
                    className="h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden"
                    style={{ 
                      backgroundColor: profileData.theme_preferences.background_color,
                      backgroundImage: profileData.theme_preferences.background_image 
                        ? `url(${profileData.theme_preferences.background_image})`
                        : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    <div 
                      className="px-4 py-2 rounded text-white text-sm font-medium relative z-10"
                      style={{ backgroundColor: profileData.theme_preferences.taskbar_color }}
                    >
                      Sample Navigation
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
                  <span>My Forum Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userThreads.map((thread) => (
                    <Link to={createPageUrl(`ForumThread?id=${thread.id}`)} key={thread.id}>
                      <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{thread.title}</h3>
                            <p className="text-gray-600 mt-1 line-clamp-2">
                              {thread.content.substring(0, 150).replace(/<[^>]*>/g, '')}...
                            </p>
                            <div className="flex items-center space-x-4 mt-2">
                              <div className="flex items-center text-sm text-gray-500">
                                <Calendar className="w-4 h-4 mr-1" />
                                {format(new Date(thread.created_date), "MMM d, yyyy")}
                              </div>
                              {thread.tags && thread.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {thread.tags.map((tag, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {thread.is_nsfw && (
                            <Badge variant="destructive" className="ml-4">
                              NSFW
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}

                  {userThreads.length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No Forum Activity</h3>
                      <p className="text-gray-500">You haven't created any forum threads yet.</p>
                    </div>
                  )}
                </div>
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
      </div>
    </div>
  );
}
