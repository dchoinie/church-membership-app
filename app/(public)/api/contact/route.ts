import { NextResponse } from "next/server";
import { Resend } from "resend";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const resend = new Resend(process.env.RESEND_API_KEY);

// Spam detection patterns
const SPAM_PATTERNS = [
  /\b(buy\s+now|click\s+here|free\s+money|make\s+money|guaranteed|limited\s+time|act\s+now)\b/gi,
  /\b(viagra|cialis|casino|poker|lottery|winner|prize)\b/gi,
  /\b(http[s]?:\/\/[^\s]+)/gi, // URLs in message
  /(.)\1{4,}/g, // Repeated characters (e.g., "aaaaa")
];

// Honeypot field name (hidden field that bots might fill)
const HONEYPOT_FIELD = "website";

/**
 * Verify reCAPTCHA token with Google
 */
async function verifyRecaptcha(token: string): Promise<boolean> {
  if (!process.env.RECAPTCHA_SECRET_KEY) {
    console.warn("RECAPTCHA_SECRET_KEY not set, skipping verification");
    return true; // Allow in development if not configured
  }

  if (!token) {
    return false;
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json();
    
    // For v3: check success and score (0.0 = bot, 1.0 = human)
    // For v2: just check success
    if (data.success === true) {
      // If score exists (v3), require score >= 0.5
      // If no score (v2), just check success
      if (data.score !== undefined) {
        return data.score >= 0.5;
      }
      return true; // v2 - success is enough
    }
    return false;
  } catch (error) {
    console.error("Error verifying reCAPTCHA:", error);
    return false;
  }
}

/**
 * Check if message contains spam patterns
 */
function containsSpam(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Check against spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }

  // Check for excessive capitalization
  const upperCaseRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (upperCaseRatio > 0.5 && text.length > 20) {
    return true;
  }

  // Check for excessive special characters
  const specialCharRatio = (text.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length / text.length;
  if (specialCharRatio > 0.3) {
    return true;
  }

  return false;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize input to prevent XSS
 */
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .substring(0, 5000); // Limit length
}

export async function POST(request: Request) {
  try {
    // Rate limiting - use moderate limits for contact form
    const rateLimitResponse = await checkRateLimit(request, RATE_LIMITS.CONTACT);

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();
    const { name, email, message, recaptchaToken, [HONEYPOT_FIELD]: honeypot } = body;

    // Honeypot check - if this field is filled, it's likely a bot
    if (honeypot) {
      console.warn("Honeypot field filled, likely spam");
      // Return success to avoid revealing the honeypot
      return NextResponse.json({ success: true });
    }

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Verify reCAPTCHA (only if configured)
    if (process.env.RECAPTCHA_SECRET_KEY) {
      if (!recaptchaToken) {
        return NextResponse.json(
          { error: "reCAPTCHA verification required" },
          { status: 400 }
        );
      }

      const recaptchaValid = await verifyRecaptcha(recaptchaToken);
      if (!recaptchaValid) {
        return NextResponse.json(
          { error: "reCAPTCHA verification failed" },
          { status: 400 }
        );
      }
    }

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedMessage = sanitizeInput(message);

    // Validate lengths
    if (sanitizedName.length < 2 || sanitizedName.length > 100) {
      return NextResponse.json(
        { error: "Name must be between 2 and 100 characters" },
        { status: 400 }
      );
    }

    if (sanitizedMessage.length < 10 || sanitizedMessage.length > 5000) {
      return NextResponse.json(
        { error: "Message must be between 10 and 5000 characters" },
        { status: 400 }
      );
    }

    // Spam detection
    if (containsSpam(sanitizedMessage) || containsSpam(sanitizedName)) {
      console.warn("Spam detected in contact form submission");
      // Return success to avoid revealing spam detection
      return NextResponse.json({ success: true });
    }

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set");
      return NextResponse.json(
        { error: "Email service is not configured" },
        { status: 500 }
      );
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const toEmail = process.env.CONTACT_FORM_TO_EMAIL || fromEmail; // Default to from email if not set

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: sanitizedEmail,
      subject: `Contact Form Submission from ${sanitizedName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Contact Form Submission</h2>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Name:</strong> ${sanitizedName}</p>
            <p><strong>Email:</strong> ${sanitizedEmail}</p>
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${sanitizedMessage.replace(/\n/g, "<br>")}</p>
          </div>
          <p style="color: #666; font-size: 12px;">
            This message was sent from the contact form on your website.
          </p>
        </div>
      `,
      text: `
New Contact Form Submission

Name: ${sanitizedName}
Email: ${sanitizedEmail}

Message:
${sanitizedMessage}
      `.trim(),
    });

    if (error) {
      console.error("Error sending contact form email:", error);
      return NextResponse.json(
        { error: "Failed to send message. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Your message has been sent successfully!",
    });
  } catch (error) {
    console.error("Error processing contact form:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}

