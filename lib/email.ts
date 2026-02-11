import { Resend } from "resend";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { eq } from "drizzle-orm";

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to get church details
async function getChurchDetails(churchId?: string | null) {
  if (!churchId) {
    return null;
  }

  try {
    const church = await db.query.churches.findFirst({
      where: eq(churches.id, churchId),
    });
    return church;
  } catch (error) {
    console.error("Error fetching church details:", error);
    return null;
  }
}

// Helper function to generate gradient from primary color or use default
function getGradientStyle(primaryColor?: string | null) {
  if (primaryColor) {
    try {
      // Convert hex to RGB for gradient
      let hex = primaryColor.replace("#", "");
      
      // Handle 3-character hex codes
      if (hex.length === 3) {
        hex = hex.split("").map(char => char + char).join("");
      }
      
      // Validate hex code length
      if (hex.length !== 6) {
        return "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
      }
      
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      
      // Validate parsed values
      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
      }
      
      // Create a darker shade for gradient end
      const r2 = Math.max(0, r - 30);
      const g2 = Math.max(0, g - 30);
      const b2 = Math.max(0, b - 30);
      
      return `linear-gradient(135deg, ${primaryColor} 0%, rgb(${r2}, ${g2}, ${b2}) 100%)`;
    } catch (error) {
      // Fall back to default if parsing fails
      return "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    }
  }
  return "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
}

// Helper function to get button color or use default
function getButtonColor(primaryColor?: string | null) {
  return primaryColor || "#667eea";
}

export async function sendInvitationEmail({
  email,
  inviteCode,
  inviterName,
  churchId,
}: {
  email: string;
  inviteCode: string;
  inviterName?: string;
  churchId?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set in environment variables");
  }

  // Fetch church details if churchId is provided
  const church = await getChurchDetails(churchId);
  const churchName = church?.name || "Good Shepherd Admin";
  const logoUrl = church?.logoUrl;
  const primaryColor = church?.primaryColor;
  const gradientStyle = getGradientStyle(primaryColor);
  const buttonColor = getButtonColor(primaryColor);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteLink = `${baseUrl}/?invite=${inviteCode}`;
  // Use RESEND_FROM_EMAIL if set (works in both dev and prod if domain is verified), otherwise fallback to test email
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  
  // Check if using default Resend test domain
  const isUsingTestDomain = fromEmail.includes("@resend.dev");

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: `You've been invited to join ${churchName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation to ${churchName}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${gradientStyle}; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${churchName}" style="max-height: 60px; margin-bottom: 10px;" />` : ""}
            <h1 style="color: white; margin: 0; font-size: 24px;">${churchName}</h1>
          </div>
          
          <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">You've been invited!</h2>
            
            <p style="color: #4b5563; font-size: 16px;">
              ${inviterName ? `${inviterName} has` : "You've been"} invited to join the ${churchName} Admin portal.
            </p>
            
            <p style="color: #4b5563; font-size: 16px;">
              Click the button below to accept your invitation and create your account:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" 
                 style="display: inline-block; background: ${buttonColor}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Accept Invitation
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="color: ${buttonColor}; font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 4px;">
              ${inviteLink}
            </p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              <strong>Your invitation code:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${inviteCode}</code>
            </p>
            
            <p style="color: #9ca3af; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
You've been invited to join ${churchName}!

${inviterName ? `${inviterName} has` : "You've been"} invited to join the ${churchName} Admin portal.

Accept your invitation by visiting:
${inviteLink}

Your invitation code: ${inviteCode}

This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
    `.trim(),
  });

  if (error) {
    // Provide helpful error messages for common Resend issues
    if (error.message?.includes("only send testing emails to your own email address")) {
      const helpfulMessage = isUsingTestDomain
        ? `Resend Test Domain Limitation: When using "onboarding@resend.dev" (or any @resend.dev address), you can only send emails to your own verified email address.\n\n` +
          `To send emails to other recipients:\n` +
          `1. Verify your domain at https://resend.com/domains\n` +
          `2. Set RESEND_FROM_EMAIL in your .env file to use your verified domain (e.g., "noreply@yourdomain.com")\n\n` +
          `For development/testing, you can:\n` +
          `- Use Resend test addresses: delivered@resend.dev, bounced@resend.dev, complained@resend.dev\n` +
          `- Or manually share the invitation code: ${inviteCode}`
        : `Failed to send email: ${error.message}`;
      
      throw new Error(helpfulMessage);
    }
    
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

