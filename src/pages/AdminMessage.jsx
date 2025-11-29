import React, { useState, useEffect } from "react";
import { Notification } from "@/entities/Notification";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ArrowLeft, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdminMessage() {
  const [notification, setNotification] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMessageData();
  }, []);

  const loadMessageData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const notificationId = urlParams.get('id');
      
      if (!notificationId) {
        setError("Message not found");
        setIsLoading(false);
        return;
      }

      const userData = await User.me();
      setUser(userData);

      const notifications = await Notification.filter({ id: notificationId });
      if (notifications.length === 0) {
        setError("Message not found");
        setIsLoading(false);
        return;
      }

      const currentNotification = notifications[0];
      
      // Check if this notification belongs to the current user
      if (currentNotification.user_id !== userData.id && userData.role !== 'admin') {
        setError("You don't have permission to view this message");
        setIsLoading(false);
        return;
      }

      setNotification(currentNotification);
      
      // Mark as read if it's unread
      if (!currentNotification.read) {
        await Notification.update(notificationId, { read: true });
        setNotification(prev => ({ ...prev, read: true }));
      }
    } catch (error) {
      console.error("Error loading message:", error);
      setError("Failed to load message");
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-xl text-gray-600 mb-4">{error}</p>
          <Link to={createPageUrl("Notifications")}>
            <Button>← Back to Notifications</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!notification) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Notifications")} className="inline-flex items-center text-purple-600 hover:text-purple-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Notifications
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    {notification.title}
                  </CardTitle>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                    <Badge className="bg-purple-100 text-purple-700">
                      From: Anamaria (Admin)
                    </Badge>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {format(new Date(notification.created_date), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-purple-400">
              <div className="prose max-w-none">
                <div 
                  className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg"
                  style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                >
                  {notification.message}
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-500">
                This message was sent to you by Anamaria, the admin of this community. 
                {notification.action_url && (
                  <span> You can also visit the related page if there's additional context.</span>
                )}
              </p>
              
              {notification.action_url && (
                <div className="mt-4">
                  <Link to={notification.action_url}>
                    <Button>View Related Content</Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}