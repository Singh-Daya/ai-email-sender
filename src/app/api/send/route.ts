import { NextRequest, NextResponse } from 'next/server';
import nodemailer, { SentMessageInfo } from 'nodemailer';
import { z } from 'zod';

const schema = z.object({
  recipients: z.string().min(3, 'At least one recipient is required'),
  subject: z.string().min(1, 'Subject is required').max(200),
  body: z.string().min(1, 'Email body is required').max(10000),
});

function jsonError(message: string, status = 500, details?: unknown) {
  return NextResponse.json(
    details ? { error: message, details } : { error: message },
    { status }
  );
}

export async function POST(req: NextRequest) {
  try {
    // Parse and validate input
    let jsonUnknown: unknown;
    try {
      jsonUnknown = await req.json();
    } catch {
      return jsonError('Request body must be JSON', 400);
    }

    const parsed = schema.safeParse(jsonUnknown);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { recipients, subject, body } = parsed.data;

    // Validate SMTP configuration
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 465);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.FROM_EMAIL || user;

    if (!host || !user || !pass || !from) {
      // Mask the password in logs
      console.error('SMTP configuration missing:', {
        host: !!host,
        user: !!user,
        pass: pass ? '****' : 'MISSING',
        from: !!from,
      });
      return jsonError('Email service is not configured properly', 500);
    }

    // Create transporter with conservative, safe defaults
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // SSL for 465, STARTTLS for others
      auth: { user, pass },
      // NOTE: Avoid disabling TLS verification in production unless you know the server cert.
      // tls: { rejectUnauthorized: false },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
    });

    // Parse recipients with basic email validation
    const recipientList = recipients
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

    if (recipientList.length === 0) {
      return jsonError('No valid email recipients found', 400);
    }

    // Verify SMTP connection first (optional but helpful)
    try {
      await transporter.verify();
      // console.log('SMTP connection verified');
    } catch (e: unknown) {
      const details = e instanceof Error ? e.message : String(e);
      console.error('SMTP connection failed:', details);
      return jsonError('Failed to connect to email server', 502, details);
    }

    // Send with reasonable defaults
    const info: SentMessageInfo = await transporter.sendMail({
      from: `"AI Email Assistant" <${from}>`,
      to: recipientList.join(', '),
      subject,
      text: body,
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charSet="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; line-height: 1.6; color: #111827; }
    .container { max-width: 640px; margin: 0 auto; padding: 16px; }
  </style>
</head>
<body>
  <div class="container">
    ${body.replace(/\n/g, '<br />')}
  </div>
</body>
</html>`,
      headers: {
        'X-Mailer': 'AI Email Assistant',
        // Avoid "Precedence: bulk" unless you truly intend bulk mail; it can hurt inbox placement.
        // Consider DKIM/SPF alignment via your domain for better deliverability.
      },
    });

    // Trim subject for logs without leaking full content
    console.log('Email sent:', {
      messageId: info.messageId,
      recipients: recipientList,
      subject: subject.length > 32 ? `${subject.slice(0, 32)}…` : subject,
    });

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully. If not received, check the spam folder.',
      messageId: info.messageId,
    });
  } catch (err: unknown) {
    const details =
      err instanceof Error
        ? err.message
        : typeof err === 'object'
        ? JSON.stringify(err)
        : String(err);

    console.error('Email send error:', details);
    return NextResponse.json(
      { error: 'Failed to send email', details },
      { status: 500 }
    );
  }
}
