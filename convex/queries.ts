import { query } from "./_generated/server";
import { v } from "convex/values";

// Get all locations
export const getLocations = query({
  handler: async (ctx) => {
    return await ctx.db.query("locations").collect();
  },
});

// Get location by slug
export const getLocationBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("locations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Get all products
export const getProducts = query({
  handler: async (ctx) => {
    return await ctx.db.query("products").collect();
  },
});

// Get active products
export const getActiveProducts = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

// Get screen by screenId
export const getScreenById = query({
  args: { screenId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("screens")
      .withIndex("by_screenId", (q) => q.eq("screenId", args.screenId))
      .first();
  },
});

// Get all screens
export const getScreens = query({
  handler: async (ctx) => {
    return await ctx.db.query("screens").collect();
  },
});

// Get templates
export const getTemplates = query({
  handler: async (ctx) => {
    return await ctx.db.query("templates").collect();
  },
});

// Get default template
export const getDefaultTemplate = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("templates")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .first();
  },
});

// Get products by category
export const getProductsByCategory = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("category", args.category))
        .collect();
    }
    return await ctx.db.query("products").collect();
  },
});

// Get product by ID
export const getProductById = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get template by ID
export const getTemplateById = query({
  args: { id: v.id("templates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get screens by location
export const getScreensByLocation = query({
  args: { locationId: v.id("locations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("screens")
      .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
      .collect();
  },
});

// Get screen with location details
export const getScreenWithLocation = query({
  args: { screenId: v.string() },
  handler: async (ctx, args) => {
    const screen = await ctx.db
      .query("screens")
      .withIndex("by_screenId", (q) => q.eq("screenId", args.screenId))
      .first();
    if (!screen) return null;
    const location = await ctx.db.get(screen.locationId);
    return { screen, location };
  },
});

// Get all static assets
export const getStaticAssets = query({
  handler: async (ctx) => {
    return await ctx.db.query("staticAssets").collect();
  },
});

// Get static asset by ID
export const getStaticAssetById = query({
  args: { id: v.id("staticAssets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get complete screen data for display
export const getScreenForDisplay = query({
  args: { screenId: v.string() },
  handler: async (ctx, args) => {
    const screen = await ctx.db
      .query("screens")
      .withIndex("by_screenId", (q) => q.eq("screenId", args.screenId))
      .first();

    if (!screen || screen.status !== "active") return null;

    const location = await ctx.db.get(screen.locationId);
    if (!location || location.status !== "active") return null;

    let template = null;
    const products: Array<{
      _id: any;
      name: string;
      price: number;
      currency: string;
      category?: string;
      description?: string;
      image?: string;
      status: "active" | "inactive";
      order: number;
    }> = [];

    if (screen.mode === "dynamic" && screen.dynamicConfig) {
      // Get template
      template = await ctx.db.get(screen.dynamicConfig.templateId);

      // Get products
      if (screen.dynamicConfig.productIds.length > 0) {
        const productPromises = screen.dynamicConfig.productIds
          .filter((id) => id !== null)
          .map((id) => ctx.db.get(id));
        const fetchedProducts = await Promise.all(productPromises);
        const validProducts = fetchedProducts
          .filter((p): p is NonNullable<typeof p> => p !== null && p.status === "active")
          .sort((a, b) => a.order - b.order);
        products.push(...validProducts);
      }
    }

    return {
      screen,
      location,
      template,
      products,
    };
  },
});
