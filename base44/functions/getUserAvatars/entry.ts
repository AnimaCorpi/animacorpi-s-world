import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userIds } = await req.json();

    if (!userIds || !userIds.length) {
      return Response.json({});
    }

    // Fetch all users by ID using service role
    const fetches = await Promise.all(
      userIds.map(id => base44.asServiceRole.entities.User.filter({ id }))
    );

    const avatarMap = {};
    fetches.flat().forEach(u => {
      avatarMap[u.id] = {
        avatar_url: u.avatar_url || null,
        username: u.username || null
      };
    });

    return Response.json(avatarMap);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});