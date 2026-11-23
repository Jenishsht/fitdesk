/** Nepal numbers -> international format without "+" (e.g. 9779812345678). */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("977")) return d.length === 13 ? d : null;
  if (d.startsWith("0")) d = d.slice(1);
  return d.length === 10 ? `977${d}` : null;
}

export async function sendTemplate(
  to: string,
  template: string,
  params: string[]
): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { ok: false, error: "WhatsApp is not configured." };

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: template,
        language: { code: "en" },
        components: [
          { type: "body", parameters: params.map((text) => ({ type: "text", text })) },
        ],
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error?.message ?? `HTTP ${res.status}` };
  return { ok: true, id: data?.messages?.[0]?.id };
}