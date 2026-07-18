export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResult =
  | { ok: true; skipped: false }
  | { ok: false; skipped: false; reason: string };

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
    return {
      ok: false as const,
      skipped: false as const,
      reason:
        "Email delivery skipped because RESEND_API_KEY or EMAIL_FROM is missing.",
    };
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
    return {
      ok: false as const,
      skipped: false as const,
      reason: `Email delivery failed: ${body || response.statusText}`,
    };
  }

  return { ok: true as const, skipped: false as const };
}
