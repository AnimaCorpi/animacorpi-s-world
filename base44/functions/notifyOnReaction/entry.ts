import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const reaction = payload.data;
    if (!reaction) return Response.json({ ok: true });

    const reactorUsers = await base44.asServiceRole.entities.User.filter({ id: reaction.user_id });
    const reactorName = reactorUsers[0]?.username || 'Someone';

    let ownerId = null;
    let title = '';
    let message = '';
    let actionUrl = '';

    if (reaction.content_type === 'thread') {
      const items = await base44.asServiceRole.entities.ForumThread.filter({ id: reaction.content_id });
      if (!items.length) return Response.json({ ok: true });
      const item = items[0];
      ownerId = item.author_id;
      title = 'Someone liked your thread';
      message = `@${reactorName} liked your thread "${item.title}"`;
      actionUrl = `/ForumThread?id=${item.id}`;
    } else if (reaction.content_type === 'chapter') {
      const items = await base44.asServiceRole.entities.Chapter.filter({ id: reaction.content_id });
      if (!items.length) return Response.json({ ok: true });
      const item = items[0];
      const books = await base44.asServiceRole.entities.Book.filter({ id: item.book_id });
      if (!books.length) return Response.json({ ok: true });
      const book = books[0];
      const authorList = await base44.asServiceRole.entities.User.filter({ email: book.created_by });
      const author = authorList[0];
      if (!author) return Response.json({ ok: true });
      ownerId = author.id;
      title = 'Someone liked your chapter';
      message = `@${reactorName} liked chapter "${item.title}"`;
      actionUrl = `/Reader?bookid=${book.id}&chapterid=${item.id}`;
    } else if (reaction.content_type === 'forum_comment') {
      const items = await base44.asServiceRole.entities.ForumComment.filter({ id: reaction.content_id });
      if (!items.length) return Response.json({ ok: true });
      const item = items[0];
      ownerId = item.author_id;
      title = 'Someone liked your comment';
      message = `@${reactorName} liked your comment`;
      actionUrl = `/ForumThread?id=${item.thread_id}`;
    } else if (reaction.content_type === 'post_comment') {
      const items = await base44.asServiceRole.entities.PostComment.filter({ id: reaction.content_id });
      if (!items.length) return Response.json({ ok: true });
      const item = items[0];
      ownerId = item.author_id;
      title = 'Someone liked your comment';
      message = `@${reactorName} liked your comment`;
      actionUrl = `/Post?id=${item.post_id}`;
    } else {
      // post-level reaction (PostReaction entity, not ContentReaction)
      return Response.json({ ok: true });
    }

    if (!ownerId || ownerId === reaction.user_id) return Response.json({ ok: true });

    const notifType = (reaction.content_type === 'thread' || reaction.content_type === 'forum_comment')
      ? 'forum_reply' : 'story_update';

    await base44.asServiceRole.entities.Notification.create({
      user_id: ownerId,
      type: notifType,
      title,
      message,
      read: false,
      related_id: reaction.content_id,
      action_url: actionUrl
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});