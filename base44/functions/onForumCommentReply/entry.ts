import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { data } = payload;

    // Only handle replies (comments that have a parent_comment_id)
    if (!data?.parent_comment_id) {
      return Response.json({ skipped: true, reason: 'not a reply' });
    }

    // Fetch the parent comment to find its author
    const parentComments = await base44.asServiceRole.entities.ForumComment.filter({ id: data.parent_comment_id });
    if (!parentComments.length) return Response.json({ skipped: true, reason: 'parent comment not found' });
    const parentComment = parentComments[0];

    // Don't notify if replying to yourself
    if (parentComment.author_id === data.author_id) {
      return Response.json({ skipped: true, reason: 'self-reply' });
    }

    // Fetch thread info for the action URL
    const threads = await base44.asServiceRole.entities.ForumThread.filter({ id: data.thread_id });
    const threadTitle = threads.length ? threads[0].title : 'a forum thread';

    await base44.asServiceRole.entities.Notification.create({
      user_id: parentComment.author_id,
      type: 'forum_reply',
      title: `${data.author_username || 'Someone'} replied to your comment`,
      message: `"${data.content?.replace(/<[^>]*>/g, '').substring(0, 100)}..."`,
      related_id: data.thread_id,
      action_url: `/ForumThread?id=${data.thread_id}`,
      read: false
    });

    return Response.json({ notified: 1 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});