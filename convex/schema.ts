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
      v.literal("featured"),
      v.literal("columns")
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

  // Generator Module Tables
  imageGenerations: defineTable({
    userId: v.string(),
    type: v.union(v.literal("free"), v.literal("product"), v.literal("menu")),
    model: v.string(),
    prompt: v.string(),
    negativePrompt: v.optional(v.string()),
    style: v.optional(v.string()),
    styleImageId: v.optional(v.id("generatedFiles")),
    width: v.number(),
    height: v.number(),
    numImages: v.number(),
    seed: v.optional(v.number()),
    guidanceScale: v.optional(v.number()),
    menuConfig: v.optional(
      v.object({
        orientation: v.union(v.literal("portrait"), v.literal("landscape")),
        pricePosition: v.union(
          v.literal("top"),
          v.literal("bottom"),
          v.literal("right"),
          v.literal("left")
        ),
        useGeneratedImages: v.boolean(),
        useProvidedImages: v.boolean(),
        backgroundSource: v.union(
          v.literal("generated"),
          v.literal("provided"),
          v.literal("none")
        ),
        backgroundImageId: v.optional(v.id("generatedFiles")),
        products: v.array(
          v.object({
            productId: v.optional(v.id("products")),
            name: v.string(),
            price: v.number(),
            imageId: v.optional(v.id("generatedFiles")),
            order: v.number(),
          })
        ),
      })
    ),
    productConfig: v.optional(
      v.object({
        productName: v.string(),
        productDescription: v.optional(v.string()),
        styleReferenceId: v.optional(v.id("generatedFiles")),
        styleStrength: v.optional(v.number()),
        backgroundType: v.union(
          v.literal("transparent"),
          v.literal("generated"),
          v.literal("provided")
        ),
        backgroundImageId: v.optional(v.id("generatedFiles")),
      })
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    falRequestId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    generatedFileIds: v.array(v.id("generatedFiles")),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_createdAt", ["createdAt"]),

  videoGenerations: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("image-to-video"),
      v.literal("video-remix"),
      v.literal("text-to-video"),
      v.literal("video-to-video")
    ),
    prompt: v.string(),
    negativePrompt: v.optional(v.string()),
    sourceImageId: v.optional(v.id("generatedFiles")),
    motionStrength: v.optional(v.number()),
    duration: v.optional(v.number()),
    sourceVideoId: v.optional(v.id("generatedFiles")),
    remixStyle: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    videoStyleId: v.optional(v.id("generatedFiles")),
    model: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    falRequestId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    generatedFileIds: v.array(v.id("generatedFiles")),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_createdAt", ["createdAt"]),

  generatedFiles: defineTable({
    storageId: v.id("_storage"),
    fileUrl: v.string(),
    fileType: v.union(v.literal("image"), v.literal("video")),
    mimeType: v.string(),
    fileSize: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    duration: v.optional(v.number()),
    generationId: v.union(
      v.id("imageGenerations"),
      v.id("videoGenerations")
    ),
    generationType: v.union(v.literal("image"), v.literal("video")),
    isOriginal: v.boolean(),
    parentFileId: v.optional(v.id("generatedFiles")),
    editHistory: v.array(
      v.object({
        editType: v.string(),
        parameters: v.any(),
        timestamp: v.number(),
      })
    ),
    createdAt: v.number(),
  })
    .index("by_generationId", ["generationId"])
    .index("by_generationType", ["generationType"])
    .index("by_fileType", ["fileType"])
    .index("by_createdAt", ["createdAt"]),

  editHistory: defineTable({
    userId: v.string(),
    fileId: v.id("generatedFiles"),
    editType: v.union(
      v.literal("crop"),
      v.literal("resize"),
      v.literal("filter"),
      v.literal("style-transfer"),
      v.literal("color-adjust"),
      v.literal("text-overlay"),
      v.literal("remove-background"),
      v.literal("upscale")
    ),
    parameters: v.any(),
    resultFileId: v.id("generatedFiles"),
    createdAt: v.number(),
  })
    .index("by_fileId", ["fileId"])
    .index("by_userId", ["userId"])
    .index("by_createdAt", ["createdAt"]),

  userCollections: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    fileIds: v.array(v.id("generatedFiles")),
    isPublic: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_createdAt", ["createdAt"]),
});

