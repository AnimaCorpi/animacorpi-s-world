import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const comment = payload.data;
    if (!comment) return Response.json({ ok: true });

    // Find the post
    const posts = await base44.asServiceRole.entities.Post.filter({ id: comment.post_id });
    if (!posts.length) return Response.json({ ok: true });
    const post = posts[0];

    // Find post author
    const users = await base44.asServiceRole.entities.User.filter({ email: post.created_by });
    const author = users[0];

    const notificationsToCreate = [];

    // Notify post author (unless they're the one commenting)
    if (author && author.id !== comment.author_id) {
      notificationsToCreate.push({
        user_id: author.id,
        type: "story_update",
        title: "New comment on your post",
        message: `@${comment.author_username || 'Someone'} commented on your post "${post.title}"`,
        read: false,
        related_id: post.id,
        action_url: `/Post?id=${post.id}`
      });
    }

    // Notify followers of the commenter who have ALSO commented on this post
    const [follows, existingComments] = await Promise.all([
      base44.asServiceRole.entities.Follow.filter({ following_id: comment.author_id }),
      base44.asServiceRole.entities.PostComment.filter({ post_id: comment.post_id })
    ]);

    if (follows.length) {
      const coCommenters = new Set(
        existingComments
          .filter(c => c.author_id !== comment.author_id && c.id !== comment.id)
          .map(c => c.author_id)
      );

      const alreadyScheduled = new Set(notificationsToCreate.map(n => n.user_id));
      for (const follow of follows) {
        if (coCommenters.has(follow.follower_id) && !alreadyScheduled.has(follow.follower_id)) {
          notificationsToCreate.push({
            user_id: follow.follower_id,
            type: "story_update",
            title: "New activity on a post you commented on",
            message: `@${comment.author_username || 'Someone'} (someone you follow) commented on "${post.title}"`,
            read: false,
            related_id: post.id,
            action_url: `/Post?id=${post.id}`
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