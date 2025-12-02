import nodemailer from "nodemailer";

// Create reusable transporter using Gmail SMTP
const createTransporter = () => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;
  
  if (!gmailUser || !gmailPassword) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD environment variables are required for sending emails");
  }
  
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailPassword, // Use App Password, not regular password
    },
  });
};

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<void> {
  const transporter = createTransporter();
  const resetUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5000"}/api/auth/reset-password-login?token=${resetToken}`;

  const mailOptions = {
    from: `"Task Board AI" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Reset Your Password - Task Board AI",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #9333ea, #ec4899); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Task Board AI</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>
            <p>Hello,</p>
            <p>We received a request to reset your password for your Task Board AI account. Click the button below to be automatically logged in and set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(to right, #9333ea, #ec4899); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${resetUrl}</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              <strong>This link will expire in 1 hour.</strong>
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} Task Board AI. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Reset Your Password - Task Board AI

      We received a request to reset your password for your Task Board AI account.
      
      Click the link below to be automatically logged in and set a new password:
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
      
      © ${new Date().getFullYear()} Task Board AI. All rights reserved.
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
}

export async function sendVerificationEmail(
  email: string,
  verificationToken: string
): Promise<void> {
  const transporter = createTransporter();
  // Get base URL - prioritize NEXTAUTH_URL for Vercel compatibility
  let baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  
  // Fallback to VERCEL_URL if available (Vercel automatically sets this)
  if (!baseUrl && process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  }
  
  // Final fallback to localhost
  if (!baseUrl) {
    baseUrl = "http://localhost:5000";
  }
  
  const verifyUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: `"Task Board AI" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Verify Your Email Address - Task Board AI",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #9333ea, #ec4899); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Task Board AI</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Verify Your Email Address</h2>
            <p>Hello,</p>
            <p>Thank you for signing up! Please verify your email address to access all features of Task Board AI. Click the button below to verify your email:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background: linear-gradient(to right, #9333ea, #ec4899); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Verify Email</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${verifyUrl}</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              <strong>This link will expire in 24 hours.</strong>
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              If you didn't create an account, please ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} Task Board AI. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Verify Your Email Address - Task Board AI

      Thank you for signing up! Please verify your email address to access all features of Task Board AI.
      
      Click the link below to verify your email:
      ${verifyUrl}
      
      This link will expire in 24 hours.
      
      If you didn't create an account, please ignore this email.
      
      © ${new Date().getFullYear()} Task Board AI. All rights reserved.
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error: unknown) {
    console.error("Error sending verification email:", error);
    const err = error as { code?: string; message?: string; response?: string; responseCode?: number };
    
    // Provide more specific error messages
    if (err.code === "EAUTH" || err.responseCode === 535) {
      throw new Error("GMAIL authentication failed. Please check your GMAIL_USER and GMAIL_APP_PASSWORD");
    } else if (err.code === "ECONNECTION" || err.code === "ETIMEDOUT") {
      throw new Error("SMTP connection failed. Please check your internet connection");
    } else if (err.message) {
      throw new Error(`Email sending failed: ${err.message}`);
    } else {
      throw new Error("Failed to send verification email. Please check your email configuration");
    }
  }
}

/**
 * Send a 6-digit verification code email used for code-based verification flows
 * (e.g. Google OAuth sign-up that requires manual code entry).
 */
export async function sendVerificationCodeEmail(
  email: string,
  code: string
): Promise<void> {
  const transporter = createTransporter();

  // Determine base URL for links in the email (for convenience)
  let baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl && process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  }
  if (!baseUrl) {
    baseUrl = "http://localhost:5000";
  }

  const verifyCodeUrl = `${baseUrl}/verify-code`;

  const mailOptions = {
    from: `"Task Board AI" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Your Task Board AI verification code",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your verification code</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a;">
          <div style="background: linear-gradient(to right, #9333ea, #ec4899); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Task Board AI</h1>
          </div>
          <div style="background: #020617; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #1f2937; border-top: none;">
            <h2 style="color: #e5e7eb; margin-top: 0;">Verify your email with this code</h2>
            <p style="color: #e5e7eb;">Hello,</p>
            <p style="color: #e5e7eb;">
              Thank you for signing up with Google. To complete your registration and verify your email address,
              please enter the following 6-digit verification code in the app:
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <div style="display: inline-block; padding: 14px 24px; border-radius: 999px; background: rgba(148,163,184,0.15); border: 1px solid rgba(148,163,184,0.4);">
                <span style="font-size: 28px; letter-spacing: 0.35em; color: #f9fafb; font-weight: 700; text-transform: none;">${code.replace(/(.{3})/, "$1&nbsp;")}</span>
              </div>
            </div>
            <p style="color: #e5e7eb;">
              You can go to the verification page here:
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${verifyCodeUrl}" style="background: linear-gradient(to right, #9333ea, #ec4899); color: white; padding: 12px 30px; text-decoration: none; border-radius: 999px; display: inline-block; font-weight: bold;">
                Enter verification code
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 14px; margin-top: 20px;">
              <strong>This code will expire in 10 minutes.</strong> If it expires, you can request a new code from your account.
            </p>
            <p style="color: #9ca3af; font-size: 14px;">
              If you didn&apos;t try to sign up, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #1f2937; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} Task Board AI. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Your Task Board AI verification code

      Code: ${code}

      Go to this page to enter your code:
      ${verifyCodeUrl}

      This code will expire in 10 minutes. If you didn't try to sign up, you can ignore this email.

      © ${new Date().getFullYear()} Task Board AI. All rights reserved.
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification code email sent to ${email}`);
  } catch (error: unknown) {
    console.error("Error sending verification code email:", error);
    const err = error as { code?: string; message?: string; response?: string; responseCode?: number };

    if (err.code === "EAUTH" || err.responseCode === 535) {
      throw new Error("GMAIL authentication failed. Please check your GMAIL_USER and GMAIL_APP_PASSWORD");
    } else if (err.code === "ECONNECTION" || err.code === "ETIMEDOUT") {
      throw new Error("SMTP connection failed. Please check your internet connection");
    } else if (err.message) {
      throw new Error(`Email sending failed: ${err.message}`);
    } else {
      throw new Error("Failed to send verification code email. Please check your email configuration");
    }
  }
}




