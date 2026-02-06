/**
 * Script to set up default giving categories for an existing church
 * Usage: tsx scripts/setup-default-giving-categories.ts <churchId>
 * 
 * This will create the default categories if they don't exist, or reactivate them if they do.
 */

import "dotenv/config";
import { db } from "../db";
import { givingCategories, churches } from "../db/schema";
import { eq, and } from "drizzle-orm";

async function setupDefaultCategories() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error("Usage: tsx scripts/setup-default-giving-categories.ts <churchId>");
    process.exit(1);
  }

  const churchId = args[0];

  try {
    // Check if church exists
    const church = await db.query.churches.findFirst({
      where: eq(churches.id, churchId),
    });

    if (!church) {
      console.error(`Church with ID ${churchId} not found`);
      process.exit(1);
    }

    console.log(`Setting up default categories for church: ${church.name} (${church.subdomain})`);

    // Default categories to create
    const defaultCategories = [
      { name: "Current", displayOrder: 1 },
      { name: "Mission", displayOrder: 2 },
      { name: "Memorials", displayOrder: 3 },
      { name: "Debt", displayOrder: 4 },
      { name: "School", displayOrder: 5 },
      { name: "Miscellaneous", displayOrder: 6 },
    ];

    // Process each default category
    for (const cat of defaultCategories) {
      // Check if category already exists
      const existing = await db
        .select()
        .from(givingCategories)
        .where(
          and(
            eq(givingCategories.churchId, churchId),
            eq(givingCategories.name, cat.name)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing category to ensure it's active and has correct order
        await db
          .update(givingCategories)
          .set({
            displayOrder: cat.displayOrder,
            isActive: true,
          })
          .where(eq(givingCategories.id, existing[0].id));
        console.log(`  ✓ Updated category: ${cat.name}`);
      } else {
        // Insert new category
        await db.insert(givingCategories).values({
          churchId,
          name: cat.name,
          displayOrder: cat.displayOrder,
          isActive: true,
        });
        console.log(`  ✓ Created category: ${cat.name}`);
      }
    }

    // Show final status
    const allCategories = await db
      .select()
      .from(givingCategories)
      .where(eq(givingCategories.churchId, churchId))
      .orderBy(givingCategories.displayOrder);

    console.log(`\n✅ Successfully set up default categories!`);
    console.log(`\nActive categories for ${church.name}:`);
    allCategories
      .filter(cat => cat.isActive)
      .forEach(cat => {
        console.log(`  ${cat.displayOrder}. ${cat.name}`);
      });

    const inactiveCount = allCategories.filter(cat => !cat.isActive).length;
    if (inactiveCount > 0) {
      console.log(`\nNote: ${inactiveCount} inactive category(ies) were not modified.`);
    }

  } catch (error) {
    console.error("Error setting up default categories:", error);
    process.exit(1);
  }
}

setupDefaultCategories();
