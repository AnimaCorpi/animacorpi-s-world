
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Notification } from "@/entities/Notification";
import { SendEmail } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Send, 
  Users, 
  Mail, 
  MessageSquare, 
  Check,
  Clock
} from "lucide-react";

export default function UserMessaging() {
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [messageForm, setMessageForm] = useState({
    subject: "",
    message: "",
    sendEmail: true,
    sendNotification: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const userData = await User.list("-created_date");
      setAllUsers(userData.filter(u => u.role !== 'admin')); // Don't include admins
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return 0;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age = age - 1;
    }
    return age;
  };

  const getFilteredUsers = () => {
    switch (filterType) {
      case "adults":
        return allUsers.filter(u => calculateAge(u.birthdate) >= 18);
      case "minors":
        return allUsers.filter(u => u.birthdate && calculateAge(u.birthdate) < 18);
      case "selected":
        return allUsers.filter(u => selectedUserIds.includes(u.id));
      case "all":
      default:
        return allUsers;
    }
  };

  const handleUserSelection = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredUsers = getFilteredUsers();
    const filteredIds = filteredUsers.map(u => u.id);
    const allSelected = filteredIds.every(id => selectedUserIds.includes(id));

    if (allSelected) {
      setSelectedUserIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedUserIds(prev => [...new Set([...prev, ...filteredIds])]);
    }
  };
  
  const handleSendMessage = async () => {
    if (!messageForm.subject || !messageForm.message) {
      setError("Please fill in both subject and message fields.");
      return;
    }

    // Get the actual recipients based on filter type
    let recipients;
    if (filterType === "selected") {
      recipients = allUsers.filter(u => selectedUserIds.includes(u.id));
    } else {
      recipients = getFilteredUsers();
    }
    
    if (recipients.length === 0) {
      setError("No users match the selected criteria.");
      return;
    }

    setIsLoading(true);
    setMessage("");
    setError("");

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const user of recipients) {
        try {
          if (messageForm.sendNotification) {
            await Notification.create({
              user_id: user.id,
              type: "admin_message",
              title: messageForm.subject,
              message: messageForm.message,
              related_id: null,
              action_url: `/AdminMessage?subject=${encodeURIComponent(messageForm.subject)}&message=${encodeURIComponent(messageForm.message)}`,
            });
          }

          if (messageForm.sendEmail && user.notification_preferences?.email_notifications !== false && user.notification_email) {
            await SendEmail({
              to: user.notification_email,
              subject: messageForm.subject,
              body: `Hi ${user.username || user.full_name},

${messageForm.message}

Warmly,
Anamaria

---
This message was sent from Anamaria's World. You can update your notification preferences in your profile settings.`,
            });
          }
          successCount++;
        } catch (err) {
          console.error(`Error sending message to user ${user.id}:`, err);
          errorCount++;
        }
      }

      setMessage(`Message sent successfully to ${successCount} users.${errorCount > 0 ? ` ${errorCount} messages failed to send.` : ''}`);
      setMessageForm({ subject: "", message: "", sendEmail: true, sendNotification: true });
      setSelectedUserIds([]);
      setFilterType("all");
      
    } catch (error) {
      setError("Failed to send messages. Please try again.");
      console.error("Error sending messages:", error);
    }
    
    setIsLoading(false);
  };

  const recipientCount = filterType === "selected" 
    ? allUsers.filter(u => selectedUserIds.includes(u.id)).length
    : getFilteredUsers().length;
    
  const currentlyVisibleUsers = getFilteredUsers();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Message Users</h3>
        <p className="text-sm text-gray-600">Send messages and updates to your community members</p>
      </div>

      {message && (
        <Alert className={message.includes("successfully") ? "border-green-200 bg-green-50" : ""}>
          <Check className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="compose" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="compose">Compose Message</TabsTrigger>
          <TabsTrigger value="recipients">Select Recipients ({recipientCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>Compose Message</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={messageForm.subject}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Message subject..."
                  maxLength={200}
                />
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={messageForm.message}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Your message to the community..."
                  rows={8}
                  className="resize-none"
                  style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                />
                <div className="text-sm text-gray-500 mt-1">
                  Users will be able to view the full message in a properly formatted page.
                </div>
              </div>

              <div className="space-y-3">
                <Label>Delivery Options</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="send-notification"
                    checked={messageForm.sendNotification}
                    onChange={(e) => setMessageForm(prev => ({ ...prev, sendNotification: e.target.checked }))}
                  />
                  <Label htmlFor="send-notification" className="text-sm">Send as in-app notification</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="send-email"
                    checked={messageForm.sendEmail}
                    onChange={(e) => setMessageForm(prev => ({ ...prev, sendEmail: e.target.checked }))}
                  />
                  <Label htmlFor="send-email" className="text-sm">Send as email (to users who have email notifications enabled)</Label>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Message Preview</h4>
                <div className="text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Recipients:</span>
                    <Badge>{recipientCount} users selected ({filterType} filter)</Badge>
                  </div>
                  <div className="mb-2">
                    <span className="font-medium">Subject:</span> {messageForm.subject || "No subject"}
                  </div>
                  <div>
                    <span className="font-medium">Message preview:</span>
                    <div className="mt-1 p-2 bg-white border rounded text-gray-600 max-h-20 overflow-hidden">
                      {messageForm.message ? (
                        <div style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                          {messageForm.message.substring(0, 150)}{messageForm.message.length > 150 ? '...' : ''}
                        </div>
                      ) : (
                        "No message content"
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !messageForm.subject || !messageForm.message || recipientCount === 0}
                className="w-full bg-purple-500 hover:bg-purple-600"
              >
                <Send className="w-4 h-4 mr-2" />
                {isLoading ? "Sending..." : `Send Message to ${recipientCount} Users`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recipients">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Select Recipients</span>
                </span>
                <div className="flex items-center space-x-2">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="all">All Users</option>
                    <option value="adults">Adults Only (18+)</option>
                    <option value="minors">Minors Only (Under 18)</option>
                    <option value="selected">Manually Selected</option>
                  </select>
                  <Button variant="outline" size="sm" onClick={handleSelectAllFiltered}>
                    Select/Deselect All Visible
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentlyVisibleUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => handleUserSelection(user.id)}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">@{user.username}</span>
                          <Badge variant="outline" className="text-xs">
                            {user.birthdate ? `${calculateAge(user.birthdate)} years old` : "Age N/A"}
                          </Badge>
                          {user.notification_preferences?.email_notifications === false && (
                            <Badge variant="secondary" className="text-xs">No Email</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{user.full_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {user.notification_preferences?.email_notifications !== false && (
                        <Mail className="w-4 h-4 text-green-500" title="Email notifications enabled" />
                      )}
                      <MessageSquare className="w-4 h-4 text-blue-500" title="In-app notifications" />
                    </div>
                  </div>
                ))}

                {currentlyVisibleUsers.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Users Found</h3>
                    <p className="text-gray-500">No users match the selected criteria.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
