import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Create location
export const createLocation = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    branding: v.object({
      primaryColor: v.string(),
      secondaryColor: v.string(),
      logo: v.optional(v.string()),
      font: v.string(),
      backgroundImage: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("locations", {
      ...args,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update location
export const updateLocation = mutation({
  args: {
    id: v.id("locations"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    branding: v.optional(
      v.object({
        primaryColor: v.string(),
        secondaryColor: v.string(),
        logo: v.optional(v.string()),
        font: v.string(),
        backgroundImage: v.optional(v.string()),
      })
    ),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Create product
export const createProduct = mutation({
  args: {
    name: v.string(),
    price: v.number(),
    currency: v.string(),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("products", {
      ...args,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update product
export const updateProduct = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Bulk update products
export const bulkUpdateProducts = mutation({
  args: {
    ids: v.array(v.id("products")),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const id of args.ids) {
      await ctx.db.patch(id, {
        status: args.status,
        updatedAt: now,
      });
    }
    return { updated: args.ids.length };
  },
});

// Bulk delete products (set to inactive)
export const bulkDeleteProducts = mutation({
  args: {
    ids: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const id of args.ids) {
      await ctx.db.patch(id, {
        status: "inactive",
        updatedAt: now,
      });
    }
    return { deleted: args.ids.length };
  },
});

// Reorder products
export const reorderProducts = mutation({
  args: {
    orders: v.array(
      v.object({
        id: v.id("products"),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const item of args.orders) {
      await ctx.db.patch(item.id, {
        order: item.order,
        updatedAt: now,
      });
    }
    return { reordered: args.orders.length };
  },
});

// Delete product (set to inactive)
export const deleteProduct = mutation({
  args: {
    id: v.id("products"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "inactive",
      updatedAt: Date.now(),
    });
  },
});

// Create screen
export const createScreen = mutation({
  args: {
    screenId: v.string(),
    name: v.string(),
    locationId: v.id("locations"),
    mode: v.union(v.literal("dynamic"), v.literal("static")),
    dynamicConfig: v.optional(
      v.object({
        productIds: v.array(v.id("products")),
        templateId: v.id("templates"),
        backgroundImage: v.optional(v.string()),
      })
    ),
    staticConfig: v.optional(
      v.object({
        imageUrl: v.string(),
      })
    ),
    layoutConfig: v.object({
      orientation: v.union(v.literal("landscape"), v.literal("portrait")),
      refreshInterval: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("screens", {
      ...args,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update screen
export const updateScreen = mutation({
  args: {
    id: v.id("screens"),
    screenId: v.optional(v.string()),
    name: v.optional(v.string()),
    locationId: v.optional(v.id("locations")),
    mode: v.optional(v.union(v.literal("dynamic"), v.literal("static"))),
    dynamicConfig: v.optional(
      v.object({
        productIds: v.array(v.id("products")),
        templateId: v.id("templates"),
        backgroundImage: v.optional(v.string()),
      })
    ),
    staticConfig: v.optional(
      v.object({
        imageUrl: v.string(),
      })
    ),
    layoutConfig: v.optional(
      v.object({
        orientation: v.union(v.literal("landscape"), v.literal("portrait")),
        refreshInterval: v.number(),
      })
    ),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("maintenance")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Create template
export const createTemplate = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    layoutType: v.union(
      v.literal("grid"),
      v.literal("list"),
      v.literal("featured")
    ),
    columns: v.optional(v.number()),
    showPrices: v.boolean(),
    showImages: v.boolean(),
    config: v.optional(v.any()),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    // If setting as default, unset other defaults
    if (args.isDefault) {
      const existingDefaults = await ctx.db
        .query("templates")
        .withIndex("by_default", (q) => q.eq("isDefault", true))
        .collect();
      for (const template of existingDefaults) {
        await ctx.db.patch(template._id, { isDefault: false });
      }
    }
    return await ctx.db.insert("templates", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update template
export const updateTemplate = mutation({
  args: {
    id: v.id("templates"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    layoutType: v.optional(
      v.union(v.literal("grid"), v.literal("list"), v.literal("featured"))
    ),
    columns: v.optional(v.number()),
    showPrices: v.optional(v.boolean()),
    showImages: v.optional(v.boolean()),
    config: v.optional(v.any()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    // If setting as default, unset other defaults
    if (updates.isDefault === true) {
      const existingDefaults = await ctx.db
        .query("templates")
        .withIndex("by_default", (q) => q.eq("isDefault", true))
        .collect();
      for (const template of existingDefaults) {
        if (template._id !== id) {
          await ctx.db.patch(template._id, { isDefault: false });
        }
      }
    }
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete template
export const deleteTemplate = mutation({
  args: {
    id: v.id("templates"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Set default template
export const setDefaultTemplate = mutation({
  args: {
    id: v.id("templates"),
  },
  handler: async (ctx, args) => {
    // Unset all existing defaults
    const existingDefaults = await ctx.db
      .query("templates")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .collect();
    for (const template of existingDefaults) {
      await ctx.db.patch(template._id, { isDefault: false });
    }
    // Set this template as default
    await ctx.db.patch(args.id, {
      isDefault: true,
      updatedAt: Date.now(),
    });
  },
});

// Delete screen
export const deleteScreen = mutation({
  args: {
    id: v.id("screens"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Create static asset
export const createStaticAsset = mutation({
  args: {
    name: v.string(),
    fileUrl: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("staticAssets", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Delete static asset
export const deleteStaticAsset = mutation({
  args: {
    id: v.id("staticAssets"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
