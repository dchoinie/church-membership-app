/**
 * Parse a single CSV line, handling quoted fields and escaped quotes.
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Parse full CSV text into headers and data rows.
 */
export function parseCSV(csvText: string): { headers: string[]; rows: string[][] } {
  const lines = csvText.split("\n").filter((line) => line.trim());
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map((line) => parseCSVLine(line));
  return { headers, rows };
}

/**
 * Escape a value for CSV output.
 */
function escapeCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Build CSV content from headers and rows (array of key-value objects keyed by header).
 */
export function buildCSV(
  headers: string[],
  rows: Array<Record<string, string | null | undefined>>
): string {
  const headerRow = headers.map(escapeCsvValue).join(",");
  const dataRows = rows.map((row) =>
    headers.map((h) => escapeCsvValue(row[h])).join(",")
  );
  return [headerRow, ...dataRows].join("\n");
}
