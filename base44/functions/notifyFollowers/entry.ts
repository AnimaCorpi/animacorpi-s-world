import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const { event, data } = body;
    if (!data || event?.type !== 'create') return Response.json({ ok: true });

    const entityName = event?.entity_name;
    let creatorId, notifTitle, notifMessage, actionUrl, notifType, isForumThread = false;

    if (entityName === 'ForumThread') {
      const users = await base44.asServiceRole.entities.User.filter({ id: data.author_id });
      const creator = users[0];
      if (!creator) return Response.json({ ok: true });
      creatorId = creator.id;
      isForumThread = true;

      notifTitle = `New forum thread by ${creator.username || creator.full_name}`;
      notifMessage = `${creator.username || creator.full_name} created a new thread: "${data.title}"`;
      actionUrl = `/ForumThread?id=${data.id}`;
      notifType = 'forum_reply';

    } else if (entityName === 'Post') {
      const users = await base44.asServiceRole.entities.User.filter({ email: data.created_by });
      const creator = users[0];
      if (!creator) return Response.json({ ok: true });
      creatorId = creator.id;

      const label = data.category === 'artwork' ? 'new artwork'
        : data.category === 'photography' ? 'new photography' : 'a new post';
      notifTitle = `New content from ${creator.username || creator.full_name}`;
      notifMessage = `${creator.username || creator.full_name} shared ${label}: "${data.title}"`;
      actionUrl = `/Post?id=${data.id}`;
      notifType = 'story_update';

    } else if (entityName === 'Chapter') {
      const books = await base44.asServiceRole.entities.Book.filter({ id: data.book_id });
      if (!books.length) return Response.json({ ok: true });
      const book = books[0];

      const users = await base44.asServiceRole.entities.User.filter({ email: book.created_by });
      const creator = users[0];
      if (!creator) return Response.json({ ok: true });
      creatorId = creator.id;

      notifTitle = `New chapter: ${data.title}`;
      notifMessage = `A new chapter was added to "${book.title}"`;
      actionUrl = `/Reader?bookId=${data.book_id}&chapterId=${data.id}`;
      notifType = 'chapter_update';

    } else {
      return Response.json({ ok: true });
    }

    const follows = await base44.asServiceRole.entities.Follow.filter({ following_id: creatorId });
    if (!follows.length) return Response.json({ ok: true, notified: 0 });

    // For forum threads, only notify followers who have notify_forum_threads enabled
    const eligibleFollows = isForumThread
      ? follows.filter(f => f.notify_forum_threads !== false)
      : follows;

    if (!eligibleFollows.length) return Response.json({ ok: true, notified: 0 });

    const notifications = eligibleFollows.map(f => ({
      user_id: f.follower_id,
      type: notifType,
      title: notifTitle,
      message: notifMessage,
      action_url: actionUrl
    }));

    await base44.asServiceRole.entities.Notification.bulkCreate(notifications);

    return Response.json({ ok: true, notified: notifications.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});