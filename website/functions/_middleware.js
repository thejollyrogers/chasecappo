export async function onRequest(context) {
  const { request } = context;

  if (request.url.includes("/api/")) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = [
      "https://chasecappo.com",
      "https://www.chasecappo.com",
    ];

    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin.startsWith("http://localhost") ||
      origin.startsWith("http://127.0.0.1");

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": isAllowed ? origin : "",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const response = await context.next();
    const newResponse = new Response(response.body, response);

    if (isAllowed) {
      newResponse.headers.set("Access-Control-Allow-Origin", origin);
    }

    return newResponse;
  }

  return context.next();
}
