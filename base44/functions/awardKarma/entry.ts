import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data } = payload;
    if (!data) return Response.json({ ok: true });

    let userId = null;
    let points = 0;

    if (event.entity_name === 'ForumThread') {
      userId = data.author_id;
      points = 5;
    } else if (event.entity_name === 'ForumComment') {
      userId = data.author_id;
      points = 2;
    } else if (event.entity_name === 'PostComment') {
      userId = data.author_id;
      points = 2;
    } else if (event.entity_name === 'ContentReaction') {
      points = 1;
      if (data.content_type === 'thread') {
        const items = await base44.asServiceRole.entities.ForumThread.filter({ id: data.content_id });
        userId = items[0]?.author_id;
      } else if (data.content_type === 'forum_comment') {
        const items = await base44.asServiceRole.entities.ForumComment.filter({ id: data.content_id });
        userId = items[0]?.author_id;
      } else if (data.content_type === 'post_comment') {
        const items = await base44.asServiceRole.entities.PostComment.filter({ id: data.content_id });
        userId = items[0]?.author_id;
      } else {
        return Response.json({ ok: true });
      }
      // No self-likes
      if (userId === data.user_id) return Response.json({ ok: true });
    }

    if (!userId) return Response.json({ ok: true });

    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    if (!users.length) return Response.json({ ok: true });
    const user = users[0];
    await base44.asServiceRole.entities.User.update(user.id, { karma: (user.karma || 0) + points });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});