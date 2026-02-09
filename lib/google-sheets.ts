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

  let credentials: any;
  try {
    // Try parsing as JSON string first
    credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
  } catch {
    // If parsing fails, assume it's a file path (not implemented in serverless environments)
    throw new Error(
      "GOOGLE_SHEETS_CREDENTIALS must be a JSON string. " +
      "Parse your service account JSON file and set it as an environment variable."
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

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "A:A", // Append to column A (will auto-expand to all columns)
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [rowData],
      },
    });
  } catch (error) {
    console.error("Error creating support ticket in Google Sheet:", error);
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
