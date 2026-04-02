import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const { event, data } = body;
    if (event?.type !== 'create' || !data?.thread_id) {
      return Response.json({ ok: true, skipped: true });
    }

    await base44.asServiceRole.entities.ForumThread.update(data.thread_id, {
      last_reply_at: new Date().toISOString()
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});