import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function ReportUserModal({ reportedUserId, onClose }) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const user = await base44.auth.me();
      if (!user) {
        base44.auth.redirectToLogin();
        return;
      }

      await base44.entities.ReportUser.create({
        reported_user_id: reportedUserId,
        reporter_id: user.id,
        reason: reason.trim()
      });

      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setReason("");
      }, 2000);
    } catch (err) {
      console.error("Error submitting report:", err);
      setError("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!submitted} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report User</DialogTitle>
          <DialogDescription>
            Help us keep the community safe by reporting this user
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Reason for reporting</label>
            <Textarea
              placeholder="Please explain why you're reporting this user..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="resize-none"
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Submitting..." : "Report"}
            </Button>
          </div>
        </div>
      </DialogContent>

      <Dialog open={submitted}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Thank You</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Your report has been submitted. We'll review it shortly.
          </p>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}