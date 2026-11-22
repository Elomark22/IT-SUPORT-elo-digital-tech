// Creates a Freshdesk ticket from the website contact form.
// Needs two environment variables in Netlify: FRESHDESK_API_KEY and FRESHDESK_DOMAIN
export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let data;
  try {
    data = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const name = String(data.name || "").trim().slice(0, 100);
  const email = String(data.email || "").trim().slice(0, 150);
  const message = String(data.message || "").trim().slice(0, 4000);

  // Hidden honeypot field: real visitors leave it empty, bots fill it in
  if (data.website) return Response.json({ ok: true });

  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ ok: false, error: "Please fill in all fields correctly." }, { status: 400 });
  }

  const escapeHtml = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const auth = Buffer.from(`${process.env.FRESHDESK_API_KEY}:X`).toString("base64");

  const res = await fetch(`https://${process.env.FRESHDESK_DOMAIN}.freshdesk.com/api/v2/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify({
      name,
      email,
      subject: `Website enquiry from ${name}`,
      description: escapeHtml(message).replace(/\n/g, "<br>"),
      status: 2,
      priority: 1,
      source: 2,
    }),
  });

  if (!res.ok) {
    console.error("Freshdesk error", res.status, await res.text());
    return Response.json({ ok: false, error: "Could not send your message. Please call us instead." }, { status: 502 });
  }
  return Response.json({ ok: true });
};
