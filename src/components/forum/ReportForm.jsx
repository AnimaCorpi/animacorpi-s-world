import React, { useState } from "react";
import { Report } from "@/entities/Report";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Flag, X, AlertTriangle } from "lucide-react";

export default function ReportForm({ itemId, itemType, user, onSuccess, onCancel }) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError("Please provide a reason for reporting this content.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await Report.create({
        item_id: itemId,
        item_type: itemType,
        reason: reason.trim(),
        reporter_id: user.id
      });

      onSuccess();
    } catch (error) {
      setError("Failed to submit report. Please try again.");
      console.error("Error submitting report:", error);
    }

    setIsSubmitting(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Flag className="w-5 h-5" />
          <span>Report Content</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="reason">Why are you reporting this {itemType}?</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please describe why this content violates community guidelines..."
              rows={4}
              className="resize-none"
              maxLength={500}
            />
            <div className="text-sm text-gray-500 mt-1">
              {reason.length}/500 characters
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              variant="destructive"
            >
              <Flag className="w-4 h-4 mr-2" />
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}