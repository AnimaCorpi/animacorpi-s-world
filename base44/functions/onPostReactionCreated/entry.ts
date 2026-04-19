import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { data } = payload;

    if (!data?.post_id || !data?.user_id) {
      return Response.json({ skipped: true });
    }

    // Fetch the post to find its author
    const posts = await base44.asServiceRole.entities.Post.filter({ id: data.post_id });
    if (!posts.length) return Response.json({ skipped: true, reason: 'post not found' });
    const post = posts[0];

    // Don't notify if reacting to your own post
    if (post.created_by === data.created_by || post.created_by === data.user_id) {
      return Response.json({ skipped: true, reason: 'self-reaction' });
    }

    // Find the post author's user record
    const authors = await base44.asServiceRole.entities.User.filter({ id: post.created_by });
    if (!authors.length) return Response.json({ skipped: true, reason: 'author not found' });
    const author = authors[0];

    // Find the reactor's username
    const reactors = await base44.asServiceRole.entities.User.filter({ id: data.user_id });
    const reactorName = reactors.length ? (reactors[0].username || reactors[0].full_name || 'Someone') : 'Someone';

    await base44.asServiceRole.entities.Notification.create({
      user_id: author.id,
      type: 'post_reaction',
      title: `${reactorName} reacted to your post`,
      message: `${data.emoji || '❤️'} on "${post.title}"`,
      related_id: data.post_id,
      action_url: `/Post?id=${data.post_id}`,
      read: false
    });

    return Response.json({ notified: 1 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});