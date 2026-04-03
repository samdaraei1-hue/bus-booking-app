export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function getEmailEnv() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return null;
  }

  return { apiKey, from };
}

export async function sendEmail(input: SendEmailInput) {
  const env = getEmailEnv();

  if (!env) {
    console.warn("Email delivery skipped because RESEND_API_KEY or EMAIL_FROM is missing.");
    return { ok: false as const, skipped: true as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Email delivery failed: ${body || response.statusText}`);
  }

  return { ok: true as const, skipped: false as const };
}
