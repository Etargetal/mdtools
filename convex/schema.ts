import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  locations: defineTable({
    name: v.string(),
    slug: v.string(),
    branding: v.object({
      primaryColor: v.string(),
      secondaryColor: v.string(),
      logo: v.optional(v.string()),
      font: v.string(),
      backgroundImage: v.optional(v.string()),
    }),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  products: defineTable({
    name: v.string(),
    price: v.number(),
    currency: v.string(),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_order", ["order"]),

  templates: defineTable({
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_default", ["isDefault"]),

  screens: defineTable({
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
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("maintenance")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_screenId", ["screenId"])
    .index("by_location", ["locationId"])
    .index("by_status", ["status"]),

  staticAssets: defineTable({
    name: v.string(),
    fileUrl: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
});

