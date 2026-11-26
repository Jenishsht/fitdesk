export async function sendEmail(opts: {
  to: string;
  toName: string;
  subject: string;
  text: string;
  fromName: string;
  attachments?: { name: string; contentBase64: string }[];
}) {
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
    throw new Error("BREVO_API_KEY or BREVO_SENDER_EMAIL is missing in .env");
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: opts.fromName, email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: opts.to, name: opts.toName }],
      subject: opts.subject,
      textContent: opts.text,
      ...(opts.attachments?.length
        ? {
            attachment: opts.attachments.map((a) => ({
              name: a.name,
              content: a.contentBase64,
            })),
          }
        : {}),
    }),
  });

  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
}