import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api-helpers";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeText, sanitizeEmail } from "@/lib/sanitize";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createSupportTicket } from "@/lib/google-sheets";
import { sendSupportTicketEmail, sendSupportTicketConfirmationEmail } from "@/lib/email";
import { createErrorResponse } from "@/lib/error-handler";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

/**
 * Generate a unique ticket ID
 */
function generateTicketId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `TICKET-${timestamp}-${random}`.toUpperCase();
}

/**
 * Validate file type
 */
function isValidImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export async function POST(request: Request) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require authentication
    try {
      await getAuthContext(request);
    } catch (error) {
      return createErrorResponse(error as Error);
    }

    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, RATE_LIMITS.SUPPORT);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const formData = await request.formData();

    // Extract form fields
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const subject = formData.get("subject") as string;
    const category = formData.get("category") as string;
    const description = formData.get("description") as string;

    // Validate required fields
    if (!name || !email || !subject || !category || !description) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedName = sanitizeText(name);
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedSubject = sanitizeText(subject);
    const sanitizedCategory = sanitizeText(category);
    const sanitizedDescription = sanitizeText(description);

    // Validate lengths
    if (sanitizedName.length < 2 || sanitizedName.length > 100) {
      return NextResponse.json(
        { error: "Name must be between 2 and 100 characters" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (sanitizedSubject.length < 5 || sanitizedSubject.length > 200) {
      return NextResponse.json(
        { error: "Subject must be between 5 and 200 characters" },
        { status: 400 }
      );
    }

    if (sanitizedDescription.length < 10 || sanitizedDescription.length > 5000) {
      return NextResponse.json(
        { error: "Description must be between 10 and 5000 characters" },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ["Bug", "Feature Request", "Question", "Account Issue", "Other"];
    if (!validCategories.includes(sanitizedCategory)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    // Process screenshots
    const screenshotFiles: File[] = [];
    const screenshotEntries = formData.getAll("screenshots") as File[];

    if (screenshotEntries.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed` },
        { status: 400 }
      );
    }

    for (const file of screenshotEntries) {
      if (!(file instanceof File)) {
        continue;
      }

      // Validate file type
      if (!isValidImageFile(file)) {
        return NextResponse.json(
          { error: `${file.name} is not a valid image file` },
          { status: 400 }
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `${file.name} exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB size limit` },
          { status: 400 }
        );
      }

      screenshotFiles.push(file);
    }

    // Generate ticket ID
    const ticketId = generateTicketId();
    const dateCreated = new Date();

    // Convert screenshots to buffers for email
    const screenshotBuffers: Array<{ filename: string; content: Buffer }> = [];
    for (const file of screenshotFiles) {
      const arrayBuffer = await file.arrayBuffer();
      screenshotBuffers.push({
        filename: file.name,
        content: Buffer.from(arrayBuffer),
      });
    }

    // Create ticket in Google Sheet (don't fail if this errors, but log it)
    let googleSheetError: string | null = null;
    try {
      await createSupportTicket({
        ticketId,
        dateCreated,
        customerName: sanitizedName,
        customerEmail: sanitizedEmail,
        subject: sanitizedSubject,
        category: sanitizedCategory,
        description: sanitizedDescription,
        screenshotCount: screenshotFiles.length,
      });
    } catch (error) {
      console.error("Failed to create ticket in Google Sheet:", error);
      googleSheetError = error instanceof Error ? error.message : "Unknown error";
      // Continue anyway - email is more critical
    }

    // Send email (don't fail ticket creation if email fails, but log it)
    let emailError: string | null = null;
    try {
      const emailResult = await sendSupportTicketEmail({
        ticketId,
        customerName: sanitizedName,
        customerEmail: sanitizedEmail,
        subject: sanitizedSubject,
        category: sanitizedCategory,
        description: sanitizedDescription,
        screenshots: screenshotBuffers,
      });

      if (!emailResult.success) {
        emailError = emailResult.error || "Failed to send email";
        console.error("Failed to send support ticket email:", emailError);
      }
    } catch (error) {
      emailError = error instanceof Error ? error.message : "Unknown error";
      console.error("Error sending support ticket email:", error);
    }

    // Send confirmation email to customer (don't fail ticket creation if this fails)
    let confirmationEmailError: string | null = null;
    try {
      const confirmationResult = await sendSupportTicketConfirmationEmail({
        ticketId,
        customerName: sanitizedName,
        customerEmail: sanitizedEmail,
        subject: sanitizedSubject,
      });

      if (!confirmationResult.success) {
        confirmationEmailError = confirmationResult.error || "Failed to send confirmation email";
        console.error("Failed to send support ticket confirmation email:", confirmationEmailError);
      }
    } catch (error) {
      confirmationEmailError = error instanceof Error ? error.message : "Unknown error";
      console.error("Error sending support ticket confirmation email:", error);
    }

    // Return success even if Google Sheet or email failed (ticket was created)
    // But include warnings if they failed
    return NextResponse.json({
      success: true,
      ticketId,
      message: "Support ticket submitted successfully",
      warnings: [
        googleSheetError && `Google Sheet update failed: ${googleSheetError}`,
        emailError && `Email sending failed: ${emailError}`,
        confirmationEmailError && `Confirmation email failed: ${confirmationEmailError}`,
      ].filter(Boolean),
    });
  } catch (error) {
    console.error("Error processing support ticket:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}
