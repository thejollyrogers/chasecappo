export async function onRequestGet(context) {
  const { env } = context;

  try {
    const { results } = await env.DB.prepare(
      "SELECT id, name, email, subject, message, submitted_at FROM contact_messages ORDER BY id DESC"
    ).all();

    return Response.json({ results });
  } catch (err) {
    console.error("Admin messages error:", err);
    return Response.json({ error: "Failed to fetch contact messages." }, { status: 500 });
  }
}
