import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return Response.json({ error: 'All fields are required.' }, { status: 400 });
    }

    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });

    if (admins.length === 0) {
      return Response.json({ error: 'Unable to send message. Please try again later.' }, { status: 500 });
    }

    for (const admin of admins) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: `Contact Form Message from ${name}`,
        body: `New contact form submission:\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n\n---\nSent from the contact form.`
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});