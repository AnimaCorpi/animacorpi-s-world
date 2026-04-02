import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId, itemType } = await req.json();

    if (!itemId || !itemType) {
      return Response.json({ error: 'Missing itemId or itemType' }, { status: 400 });
    }

    if (itemType === 'thread') {
      const thread = await base44.entities.ForumThread.filter({ id: itemId });
      if (thread.length === 0 || thread[0].author_id !== user.id) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
      }
      await base44.entities.ForumThread.delete(itemId);
    } else if (itemType === 'reply') {
      const comment = await base44.entities.ForumComment.filter({ id: itemId });
      if (comment.length === 0 || comment[0].author_id !== user.id) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
      }
      await base44.entities.ForumComment.delete(itemId);
    } else {
      return Response.json({ error: 'Invalid itemType' }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});