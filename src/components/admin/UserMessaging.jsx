import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { SendEmail } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Users, Mail, MessageSquare, Check, Plus, Trash2, Eye, EyeOff, Megaphone } from "lucide-react";
import { format } from "date-fns";

const TYPE_STYLES = {
  info: "bg-blue-100 text-blue-800",
  warning: "bg-yellow-100 text-yellow-800",
  success: "bg-green-100 text-green-800",
  new_drop: "bg-purple-100 text-purple-800",
};

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
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [annForm, setAnnForm] = useState({ message: "", type: "info", expires_at: "" });
  const [annSaving, setAnnSaving] = useState(false);
  const [annLoading, setAnnLoading] = useState(true);

  useEffect(() => {
    loadUsers();
    loadAnnouncements();
  }, []);

  const loadUsers = async () => {
    const userData = await base44.entities.User.list("-created_date");
    setAllUsers(userData.filter(u => u.role !== 'admin'));
  };

  const loadAnnouncements = async () => {
    setAnnLoading(true);
    const data = await base44.entities.Announcement.list("-created_date");
    setAnnouncements(data);
    setAnnLoading(false);
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return 0;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const getFilteredUsers = () => {
    switch (filterType) {
      case "adults": return allUsers.filter(u => calculateAge(u.birthdate) >= 18);
      case "minors": return allUsers.filter(u => u.birthdate && calculateAge(u.birthdate) < 18);
      case "selected": return allUsers.filter(u => selectedUserIds.includes(u.id));
      default: return allUsers;
    }
  };

  const handleUserSelection = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = getFilteredUsers().map(u => u.id);
    const allSelected = filteredIds.every(id => selectedUserIds.includes(id));
    setSelectedUserIds(prev =>
      allSelected ? prev.filter(id => !filteredIds.includes(id)) : [...new Set([...prev, ...filteredIds])]
    );
  };

  const handleSendMessage = async () => {
    if (!messageForm.subject || !messageForm.message) {
      setError("Please fill in both subject and message fields.");
      return;
    }
    const recipients = filterType === "selected"
      ? allUsers.filter(u => selectedUserIds.includes(u.id))
      : getFilteredUsers();

    if (recipients.length === 0) {
      setError("No users match the selected criteria.");
      return;
    }

    setIsLoading(true);
    setStatusMsg("");
    setError("");

    let successCount = 0;
    let errorCount = 0;

    for (const user of recipients) {
      try {
        if (messageForm.sendNotification) {
          await base44.entities.Notification.create({
            user_id: user.id,
            type: "admin_message",
            title: messageForm.subject,
            message: messageForm.message,
            action_url: `/AdminMessage?subject=${encodeURIComponent(messageForm.subject)}&message=${encodeURIComponent(messageForm.message)}`,
          });
        }

        const emailAddress = user.notification_email || user.email;
        if (messageForm.sendEmail && user.notification_preferences?.email_notifications !== false && emailAddress) {
          await SendEmail({
            to: emailAddress,
            subject: messageForm.subject,
            body: `Hi ${user.username || user.full_name},\n\n${messageForm.message}\n\nWarmly,\nAnamaria\n\n---\nThis message was sent from Anamaria's World. You can update your notification preferences in your profile settings.`,
          });
        }
        successCount++;
      } catch (err) {
        console.error(`Error sending message to user ${user.id}:`, err);
        errorCount++;
      }
    }

    setStatusMsg(`Message sent to ${successCount} users.${errorCount > 0 ? ` ${errorCount} failed.` : ''}`);
    setMessageForm({ subject: "", message: "", sendEmail: true, sendNotification: true });
    setSelectedUserIds([]);
    setFilterType("all");
    setIsLoading(false);
  };

  const handleCreateAnnouncement = async () => {
    if (!annForm.message.trim()) return;
    setAnnSaving(true);
    await base44.entities.Announcement.create({
      message: annForm.message,
      type: annForm.type,
      active: true,
      ...(annForm.expires_at ? { expires_at: new Date(annForm.expires_at).toISOString() } : {})
    });
    setAnnForm({ message: "", type: "info", expires_at: "" });
    await loadAnnouncements();
    setAnnSaving(false);
  };

  const toggleAnnActive = async (ann) => {
    await base44.entities.Announcement.update(ann.id, { active: !ann.active });
    await loadAnnouncements();
  };

  const deleteAnnouncement = async (id) => {
    if (!confirm("Delete this announcement?")) return;
    await base44.entities.Announcement.delete(id);
    await loadAnnouncements();
  };

  const recipientCount = filterType === "selected"
    ? allUsers.filter(u => selectedUserIds.includes(u.id)).length
    : getFilteredUsers().length;

  const currentlyVisibleUsers = getFilteredUsers();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Messaging & Announcements</h3>
        <p className="text-sm text-gray-600">Send messages to users or post site-wide announcements</p>
      </div>

      {statusMsg && (
        <Alert className="border-green-200 bg-green-50">
          <Check className="h-4 w-4" />
          <AlertDescription>{statusMsg}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="compose" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="recipients">Recipients ({recipientCount})</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>

        {/* COMPOSE TAB */}
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
                />
              </div>
              <div className="space-y-3">
                <Label>Delivery Options</Label>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="send-notification"
                    checked={messageForm.sendNotification}
                    onChange={(e) => setMessageForm(prev => ({ ...prev, sendNotification: e.target.checked }))}
                  />
                  <Label htmlFor="send-notification" className="text-sm">Send as in-app notification</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="send-email"
                    checked={messageForm.sendEmail}
                    onChange={(e) => setMessageForm(prev => ({ ...prev, sendEmail: e.target.checked }))}
                  />
                  <Label htmlFor="send-email" className="text-sm">Send as email (to users with email notifications enabled)</Label>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Recipients:</span>
                  <Badge>{recipientCount} users ({filterType} filter)</Badge>
                </div>
                <div className="mb-1"><span className="font-medium">Subject:</span> {messageForm.subject || "No subject"}</div>
                <div className="mt-1 p-2 bg-white border rounded text-gray-600 max-h-20 overflow-hidden">
                  {messageForm.message ? messageForm.message.substring(0, 150) + (messageForm.message.length > 150 ? '...' : '') : "No message content"}
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

        {/* RECIPIENTS TAB */}
        <TabsContent value="recipients">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Select Recipients</span>
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="all">All Users</option>
                    <option value="adults">Adults (18+)</option>
                    <option value="minors">Minors (&lt;18)</option>
                    <option value="selected">Manually Selected</option>
                  </select>
                  <Button variant="outline" size="sm" onClick={handleSelectAllFiltered}>
                    Select/Deselect All
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentlyVisibleUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <input type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => handleUserSelection(user.id)}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-1">
                          <span className="font-medium">@{user.username}</span>
                          <Badge variant="outline" className="text-xs">
                            {user.birthdate ? `${calculateAge(user.birthdate)} yrs` : "Age N/A"}
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
                        <Mail className="w-4 h-4 text-green-500" title="Email enabled" />
                      )}
                      <MessageSquare className="w-4 h-4 text-blue-500" title="In-app notifications" />
                    </div>
                  </div>
                ))}
                {currentlyVisibleUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No users match the selected criteria.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANNOUNCEMENTS TAB */}
        <TabsContent value="announcements">
          <div className="space-y-6">
            {/* Create form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  <span>New Announcement</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={annForm.message}
                    onChange={(e) => setAnnForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Write your site-wide announcement..."
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={annForm.type} onValueChange={(v) => setAnnForm(p => ({ ...p, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="new_drop">New Drop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Expires At (optional)</Label>
                    <Input
                      type="datetime-local"
                      value={annForm.expires_at}
                      onChange={(e) => setAnnForm(p => ({ ...p, expires_at: e.target.value }))}
                    />
                  </div>
                </div>
                <Button onClick={handleCreateAnnouncement} disabled={annSaving || !annForm.message.trim()} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  {annSaving ? "Creating..." : "Post Announcement"}
                </Button>
              </CardContent>
            </Card>

            {/* List */}
            {annLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : announcements.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No announcements yet.</p>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div key={ann.id} className="flex items-start gap-3 border rounded-lg p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={TYPE_STYLES[ann.type] || TYPE_STYLES.info}>{ann.type}</Badge>
                        <Badge variant={ann.active ? "default" : "outline"}>{ann.active ? "Active" : "Hidden"}</Badge>
                        {ann.expires_at && (
                          <span className="text-xs text-muted-foreground">
                            Expires: {format(new Date(ann.expires_at), "MMM d, yyyy h:mm a")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{ann.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {format(new Date(ann.created_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => toggleAnnActive(ann)} title={ann.active ? "Hide" : "Show"}>
                        {ann.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => deleteAnnouncement(ann.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}