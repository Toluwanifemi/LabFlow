import nodemailer from 'nodemailer';

type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

async function sendViaSmtp({ to, subject, text, html }: SendEmailParams): Promise<boolean> {
  const host = process.env.SMTP_HOST?.trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.EMAIL_FROM?.trim() || 'noreply@labflow.app';

  if (!host || !user || !pass) {
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 8000,
      socketTimeout: 8000,
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html: html || text,
    });

    return true;
  } catch (error) {
    console.error('[mailer] SMTP error:', error);
    return false;
  }
}

async function sendViaResend({ to, subject, text, html }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'noreply@labflow.app';

  if (!apiKey) {
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, text, html: html || text }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[mailer] Resend API error:', res.status, errBody);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[mailer] Resend error:', error);
    return false;
  }
}

export async function sendEmail({ to, subject, text, html }: SendEmailParams): Promise<boolean> {
  if (process.env.SMTP_HOST) {
    const sent = await sendViaSmtp({ to, subject, text, html });
    if (sent) return true;
    console.warn('[mailer] SMTP failed, trying Resend fallback');
  }

  if (process.env.RESEND_API_KEY) {
    return sendViaResend({ to, subject, text, html });
  }

  console.warn('[mailer] No email provider configured (SMTP_HOST or RESEND_API_KEY) — skipping email send');
  return false;
}

export async function sendWelcomeEmail(to: string, name: string, labName: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Welcome to LabFlow',
    text: `Hi ${name},\n\nWelcome to LabFlow! Your lab "${labName}" has been created.\n\nStart logging your biological samples today.\n\n— The LabFlow Team`,
    html: `<p>Hi ${name},</p><p>Welcome to LabFlow! Your lab <strong>${labName}</strong> has been created.</p><p>Start logging your biological samples today.</p><p>— The LabFlow Team</p>`,
  });
}

export async function sendInviteEmail(to: string, name: string, labName: string, adminName: string, verifyUrl: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: `You've been added to ${labName} on LabFlow`,
    text: `Hi ${name},\n\n${adminName} has added you to the lab "${labName}" on LabFlow.\n\nClick this link to verify your email and set your password:\n${verifyUrl}\n\nThis link expires in 48 hours.\n\n— The LabFlow Team`,
    html: `<p>Hi ${name},</p><p>${adminName} has added you to the lab <strong>${labName}</strong> on LabFlow.</p><p><a href="${verifyUrl}">Click here to verify your email and set your password</a></p><p>This link expires in 48 hours.</p><p>— The LabFlow Team</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Reset your LabFlow password',
    text: `You requested a password reset.\n\nClick this link to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you did not request this, you can safely ignore this email.\n\n— The LabFlow Team`,
    html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Click here to reset your password</a></p><p>This link expires in 1 hour.</p><p>If you did not request this, you can safely ignore this email.</p><p>— The LabFlow Team</p>`,
  });
}
