import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";

const TYPE_STYLES = {
  info: "bg-blue-100 text-blue-800",
  warning: "bg-yellow-100 text-yellow-800",
  success: "bg-green-100 text-green-800",
  new_drop: "bg-purple-100 text-purple-800",
};

export default function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ message: "", type: "info", expires_at: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setIsLoading(true);
    const data = await base44.entities.Announcement.list("-created_date");
    setAnnouncements(data);
    setIsLoading(false);
  };

  const handleCreate = async () => {
    if (!form.message.trim()) return;
    setSaving(true);
    await base44.entities.Announcement.create({
      message: form.message,
      type: form.type,
      active: true,
      ...(form.expires_at ? { expires_at: new Date(form.expires_at).toISOString() } : {})
    });
    setForm({ message: "", type: "info", expires_at: "" });
    await load();
    setSaving(false);
  };

  const toggleActive = async (ann) => {
    await base44.entities.Announcement.update(ann.id, { active: !ann.active });
    await load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this announcement?")) return;
    await base44.entities.Announcement.delete(id);
    await load();
  };

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
        <h3 className="font-semibold text-sm">New Announcement</h3>
        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea
            value={form.message}
            onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))}
            placeholder="Write your announcement..."
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v }))}>
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
              value={form.expires_at}
              onChange={(e) => setForm(p => ({ ...p, expires_at: e.target.value }))}
            />
          </div>
        </div>
        <Button onClick={handleCreate} disabled={saving || !form.message.trim()} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          {saving ? "Creating..." : "Create Announcement"}
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
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
                <Button variant="ghost" size="sm" onClick={() => toggleActive(ann)} title={ann.active ? "Hide" : "Show"}>
                  {ann.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(ann.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}