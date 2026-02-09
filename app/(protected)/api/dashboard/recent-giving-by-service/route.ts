import { NextResponse } from "next/server";
import { eq, desc, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  services,
  giving,
  givingItems,
  givingCategories,
  members,
} from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    // Get 5 most recent services
    const recentServices = await db
      .select({
        id: services.id,
        serviceDate: services.serviceDate,
        serviceType: services.serviceType,
        serviceTime: services.serviceTime,
      })
      .from(services)
      .where(eq(services.churchId, churchId))
      .orderBy(desc(services.serviceDate))
      .limit(5);

    if (recentServices.length === 0) {
      return NextResponse.json({ services: [] });
    }

    const serviceIds = recentServices.map((s) => s.id);

    // Get all giving records for these services
    const givingRecords = await db
      .select({
        id: giving.id,
        serviceId: giving.serviceId,
      })
      .from(giving)
      .innerJoin(members, eq(giving.memberId, members.id))
      .where(
        and(
          eq(members.churchId, churchId),
          inArray(giving.serviceId, serviceIds),
        ),
      );

    const givingIds = givingRecords.map((g) => g.id);

    // Get all giving items for these records
    const allItems =
      givingIds.length > 0
        ? await db
            .select({
              givingId: givingItems.givingId,
              categoryId: givingItems.categoryId,
              amount: givingItems.amount,
              categoryName: givingCategories.name,
            })
            .from(givingItems)
            .innerJoin(
              givingCategories,
              eq(givingItems.categoryId, givingCategories.id),
            )
            .where(inArray(givingItems.givingId, givingIds))
        : [];

    // Group giving records by serviceId
    const givingByServiceId: Record<string, typeof givingRecords> = {};
    givingRecords.forEach((record) => {
      if (record.serviceId) {
        if (!givingByServiceId[record.serviceId]) {
          givingByServiceId[record.serviceId] = [];
        }
        givingByServiceId[record.serviceId].push(record);
      }
    });

    // Group items by givingId
    const itemsByGivingId: Record<string, typeof allItems> = {};
    allItems.forEach((item) => {
      if (!itemsByGivingId[item.givingId]) {
        itemsByGivingId[item.givingId] = [];
      }
      itemsByGivingId[item.givingId].push(item);
    });

    // Calculate totals for each service by category
    const servicesWithGiving = recentServices.map((service) => {
      const serviceGivingRecords = givingByServiceId[service.id] || [];

      // Initialize category totals
      const categoryTotalsMap: Record<
        string,
        { categoryId: string; categoryName: string; amount: number }
      > = {};
      let totalAmount = 0;

      // Aggregate giving for this service
      serviceGivingRecords.forEach((givingRecord) => {
        const items = itemsByGivingId[givingRecord.id] || [];
        items.forEach((item) => {
          const amount = parseFloat(item.amount || "0");
          totalAmount += amount;

          if (!categoryTotalsMap[item.categoryId]) {
            categoryTotalsMap[item.categoryId] = {
              categoryId: item.categoryId,
              categoryName: item.categoryName,
              amount: 0,
            };
          }
          categoryTotalsMap[item.categoryId].amount += amount;
        });
      });

      // Convert to array and round amounts
      const categoryTotals = Object.values(categoryTotalsMap).map((cat) => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        amount: Math.round(cat.amount * 100) / 100,
      }));

      return {
        serviceId: service.id,
        serviceDate: service.serviceDate,
        serviceType: service.serviceType,
        serviceTime: service.serviceTime,
        categoryTotals,
        totalAmount: Math.round(totalAmount * 100) / 100,
      };
    });

    return NextResponse.json({ services: servicesWithGiving });
  } catch (error) {
    return createErrorResponse(error);
  }
}
