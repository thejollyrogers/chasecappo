export async function onRequestPost(context) {
  const { request, env } = context;

  let name, email, subject, message, turnstileToken;
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    name = formData.get("name")?.toString().trim();
    email = formData.get("email")?.toString().trim();
    subject = formData.get("subject")?.toString().trim() || "General Inquiry";
    message = formData.get("message")?.toString().trim();
    turnstileToken = formData.get("cf-turnstile-response")?.toString();
  } else {
    const body = await request.json();
    name = body.name?.trim();
    email = body.email?.trim();
    subject = body.subject?.trim() || "General Inquiry";
    message = body.message?.trim();
    turnstileToken = body["cf-turnstile-response"];
  }

  if (turnstileToken && env.TURNSTILE_SECRET) {
    const turnstileRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET,
        response: turnstileToken,
        remoteip: request.headers.get("CF-Connecting-IP"),
      }),
    });

    const turnstileData = await turnstileRes.json();
    if (!turnstileData.success) {
      return Response.json({ error: "Verification failed. Please try again." }, { status: 403 });
    }
  }

  if (!name || !email || !message) {
    return Response.json({ error: "All required fields must be completed." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    await env.DB.prepare(
      `INSERT INTO contact_messages (name, email, subject, message, submitted_at) VALUES (?, ?, ?, ?, ?)`
    ).bind(name, email, subject, message, new Date().toISOString()).run();

    return Response.json({ success: true, message: "Thank you. Your message has been received." });
  } catch (err) {
    console.error("Contact form error:", err);
    return Response.json({ error: "Failed to submit message." }, { status: 500 });
  }
}

export async function onRequestGet() {
  return Response.json({ error: "Use POST to send a message." }, { status: 405 });
}
