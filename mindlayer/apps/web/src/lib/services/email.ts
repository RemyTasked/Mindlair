const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@mindlayer.app';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log('Email would be sent (no RESEND_API_KEY configured):');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`HTML: ${options.html}`);
    return true;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

export async function sendMagicLink(email: string, token: string): Promise<boolean> {
  const magicLinkUrl = `${APP_URL}/verify?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to Mindlayer</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #18181b; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 700; margin: 0; background: linear-gradient(135deg, #f43f5e, #f97316, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Mindlayer</h1>
  </div>
  
  <div style="background: #fafafa; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
    <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Sign in to your account</h2>
    <p style="margin: 0 0 24px 0; color: #52525b;">Click the button below to sign in to Mindlayer. This link will expire in 15 minutes.</p>
    
    <a href="${magicLinkUrl}" style="display: inline-block; background: linear-gradient(135deg, #f43f5e, #f97316); color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Sign in to Mindlayer</a>
  </div>
  
  <p style="font-size: 14px; color: #71717a; margin: 0 0 8px 0;">If the button doesn't work, copy and paste this link into your browser:</p>
  <p style="font-size: 14px; color: #a1a1aa; margin: 0; word-break: break-all;">${magicLinkUrl}</p>
  
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
  
  <p style="font-size: 12px; color: #a1a1aa; margin: 0;">If you didn't request this email, you can safely ignore it. Someone may have typed your email address by mistake.</p>
</body>
</html>
  `.trim();

  const text = `
Sign in to Mindlayer

Click this link to sign in: ${magicLinkUrl}

This link will expire in 15 minutes.

If you didn't request this email, you can safely ignore it.
  `.trim();

  return sendEmail({
    to: email,
    subject: 'Sign in to Mindlayer',
    html,
    text,
  });
}

export async function sendWelcomeEmail(email: string, name?: string): Promise<boolean> {
  const greeting = name ? `Hi ${name}` : 'Welcome';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Mindlayer</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #18181b; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 700; margin: 0; background: linear-gradient(135deg, #f43f5e, #f97316, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Mindlayer</h1>
  </div>
  
  <div style="background: #fafafa; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
    <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">${greeting}!</h2>
    <p style="margin: 0 0 16px 0; color: #52525b;">Welcome to Mindlayer — your thinking app that maps what you believe and how you got there.</p>
    
    <h3 style="font-size: 16px; font-weight: 600; margin: 24px 0 12px 0;">Get started:</h3>
    <ul style="margin: 0; padding: 0 0 0 20px; color: #52525b;">
      <li style="margin-bottom: 8px;">Download the desktop app to capture what you read</li>
      <li style="margin-bottom: 8px;">Generate an API key in Settings to sync across devices</li>
      <li style="margin-bottom: 8px;">React to claims during your daily digests</li>
    </ul>
    
    <div style="margin-top: 24px;">
      <a href="${APP_URL}/map" style="display: inline-block; background: linear-gradient(135deg, #f43f5e, #f97316); color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Your Belief Map</a>
    </div>
  </div>
  
  <p style="font-size: 12px; color: #a1a1aa; margin: 0; text-align: center;">Mindlayer — Map your thinking, not just your time.</p>
</body>
</html>
  `.trim();

  return sendEmail({
    to: email,
    subject: 'Welcome to Mindlayer',
    html,
  });
}
