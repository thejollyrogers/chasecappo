export async function onRequestGet(context) {
  const { env } = context;

  try {
    const { results } = await env.DB.prepare(
      "SELECT id, email, signed_up_at FROM signups ORDER BY id DESC"
    ).all();

    return Response.json({ results });
  } catch (err) {
    console.error("Admin signups error:", err);
    return Response.json({ error: "Failed to fetch signups." }, { status: 500 });
  }
}
