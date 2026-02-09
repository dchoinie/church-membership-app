import { google } from "googleapis";

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

/**
 * Initialize Google Sheets client with service account credentials
 */
function initializeGoogleSheets() {
  if (sheetsClient) {
    return sheetsClient;
  }

  if (!process.env.GOOGLE_SHEETS_CREDENTIALS) {
    throw new Error("GOOGLE_SHEETS_CREDENTIALS environment variable is not set");
  }

  if (!process.env.GOOGLE_SHEET_ID) {
    throw new Error("GOOGLE_SHEET_ID environment variable is not set");
  }

  const credentialsString = process.env.GOOGLE_SHEETS_CREDENTIALS;
  let credentials: any;
  
  try {
    // Try parsing as JSON string first
    credentials = JSON.parse(credentialsString);
    
    // Validate required fields
    if (!credentials.client_email) {
      throw new Error("GOOGLE_SHEETS_CREDENTIALS missing client_email field");
    }
    if (!credentials.private_key) {
      throw new Error("GOOGLE_SHEETS_CREDENTIALS missing private_key field");
    }
    if (credentials.type !== "service_account") {
      throw new Error(`GOOGLE_SHEETS_CREDENTIALS type should be "service_account", got "${credentials.type}"`);
    }
    
    console.log(`[Google Sheets] Initializing with service account: ${credentials.client_email}`);
  } catch (error) {
    // Provide detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const credentialsPreview = credentialsString.substring(0, 100) + "...";
    
    console.error("[Google Sheets] Failed to parse GOOGLE_SHEETS_CREDENTIALS");
    console.error(`[Google Sheets] Parse error: ${errorMessage}`);
    console.error(`[Google Sheets] Credentials preview (first 100 chars): ${credentialsPreview}`);
    console.error(`[Google Sheets] Credentials length: ${credentialsString.length} characters`);
    
    // Check for common issues
    if (errorMessage.includes("Unexpected token") || errorMessage.includes("JSON")) {
      console.error("[Google Sheets] Common fixes:");
      console.error("1. Ensure all quotes inside JSON are escaped with backslash: \\\"");
      console.error("2. Ensure newlines in private_key are escaped as \\n (not actual newlines)");
      console.error("3. Ensure the entire JSON is on a single line (if setting via CLI)");
      console.error("4. Try copying the JSON file content directly into Vercel dashboard");
      console.error("5. In Vercel dashboard, paste the JSON file content as-is (Vercel handles escaping)");
    }
    
    throw new Error(
      "GOOGLE_SHEETS_CREDENTIALS must be a valid JSON string. " +
      `Parse error: ${errorMessage}. ` +
      "Check Vercel logs above for more details. " +
      "Common issues: unescaped quotes, incorrect newline handling, or multi-line format."
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  sheetsClient = google.sheets({ version: "v4", auth });

  return sheetsClient;
}

export interface SupportTicketData {
  ticketId: string;
  dateCreated: Date;
  customerName: string;
  customerEmail: string;
  subject: string;
  category: string;
  description: string;
  screenshotCount: number;
}

/**
 * Create a new support ticket row in Google Sheet
 */
export async function createSupportTicket(
  ticketData: SupportTicketData
): Promise<void> {
  try {
    const sheets = initializeGoogleSheets();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

    if (!spreadsheetId) {
      throw new Error("GOOGLE_SHEET_ID environment variable is not set");
    }

    console.log(`[Google Sheets] Creating ticket ${ticketData.ticketId} in sheet ${spreadsheetId}`);

    // Format date as string for Google Sheets
    const dateCreatedStr = ticketData.dateCreated.toISOString();

    // Prepare row data matching the sheet structure:
    // Ticket ID, Date Created, Customer Name, Customer Email, Subject, Category, Description, Status, Priority, Screenshot Count, Notes, Date Resolved
    const rowData = [
      ticketData.ticketId,
      dateCreatedStr,
      ticketData.customerName,
      ticketData.customerEmail,
      ticketData.subject,
      ticketData.category,
      ticketData.description,
      "open", // Default status
      "", // Priority - filled by admin
      ticketData.screenshotCount,
      "", // Notes - filled by admin
      "", // Date Resolved - filled when resolved
    ];

    console.log(`[Google Sheets] Appending row with ${rowData.length} columns`);

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "A:A", // Append to column A (will auto-expand to all columns)
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [rowData],
      },
    });

    console.log(`[Google Sheets] Successfully appended row. Updated range: ${response.data.updates?.updatedRange}`);
  } catch (error) {
    console.error("[Google Sheets] Error creating support ticket:", error);
    
    // Provide more helpful error messages
    if (error instanceof Error) {
      if (error.message.includes("PERMISSION_DENIED") || error.message.includes("403")) {
        console.error("[Google Sheets] Permission denied. Service account email needs Editor access to the sheet.");
        console.error("[Google Sheets] Share the sheet with the service account email from GOOGLE_SHEETS_CREDENTIALS");
      }
      if (error.message.includes("NOT_FOUND") || error.message.includes("404")) {
        console.error("[Google Sheets] Sheet not found. Check that GOOGLE_SHEET_ID is correct.");
        console.error(`[Google Sheets] Current GOOGLE_SHEET_ID: ${process.env.GOOGLE_SHEET_ID}`);
      }
    }
    
    throw error;
  }
}

/**
 * Update ticket status in Google Sheet
 */
export async function updateTicketStatus(
  ticketId: string,
  status: "open" | "in queue" | "in progress" | "client verification" | "resolved",
  priority?: string,
  notes?: string
): Promise<void> {
  try {
    const sheets = initializeGoogleSheets();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

    // First, find the row with this ticket ID
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "A:A", // Search in column A (Ticket ID)
    });

    const rows = response.data.values || [];
    let rowIndex = -1;

    // Find the row index (1-indexed, but we need to account for header row)
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === ticketId) {
        rowIndex = i + 1; // Google Sheets is 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Ticket ID ${ticketId} not found in sheet`);
    }

    // Update status (column H, index 8)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `H${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[status]],
      },
    });

    // Update priority if provided (column I, index 9)
    if (priority !== undefined) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `I${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[priority]],
        },
      });
    }

    // Update notes if provided (column K, index 11)
    if (notes !== undefined) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `K${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[notes]],
        },
      });
    }

    // Update Date Resolved if status is resolved (column L, index 12)
    if (status === "resolved") {
      const dateResolvedStr = new Date().toISOString();
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `L${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[dateResolvedStr]],
        },
      });
    }
  } catch (error) {
    console.error("Error updating ticket status in Google Sheet:", error);
    throw error;
  }
}
