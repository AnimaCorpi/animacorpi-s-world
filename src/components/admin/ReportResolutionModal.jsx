import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import { addDays, addWeeks, addMonths, format } from "date-fns";

export default function ReportResolutionModal({ report, user, isOpen, onClose, onResolve }) {
  const [blockPostsChecked, setBlockPostsChecked] = useState(false);
  const [blockForumChecked, setBlockForumChecked] = useState(false);
  const [blockPostsDays, setBlockPostsDays] = useState(7);
  const [blockForumDays, setBlockForumDays] = useState(7);
  const [appealDays, setAppealDays] = useState(14);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleResolve = async (action) => {
    if (action === "block" && !blockPostsChecked && !blockForumChecked) {
      setError("Please select at least one restriction.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const updateData = {
        status: "resolved",
        resolution_action: action,
        resolution_notes: resolutionNotes
      };

      if (action === "block") {
        if (blockPostsChecked) {
          updateData.blocked_posts_until = format(addDays(new Date(), parseInt(blockPostsDays)), "yyyy-MM-dd'T'HH:mm:ss");
        }
        if (blockForumChecked) {
          updateData.blocked_forum_until = format(addDays(new Date(), parseInt(blockForumDays)), "yyyy-MM-dd'T'HH:mm:ss");
        }
        updateData.appeal_deadline = format(addDays(new Date(), parseInt(appealDays)), "yyyy-MM-dd'T'HH:mm:ss");
      }

      await base44.entities.ReportUser.update(report.id, updateData);

      // Create notification if action was taken
      if (action === "block") {
        await base44.entities.Notification.create({
          user_id: user.id,
          type: "report_action",
          title: "Action Taken on Your Account",
          message: `An action has been taken on your account due to a report. You have until ${format(new Date(updateData.appeal_deadline), "MMM d, yyyy")} to appeal.`,
          action_url: "/MyReports",
          read: false
        });
      }

      onResolve();
      onClose();
    } catch (error) {
      console.error("Error resolving report:", error);
      setError("Failed to resolve report. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Resolve User Report</DialogTitle>
          <DialogDescription>
            Reported User: @{user?.username}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Report Details</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400"><strong>Reason:</strong> {report?.reason}</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Resolution Notes</h3>
            <Textarea
              placeholder="Add notes about this resolution (optional)..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
            />
          </div>

          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Apply Restrictions</h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="block-posts"
                  checked={blockPostsChecked}
                  onCheckedChange={setBlockPostsChecked}
                />
                <div className="flex-1">
                  <Label htmlFor="block-posts" className="cursor-pointer font-medium">
                    Block from commenting on blog posts
                  </Label>
                  {blockPostsChecked && (
                    <div className="mt-2 ml-6">
                      <Label htmlFor="block-posts-days" className="text-sm">Duration (days)</Label>
                      <Input
                        id="block-posts-days"
                        type="number"
                        min="1"
                        value={blockPostsDays}
                        onChange={(e) => setBlockPostsDays(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="block-forum"
                  checked={blockForumChecked}
                  onCheckedChange={setBlockForumChecked}
                />
                <div className="flex-1">
                  <Label htmlFor="block-forum" className="cursor-pointer font-medium">
                    Block from creating/commenting on forum threads
                  </Label>
                  {blockForumChecked && (
                    <div className="mt-2 ml-6">
                      <Label htmlFor="block-forum-days" className="text-sm">Duration (days)</Label>
                      <Input
                        id="block-forum-days"
                        type="number"
                        min="1"
                        value={blockForumDays}
                        onChange={(e) => setBlockForumDays(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {(blockPostsChecked || blockForumChecked) && (
              <div className="border-t pt-4 mt-4">
                <Label htmlFor="appeal-days" className="text-sm">Appeal deadline (days from now)</Label>
                <Input
                  id="appeal-days"
                  type="number"
                  min="1"
                  value={appealDays}
                  onChange={(e) => setAppealDays(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleResolve("absolve")}
              disabled={isSubmitting}
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              Absolve (No Action)
            </Button>
            <Button
              onClick={() => handleResolve("block")}
              disabled={isSubmitting || (!blockPostsChecked && !blockForumChecked)}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? "Saving..." : "Apply Restrictions"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm("This will permanently delete the user account. Are you sure?")) {
                  handleResolve("delete");
                }
              }}
              disabled={isSubmitting}
            >
              Delete User
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}