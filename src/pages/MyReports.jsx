import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, Clock, FileText } from "lucide-react";
import { format, isPast } from "date-fns";

export default function MyReports() {
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingAppeal, setSubmittingAppeal] = useState(null);
  const [appealMessage, setAppealMessage] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (!isAuthenticated) {
        base44.auth.redirectToLogin();
        return;
      }
      const userData = await base44.auth.me();
      setUser(userData);
      loadReports(userData.id);
    };
    checkAuth();
  }, []);

  const loadReports = async (userId) => {
    try {
      const userReports = await base44.entities.ReportUser.filter(
        { reported_user_id: userId },
        "-created_date"
      );
      
      // Filter to only show reports with actions (blocks or appeals required)
      const actionableReports = userReports.filter(r => 
        r.blocked_posts_until || r.blocked_forum_until || r.appeal_deadline
      );
      
      setReports(actionableReports);
    } catch (error) {
      console.error("Error loading reports:", error);
      setError("Failed to load reports.");
    }
    setIsLoading(false);
  };

  const handleSubmitAppeal = async (reportId) => {
    if (!appealMessage.trim()) {
      setError("Please enter an appeal message.");
      return;
    }

    setSubmittingAppeal(reportId);
    try {
      await base44.entities.ReportUser.update(reportId, {
        appeal_message: appealMessage
      });
      setAppealMessage("");
      setMessage("Appeal submitted successfully! The admin will review your message.");
      setError("");
      loadReports(user.id);
    } catch (error) {
      console.error("Error submitting appeal:", error);
      setError("Failed to submit appeal. Please try again.");
    }
    setSubmittingAppeal(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  const hasActiveReports = reports.length > 0;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-foreground">My Reports</h1>
          <p className="text-gray-600 dark:text-muted-foreground mt-1">View and appeal actions taken on your account</p>
        </div>

        {message && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <Check className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!hasActiveReports ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-2">No Active Reports</h3>
              <p className="text-gray-600 dark:text-muted-foreground">You're all clear! No action has been taken on your account.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {reports.map((report) => {
              const postsBlocked = report.blocked_posts_until && !isPast(new Date(report.blocked_posts_until));
              const forumBlocked = report.blocked_forum_until && !isPast(new Date(report.blocked_forum_until));
              const canAppeal = report.appeal_deadline && !isPast(new Date(report.appeal_deadline)) && !report.appeal_message;
              const appealDeadlinePassed = report.appeal_deadline && isPast(new Date(report.appeal_deadline));
              const hasAppealed = !!report.appeal_message;

              return (
                <Card key={report.id} className="border-orange-200 dark:border-orange-900">
                  <CardHeader className="bg-orange-50 dark:bg-orange-950/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-300">
                          <AlertCircle className="w-5 h-5" />
                          Action Taken
                        </CardTitle>
                        <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                          Reported on {format(new Date(report.created_date), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      <Badge variant="destructive">
                        {hasAppealed ? "Appealed" : canAppeal ? "Pending Appeal" : "Active"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-foreground mb-2">Reason for Report</h3>
                      <p className="text-gray-700 dark:text-gray-300">{report.reason}</p>
                    </div>

                    {(postsBlocked || forumBlocked) && (
                      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4 space-y-2">
                        <h3 className="font-semibold text-red-900 dark:text-red-300">Restrictions Applied</h3>
                        {postsBlocked && (
                          <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
                            <Clock className="w-4 h-4" />
                            <span>Blocked from commenting on posts until {format(new Date(report.blocked_posts_until), "MMM d, yyyy")}</span>
                          </div>
                        )}
                        {forumBlocked && (
                          <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
                            <Clock className="w-4 h-4" />
                            <span>Blocked from forum activity until {format(new Date(report.blocked_forum_until), "MMM d, yyyy")}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {canAppeal && (
                      <div className="space-y-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                        <div>
                          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Appeal Your Case</h3>
                          <p className="text-sm text-blue-800 dark:text-blue-400 mb-4">
                            You have until {format(new Date(report.appeal_deadline), "MMM d, yyyy")} to submit an appeal.
                          </p>
                          <Textarea
                            placeholder="Explain why you believe this action was unfair..."
                            value={appealMessage}
                            onChange={(e) => setAppealMessage(e.target.value)}
                            className="mb-3"
                          />
                          <Button
                            onClick={() => handleSubmitAppeal(report.id)}
                            disabled={submittingAppeal === report.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {submittingAppeal === report.id ? "Submitting..." : "Submit Appeal"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {hasAppealed && (
                      <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-lg p-4">
                        <div className="flex items-start gap-2 mb-2">
                          <Check className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-purple-900 dark:text-purple-300">Appeal Submitted</h3>
                            <p className="text-sm text-purple-800 dark:text-purple-400 mt-1">
                              The admin will review your appeal and get back to you soon.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {appealDeadlinePassed && !hasAppealed && (
                      <div className="bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg p-4">
                        <p className="text-sm text-gray-700 dark:text-gray-400">
                          The appeal deadline has passed on {format(new Date(report.appeal_deadline), "MMM d, yyyy")}.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}