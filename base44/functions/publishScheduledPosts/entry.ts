import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date().toISOString();

    // Find all unpublished posts that have a publish_at in the past
    const posts = await base44.asServiceRole.entities.Post.filter({ published: false });
    const toPublish = posts.filter(p => p.publish_at && new Date(p.publish_at) <= new Date());

    let count = 0;
    for (const post of toPublish) {
      await base44.asServiceRole.entities.Post.update(post.id, { published: true });
      count++;
    }

    // Same for chapters
    const chapters = await base44.asServiceRole.entities.Chapter.filter({ published: false });
    const chaptersToPublish = chapters.filter(c => c.publish_at && new Date(c.publish_at) <= new Date());

    let chapterCount = 0;
    for (const chapter of chaptersToPublish) {
      await base44.asServiceRole.entities.Chapter.update(chapter.id, { published: true });
      chapterCount++;
    }

    return Response.json({ 
      success: true, 
      postsPublished: count, 
      chaptersPublished: chapterCount 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});