import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const threads = await base44.entities.ForumThread.filter({ author_id: user.id });
    const comments = await base44.entities.ForumComment.filter({ author_id: user.id });

    for (const thread of threads) {
      await base44.entities.ForumThread.delete(thread.id);
    }

    for (const comment of comments) {
      await base44.entities.ForumComment.delete(comment.id);
    }

    return Response.json({ success: true, deletedThreads: threads.length, deletedComments: comments.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});