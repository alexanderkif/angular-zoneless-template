import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { getEnv, getFrontendUrl, isLocal } from './env';

export interface SendVerificationEmailParams {
  to: string;
  name: string;
  verificationToken: string;
}

export async function sendVerificationEmail({
  to,
  name,
  verificationToken,
}: SendVerificationEmailParams): Promise<void> {
  const env = getEnv();
  const isDevMode = isLocal();
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    connectionTimeout: isDevMode ? 5000 : 10000, // Shorter timeout in dev
    greetingTimeout: isDevMode ? 5000 : 10000,
    socketTimeout: isDevMode ? 8000 : 15000,
    pool: false, // Don't use connection pooling
    maxConnections: 1,
    logger: isDevMode ? false : true, // Less verbose in dev
    debug: isDevMode ? false : true,
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    },
  } as SMTPTransport.Options);
  
  const frontendUrl = getFrontendUrl();
  const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

  // In local dev, just log the verification link and skip actual sending
  if (isLocal()) {
    console.log('\n🔗 ========== DEV MODE ==========');
    console.log('Verification link:', verificationUrl);
    console.log('================================\n');
    return;
  }

  // Production: send real email
  try {
    const info = await transporter.sendMail({
      from: `"Angular App" <${env.SMTP_USER}>`,
      to,
      subject: 'Verify your email address',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <h1 style="margin: 0; color: #333333; font-size: 28px; font-weight: 600;">
                Verify Your Email
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Hello <strong>${name}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Thanks for signing up! Please verify your email address by clicking the button below:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${verificationUrl}" 
                       style="display: inline-block; padding: 14px 32px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px; line-height: 1.5;">
                Or copy and paste this link:
              </p>
              <p style="margin: 0; word-break: break-all;">
                <a href="${verificationUrl}" style="color: #0066cc; text-decoration: none; font-size: 14px;">
                  ${verificationUrl}
                </a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.5;">
                This link will expire in 24 hours.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5; text-align: center;">
                © ${new Date().getFullYear()} Angular Zoneless Template
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });
    
    transporter.close();
  } catch (error) {
    console.error('Failed to send verification email:', error instanceof Error ? error.message : 'Unknown error');
    
    try {
      transporter.close();
    } catch (closeError) {
      // Ignore close errors
    }
    
    throw error;
  }
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const frontendUrl = getFrontendUrl();
  
  // In local dev, skip email sending
  if (isLocal()) {
    return;
  }
  
  const env = getEnv();
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    pool: false,
    maxConnections: 1,
  } as SMTPTransport.Options);

  try {
    await transporter.sendMail({
      from: `"Angular App" <${env.SMTP_USER}>`,
      to,
      subject: 'Welcome to Angular Zoneless Template!',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 20px 0; color: #333333; font-size: 28px; font-weight: 600;">
                Welcome, ${name}! 🎉
              </h1>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Your email has been verified successfully!
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="${frontendUrl}" 
                       style="display: inline-block; padding: 14px 32px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Go to App
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
}
