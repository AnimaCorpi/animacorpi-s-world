import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const comment = payload.data;
    if (!comment) return Response.json({ ok: true });

    // Find the thread
    const threads = await base44.asServiceRole.entities.ForumThread.filter({ id: comment.thread_id });
    if (!threads.length) return Response.json({ ok: true });
    const thread = threads[0];

    const notificationsToCreate = [];

    // Notify the thread author (unless they're the one commenting)
    if (thread.author_id !== comment.author_id) {
      notificationsToCreate.push({
        user_id: thread.author_id,
        type: "forum_reply",
        title: "New reply on your thread",
        message: `@${comment.author_username || 'Someone'} replied to your thread "${thread.title}"`,
        read: false,
        related_id: thread.id,
        action_url: `/ForumThread?id=${thread.id}`
      });
    }

    // Notify followers of the commenter who have ALSO commented on this thread (excluding the commenter and thread author already notified)
    const [follows, existingComments] = await Promise.all([
      base44.asServiceRole.entities.Follow.filter({ following_id: comment.author_id }),
      base44.asServiceRole.entities.ForumComment.filter({ thread_id: comment.thread_id })
    ]);

    if (follows.length) {
      // Get unique user IDs who have commented on this thread (excluding the current commenter)
      const coCommenters = new Set(
        existingComments
          .filter(c => c.author_id !== comment.author_id && c.id !== comment.id)
          .map(c => c.author_id)
      );

      // Notify followers who are co-commenters (and haven't already been scheduled)
      const alreadyScheduled = new Set(notificationsToCreate.map(n => n.user_id));
      for (const follow of follows) {
        if (coCommenters.has(follow.follower_id) && !alreadyScheduled.has(follow.follower_id)) {
          notificationsToCreate.push({
            user_id: follow.follower_id,
            type: "forum_reply",
            title: "New activity on a thread you joined",
            message: `@${comment.author_username || 'Someone'} (someone you follow) commented on "${thread.title}"`,
            read: false,
            related_id: thread.id,
            action_url: `/ForumThread?id=${thread.id}`
          });
          alreadyScheduled.add(follow.follower_id);
        }
      }
    }

    if (notificationsToCreate.length) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notificationsToCreate);
    }

    return Response.json({ ok: true, notified: notificationsToCreate.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});