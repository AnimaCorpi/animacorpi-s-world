import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { data, old_data, event } = payload;

    // Only proceed if this chapter is now published (and wasn't before, or is new)
    const isNowPublished = data?.published === true;
    const wasAlreadyPublished = old_data?.published === true;

    if (!isNowPublished || (event?.type === 'update' && wasAlreadyPublished)) {
      return Response.json({ skipped: true });
    }

    const bookId = data.book_id;
    const chapterTitle = data.title;

    // Fetch the book info
    const books = await base44.asServiceRole.entities.Book.filter({ id: bookId });
    if (!books.length) return Response.json({ skipped: true, reason: 'book not found' });
    const book = books[0];

    // Find all users who have bookmarked this book
    const bookmarks = await base44.asServiceRole.entities.Bookmark.filter({ book_id: bookId });
    if (!bookmarks.length) return Response.json({ notified: 0 });

    // Create notifications for each bookmarked user (deduplicated by user_id)
    const userIds = [...new Set(bookmarks.map(b => b.user_id))];

    await Promise.all(userIds.map(userId =>
      base44.asServiceRole.entities.Notification.create({
        user_id: userId,
        type: 'chapter_update',
        title: `New chapter in "${book.title}"`,
        message: `Chapter "${chapterTitle}" has just been published!`,
        related_id: bookId,
        action_url: `/ChapterList?bookId=${bookId}`,
        read: false
      })
    ));

    return Response.json({ notified: userIds.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});