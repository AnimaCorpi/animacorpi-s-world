import React, { useState, useEffect } from "react";
import { Report } from "@/entities/Report";
import { ForumThread } from "@/entities/ForumThread";
import { ForumComment } from "@/entities/ForumComment";
import { PostComment } from "@/entities/PostComment";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Flag, Check, Trash2, ExternalLink, Eye, EyeOff, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ReportManager() {
    const [reports, setReports] = useState([]);
    const [showResolved, setShowResolved] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [usersMap, setUsersMap] = useState({});
    const [contentMap, setContentMap] = useState({});
    const [deletingContent, setDeletingContent] = useState(null);

    useEffect(() => {
        loadReportsAndData();
    }, []);

    const loadReportsAndData = async () => {
        setIsLoading(true);
        try {
            const reportData = await Report.list("-created_date");
            setReports(reportData);

            if (reportData.length > 0) {
                // Load all users
                const users = await User.list();
                const userMap = users.reduce((acc, user) => {
                    acc[user.id] = user;
                    return acc;
                }, {});
                setUsersMap(userMap);

                // Load content data for each report
                const contentData = {};
                for (const report of reportData) {
                    try {
                        if (report.item_type === 'thread') {
                            const threads = await ForumThread.filter({ id: report.item_id });
                            if (threads.length > 0) {
                                contentData[report.item_id] = {
                                    type: 'thread',
                                    data: threads[0],
                                    author: userMap[threads[0].author_id]
                                };
                            } else {
                                contentData[report.item_id] = {
                                    type: 'thread',
                                    data: null,
                                    author: null,
                                    deleted: true
                                };
                            }
                        } else if (report.item_type === 'comment') {
                            // Try forum comment first
                            let comments = await ForumComment.filter({ id: report.item_id });
                            if (comments.length > 0) {
                                contentData[report.item_id] = {
                                    type: 'forum_comment',
                                    data: comments[0],
                                    author: userMap[comments[0].author_id]
                                };
                            } else {
                                // Try post comment
                                comments = await PostComment.filter({ id: report.item_id });
                                if (comments.length > 0) {
                                    contentData[report.item_id] = {
                                        type: 'post_comment',
                                        data: comments[0],
                                        author: userMap[comments[0].author_id]
                                    };
                                } else {
                                    contentData[report.item_id] = {
                                        type: 'comment',
                                        data: null,
                                        author: null,
                                        deleted: true
                                    };
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`Error loading content for report ${report.id}:`, error);
                        contentData[report.item_id] = {
                            type: report.item_type,
                            data: null,
                            author: null,
                            deleted: true
                        };
                    }
                }
                setContentMap(contentData);
            }
        } catch (error) {
            console.error("Error loading reports:", error);
        }
        setIsLoading(false);
    };

    const handleResolve = async (reportId) => {
        try {
            await Report.update(reportId, { status: 'resolved' });
            loadReportsAndData();
        } catch (error) {
            console.error("Error resolving report:", error);
        }
    };
    
    const handleDeleteContent = async (report) => {
        if (!confirm("Are you sure you want to delete the reported content? This action is irreversible.")) return;

        setDeletingContent(report.id);
        try {
            if (report.item_type === 'thread') {
                // Delete thread and all its comments
                const comments = await ForumComment.filter({thread_id: report.item_id});
                for(const comment of comments){
                    await ForumComment.delete(comment.id);
                }
                await ForumThread.delete(report.item_id);
            } else if (report.item_type === 'comment') {
                // Try to delete as forum comment first
                try {
                    await ForumComment.delete(report.item_id);
                } catch {
                    // If that fails, try as post comment
                    await PostComment.delete(report.item_id);
                }
            }
            await handleResolve(report.id);
            alert("Content deleted successfully.");
        } catch (error) {
            alert("Failed to delete content. It may have already been removed.");
            console.error("Error deleting content:", error);
        } finally {
            setDeletingContent(null);
        }
    };

    const getContentViewUrl = (report) => {
        const content = contentMap[report.item_id];
        if (!content || content.deleted) return null;

        if (content.type === 'thread') {
            return createPageUrl(`ForumThread?id=${report.item_id}`);
        }
        if (content.type === 'forum_comment') {
            return createPageUrl(`ForumThread?id=${content.data.thread_id}`);
        }
        if (content.type === 'post_comment') {
            return createPageUrl(`Post?id=${content.data.post_id}`);
        }
        return null;
    };

    const renderContentPreview = (report) => {
        const content = contentMap[report.item_id];
        if (!content) return "Loading content...";
        if (content.deleted) return "Content has been deleted";

        if (content.type === 'thread') {
            return (
                <div>
                    <p className="font-semibold">Thread: "{content.data.title}"</p>
                    <p className="text-sm text-gray-600 mt-1">
                        {content.data.content.substring(0, 100).replace(/<[^>]*>/g, '')}...
                    </p>
                </div>
            );
        } else {
            return (
                <div>
                    <p className="font-semibold">Comment</p>
                    <p className="text-sm text-gray-600 mt-1">
                        {content.data.content.substring(0, 100)}...
                    </p>
                </div>
            );
        }
    };

    const filteredReports = showResolved 
        ? reports 
        : reports.filter(report => report.status === 'pending');

    if (isLoading) {
        return <div className="text-center py-8">Loading reports...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold flex items-center space-x-2">
                        <Flag className="w-5 h-5" />
                        <span>Content Reports</span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Review and manage user-submitted reports for threads and comments.
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => setShowResolved(!showResolved)}
                    className="flex items-center space-x-2"
                >
                    {showResolved ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{showResolved ? "Hide Resolved" : "Show All Reports"}</span>
                </Button>
            </div>

            <div className="space-y-4">
                {filteredReports.map(report => {
                    const reporter = usersMap[report.reporter_id];
                    const content = contentMap[report.item_id];
                    const contentAuthor = content?.author;
                    const isContentDeleted = content?.deleted;
                    
                    return (
                        <Card key={report.id} className={report.status === 'resolved' ? 'bg-gray-50 opacity-75' : ''}>
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center space-x-4 flex-wrap">
                                            <Badge variant={report.status === 'resolved' ? 'secondary' : 'destructive'}>
                                                {report.status.toUpperCase()}
                                            </Badge>
                                            <Badge variant="outline" className="capitalize">
                                                {report.item_type}
                                            </Badge>
                                            {isContentDeleted && (
                                                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                                                    <AlertCircle className="w-3 h-3 mr-1" />
                                                    Content Deleted
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <span className="font-semibold text-sm">Reported by:</span>
                                                    <p className="text-sm">@{reporter?.username || 'Unknown user'}</p>
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-sm">Content author:</span>
                                                    <p className="text-sm">@{contentAuthor?.username || 'Unknown user'}</p>
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-sm">Report reason:</span>
                                                    <p className="text-sm">{report.reason}</p>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <span className="font-semibold text-sm">Content preview:</span>
                                                <div className="mt-1 p-3 bg-gray-100 rounded text-sm border-l-4 border-gray-300">
                                                    {renderContentPreview(report)}
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-xs text-gray-500">
                                            Reported on: {format(new Date(report.created_date), "MMM d, yyyy, h:mm a")}
                                        </p>
                                    </div>
                                    
                                    <div className="flex flex-col space-y-2 ml-4">
                                        {getContentViewUrl(report) && !isContentDeleted && (
                                            <Link to={getContentViewUrl(report)}>
                                                <Button variant="outline" size="sm" className="w-full">
                                                    <ExternalLink className="w-4 h-4 mr-2" /> View Content
                                                </Button>
                                            </Link>
                                        )}
                                        {!isContentDeleted && (
                                            <Button 
                                                variant="destructive" 
                                                size="sm" 
                                                onClick={() => handleDeleteContent(report)}
                                                disabled={deletingContent === report.id}
                                                className="w-full"
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" /> 
                                                {deletingContent === report.id ? "Deleting..." : "Delete Content"}
                                            </Button>
                                        )}
                                        {report.status === 'pending' && (
                                            <Button 
                                                size="sm" 
                                                onClick={() => handleResolve(report.id)}
                                                className="w-full"
                                            >
                                                <Check className="w-4 h-4 mr-2" /> Mark as Resolved
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
             
            {filteredReports.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                    <Flag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h4 className="font-semibold">
                        {showResolved ? "No Reports Found" : "No Pending Reports"}
                    </h4>
                    <p>
                        {showResolved 
                            ? "There are no reports in the system."
                            : "There are no pending reports. All reports have been resolved."
                        }
                    </p>
                </div>
            )}
        </div>
    );
}