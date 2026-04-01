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

    // Don't notify if commenting on own thread
    if (thread.author_id === comment.author_id) return Response.json({ ok: true });

    // Find thread author user
    const users = await base44.asServiceRole.entities.User.list();
    const author = users.find(u => u.id === thread.author_id);
    if (!author) return Response.json({ ok: true });

    await base44.asServiceRole.entities.Notification.create({
      user_id: thread.author_id,
      type: "forum_reply",
      title: "New reply on your thread",
      message: `@${comment.author_username || 'Someone'} replied to your thread "${thread.title}"`,
      read: false,
      related_id: thread.id,
      action_url: `/ForumThread?id=${thread.id}`
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});