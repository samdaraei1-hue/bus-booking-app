export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResult =
  | { ok: true; skipped: false }
  | { ok: false; skipped: false; reason: string };

import nodemailer from "nodemailer";

function getSmtpEnv() {
  const user = process.env.EMAIL_USER;
  const appPassword = process.env.EMAIL_APP_PASSWORD;
  const from = process.env.EMAIL_FROM || user;

  if (!user || !appPassword || !from) {
    return null;
  }

  return { user, appPassword, from };
}

function getResendEnv() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return null;
  }

  return { apiKey, from };
}

export async function sendEmail(input: SendEmailInput) {
  const smtpEnv = getSmtpEnv();

  if (smtpEnv) {
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: smtpEnv.user,
          pass: smtpEnv.appPassword,
        },
      });

      await transporter.sendMail({
        from: smtpEnv.from.includes("<")
          ? smtpEnv.from
          : `"Energy Travel" <${smtpEnv.from}>`,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: smtpEnv.user,
      });

      return { ok: true as const, skipped: false as const };
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Unknown SMTP delivery error";
      return {
        ok: false as const,
        skipped: false as const,
        reason: `Email delivery failed via Gmail SMTP: ${reason}`,
      };
    }
  }

  const env = getResendEnv();

  if (!env) {
    return {
      ok: false as const,
      skipped: false as const,
      reason:
        "Email delivery skipped because EMAIL_USER/EMAIL_APP_PASSWORD or RESEND_API_KEY/EMAIL_FROM is missing.",
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
