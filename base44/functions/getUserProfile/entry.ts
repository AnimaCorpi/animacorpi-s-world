import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userId } = await req.json();

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    if (!users.length) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];
    // Only expose safe public fields
    return Response.json({
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      avatar_url: user.avatar_url,
      created_date: user.created_date,
      theme_preferences: user.theme_preferences,
      birthdate: user.birthdate,
      role: user.role,
      karma: user.karma || 0
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});