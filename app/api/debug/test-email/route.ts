import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import nodemailer from 'nodemailer';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const host = process.env.SMTP_HOST?.trim();
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    const from = process.env.EMAIL_FROM?.trim() || 'noreply@labflow.app';
    const toEmail = (req.nextUrl.searchParams.get('to') || session.user.email || '').trim();
    if (!toEmail) {
      return NextResponse.json({ error: 'No recipient email found' }, { status: 400 });
    }
    const resendKey = process.env.RESEND_API_KEY ? 'set' : 'not set';

    const diagnostics: Record<string, any> = {
      env: {
        SMTP_HOST: host || '(not set)',
        SMTP_PORT: port,
        SMTP_USER: user || '(not set)',
        SMTP_PASS: pass ? `${pass.slice(0, 4)}...${pass.slice(-4)} (${pass.length} chars)` : '(not set)',
        EMAIL_FROM: from,
        RESEND_API_KEY: resendKey,
      },
      steps: [] as any[],
    };

    if (!host || !user || !pass) {
      diagnostics.error = 'SMTP not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env.local';
      return NextResponse.json(diagnostics, { status: 200 });
    }

    // Step 1: Create transporter and verify connection
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      });

      diagnostics.steps.push({ step: 'Verifying SMTP connection...' });
      await transporter.verify();
      diagnostics.steps.push({ step: 'verify', status: 'ok', message: 'SMTP connection verified' });
    } catch (verifyErr: any) {
      diagnostics.steps.push({
        step: 'verify',
        status: 'failed',
        error: verifyErr.message,
        code: verifyErr.code,
        command: verifyErr.command,
      });

      // Try without TLS rejectUnauthorized option
      try {
        const transporter2 = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        diagnostics.steps.push({ step: 'Retrying verify without tls override...' });
        await transporter2.verify();
        diagnostics.steps.push({ step: 'verify_retry', status: 'ok', message: 'SMTP connection verified (without tls override)' });
      } catch (retryErr: any) {
        diagnostics.steps.push({
          step: 'verify_retry',
          status: 'failed',
          error: retryErr.message,
          code: retryErr.code,
        });
      }

      return NextResponse.json(diagnostics, { status: 200 });
    }

    // Step 2: Send test email
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      });

      diagnostics.steps.push({ step: 'Sending test email...' });
      const info = (await transporter.sendMail({
        from,
        to: toEmail,
        subject: 'LabFlow SMTP Test',
        text: 'This is a test email from LabFlow. If you receive this, SMTP is working.',
        html: '<p>This is a test email from LabFlow. If you receive this, SMTP is working.</p>',
      })) as any;

      diagnostics.steps.push({
        step: 'send',
        status: 'ok',
        messageId: info.messageId,
        accepted: info.accepted,
        response: info.response,
      });
    } catch (sendErr: any) {
      diagnostics.steps.push({
        step: 'send',
        status: 'failed',
        error: sendErr.message,
        code: sendErr.code,
        command: sendErr.command,
      });
    }

    return NextResponse.json(diagnostics, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
