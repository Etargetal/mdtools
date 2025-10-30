import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Seed default templates
export const seedDefaultTemplates = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Check if templates already exist
    const existing = await ctx.db.query("templates").collect();
    if (existing.length > 0) {
      return { message: "Templates already exist" };
    }

    const templates = [
      {
        name: "Grid 2 Columns",
        slug: "grid-2-columns",
        layoutType: "grid" as const,
        columns: 2,
        showPrices: true,
        showImages: true,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Grid 3 Columns",
        slug: "grid-3-columns",
        layoutType: "grid" as const,
        columns: 3,
        showPrices: true,
        showImages: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Grid 4 Columns",
        slug: "grid-4-columns",
        layoutType: "grid" as const,
        columns: 4,
        showPrices: true,
        showImages: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "List Layout",
        slug: "list-layout",
        layoutType: "list" as const,
        showPrices: true,
        showImages: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Featured Layout",
        slug: "featured-layout",
        layoutType: "featured" as const,
        showPrices: true,
        showImages: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const template of templates) {
      await ctx.db.insert("templates", template);
    }

    return { message: "Default templates seeded successfully" };
  },
});

