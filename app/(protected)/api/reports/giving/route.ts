import { NextResponse } from "next/server";
import { eq, and, gte, lte, asc, inArray } from "drizzle-orm";

import { db } from "@/db";
import { giving, members, services, givingItems, givingCategories } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";

// Helper function to escape CSV values
function escapeCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

// Helper function to generate CSV content
function generateCsv(rows: Array<Record<string, string | null>>, headers?: string[]): string {
  if (rows.length === 0) {
    // If headers provided, return just headers
    if (headers && headers.length > 0) {
      return headers.map(escapeCsvValue).join(",");
    }
    return "";
  }
  
  const csvHeaders = headers || Object.keys(rows[0]);
  const headerRow = csvHeaders.map(escapeCsvValue).join(",");
  const dataRows = rows.map((row) =>
    csvHeaders.map((header) => escapeCsvValue(row[header])).join(",")
  );
  
  return [headerRow, ...dataRows].join("\n");
}

export async function GET(request: Request) {
  try {
    // Allow all authenticated users to view reports
    const { churchId } = await getAuthContext(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") || "csv";

    // Validate date parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 },
      );
    }

    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: "Start date must be before or equal to end date" },
        { status: 400 },
      );
    }

    // Get all services in the date range
    const allServices = await db
      .select({
        id: services.id,
        serviceDate: services.serviceDate,
        serviceType: services.serviceType,
        serviceTime: services.serviceTime,
      })
      .from(services)
      .where(
        and(
          eq(services.churchId, churchId),
          gte(services.serviceDate, startDate),
          lte(services.serviceDate, endDate),
        )
      )
      .orderBy(asc(services.serviceDate), asc(services.serviceTime));

    // Get active categories for this church
    const categories = await db
      .select()
      .from(givingCategories)
      .where(and(
        eq(givingCategories.churchId, churchId),
        eq(givingCategories.isActive, true),
      ))
      .orderBy(asc(givingCategories.displayOrder), asc(givingCategories.name));

    // Get all giving records with serviceId join for the date range
    // Include both records with serviceId and those without (serviceId is null)
    const givingRecordsRaw = await db
      .select({
        id: giving.id,
        serviceId: giving.serviceId,
        dateGiven: giving.dateGiven,
      })
      .from(giving)
      .innerJoin(members, eq(giving.memberId, members.id))
      .where(
        and(
          eq(members.churchId, churchId),
          gte(giving.dateGiven, startDate),
          lte(giving.dateGiven, endDate),
        )
      );

    // Get all giving items for these records
    const givingIds = givingRecordsRaw.map(g => g.id);
    const allItems = givingIds.length > 0 ? await db
      .select({
        givingId: givingItems.givingId,
        categoryId: givingItems.categoryId,
        categoryName: givingCategories.name,
        amount: givingItems.amount,
      })
      .from(givingItems)
      .innerJoin(givingCategories, eq(givingItems.categoryId, givingCategories.id))
      .where(inArray(givingItems.givingId, givingIds))
      : [];

    // Group items by giving ID
    const itemsByGivingId: Record<string, Array<{ categoryId: string; categoryName: string; amount: string }>> = {};
    allItems.forEach(item => {
      if (!itemsByGivingId[item.givingId]) {
        itemsByGivingId[item.givingId] = [];
      }
      itemsByGivingId[item.givingId].push({
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        amount: item.amount,
      });
    });

    // Create a map of giving records by serviceId
    // Records with null serviceId will be grouped separately as "Other"
    const givingByServiceId: Record<string, Array<{ id: string; items: Array<{ categoryId: string; categoryName: string; amount: string }> }>> = {};
    givingRecordsRaw.forEach(record => {
      const serviceKey = record.serviceId || "OTHER";
      if (!givingByServiceId[serviceKey]) {
        givingByServiceId[serviceKey] = [];
      }
      givingByServiceId[serviceKey].push({
        id: record.id,
        items: itemsByGivingId[record.id] || [],
      });
    });

    // Helper function to format service type
    const formatServiceType = (serviceType: string): string => {
      const typeMap: Record<string, string> = {
        divine_service: "Divine Service",
        midweek_lent: "Midweek Lent",
        midweek_advent: "Midweek Advent",
        festival: "Festival",
      };
      return typeMap[serviceType] || serviceType;
    };

    // Helper function to format service date and time
    const formatServiceDisplay = (service: typeof allServices[0]): string => {
      const dateStr = new Date(service.serviceDate).toLocaleDateString();
      const timeStr = service.serviceTime ? ` ${service.serviceTime}` : "";
      return `${dateStr}${timeStr} - ${formatServiceType(service.serviceType)}`;
    };

    // Calculate totals for each service by category
    const serviceBreakdown: Array<{
      serviceId: string | null;
      serviceDate: string;
      serviceType: string;
      serviceTime: string | null;
      displayName: string;
      categoryTotals: Record<string, number>;
      total: number;
    }> = allServices.map(service => {
      const givingForService = givingByServiceId[service.id] || [];

      // Initialize category totals for this service
      const serviceCategoryTotals: Record<string, number> = {};
      categories.forEach(cat => {
        serviceCategoryTotals[cat.id] = 0;
      });
      let serviceTotal = 0;

      // Aggregate giving for this service
      givingForService.forEach(givingRecord => {
        givingRecord.items.forEach(item => {
          const amount = parseFloat(item.amount || "0");
          if (!serviceCategoryTotals[item.categoryId]) {
            serviceCategoryTotals[item.categoryId] = 0;
          }
          serviceCategoryTotals[item.categoryId] += amount;
          serviceTotal += amount;
        });
      });

      return {
        serviceId: service.id,
        serviceDate: service.serviceDate,
        serviceType: service.serviceType,
        serviceTime: service.serviceTime,
        displayName: formatServiceDisplay(service),
        categoryTotals: serviceCategoryTotals,
        total: serviceTotal,
      };
    });

    // Handle "Other" donations (serviceId is null)
    const otherGiving = givingByServiceId["OTHER"] || [];
    let otherCategoryTotals: Record<string, number> = {};
    categories.forEach(cat => {
      otherCategoryTotals[cat.id] = 0;
    });
    let otherTotal = 0;

    otherGiving.forEach(givingRecord => {
      givingRecord.items.forEach(item => {
        const amount = parseFloat(item.amount || "0");
        if (!otherCategoryTotals[item.categoryId]) {
          otherCategoryTotals[item.categoryId] = 0;
        }
        otherCategoryTotals[item.categoryId] += amount;
        otherTotal += amount;
      });
    });

    // Add "Other" to service breakdown if there are any
    if (otherTotal > 0) {
      serviceBreakdown.push({
        serviceId: null,
        serviceDate: "",
        serviceType: "",
        serviceTime: null,
        displayName: "Other (not at a service)",
        categoryTotals: otherCategoryTotals,
        total: otherTotal,
      });
    }

    // Calculate grand totals for each category and overall
    const grandCategoryTotals: Record<string, number> = {};
    categories.forEach(cat => {
      grandCategoryTotals[cat.id] = 0;
    });
    let grandTotal = 0;

    serviceBreakdown.forEach(service => {
      Object.entries(service.categoryTotals).forEach(([categoryId, amount]) => {
        grandCategoryTotals[categoryId] = (grandCategoryTotals[categoryId] || 0) + amount;
      });
      grandTotal += service.total;
    });

    // Build totals object with category names
    const totals: Record<string, string> = {};
    categories.forEach(cat => {
      totals[cat.name] = (grandCategoryTotals[cat.id] || 0).toFixed(2);
    });
    totals.total = grandTotal.toFixed(2);

    if (format === "json") {
      return NextResponse.json({ 
        services: serviceBreakdown.map(service => ({
          serviceId: service.serviceId,
          serviceDate: service.serviceDate || null,
          serviceType: service.serviceType || null,
          serviceTime: service.serviceTime || null,
          displayName: service.displayName,
          categoryTotals: Object.fromEntries(
            categories.map(cat => [cat.name, (service.categoryTotals[cat.id] || 0).toFixed(2)])
          ),
          total: service.total.toFixed(2),
        })),
        totals,
      });
    }

    // Generate CSV with service breakdown
    const csvRows = serviceBreakdown.map(service => {
      const row: Record<string, string> = {
        "Service Date": service.serviceDate || "",
        "Service Type": service.serviceType ? formatServiceType(service.serviceType) : "Other",
        "Service Time": service.serviceTime || "",
      };

      // Add category columns dynamically
      categories.forEach(cat => {
        row[cat.name] = (service.categoryTotals[cat.id] || 0).toFixed(2);
      });

      row["Total"] = service.total.toFixed(2);

      return row;
    });

    // Add grand total row at the bottom
    const totalRow: Record<string, string> = {
      "Service Date": "",
      "Service Type": "",
      "Service Time": "GRAND TOTAL",
    };
    categories.forEach(cat => {
      totalRow[cat.name] = totals[cat.name] || "0.00";
    });
    totalRow["Total"] = totals.total;
    csvRows.push(totalRow);

    // Build CSV headers dynamically
    const csvHeaders = [
      "Service Date",
      "Service Type",
      "Service Time",
      ...categories.map(cat => cat.name),
      "Total"
    ];

    const csvContent = generateCsv(csvRows, csvHeaders);
    const filename = `giving-report-by-service-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