export async function sendPasswordResetEmail({
  email,
  resetUrl,
  userName,
  churchId,
}: {
  email: string;
  resetUrl: string;
  userName?: string;
  churchId?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set in environment variables");
  }

  // Fetch church details if churchId is provided
  const church = await getChurchDetails(churchId);
  const churchName = church?.name || "Good Shepherd Admin";
  const logoUrl = church?.logoUrl;
  const primaryColor = church?.primaryColor;
  const gradientStyle = getGradientStyle(primaryColor);
  const buttonColor = getButtonColor(primaryColor);

  // Use RESEND_FROM_EMAIL if set (works in both dev and prod if domain is verified), otherwise fallback to test email
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const isUsingTestDomain = fromEmail.includes("@resend.dev");

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: `Reset Your Password - ${churchName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${gradientStyle}; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${churchName}" style="max-height: 60px; margin-bottom: 10px;" />` : ""}
            <h1 style="color: white; margin: 0; font-size: 24px;">${churchName}</h1>
          </div>
          
          <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>
            
            <p style="color: #4b5563; font-size: 16px;">
              ${userName ? `Hello ${userName},` : "Hello,"}
            </p>
            
            <p style="color: #4b5563; font-size: 16px;">
              We received a request to reset your password for your ${churchName} account. Click the button below to reset your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="display: inline-block; background: ${buttonColor}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="color: ${buttonColor}; font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 4px;">
              ${resetUrl}
            </p>
            
            <p style="color: #9ca3af; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Reset Your Password - ${churchName}

${userName ? `Hello ${userName},` : "Hello,"}

We received a request to reset your password for your ${churchName} account.

Reset your password by visiting:
${resetUrl}

This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    `.trim(),
  });

  if (error) {
    // Provide helpful error messages for common Resend issues
    if (error.message?.includes("only send testing emails to your own email address")) {
      const helpfulMessage = isUsingTestDomain
        ? `Resend Test Domain Limitation: When using "onboarding@resend.dev" (or any @resend.dev address), you can only send emails to your own verified email address.\n\n` +
          `To send emails to other recipients:\n` +
          `1. Verify your domain at https://resend.com/domains\n` +
          `2. Set RESEND_FROM_EMAIL in your .env file to use your verified domain (e.g., "noreply@yourdomain.com")`
        : `Failed to send email: ${error.message}`;
      
      throw new Error(helpfulMessage);
    }
    
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

export async function sendVerificationEmail({
  email,
  verificationUrl,
  userName,
  churchId,
}: {
  email: string;
  verificationUrl: string;
  userName?: string;
  churchId?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set in environment variables");
  }

  // Fetch church details if churchId is provided
  const church = await getChurchDetails(churchId);
  const churchName = church?.name || "Good Shepherd Admin";
  const logoUrl = church?.logoUrl;
  const primaryColor = church?.primaryColor;
  const gradientStyle = getGradientStyle(primaryColor);
  const buttonColor = getButtonColor(primaryColor);

  // Use RESEND_FROM_EMAIL if set (works in both dev and prod if domain is verified), otherwise fallback to test email
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const isUsingTestDomain = fromEmail.includes("@resend.dev");

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: `Verify Your Email Address - ${churchName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email Address</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${gradientStyle}; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${churchName}" style="max-height: 60px; margin-bottom: 10px;" />` : ""}
            <h1 style="color: white; margin: 0; font-size: 24px;">${churchName}</h1>
          </div>
          
          <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">Verify Your Email Address</h2>
            
            <p style="color: #4b5563; font-size: 16px;">
              ${userName ? `Hello ${userName},` : "Hello,"}
            </p>
            
            <p style="color: #4b5563; font-size: 16px;">
              Thank you for creating your ${churchName} account. Please verify your email address by clicking the button below:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="display: inline-block; background: ${buttonColor}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="color: ${buttonColor}; font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 4px;">
              ${verificationUrl}
            </p>
            
            <p style="color: #9ca3af; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              This verification link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Verify Your Email Address - ${churchName}

${userName ? `Hello ${userName},` : "Hello,"}

Thank you for creating your ${churchName} account. Please verify your email address by visiting:

${verificationUrl}

