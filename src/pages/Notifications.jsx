import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Trash2, MessageSquare, BookOpen, User as UserIcon, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import PullToRefresh from "@/components/PullToRefresh";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      const userNotifications = await base44.entities.Notification.filter({ user_id: userData.id }, "-created_date");
      setNotifications(userNotifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const markAsRead = async (notificationId) => {
    await base44.entities.Notification.update(notificationId, { read: true });
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const deleteNotification = async (notificationId) => {
    await base44.entities.Notification.delete(notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getNotificationIcon = (type) => {
    const icons = {
      chapter_update: <BookOpen className="w-5 h-5 text-blue-500" aria-hidden="true" />,
      forum_reply: <MessageSquare className="w-5 h-5 text-green-500" aria-hidden="true" />,
      admin_message: <UserIcon className="w-5 h-5 text-purple-500" aria-hidden="true" />,
      story_update: <BookOpen className="w-5 h-5 text-orange-500" aria-hidden="true" />
    };
    return icons[type] || <Bell className="w-5 h-5 text-gray-500" aria-hidden="true" />;
  };

  const getNotificationColor = (type) => {
    const colors = {
      chapter_update: "bg-blue-50 border-blue-200",
      forum_reply: "bg-green-50 border-green-200",
      admin_message: "bg-purple-50 border-purple-200",
      story_update: "bg-orange-50 border-orange-200"
    };
    return colors[type] || "bg-gray-50 border-gray-200";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Bell className="w-8 h-8 mr-3" aria-hidden="true" />
                Notifications
              </h1>
              <p className="text-gray-600 mt-1">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="outline"
                aria-label="Mark all notifications as read"
                className="min-h-[44px]"
              >
                <Check className="w-4 h-4 mr-2" aria-hidden="true" />
                Mark All Read
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`transition-all duration-200 ${
                  !notification.read
                    ? `${getNotificationColor(notification.type)} border-l-4`
                    : 'bg-white border-gray-200'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-4 flex-1 min-w-0">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <Badge className="bg-blue-500 text-white">New</Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-3">{notification.message}</p>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-1" aria-hidden="true" />
                          {format(new Date(notification.created_date), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {notification.action_url && (
                        <Link to={notification.action_url}>
                          <Button
                            size="sm"
                            onClick={() => !notification.read && markAsRead(notification.id)}
                            className="bg-purple-500 hover:bg-purple-600 min-h-[44px] min-w-[44px]"
                            aria-label={`View: ${notification.title}`}
                          >
                            View
                          </Button>
                        </Link>
                      )}
                      {!notification.read && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markAsRead(notification.id)}
                          aria-label="Mark as read"
                          className="min-h-[44px] min-w-[44px]"
                        >
                          <Check className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteNotification(notification.id)}
                        className="text-red-600 hover:text-red-800 min-h-[44px] min-w-[44px]"
                        aria-label="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {notifications.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" aria-hidden="true" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No notifications yet</h3>
                  <p className="text-gray-500">
                    You'll receive notifications here when there are new chapters, forum replies, or messages.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}