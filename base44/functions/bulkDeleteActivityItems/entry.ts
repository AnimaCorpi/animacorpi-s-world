import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { items } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Invalid items array' }, { status: 400 });
    }

    let deletedCount = 0;

    for (const { itemId, itemType } of items) {
      try {
        if (itemType === 'thread') {
          const thread = await base44.entities.ForumThread.filter({ id: itemId });
          if (thread.length > 0 && thread[0].author_id === user.id) {
            await base44.entities.ForumThread.delete(itemId);
            deletedCount++;
          }
        } else if (itemType === 'reply') {
          const comment = await base44.entities.ForumComment.filter({ id: itemId });
          if (comment.length > 0 && comment[0].author_id === user.id) {
            await base44.entities.ForumComment.delete(itemId);
            deletedCount++;
          }
        } else if (itemType === 'post') {
          const post = await base44.entities.Post.filter({ id: itemId });
          if (post.length > 0 && post[0].created_by === user.email) {
            await base44.entities.Post.delete(itemId);
            deletedCount++;
          }
        } else if (itemType === 'post_comment') {
          const comment = await base44.entities.PostComment.filter({ id: itemId });
          if (comment.length > 0 && comment[0].author_id === user.id) {
            await base44.entities.PostComment.delete(itemId);
            deletedCount++;
          }
        }
      } catch (err) {
        console.error(`Error deleting ${itemType} ${itemId}:`, err.message);
      }
    }

    return Response.json({ success: true, deletedCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});