This verification link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
    `.trim(),
  });

  if (error) {
    // Provide helpful error messages for common Resend issues
    if (error.message?.includes("only send testing emails to your own email address")) {
      const helpfulMessage = isUsingTestDomain
        ? `Resend Test Domain Limitation: When using "onboarding@resend.dev" (or any @resend.dev address), you can only send emails to your own verified email address.\n\n` +
          `To send emails to other recipients:\n` +
          `1. Verify your domain at https://resend.com/domains\n` +
          `2. Set RESEND_FROM_EMAIL in your .env file to use your verified domain (e.g., "noreply@yourdomain.com")`
        : `Failed to send email: ${error.message}`;
      
      throw new Error(helpfulMessage);
    }
    
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

export async function sendGivingStatementEmail({
  to,
  recipientName,
  churchName,
  year,
  totalAmount,
  pdfUrl,
  statementNumber,
}: {
  to: string;
  recipientName: string;
  churchName: string;
  year: number;
  totalAmount: number;
  pdfUrl: string;
  statementNumber?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        error: "RESEND_API_KEY is not set in environment variables",
      };
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    // Extract PDF buffer from data URL
    let pdfBuffer: Buffer;
    if (pdfUrl.startsWith("data:application/pdf;base64,")) {
      const base64Data = pdfUrl.replace("data:application/pdf;base64,", "");
      pdfBuffer = Buffer.from(base64Data, "base64");
    } else {
      return {
        success: false,
        error: "Invalid PDF URL format",
      };
    }

    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(totalAmount);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: `${year} Giving Statement - ${churchName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${year} Giving Statement</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${churchName}</h1>
            </div>
            
            <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1f2937; margin-top: 0;">${year} Giving Statement</h2>
              
              <p style="color: #4b5563; font-size: 16px;">
                Dear ${recipientName},
              </p>
              
              <p style="color: #4b5563; font-size: 16px;">
                Thank you for your generous support of ${churchName} during ${year}. Attached is your annual giving statement for tax purposes.
              </p>
              
              <div style="background: #f3f4f6; border-left: 4px solid #667eea; padding: 16px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0; color: #1f2937; font-weight: 600;">
                  Total Contributions for ${year}:
                </p>
                <p style="margin: 8px 0 0 0; color: #667eea; font-size: 24px; font-weight: bold;">
                  ${formattedAmount}
                </p>
                ${statementNumber ? `<p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">Statement #${statementNumber}</p>` : ""}
              </div>
              
              <p style="color: #4b5563; font-size: 16px;">
                This statement is for your records and may be used for tax filing purposes. Please retain this document with your tax records.
              </p>
              
              <p style="color: #4b5563; font-size: 16px;">
                If you have any questions about this statement or believe there is an error, please contact us as soon as possible.
              </p>
              
              <p style="color: #4b5563; font-size: 16px; margin-top: 30px;">
                God bless you,<br />
                <strong>${churchName}</strong>
              </p>
              
              <p style="color: #9ca3af; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <strong>Important:</strong> This statement meets IRS requirements for donor acknowledgment. No goods or services were provided in exchange for your contributions, except for intangible religious benefits. Please consult your tax advisor for specific guidance on deducting charitable contributions.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
${year} Giving Statement - ${churchName}

Dear ${recipientName},

Thank you for your generous support of ${churchName} during ${year}. Attached is your annual giving statement for tax purposes.

Total Contributions for ${year}: ${formattedAmount}
${statementNumber ? `Statement #${statementNumber}` : ""}

This statement is for your records and may be used for tax filing purposes. Please retain this document with your tax records.

If you have any questions about this statement or believe there is an error, please contact us as soon as possible.

God bless you,
${churchName}

---
Important: This statement meets IRS requirements for donor acknowledgment. No goods or services were provided in exchange for your contributions, except for intangible religious benefits. Please consult your tax advisor for specific guidance on deducting charitable contributions.
      `.trim(),
      attachments: [
        {
          filename: `giving-statement-${year}${statementNumber ? `-${statementNumber}` : ""}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error("Error sending giving statement email:", error);
      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending giving statement email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendSupportTicketEmail({
  ticketId,
  customerName,
  customerEmail,
  subject,
  category,
  description,
  screenshots,
}: {
  ticketId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  category: string;
  description: string;
  screenshots: Array<{ filename: string; content: Buffer }>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        error: "RESEND_API_KEY is not set in environment variables",
      };
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const supportEmail = process.env.SUPPORT_EMAIL || "support@simplechurchtools.com";

    // Format description with line breaks
    const formattedDescription = description.replace(/\n/g, "<br>");

    // Build screenshot list HTML
    const screenshotListHtml =
      screenshots.length > 0
        ? `
          <div style="margin-top: 20px;">
            <p style="color: #4b5563; font-size: 14px; font-weight: 600;">Attached Screenshots (${screenshots.length}):</p>
            <ul style="color: #6b7280; font-size: 14px; margin-top: 8px; padding-left: 20px;">
              ${screenshots.map((s) => `<li>${s.filename}</li>`).join("")}
            </ul>
          </div>
        `
        : "";

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: supportEmail,
      replyTo: customerEmail,
      subject: `[Support Ticket #${ticketId}] ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Support Ticket #${ticketId}</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Support Ticket</h1>
            </div>
            
            <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <div style="background: #f3f4f6; border-left: 4px solid #667eea; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                <p style="margin: 0; color: #1f2937; font-weight: 600; font-size: 18px;">
                  Ticket ID: #${ticketId}
                </p>
                <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
                  ${new Date().toLocaleString()}
                </p>
              </div>

              <div style="margin-bottom: 24px;">
                <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 16px; font-size: 20px;">Customer Information</h2>
                <div style="background: #f9fafb; padding: 16px; border-radius: 4px;">
                  <p style="margin: 0 0 8px 0; color: #4b5563;">
                    <strong>Name:</strong> ${customerName}
                  </p>
                  <p style="margin: 0; color: #4b5563;">
                    <strong>Email:</strong> <a href="mailto:${customerEmail}" style="color: #667eea; text-decoration: none;">${customerEmail}</a>
                  </p>
                </div>
              </div>

              <div style="margin-bottom: 24px;">
                <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 16px; font-size: 20px;">Ticket Details</h2>
                <div style="background: #f9fafb; padding: 16px; border-radius: 4px; space-y: 8px;">
                  <p style="margin: 0 0 12px 0; color: #4b5563;">
                    <strong>Subject:</strong> ${subject}
                  </p>
                  <p style="margin: 0 0 12px 0; color: #4b5563;">
                    <strong>Category:</strong> <span style="background: #667eea; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${category}</span>
                  </p>
                  <div style="margin-top: 12px;">
                    <p style="margin: 0 0 8px 0; color: #4b5563; font-weight: 600;">Description:</p>
                    <div style="background: white; padding: 12px; border-radius: 4px; border: 1px solid #e5e7eb; color: #374151; white-space: pre-wrap;">
                      ${formattedDescription}
                    </div>
                  </div>
                  ${screenshotListHtml}
                </div>
              </div>

              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-top: 24px; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>Note:</strong> Reply to this email to respond directly to the customer. Update the ticket status in the Google Sheet when resolved.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Support Ticket #${ticketId}

Customer Information:
Name: ${customerName}
Email: ${customerEmail}

Ticket Details:
Subject: ${subject}
Category: ${category}

Description:
${description}

${screenshots.length > 0 ? `\nAttached Screenshots (${screenshots.length}):\n${screenshots.map((s) => `- ${s.filename}`).join("\n")}` : ""}

---
Note: Reply to this email to respond directly to the customer. Update the ticket status in the Google Sheet when resolved.
      `.trim(),
      attachments: screenshots.map((screenshot) => ({
        filename: screenshot.filename,
        content: screenshot.content,
      })),
    });

    if (error) {
      console.error("Error sending support ticket email:", error);
      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending support ticket email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendSupportTicketConfirmationEmail({
  ticketId,
  customerName,
  customerEmail,
  subject,
}: {
  ticketId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        error: "RESEND_API_KEY is not set in environment variables",
      };
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: customerEmail,
      subject: `We've received your support request #${ticketId}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Support Request Received</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Support Request Received</h1>
            </div>

            <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px;">
                Hi ${customerName},
              </p>
              <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px;">
                Thank you for reaching out! We've received your support request and our team is reviewing it.
              </p>
              <div style="background: #f3f4f6; border-left: 4px solid #667eea; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                <p style="margin: 0; color: #1f2937; font-weight: 600; font-size: 18px;">
                  Ticket ID: #${ticketId}
                </p>
                <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
                  Subject: ${subject}
                </p>
              </div>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                We'll get back to you as soon as possible. Please reference your ticket ID above if you need to follow up.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
Hi ${customerName},

Thank you for reaching out! We've received your support request and our team is reviewing it.

Ticket ID: #${ticketId}
Subject: ${subject}

We'll get back to you as soon as possible. Please reference your ticket ID above if you need to follow up.
      `.trim(),
    });

    if (error) {
      console.error("Error sending support ticket confirmation email:", error);
      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending support ticket confirmation email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

