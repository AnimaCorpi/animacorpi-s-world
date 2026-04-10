import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, Shield, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm]);

  const loadUsers = async () => {
    try {
      const userData = await base44.entities.User.list("-created_date");
      setUsers(userData);
    } catch (error) {
      console.error("Error loading users:", error);
    }
    setIsLoading(false);
  };

  const filterUsers = () => {
    if (!searchTerm) {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(
        users.filter(user => 
          user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
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

  const isUnderage = (birthdate) => {
    const age = calculateAge(birthdate);
    return typeof age === 'number' && age < 18;
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This will also delete all their forum posts and comments.`)) {
      return;
    }

    try {
      // Delete user's forum threads and comments
      const userThreads = await base44.entities.ForumThread.filter({ author_id: userId });
      const userComments = await base44.entities.ForumComment.filter({ author_id: userId });
      
      for (const thread of userThreads) {
        await base44.entities.ForumThread.delete(thread.id);
      }
      
      for (const comment of userComments) {
        await base44.entities.ForumComment.delete(comment.id);
      }
      
      // Delete the user
      await base44.entities.User.delete(userId);
      
      loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>User Management</span>
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Total users: {users.length} | 
            Underage: {users.filter(u => isUnderage(u.birthdate)).length} | 
            Adults: {users.filter(u => !isUnderage(u.birthdate) && u.birthdate).length}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-4">
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user.username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 dark:text-purple-300 font-semibold text-lg">
                        {user.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold">{user.username || "No username"}</h4>
                      {user.role === 'admin' && (
                        <Badge className="bg-purple-100 text-purple-700">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {isUnderage(user.birthdate) && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Under 18
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><span className="font-medium">Email:</span> {user.email}</p>
                      <p><span className="font-medium">Full Name:</span> {user.full_name || "Not provided"}</p>
                      {user.birthdate && (
                        <p>
                          <span className="font-medium">Age:</span> {calculateAge(user.birthdate)} years old
                          <span className="text-muted-foreground ml-2">
                            (Born: {format(new Date(user.birthdate), "MMM d, yyyy")})
                          </span>
                        </p>
                      )}
                      <p className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span className="font-medium">Joined:</span> 
                        <span className="ml-1">{format(new Date(user.created_date), "MMM d, yyyy")}</span>
                      </p>
                    </div>
                    
                    {user.notification_preferences && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-foreground">Notification Preferences:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.notification_preferences.email_notifications && (
                            <Badge variant="outline" className="text-xs">Email</Badge>
                          )}
                          {user.notification_preferences.sms_notifications && (
                            <Badge variant="outline" className="text-xs">SMS</Badge>
                          )}
                          {user.notification_preferences.forum_replies && (
                            <Badge variant="outline" className="text-xs">Forum Replies</Badge>
                          )}
                          {user.notification_preferences.new_stories && (
                            <Badge variant="outline" className="text-xs">New Stories</Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {user.role !== 'admin' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteUser(user.id, user.username || user.email)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-8">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No users found</h3>
          <p className="text-gray-500">
            {searchTerm ? "Try adjusting your search terms." : "No users have registered yet."}
          </p>
        </div>
      )}
    </div>
  );
}