export async function onRequestPost(context) {
  const { request, env } = context;

  let email;
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    email = formData.get("email")?.toString().trim();
  } else {
    const body = await request.json();
    email = body.email?.trim();
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    await env.DB.prepare(
      `INSERT INTO signups (email, signed_up_at) VALUES (?, ?)
       ON CONFLICT(email) DO NOTHING`
    ).bind(email, new Date().toISOString()).run();

    return Response.json({ success: true });
  } catch (err) {
    console.error("Signup error:", err);
    return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}

export async function onRequestGet() {
  return Response.json({ error: "Use POST to sign up." }, { status: 405 });
}
