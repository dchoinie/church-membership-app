import { renderToBuffer } from "@react-pdf/renderer";
import { GivingStatementPDF } from "@/components/giving-statement-pdf";
import { createElement } from "react";

interface GivingItem {
  dateGiven: string;
  categoryName: string;
  amount: number;
}

interface CategoryTotal {
  categoryName: string;
  total: number;
}

export interface GenerateStatementOptions {
  church: {
    name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    phone?: string | null;
    email?: string | null;
    taxId?: string | null;
    is501c3?: boolean | null;
    taxStatementDisclaimer?: string | null;
    goodsServicesProvided?: boolean | null;
    goodsServicesStatement?: string | null;
  };
  household: {
    name: string;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  };
  year: number;
  startDate: string;
  endDate: string;
  items: GivingItem[];
  statementNumber?: string | null;
}

/**
 * Generates a PDF buffer for a giving statement
 * @param options - Statement data including church, household, and giving information
 * @returns Promise<Buffer> - PDF file as a buffer
 */
export async function generateGivingStatementPDF(
  options: GenerateStatementOptions
): Promise<Buffer> {
  // Calculate category totals
  const categoryMap = new Map<string, number>();
  
  for (const item of options.items) {
    const current = categoryMap.get(item.categoryName) || 0;
    categoryMap.set(item.categoryName, current + item.amount);
  }

  const categoryTotals: CategoryTotal[] = Array.from(categoryMap.entries()).map(
    ([categoryName, total]) => ({
      categoryName,
      total,
    })
  );

  // Calculate total amount
  const totalAmount = options.items.reduce((sum, item) => sum + item.amount, 0);

  // Create the PDF document
  const pdfDocument = createElement(GivingStatementPDF, {
    church: options.church,
    household: options.household,
    year: options.year,
    startDate: options.startDate,
    endDate: options.endDate,
    items: options.items,
    categoryTotals,
    totalAmount,
    statementNumber: options.statementNumber,
    generatedDate: new Date().toISOString(),
  });

  // Render to buffer
  const buffer = await renderToBuffer(pdfDocument);
  return buffer;
}

/**
 * Generates a statement number for tracking
 * Format: YEAR-HOUSEHOLDID-TIMESTAMP
 */
export function generateStatementNumber(
  year: number,
  householdId: string
): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const householdPrefix = householdId.substring(0, 8).toUpperCase();
  return `${year}-${householdPrefix}-${timestamp}`;
}

/**
 * Validates that church has required tax information for IRS compliance
 */
export function validateChurchTaxInfo(church: {
  taxId?: string | null;
  is501c3?: boolean | null;
}): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!church.taxId || church.taxId.trim() === "") {
    missing.push("Tax ID / EIN");
  }

  if (church.is501c3 === null || church.is501c3 === undefined) {
    missing.push("501(c)(3) Status");
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
