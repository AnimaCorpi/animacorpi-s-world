import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commentId } = await req.json();

    if (!commentId) {
      return Response.json({ error: 'commentId is required' }, { status: 400 });
    }

    // Fetch the comment to verify ownership or admin
    const comments = await base44.asServiceRole.entities.PostComment.filter({ id: commentId });
    if (comments.length === 0) {
      return Response.json({ error: 'Comment not found' }, { status: 404 });
    }

    const comment = comments[0];

    // Allow if admin OR the comment's author
    if (user.role !== 'admin' && comment.author_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    await base44.asServiceRole.entities.PostComment.delete(commentId);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});