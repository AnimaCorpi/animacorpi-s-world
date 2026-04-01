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

    // Find post author by email (created_by)
    const users = await base44.asServiceRole.entities.User.list();
    const author = users.find(u => u.email === post.created_by);
    if (!author) return Response.json({ ok: true });

    // Don't notify if commenting on own post
    if (author.id === comment.author_id) return Response.json({ ok: true });

    await base44.asServiceRole.entities.Notification.create({
      user_id: author.id,
      type: "story_update",
      title: "New comment on your post",
      message: `@${comment.author_username || 'Someone'} commented on your post "${post.title}"`,
      read: false,
      related_id: post.id,
      action_url: `/Post?id=${post.id}`
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});